# Downsman Startup Guide

## Prerequisites

- Node.js 18+
- Docker
- AWS CLI, with credentials that can create/manage a Cognito user pool

## 1. Provision a dev Cognito pool (one-time)

```bash
npm install
node scripts/create-cognito-pool.js dev
```

This prints a `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` - keep them for step 3.

## 2. Start Local DynamoDB

```bash
docker run -v ~/tmp/data:/data -p 8000:8000 amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -dbPath /data
```

This persists data to `~/tmp/data` so it survives restarts.

## 3. Create Environment Config

```bash
cp .env.example .env.local
```

Fill in the `COGNITO_USER_POOL_ID`/`COGNITO_CLIENT_ID` from step 1. Default
settings otherwise connect to local DynamoDB on port 8000.

## 4. Create Database Tables

```bash
npm run create-tables
```

Verify they exist:

```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000 --region eu-west-2
```

You should see: Team, Scouts, Support, Log.

## 5. Start the App

```bash
./scripts/start-local.sh
```

Or run steps 2-4 manually then `npm run dev`. Open http://localhost:3000.

## 6. Create Your First User

1. Click **Register**
2. Fill in username, email, phone, password
3. Login with your new credentials

This creates a real user in the dev Cognito pool from step 1 - there's no
local/offline auth emulation.

## 7. Make a User Admin

Admin status is a Cognito group, not a database field:

```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id <your dev pool id> \
  --username <username> \
  --group-name admin \
  --region eu-west-2
```

They'll need to log out and back in (or wait for the next token refresh) to
pick up the new group membership.

## Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) - production runs on AWS Amplify Hosting
against the prod Cognito pool and real DynamoDB, not this local setup.
