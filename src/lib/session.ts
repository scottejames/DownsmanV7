import { NextResponse } from 'next/server';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { Tokens } from '@/services/cognito';
import type { UserModel } from '@/models/types';

export const ID_COOKIE = 'dm_id_token';
export const REFRESH_COOKIE = 'dm_refresh_token';

// Cognito's default refresh token validity for this pool (see
// scripts/create-cognito-pool.js) - keep in sync if that's ever changed.
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

// Built lazily rather than cached at module load - same reasoning as
// userPoolId()/clientId() in services/cognito.ts: keeps this testable and
// avoids freezing a value from before config was ready.
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      tokenUse: 'id',
      clientId: process.env.COGNITO_CLIENT_ID!,
    });
  }
  return verifier;
}

export interface SessionClaims {
  sub: string;
  'cognito:username': string;
  email?: string;
  'custom:legacyId'?: string;
  'custom:mobile'?: string;
  'cognito:groups'?: string[];
}

export async function verifyIdToken(token: string): Promise<SessionClaims | null> {
  try {
    return (await getVerifier().verify(token)) as unknown as SessionClaims;
  } catch {
    return null;
  }
}

export function setSessionCookies(res: NextResponse, tokens: Tokens): void {
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(ID_COOKIE, tokens.idToken, {
    httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: tokens.expiresIn,
  });
  if (tokens.refreshToken) {
    res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: REFRESH_MAX_AGE,
    });
  }
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.delete(ID_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
}

// The id every Team/Scouts/Support row's `ownerID` points at: the legacy
// app-generated id for migrated users, or the Cognito sub for new signups.
export function resolveOwnerId(claims: SessionClaims): string {
  return claims['custom:legacyId'] || claims.sub;
}

export function safeUserFromClaims(claims: SessionClaims): Omit<UserModel, 'password'> {
  const groups = claims['cognito:groups'] || [];
  return {
    id: resolveOwnerId(claims),
    username: claims['cognito:username'],
    email: claims.email,
    mobile: claims['custom:mobile'],
    admin: groups.includes('admin'),
    breakLock: groups.includes('breakLock'),
  };
}
