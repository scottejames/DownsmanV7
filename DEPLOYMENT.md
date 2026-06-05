# NewDownsman - Build & Deployment

## Architecture

- **App**: Next.js 14 (App Router)
- **Hosting**: AWS Amplify (WEB_COMPUTE)
- **Database**: DynamoDB (eu-west-2)
- **Region**: eu-west-2
- **Amplify App ID**: d1mwozzx371w2q
- **URL**: https://d1mwozzx371w2q.amplifyapp.com

## How Deployment Works

Amplify is connected to the GitHub repo `scottejames/DownsmanV6`. When code is pushed to `master`, Amplify automatically:

1. Clones the repo
2. Uses `NewDownsman/` as the app root (monorepo setup via `AMPLIFY_MONOREPO_APP_ROOT`)
3. Runs `npm ci` then `npm run build`
4. Injects environment variables (DM_DEV, DM_LOCK, DM_BANKDETS) into `.env.production`
5. Deploys the `.next` output

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/start-local.sh` | Start app locally with local DynamoDB |
| `scripts/build.sh` | Production build (local verification) |
| `scripts/deploy.sh` | Push to GitHub and wait for Amplify deployment |
| `scripts/create-tables.js` | Create DynamoDB tables |
| `scripts/make-admin.sh` | Promote a user to admin |

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

## Environment Variables (set in Amplify Console)

| Variable | Purpose |
|----------|---------|
| `AMPLIFY_MONOREPO_APP_ROOT` | `NewDownsman` - tells Amplify which subdirectory is the app |
| `DM_DEV` | `false` in prod - controls dev mode banner |
| `DM_LOCK` | `false` - set to `true` to lock entries |
| `DM_BANKDETS` | Bank details shown for payment |

## Local Development

```bash
./scripts/start-local.sh
```

This starts a local DynamoDB container, creates tables, and runs the Next.js dev server on http://localhost:3000.

## Amplify Build Spec

The build spec is stored in the Amplify console (not a local file):

```yaml
version: 1
applications:
  - appRoot: NewDownsman
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - env | grep -e DM_ >> .env.production
            - env | grep -e NEXT_PUBLIC_ >> .env.production
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
