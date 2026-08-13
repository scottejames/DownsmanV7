import { NextRequest, NextResponse } from 'next/server';
import { getSupportByOwner, saveSupport, deleteSupport, getTeamById } from '@/services/db';
import { getSession, SessionIdentity } from '@/lib/authz';

// Support.ownerID is the owning TEAM's id, not the user's - see scouts/route.ts.
async function ownsTeam(teamId: string, session: SessionIdentity): Promise<boolean> {
  if (session.isAdmin) return true;
  const team = await getTeamById(teamId);
  return !!team && team.ownerID === session.ownerId;
}

export async function GET(req: NextRequest) {
  const session = getSession(req);
  const ownerID = req.nextUrl.searchParams.get('ownerID');
  if (!ownerID) return NextResponse.json({ error: 'ownerID required' }, { status: 400 });
  if (!(await ownsTeam(ownerID, session))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const support = await getSupportByOwner(ownerID);
  return NextResponse.json(support);
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  const support = await req.json();
  if (!support.ownerID || !(await ownsTeam(support.ownerID, session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const saved = await saveSupport(support);
  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  const { ownerID, id } = await req.json();
  if (!ownerID || !(await ownsTeam(ownerID, session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await deleteSupport(ownerID, id);
  return NextResponse.json({ ok: true });
}
