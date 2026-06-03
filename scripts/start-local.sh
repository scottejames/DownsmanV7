#!/bin/bash

set -e
export DM_DEV=true

cd "$(dirname "$0")/.."

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Create .env.local if missing
if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  echo "Created .env.local from .env.example"
fi

# Start DynamoDB if not already running
if ! curl -s http://localhost:8000 > /dev/null 2>&1; then
  echo "Starting local DynamoDB..."
  mkdir -p ~/tmp/data
  docker run -d --name downsman-dynamo -v ~/tmp/data:/data:z -p 8000:8000 \
    amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -dbPath /data
  sleep 2
  echo "DynamoDB started."
else
  echo "DynamoDB already running on port 8000."
fi

# Create tables if they don't exist
echo "Ensuring tables exist..."
node scripts/create-tables.js

# Start the app
echo "Starting Downsman on http://localhost:3000"
npm run dev
