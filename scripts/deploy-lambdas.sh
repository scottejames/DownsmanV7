#!/bin/bash
# Build, deploy, and wire the Cognito trigger Lambdas for one environment.
#
# Prerequisites (not done by this script - see DEPLOYMENT.md "Cognito" section):
#   - A Cognito user pool for this env (scripts/create-cognito-pool.js)
#   - An IAM role for the Lambdas to run as, with dynamodb:GetItem+Scan on
#     the User table and cognito-idp:Admin* perms scoped to that pool - pass
#     its ARN via ROLE_ARN.
#
# Usage: ROLE_ARN=arn:aws:iam::...:role/NewDownsmanCognitoTriggersRole-dev \
#        ./scripts/deploy-lambdas.sh dev eu-west-2_XXXXXXXXX
set -euo pipefail
cd "$(dirname "$0")/.."

ENV=${1:?"Usage: ROLE_ARN=... $0 <dev|prod> <user-pool-id>"}
POOL_ID=${2:?"Usage: ROLE_ARN=... $0 <dev|prod> <user-pool-id>"}
REGION=eu-west-2
ROLE_ARN=${ROLE_ARN:?"Set ROLE_ARN to the Lambda execution role ARN"}
USER_TABLE_NAME=${USER_TABLE_NAME:-User}

deploy_one() {
  local name=$1 dir=$2
  local fn="downsman-${name}-${ENV}"

  echo "Building $fn..." >&2
  (cd "$dir" && npm install --omit=dev --no-audit --no-fund >/dev/null)
  (cd "$dir" && zip -r -q /tmp/"$fn".zip . -x '*.zip')

  if aws lambda get-function --function-name "$fn" --region "$REGION" >/dev/null 2>&1; then
    aws lambda update-function-code --function-name "$fn" --region "$REGION" \
      --zip-file fileb:///tmp/"$fn".zip >/dev/null
    aws lambda wait function-updated --function-name "$fn" --region "$REGION"
    aws lambda update-function-configuration --function-name "$fn" --region "$REGION" \
      --environment "Variables={USER_TABLE_NAME=$USER_TABLE_NAME}" >/dev/null
  else
    aws lambda create-function --function-name "$fn" --region "$REGION" \
      --runtime nodejs20.x --handler index.handler --role "$ROLE_ARN" \
      --timeout 10 --zip-file fileb:///tmp/"$fn".zip \
      --environment "Variables={USER_TABLE_NAME=$USER_TABLE_NAME}" >/dev/null
  fi
  echo "Deployed $fn" >&2

  aws lambda add-permission --function-name "$fn" --region "$REGION" \
    --statement-id "cognito-invoke-$ENV" --action lambda:InvokeFunction \
    --principal cognito-idp.amazonaws.com \
    --source-arn "arn:aws:cognito-idp:${REGION}:$(aws sts get-caller-identity --query Account --output text):userpool/${POOL_ID}" \
    >/dev/null 2>&1 || echo "  (invoke permission already present)" >&2

  aws lambda get-function --function-name "$fn" --region "$REGION" --query 'Configuration.FunctionArn' --output text
}

MIGRATE_ARN=$(deploy_one cognito-migrate-user lambda/cognito-migrate-user)
POST_AUTH_ARN=$(deploy_one cognito-post-auth lambda/cognito-post-auth)

echo "Wiring triggers on pool $POOL_ID..."
aws cognito-idp update-user-pool --user-pool-id "$POOL_ID" --region "$REGION" \
  --lambda-config "UserMigration=${MIGRATE_ARN},PostAuthentication=${POST_AUTH_ARN}" >/dev/null

echo "Done. Triggers wired: UserMigration -> $MIGRATE_ARN, PostAuthentication -> $POST_AUTH_ARN"
