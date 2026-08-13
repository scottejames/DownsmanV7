import { NextRequest, NextResponse } from 'next/server';
import { getTeamsByOwner, saveTeam, deleteTeam, getAllTeams, getTeamById } from '@/services/db';
import { getSession } from '@/lib/authz';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  const all = req.nextUrl.searchParams.get('all');

  if (all === 'true') {
    if (!session.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const teams = await getAllTeams();
    return NextResponse.json(teams);
  }

  const teams = await getTeamsByOwner(session.ownerId);
  return NextResponse.json(teams);
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  const team = await req.json();
  // A malicious ownerID here can't touch another user's row: writes always
  // land in the caller's own partition, matching the Team table's key schema
  // ({ownerID, id}) - see DEPLOYMENT.md / scripts/create-tables.js.
  team.ownerID = session.ownerId;
  const saved = await saveTeam(team);
  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  const { id } = await req.json();
  // Fetch-and-verify rather than trusting the client-supplied team, because
  // deleteTeam() cascades to that team's Scouts/Support by id regardless of
  // who's asking - the ownership check has to happen before that cascade runs.
  const existing = id ? await getTeamById(id) : null;
  if (!existing || (!session.isAdmin && existing.ownerID !== session.ownerId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await deleteTeam(existing);
  return NextResponse.json({ ok: true });
}
