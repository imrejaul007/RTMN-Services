#!/bin/bash
# =============================================================================
# Hojai WhatsApp AI - Vercel Deployment
# =============================================================================

set -e

echo "Deploying frontend to Vercel..."

# Deploy dashboard
cd products/hojai-whatsapp-ai/dashboard
vercel --prod

# Get URL
echo "Frontend deployed!"
