#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <username>"
  exit 1
fi

AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local aws dynamodb update-item \
  --endpoint-url http://localhost:8000 \
  --region eu-west-2 \
  --table-name User \
  --key "{\"ownerID\": {\"S\": \"None\"}, \"username\": {\"S\": \"$1\"}}" \
  --update-expression "SET admin = :a" \
  --expression-attribute-values '{":a": {"BOOL": true}}'

echo "User '$1' is now an admin."
