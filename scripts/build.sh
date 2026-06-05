#!/bin/bash
# Build NewDownsman locally (production build)
set -e
cd "$(dirname "$0")/.."
npm ci
npm run build
echo "Build complete. Output in .next/"
