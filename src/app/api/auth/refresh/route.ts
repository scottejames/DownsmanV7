import { NextRequest, NextResponse } from 'next/server';
import * as cognito from '@/services/cognito';
import { AuthError } from '@/services/cognito';
import { REFRESH_COOKIE, setSessionCookies, verifyIdToken, safeUserFromClaims, clearSessionCookies } from '@/lib/session';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.json({ error: 'No session' }, { status: 401 });

  try {
    const tokens = await cognito.refresh(refreshToken);
    const claims = await verifyIdToken(tokens.idToken);
    if (!claims) return NextResponse.json({ error: 'No session' }, { status: 401 });

    const res = NextResponse.json(safeUserFromClaims(claims));
    setSessionCookies(res, tokens);
    return res;
  } catch (e) {
    if (e instanceof AuthError) {
      const res = NextResponse.json({ error: 'Session expired' }, { status: 401 });
      clearSessionCookies(res);
      return res;
    }
    throw e;
  }
}
