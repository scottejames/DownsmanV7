import { NextRequest, NextResponse } from 'next/server';
import { getSupportByOwner, saveSupport, deleteSupport } from '@/services/db';

export async function GET(req: NextRequest) {
  const ownerID = req.nextUrl.searchParams.get('ownerID');
  if (!ownerID) return NextResponse.json({ error: 'ownerID required' }, { status: 400 });
  const support = await getSupportByOwner(ownerID);
  return NextResponse.json(support);
}

export async function POST(req: NextRequest) {
  const support = await req.json();
  const saved = await saveSupport(support);
  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest) {
  const { ownerID, id } = await req.json();
  await deleteSupport(ownerID, id);
  return NextResponse.json({ ok: true });
}
