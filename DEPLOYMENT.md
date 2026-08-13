# NewDownsman - Build & Deployment

## Architecture

- **App**: Next.js 15 (App Router)
- **Hosting**: AWS Amplify (WEB_COMPUTE)
- **Database**: DynamoDB (eu-west-2)
- **Auth**: Amazon Cognito (eu-west-2)
- **Region**: eu-west-2
- **Amplify App ID**: d1mwozzx371w2q
- **URL**: https://master.d1mwozzx371w2q.amplifyapp.com

## How Deployment Works

Amplify is connected to the GitHub repo `scottejames/DownsmanV7`. When code is pushed to `master`, Amplify automatically:

1. Clones the repo
2. Runs `npm ci` then `npm run build`
3. Injects environment variables (`DM_*`, `NEXT_PUBLIC_*`, `COGNITO_*`) into `.env.production`
4. Deploys the `.next` output

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/start-local.sh` | Start app locally with local DynamoDB |
| `scripts/build.sh` | Production build (local verification) |
| `scripts/deploy.sh` | Push to GitHub and wait for Amplify deployment |
| `scripts/create-tables.js` | Create DynamoDB tables (Team/Scouts/Support/Log) |
| `scripts/create-cognito-pool.js` | Provision a Cognito user pool (`dev` or `prod`) |
| `scripts/deploy-lambdas.sh` | Deploy/wire the Cognito trigger Lambdas |
| `scripts/backup-dynamo.sh` | Back up all DynamoDB tables |

## Deploy

```bash
# 1. Commit your changes
git add -A && git commit -m "your message"

# 2. Deploy (pushes to GitHub, waits for Amplify)
./scripts/deploy.sh
```

Or manually:
```bash
git push origin master
# Then check: https://eu-west-2.console.aws.amazon.com/amplify/apps/d1mwozzx371w2q
```

Live site: https://master.d1mwozzx371w2q.amplifyapp.com

## Environment Variables (set in Amplify Console)

| Variable | Purpose |
|----------|---------|
| `DM_DEV` | `false` in prod - controls dev mode banner |
| `DM_LOCK` | `false` - set to `true` to lock entries |
| `DM_BANKDETS` | Bank details shown for payment |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID - prod: `eu-west-2_1B5NhDvlc` |
| `COGNITO_CLIENT_ID` | Cognito App Client ID - prod: `14fr5t5bkbkmnqtrl14dkjbtvc` |
| `COGNITO_REGION` | `eu-west-2` |

## Cognito

Two pools, provisioned via `scripts/create-cognito-pool.js <dev\|prod>`:

| | Dev | Prod |
|---|---|---|
| Pool ID | `eu-west-2_f81ED2Z78` | `eu-west-2_1B5NhDvlc` |
| App Client ID | `5ffbd3vrlo0e9onmgboadno7s8` | `14fr5t5bkbkmnqtrl14dkjbtvc` |

Both pools have `admin` and `breakLock` groups (mirroring the legacy `User` table's boolean flags) and custom attributes `custom:legacyId`, `custom:mobile`, `custom:groupsSynced`.

Two Lambda triggers per pool (source in `lambda/`, deployed via `ROLE_ARN=... scripts/deploy-lambdas.sh <dev|prod> <pool-id>`):
- **`downsman-cognito-migrate-user-{env}`** (User Migration trigger) - migrates existing legacy `User` table accounts transparently on first login, checking the old MD5 hash and stamping the account's existing app-generated id onto `custom:legacyId` so existing `Team`/`Scouts`/`Support` rows keep working unchanged.
- **`downsman-cognito-post-auth-{env}`** (Post Authentication trigger) - syncs the legacy `admin`/`breakLock` flags to Cognito groups on first login after migration.

Each Lambda's execution role (`NewDownsmanCognitoTriggersRole-{env}`) needs `dynamodb:GetItem`+`Scan` on the `User` table and `cognito-idp:Admin*` group/attribute actions scoped to its own pool. The app's own compute role (`AmplifyNewDownsmanRole` in prod; your own AWS credentials locally) needs the broader set of `cognito-idp:Admin*` actions used by `src/services/cognito.ts` - see that role's `cognito-auth-prod` inline policy.

## Local Development

```bash
./scripts/start-local.sh
```

This starts a local DynamoDB container, creates tables, and runs the Next.js dev server on http://localhost:3000.

## Amplify Build Spec

The build spec is stored in the Amplify console (not a local file):

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - env | grep -e DM_ >> .env.production
        - env | grep -e NEXT_PUBLIC_ >> .env.production
        - env | grep -e COGNITO_ >> .env.production
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```
