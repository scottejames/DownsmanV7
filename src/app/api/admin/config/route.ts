import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/authz';
import { ConfigVar } from '@/models/types';

// The canonical list of variables that configure this app (as opposed to
// AWS_REGION/USER_TABLE_NAME, which only the Lambda triggers read, or NODE_ENV,
// which Next.js sets itself) - see CODE_REVIEW_2026-08-13.md's variable review and
// DEPLOYMENT.md's "Environment Variables" table, which this should stay in sync
// with. NEXT_PUBLIC_* vars are readable from process.env server-side too (Next.js
// also inlines them into the client bundle), so this route can return all of them
// uniformly regardless of which ones a client component could read directly itself.
const CONFIG_VARS: { key: string; description: string }[] = [
  { key: 'NEXT_PUBLIC_DM_DEV', description: 'Shows a DEV banner in the UI' },
  { key: 'NEXT_PUBLIC_DM_LOCK', description: 'Locks entries app-wide (read-only), overridable per-user via the breakLock group' },
  { key: 'NEXT_PUBLIC_DM_HIKE_DATE', description: "This season's hike date - every age-based validation rule depends on it" },
  { key: 'DM_DEV', description: 'Uses local DynamoDB on port 8000 instead of real AWS' },
  { key: 'DM_BANKDETS', description: 'Bank details shown for payment - currently unused, not wired into any UI (see CODE_REVIEW_2026-08-13.md M4)' },
  { key: 'COGNITO_USER_POOL_ID', description: 'Cognito User Pool ID' },
  { key: 'COGNITO_CLIENT_ID', description: 'Cognito App Client ID' },
  { key: 'COGNITO_REGION', description: 'AWS region for Cognito calls' },
];

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const config: ConfigVar[] = CONFIG_VARS.map(({ key, description }) => ({
    key,
    description,
    value: process.env[key] ?? null,
  }));
  return NextResponse.json(config);
}
