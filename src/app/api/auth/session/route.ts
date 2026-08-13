import { NextRequest, NextResponse } from 'next/server';
import { ID_COOKIE, verifyIdToken, safeUserFromClaims } from '@/lib/session';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ID_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'No session' }, { status: 401 });

  const claims = await verifyIdToken(token);
  if (!claims) return NextResponse.json({ error: 'No session' }, { status: 401 });

  return NextResponse.json(safeUserFromClaims(claims));
}
