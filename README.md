# Downsman - Next.js/TypeScript Edition

A scout hiking event team registration system, rewritten from Vaadin/Java to Next.js + TypeScript + Tailwind CSS with DynamoDB backend.

## Prerequisites

- Node.js 18+
- DynamoDB (local via Docker, or AWS)
- AWS credentials configured (`~/.aws/credentials`)

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env.local

# Start local DynamoDB
docker run -v ~/tmp/data:/data -p 8000:8000 amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -dbPath /data

# Create tables (same schema as original - User, Team, Scouts, Support, Log)
# Use the existing scripts/create-tables.sh or create them manually

# Run dev server
npm run dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DM_DEV` | `true` uses local DynamoDB on port 8000 | `true` |
| `NEXT_PUBLIC_DM_DEV` | Shows DEV banner in UI | `true` |
| `NEXT_PUBLIC_DM_LOCK` | Locks entries (read-only) | `false` |
| `DM_BANKDETS` | Bank details for payment info | - |

## DynamoDB Tables

Same tables as the original Java version:

- **User** - hash: `ownerID` ("None"), range: `username`
- **Team** - hash: `ownerID`, range: `id`
- **Scouts** - hash: `ownerID`, range: `id`
- **Support** - hash: `ownerID`, range: `id`
- **Log** - hash: `ownerID` ("log"), range: `id`

## Production Deployment

```bash
npm run build
npm start
```

Set `DM_DEV=false` in production to connect to real AWS DynamoDB.

## Architecture

```
src/
├── app/
│   ├── api/          # API routes (auth, teams, scouts, support, admin)
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Main page (team list, login/register)
├── components/       # React components (dialogs)
├── models/           # TypeScript interfaces & reference data
├── services/         # DynamoDB service layer
└── utils/            # Helpers (validation, date, hash)
```

## Migration Notes

- Passwords use the same MD5 hash as the original Java app, so existing users can log in with the same credentials
- The DynamoDB table structure is identical - this app reads/writes the same data
- All team validation rules (age checks, team size, hike class requirements) are preserved
