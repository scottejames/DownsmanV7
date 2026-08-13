import { NextRequest, NextResponse } from 'next/server';
import { ID_COOKIE, verifyIdToken, resolveOwnerId } from '@/lib/session';

export const config = {
  matcher: ['/api/:path*'],
};

export async function middleware(req: NextRequest) {
  // /api/auth/* is how a session gets established in the first place -
  // nothing to verify yet.
  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ID_COOKIE)?.value;
  const claims = token ? await verifyIdToken(token) : null;
  if (!claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Strip first so a request can't spoof these by sending them directly -
  // only middleware is allowed to set them, right before forwarding.
  const headers = new Headers(req.headers);
  headers.delete('x-user-owner-id');
  headers.delete('x-user-sub');
  headers.delete('x-user-groups');

  headers.set('x-user-owner-id', resolveOwnerId(claims));
  headers.set('x-user-sub', claims.sub);
  headers.set('x-user-groups', (claims['cognito:groups'] || []).join(','));

  return NextResponse.next({ request: { headers } });
}
