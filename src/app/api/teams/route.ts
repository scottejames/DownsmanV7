import { NextRequest, NextResponse } from 'next/server';
import { getTeamsByOwner, saveTeam, deleteTeam, getAllTeams } from '@/services/db';

export async function GET(req: NextRequest) {
  const ownerID = req.nextUrl.searchParams.get('ownerID');
  const all = req.nextUrl.searchParams.get('all');

  if (all === 'true') {
    const teams = await getAllTeams();
    return NextResponse.json(teams);
  }
  if (!ownerID) return NextResponse.json({ error: 'ownerID required' }, { status: 400 });
  const teams = await getTeamsByOwner(ownerID);
  return NextResponse.json(teams);
}

export async function POST(req: NextRequest) {
  const team = await req.json();
  const saved = await saveTeam(team);
  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest) {
  const team = await req.json();
  await deleteTeam(team);
  return NextResponse.json({ ok: true });
}
