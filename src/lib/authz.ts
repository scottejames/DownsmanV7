import { NextRequest } from 'next/server';

export interface SessionIdentity {
  ownerId: string;
  sub: string;
  groups: string[];
  isAdmin: boolean;
}

// Reads the identity middleware.ts verified and injected as headers. Throws
// if called from a route that isn't covered by the middleware matcher - that's
// a bug (an unprotected route), not a request the caller can trigger.
export function getSession(req: NextRequest): SessionIdentity {
  const ownerId = req.headers.get('x-user-owner-id');
  const sub = req.headers.get('x-user-sub');
  if (!ownerId || !sub) {
    throw new Error('No verified session headers on this request - is the route excluded from middleware.ts?');
  }
  const groups = (req.headers.get('x-user-groups') || '').split(',').filter(Boolean);
  return { ownerId, sub, groups, isAdmin: groups.includes('admin') };
}
