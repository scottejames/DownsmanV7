import { NextRequest, NextResponse } from 'next/server';
import * as cognito from '@/services/cognito';
import { AuthError, Tokens } from '@/services/cognito';
import { setSessionCookies, verifyIdToken, safeUserFromClaims } from '@/lib/session';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === 'login') {
    const { username, password } = body;
    try {
      const result = await cognito.login(username, password);
      if (result.kind === 'newPasswordRequired') {
        return NextResponse.json({ challenge: 'NEW_PASSWORD_REQUIRED', session: result.session, username });
      }
      return respondWithTokens(result.tokens);
    } catch (e) {
      if (e instanceof AuthError) return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      throw e;
    }
  }

  if (action === 'completeNewPassword') {
    const { username, newPassword, session } = body;
    const tokens = await cognito.respondToNewPassword(username, newPassword, session);
    return respondWithTokens(tokens);
  }

  if (action === 'register') {
    const { username, password, email, mobile } = body;
    if (!username || !password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!hasLetter || !hasDigit) {
      return NextResponse.json({ error: 'Password must contain letters and numbers' }, { status: 400 });
    }
    try {
      await cognito.register(username, password, email, mobile);
    } catch (e) {
      if (e instanceof AuthError && e.code === 'UsernameTaken') {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }
      throw e;
    }
    return NextResponse.json({ username, email: email || '', mobile: mobile || '' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

async function respondWithTokens(tokens: Tokens): Promise<NextResponse> {
  const claims = await verifyIdToken(tokens.idToken);
  if (!claims) return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  const res = NextResponse.json(safeUserFromClaims(claims));
  setSessionCookies(res, tokens);
  return res;
}
