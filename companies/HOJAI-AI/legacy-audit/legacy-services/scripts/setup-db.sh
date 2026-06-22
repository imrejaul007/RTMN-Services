#!/bin/bash
# Setup MongoDB indexes
# Usage: ./scripts/setup-db.sh

MONGODB_URI=${MONGODB_URI:-mongodb://localhost:27017/hojai-whatsapp}

echo "Setting up MongoDB indexes..."

mongosh "$MONGODB_URI" --eval '
  db.merchants.createIndex({ tenantId: 1 }, { unique: true });
  db.conversations.createIndex({ tenantId: 1, merchantId: 1 });
  db.conversations.createIndex({ merchantId: 1, createdAt: -1 });
  db.knowledgebase.createIndex({ merchantId: 1, active: 1 });
  db.sessions.createIndex({ merchantId: 1, customerId: 1 });
  db.subscriptions.createIndex({ tenantId: 1, status: 1 });
  print("Indexes created");
'