#!/bin/bash
# Back up production DynamoDB tables to backups/dynamodb/<timestamp>/
# Never overwrites an existing backup.
set -e
cd "$(dirname "$0")/.."

REGION=eu-west-2
TABLES="User Team Scouts Support Log"
TS=$(date +%Y%m%d-%H%M%S)
DEST="backups/dynamodb/$TS"

if [ -e "$DEST" ]; then
  echo "Backup dir $DEST already exists, aborting to avoid overwrite." >&2
  exit 1
fi

mkdir -p "$DEST"

for T in $TABLES; do
  OUT="$DEST/${T}.json"
  if [ -e "$OUT" ]; then
    echo "$OUT already exists, aborting to avoid overwrite." >&2
    exit 1
  fi
  aws dynamodb scan --table-name "$T" --region "$REGION" --output json > "$OUT"
  COUNT=$(python3 -c "import json;print(json.load(open('$OUT'))['Count'])")
  echo "$T: $COUNT items backed up"
done

echo "Backup complete: $DEST"
