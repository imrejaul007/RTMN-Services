#!/bin/bash
# HOJAI AI - REZ Merchant Migration
# Migrate REZ Merchant services to Hojai Platforms

set -e

echo "=========================================="
echo "REZ Merchant Migration to Hojai"
echo "=========================================="
echo ""

TENANT="${1:-merchant_test}"
TENANT_ID="merchant_${TENANT}"

echo "Tenant: $TENANT_ID"
echo ""

# Step 1: Create Merchant
echo "Step 1: Create Merchant..."
curl -X POST http://localhost:4590/api/merchants \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Merchant",
    "type": "retailer",
    "business_category": "jewellery",
    "phone": "+919876543210",
    "email": "owner@merchant.com"
  }'

echo ""
echo "Step 2: Create Customer..."
curl -X POST http://localhost:4590/api/customers \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "phone": "+919876543211"
  }'

echo ""
echo "Step 3: Create Order..."
curl -X POST http://localhost:4560/api/workflows \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Order Workflow",
    "type": "automation"
  }'

echo ""
echo "Step 4: Create Support Agent..."
curl -X POST http://localhost:4550/api/agents \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support Bot",
    "type": "support"
  }'

echo ""
echo "=========================================="
echo "Migration Complete!"
echo "=========================================="
