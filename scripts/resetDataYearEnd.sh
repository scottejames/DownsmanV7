#!/bin/bash
# Year-end data reset.
#
# Wipes every item from Team, Scouts, Support, Log, and wipes User except
# the KEEP_USERNAME record (so you can still log in afterwards).
#
# Refuses to run unless a backup (scripts/backup-dynamo.sh) exists in
# BACKUP_ROOT that is no older than MAX_AGE_HOURS and contains all five
# table dumps.
set -euo pipefail
cd "$(dirname "$0")/.."

REGION=eu-west-2
BACKUP_ROOT=${BACKUP_ROOT:-backups/dynamodb}
MAX_AGE_HOURS=${MAX_AGE_HOURS:-24}
KEEP_USERNAME=scott

LATEST=$(ls -1 "$BACKUP_ROOT" 2>/dev/null | sort | tail -n1 || true)
if [ -z "$LATEST" ]; then
  echo "No backups found in $BACKUP_ROOT/. Run scripts/backup-dynamo.sh first. Aborting." >&2
  exit 1
fi
LATEST_PATH="$BACKUP_ROOT/$LATEST"

LATEST_EPOCH=$(date -d "${LATEST:0:4}-${LATEST:4:2}-${LATEST:6:2} ${LATEST:9:2}:${LATEST:11:2}:${LATEST:13:2}" +%s 2>/dev/null) || {
  echo "Could not parse timestamp from backup dir name '$LATEST'. Aborting." >&2
  exit 1
}
AGE_HOURS=$(( ($(date +%s) - LATEST_EPOCH) / 3600 ))

if [ "$AGE_HOURS" -gt "$MAX_AGE_HOURS" ]; then
  echo "Most recent backup ($LATEST) is ${AGE_HOURS}h old, older than the ${MAX_AGE_HOURS}h limit." >&2
  echo "Run scripts/backup-dynamo.sh first, then retry. Aborting." >&2
  exit 1
fi

for T in User Team Scouts Support Log; do
  if [ ! -s "$LATEST_PATH/$T.json" ]; then
    echo "Backup $LATEST_PATH is missing or has an empty ${T}.json. Aborting." >&2
    exit 1
  fi
done

echo "Recent backup OK: $LATEST_PATH (${AGE_HOURS}h old)"

if [ "${1:-}" != "--yes" ]; then
  echo
  echo "This will PERMANENTLY DELETE:"
  echo "  - every item in Team, Scouts, Support, Log"
  echo "  - every item in User except username='$KEEP_USERNAME'"
  read -r -p "Type RESET to continue: " CONFIRM
  if [ "$CONFIRM" != "RESET" ]; then
    echo "Aborted."
    exit 1
  fi
fi

wipe_table() {
  local table=$1
  aws dynamodb scan --table-name "$table" --region "$REGION" \
    --projection-expression "ownerID, id" --output json \
    | jq -c '.Items[]' \
    | while read -r item; do
        aws dynamodb delete-item --table-name "$table" --region "$REGION" --key "$item" >/dev/null
      done
  local remaining
  remaining=$(aws dynamodb scan --table-name "$table" --region "$REGION" --select COUNT --output json | jq '.Count')
  echo "$table: cleared (remaining items: $remaining)"
}

for T in Team Scouts Support Log; do
  echo "Clearing $T..."
  wipe_table "$T"
done

echo "Clearing User (keeping '$KEEP_USERNAME')..."
aws dynamodb scan --table-name User --region "$REGION" \
  --projection-expression "ownerID, username" --output json \
  | jq -c --arg keep "$KEEP_USERNAME" '.Items[] | select(.username.S != $keep)' \
  | while read -r item; do
      aws dynamodb delete-item --table-name User --region "$REGION" --key "$item" >/dev/null
    done
REMAINING=$(aws dynamodb scan --table-name User --region "$REGION" --select COUNT --output json | jq '.Count')
echo "User: cleared except '$KEEP_USERNAME' (remaining items: $REMAINING)"

echo "Year-end reset complete."
