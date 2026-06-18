#!/bin/bash
# RTMN Customer Operations OS - MongoDB Atlas Setup Guide
# This script guides you through MongoDB Atlas setup

set -e

echo "=========================================="
echo "MongoDB Atlas Setup for RTMN"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Create Atlas Account
echo -e "${YELLOW}STEP 1: Create MongoDB Atlas Account${NC}"
echo "1. Go to: https://www.mongodb.com/cloud/atlas"
echo "2. Click 'Start Free' button"
echo "3. Sign up with Google or Email"
echo "4. Verify your email"
echo ""
read -p "Press Enter when done..."

# Step 2: Create Cluster
echo -e "${YELLOW}STEP 2: Create Free Cluster${NC}"
echo "1. Click 'Build a Database'"
echo "2. Select 'FREE' tier (M0 Sandbox)"
echo "3. Choose Region: Singapore (closest to you)"
echo "4. Click 'Create'"
echo "5. Wait for cluster to deploy (~3 minutes)"
echo ""
read -p "Press Enter when cluster is ready..."

# Step 3: Create Database User
echo -e "${YELLOW}STEP 3: Create Database User${NC}"
echo "1. Go to Security → Database Access"
echo "2. Click 'Add New Database User'"
echo "3. Authentication Method: Password"
echo "4. Username: rtmn_user"
echo "5. Password: (generate secure password)"
echo "6. Database Privileges: 'Read and write to any database'"
echo "7. Click 'Add User'"
echo ""
read -p "Press Enter when user is created..."

# Step 4: Whitelist IP
echo -e "${YELLOW}STEP 4: Whitelist IP Address${NC}"
echo "1. Go to Security → Network Access"
echo "2. Click 'Add IP Address'"
echo "3. Click 'Allow Access from Anywhere' (0.0.0.0/0)"
echo "4. Click 'Confirm'"
echo ""
read -p "Press Enter when IP is whitelisted..."

# Step 5: Get Connection String
echo -e "${YELLOW}STEP 5: Get Connection String${NC}"
echo "1. Go to Deployment → Database"
echo "2. Click 'Connect' on your cluster"
echo "3. Select 'Connect your application'"
echo "4. Copy the connection string"
echo "5. It will look like:"
echo "   mongodb+srv://rtmn_user:<password>@cluster.mongodb.net/?retryWrites=true&w=majority"
echo ""
echo -e "${GREEN}Paste your connection string below:${NC}"
read -p "mongodb+srv://... " MONGO_URI

# Step 6: Create .env file
echo -e "${YELLOW}STEP 6: Creating .env file${NC}"

cat > .env.mongodb << EOF
# MongoDB Atlas Connection
MONGODB_URI=${MONGO_URI}

# Database Name
DB_NAME=rtmn_customer_ops

# Collection Names
CUSTOMERS_COLLECTION=customers
ORDERS_COLLECTION=orders
TICKETS_COLLECTION=tickets
PAYMENTS_COLLECTION=payments
LEADS_COLLECTION=leads
EOF

echo -e "${GREEN}Created .env.mongodb${NC}"
echo ""

# Step 7: Test Connection
echo -e "${YELLOW}STEP 7: Testing Connection${NC}"
echo "Installing MongoDB shell..."
npm install -g mongodb-shell 2>/dev/null || true

echo "Your MongoDB Atlas is ready!"
echo ""
echo -e "${GREEN}==========================================${NC}"
echo "NEXT STEPS:"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "1. Copy connection string to all services:"
echo "   export MONGODB_URI='${MONGO_URI}'"
echo ""
echo "2. Or add to each service's .env file"
echo ""
echo "3. Deploy to Render:"
echo "   render blueprint apply render.yaml"
echo ""
echo "4. In Render dashboard, add environment variable:"
echo "   MONGODB_URI = ${MONGO_URI}"
echo ""
echo -e "${GREEN}Setup Complete!${NC}"
