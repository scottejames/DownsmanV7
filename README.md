# Downsman

A scout hiking event team registration system, rewritten from Vaadin/Java to
Next.js + TypeScript + Tailwind CSS, with DynamoDB for data and Amazon
Cognito for authentication.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for how this is hosted and deployed, and
[TODO.md](./TODO.md) for known follow-up work.

## Prerequisites

- Node.js 18+
- Docker (for local DynamoDB)
- AWS credentials configured (`~/.aws/credentials`), with access to a dev
  Cognito user pool - see `scripts/create-cognito-pool.js`

## Quick Start

```bash
./scripts/start-local.sh
```

This starts a local DynamoDB container, creates the `Team`/`Scouts`/`Support`/`Log`
tables, and runs the dev server on http://localhost:3000. Copy `.env.example`
to `.env.local` first and fill in `COGNITO_USER_POOL_ID`/`COGNITO_CLIENT_ID`
for a dev pool (`node scripts/create-cognito-pool.js dev` provisions one).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DM_DEV` | `true` uses local DynamoDB on port 8000 |
| `NEXT_PUBLIC_DM_DEV` | Shows a DEV banner in the UI |
| `NEXT_PUBLIC_DM_LOCK` | Locks entries (read-only) |
| `NEXT_PUBLIC_DM_HIKE_DATE` | This season's hike date (`YYYY-MM-DD`) - required, every age-based validation rule depends on it |
| `DM_BANKDETS` | Bank details shown for payment |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | Cognito App Client ID |
| `COGNITO_REGION` | AWS region for Cognito calls |

## DynamoDB Tables

- **Team** - hash: `ownerID` (the owning user's id), range: `id`
- **Scouts** - hash: `ownerID` (the owning team's id), range: `id`
- **Support** - hash: `ownerID` (the owning team's id), range: `id`
- **Log** - hash: `ownerID` ("log"), range: `id`

User accounts live in Cognito, not DynamoDB - see [DEPLOYMENT.md](./DEPLOYMENT.md#cognito).

## Architecture

```
src/
├── app/
│   ├── api/          # API routes (auth, teams, scouts, support, admin)
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Main page (team list, login/register)
├── components/       # React components (dialogs) and shared ui/ primitives
├── lib/              # Session/cookie handling, request authorization
├── middleware.ts     # Verifies the session on every /api/* request
├── models/           # TypeScript interfaces & reference data
├── services/         # DynamoDB and Cognito service layers
└── utils/            # Helpers (validation, date)
lambda/                # Cognito trigger Lambdas (user migration, group sync)
```
