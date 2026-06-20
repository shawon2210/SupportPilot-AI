#!/bin/bash
# SupportPilot AI — Railway Deployment Script
# Usage: RAILWAY_TOKEN=<personal-token> ./deploy.sh

set -e

PROJECT_ID="81cba11d-4508-4678-a1c3-c745bd487e2b"
SERVICE_ID="2801521c-4a4e-41fd-a6d3-01795d68a9ad"

if [ -z "$RAILWAY_TOKEN" ]; then
  echo "ERROR: Set RAILWAY_TOKEN=<personal-token>"
  echo "Get one at: https://railway.com/account/tokens"
  exit 1
fi

echo "=== SupportPilot AI — Railway Deployment ==="
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_ID"

# Step 1: Verify token works
echo ""
echo "[1/5] Verifying token..."
curl -s -H "Authorization: Bearer $RAILWAY_TOKEN" \
  "https://backboard.railway.com/graphql/v2" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ me { email } }"}' | head -5

echo ""
echo "[2/5] Deployment would proceed here..."
echo "The Railway CLI needs to be authenticated from Windows to run this."
echo ""
echo "Please run from Windows PowerShell:"
echo '  & "$env:USERPROFILE\.railway\bin\railway" login'
echo ""
echo "Then run: railway up --service $SERVICE_ID"
