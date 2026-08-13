import { NextRequest, NextResponse } from 'next/server';
import { getScoutsByOwner, saveScout, deleteScout, getTeamById } from '@/services/db';
import { getSession, SessionIdentity } from '@/lib/authz';

// Scouts.ownerID is the owning TEAM's id, not the user's - so authorizing a
// scout means checking that the referenced team belongs to the caller (or
// the caller is an admin), not just comparing ids directly.
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

  const scouts = await getScoutsByOwner(ownerID);
  return NextResponse.json(scouts);
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  const scout = await req.json();
  if (!scout.ownerID || !(await ownsTeam(scout.ownerID, session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const saved = await saveScout(scout);
  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  const { ownerID, id } = await req.json();
  if (!ownerID || !(await ownsTeam(ownerID, session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await deleteScout(ownerID, id);
  return NextResponse.json({ ok: true });
}
