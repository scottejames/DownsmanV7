import { NextRequest, NextResponse } from 'next/server';
import { getScoutsByOwner, saveScout, deleteScout } from '@/services/db';

export async function GET(req: NextRequest) {
  const ownerID = req.nextUrl.searchParams.get('ownerID');
  if (!ownerID) return NextResponse.json({ error: 'ownerID required' }, { status: 400 });
  const scouts = await getScoutsByOwner(ownerID);
  return NextResponse.json(scouts);
}

export async function POST(req: NextRequest) {
  const scout = await req.json();
  const saved = await saveScout(scout);
  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest) {
  const { ownerID, id } = await req.json();
  await deleteScout(ownerID, id);
  return NextResponse.json({ ok: true });
}
