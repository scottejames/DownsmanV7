#!/bin/bash
# Deploy NewDownsman to AWS Amplify
# Pushes current master to GitHub which triggers an Amplify build,
# then polls until deployment completes.

set -e

APP_ID="d1mwozzx371w2q"
BRANCH="master"
REGION="eu-west-2"

cd "$(dirname "$0")/../.."

echo "=== Building locally to verify ==="
cd NewDownsman
npm run build
cd ..

echo ""
echo "=== Pushing to GitHub ==="
git push origin "$BRANCH"

echo ""
echo "=== Waiting for Amplify build to start ==="
sleep 5

JOB_ID=$(aws amplify list-jobs --app-id "$APP_ID" --branch-name "$BRANCH" --region "$REGION" \
  --query 'jobSummaries[0].jobId' --output text)

echo "Build job: $JOB_ID"
echo "=== Waiting for deployment to complete ==="

while true; do
  STATUS=$(aws amplify get-job --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" \
    --region "$REGION" --query 'job.summary.status' --output text)
  echo "  Status: $STATUS"
  if [ "$STATUS" = "SUCCEED" ]; then
    echo ""
    echo "=== Deployed successfully ==="
    echo "Live at: https://${APP_ID}.amplifyapp.com"
    exit 0
  elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "CANCELLED" ]; then
    echo "ERROR: Build $STATUS"
    exit 1
  fi
  sleep 10
done
