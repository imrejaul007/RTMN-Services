#!/bin/bash
# ============================================================
# Connector Ecosystem - Startup Script
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
PLATFORM_DIR="$BASE_DIR/platform"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Connector Ecosystem - Startup Script            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

start_service() {
    local name=$1
    local dir=$2
    local port=$3
    echo -e "${YELLOW}Starting ${name} on port ${port}...${NC}"
    if [ -d "$dir" ]; then
        cd "$dir"
        if [ -f "package.json" ]; then
            if [ ! -d "node_modules" ]; then
                npm install 2>/dev/null || true
            fi
            npm run dev > /dev/null 2>&1 &
            echo -e "  ${GREEN}✓ ${name} started${NC}"
        fi
    fi
    cd "$PLATFORM_DIR"
}

echo -e "${GREEN}Starting all connectors...${NC}"
echo ""

# Communication Connectors
echo -e "${BLUE}═══ Communication ═══${NC}"
start_service "Slack Connector" "$PLATFORM_DIR/connectors/slack-connector" "4790"
start_service "Teams Connector" "$PLATFORM_DIR/connectors/teams-connector" "4781"
start_service "Zoom Connector" "$PLATFORM_DIR/connectors/zoom-connector" "4782"
start_service "Gmail Connector" "$PLATFORM_DIR/connectors/gmail-connector" "4792"

echo ""

# CRM Connectors
echo -e "${BLUE}═══ CRM ═══${NC}"
start_service "Salesforce Connector" "$PLATFORM_DIR/connectors/salesforce-connector" "4786"
start_service "HubSpot Connector" "$PLATFORM_DIR/connectors/hubspot-connector" "4780"
start_service "Zoho Connector" "$PLATFORM_DIR/connectors/zoho-connector" "4784"
start_service "Freshworks Connector" "$PLATFORM_DIR/connectors/freshworks-connector" "4801"
start_service "Freshdesk Connector" "$PLATFORM_DIR/connectors/freshdesk-connector" "4802"

echo ""

# Project Management Connectors
echo -e "${BLUE}═══ Project Management ═══${NC}"
start_service "Jira Connector" "$PLATFORM_DIR/connectors/jira-connector" "4793"
start_service "Linear Connector" "$PLATFORM_DIR/connectors/linear-connector" "4798"
start_service "Asana Connector" "$PLATFORM_DIR/connectors/asana-connector" "4799"
start_service "Notion Connector" "$PLATFORM_DIR/connectors/notion-connector" "4794"

echo ""

# Finance Connectors
echo -e "${BLUE}═══ Finance ═══${NC}"
start_service "QuickBooks Connector" "$PLATFORM_DIR/connectors/quickbooks-connector" "4783"
start_service "Stripe Connector" "$PLATFORM_DIR/connectors/stripe-connector" "4788"

echo ""

# Enterprise ERP Connectors
echo -e "${BLUE}═══ Enterprise ERP ═══${NC}"
start_service "SAP Connector" "$PLATFORM_DIR/connectors/sap-connector" "4796"
start_service "Oracle Connector" "$PLATFORM_DIR/connectors/oracle-connector" "4797"

echo ""

# Commerce Connectors
echo -e "${BLUE}═══ Commerce ═══${NC}"
start_service "Shopify Connector" "$PLATFORM_DIR/connectors/shopify-connector" "4787"

echo ""

# Calendar Connector
echo -e "${BLUE}═══ Calendar ═══${NC}"
start_service "Calendar Connector" "$PLATFORM_DIR/connectors/calendar-connector" "4795"

echo ""

# Customer Messaging
echo -e "${BLUE}═══ Customer Messaging ═══${NC}"
start_service "Intercom Connector" "$PLATFORM_DIR/connectors/intercom-connector" "4803"

echo ""

# Infrastructure
echo -e "${BLUE}═══ Infrastructure ═══${NC}"
start_service "Connector Registry" "$PLATFORM_DIR/connectors/connector-registry" "4753"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        All Connectors Started                              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Run ${YELLOW}curl http://localhost:4753/api/connectors${NC} to list all connectors"
echo ""
