#!/bin/bash
# =============================================================================
# Hojai WhatsApp AI - Railway Deployment
# =============================================================================

set -e

echo "Deploying to Railway..."

# Build and push
railway build

# Deploy
railway deploy

# Get URL
URL=$(railway variables | grep PUBLIC_DOMAIN | awk '{print $2}')
echo "Deployed to: $URL"

# Verify
curl -f "$URL/health" && echo "✓ Health check passed" || echo "✗ Health check failed"
