# Downsman Startup Guide

## Prerequisites

- Node.js 18+
- Docker
- AWS CLI (for verifying tables)

## 1. Start Local DynamoDB

```bash
docker run -v ~/tmp/data:/data -p 8000:8000 amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -dbPath /data
```

This persists data to `~/tmp/data` so it survives restarts.

## 2. Install Dependencies

```bash
cd NewDownsman
npm install
```

## 3. Create Environment Config

```bash
cp .env.example .env.local
```

Default settings connect to local DynamoDB on port 8000.

## 4. Create Database Tables

```bash
npm run create-tables
```

Verify they exist:

```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000 --region eu-west-2
```

You should see: User, Team, Scouts, Support, Log.

## 5. Start the App

```bash
npm run dev
```

Open http://localhost:3000

## 6. Create Your First User

1. Click **Register**
2. Fill in username, email, phone, password
3. Login with your new credentials

## 7. Make a User Admin

Use dynamodb-admin:

```bash
npm install -g dynamodb-admin
export DYNAMO_ENDPOINT=http://localhost:8000
export AWS_REGION=eu-west-2
dynamodb-admin
```

Open http://localhost:8001/tables/User, find your user, change `admin` from `false` to `true`.

## Production

Set these environment variables and point at real DynamoDB:

```bash
export DM_DEV=false
export NEXT_PUBLIC_DM_DEV=false
export NEXT_PUBLIC_DM_LOCK=false   # set to true to lock entries

npm run build
npm start
```
