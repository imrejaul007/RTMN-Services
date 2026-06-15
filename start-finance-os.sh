#!/bin/bash

# ============================================
# HOJAI FinanceOS Startup Script
# Starts all 14 FinanceOS services
# ============================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "============================================"
echo "   HOJAI FinanceOS Startup"
echo "   14 Services - Ports 4900-4906, 5220, 5250-5290"
echo "============================================"
echo ""

# Base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Track PIDs
declare -a PIDS
declare -a SERVICES

# Function to start a service
start_service() {
    local service_name=$1
    local service_path=$2
    local port=$3
    local build_cmd=$4
    local start_cmd=$5

    echo -e "${YELLOW}Starting ${service_name} on port ${port}...${NC}"

    # Check if directory exists
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}  ✗ Directory not found: $service_path${NC}"
        return 1
    fi

    cd "$service_path"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "  Installing dependencies..."
        npm install 2>/dev/null
        if [ $? -ne 0 ]; then
            echo -e "${RED}  ✗ Failed to install dependencies${NC}"
            return 1
        fi
    fi

    # Build if TypeScript
    if [ -f "tsconfig.json" ]; then
        echo "  Building TypeScript..."
        npm run build 2>/dev/null
    fi

    # Start service in background
    eval "$start_cmd" &
    local pid=$!
    PIDS+=($pid)
    SERVICES+=("$service_name:$port:$pid")

    cd "$SCRIPT_DIR"
    echo -e "${GREEN}  ✓ ${service_name} started (PID: $pid)${NC}"
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down FinanceOS services...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 $pid 2>/dev/null; then
            kill $pid 2>/dev/null
            echo "  Stopped PID $pid"
        fi
    done
    exit 0
}

# Trap signals
trap cleanup SIGINT SIGTERM

# ============================================
# FINANCE AI AGENTS (Ports 4900-4906)
# ============================================

echo ""
echo "============================================"
echo "   Finance AI Agents (4900-4906)"
echo "============================================"

# Finance CFO AI
start_service "Finance CFO AI" "companies/hojai-ai/finance-cfo" 4900 "npm install" "node src/index.js"

# Finance Accountant
start_service "Finance Accountant" "companies/hojai-ai/finance-accountant" 4901 "npm install" "node src/index.js"

# Finance Compliance
start_service "Finance Compliance" "companies/hojai-ai/finance-compliance" 4902 "npm install" "node src/index.js"

# Finance Auditor
start_service "Finance Auditor" "companies/hojai-ai/finance-auditor" 4903 "npm install" "node src/index.js"

# Finance Collections
start_service "Finance Collections" "companies/hojai-ai/finance-collections" 4904 "npm install" "node src/index.js"

# Finance Payables
start_service "Finance Payables" "companies/hojai-ai/finance-payables" 4905 "npm install" "node src/index.js"

# Finance Budget Coach
start_service "Finance Budget Coach" "companies/hojai-ai/finance-budget-coach" 4906 "npm install" "node src/index.js"

# ============================================
# FINANCIAL OS (Port 5220)
# ============================================

echo ""
echo "============================================"
echo "   Financial OS (5220)"
echo "============================================"

start_service "Financial OS" "industry-os/services/financial-os" 5220 "npm install" "node src/index.js"

# ============================================
# FINANCE OS SUITE (Ports 5250-5290)
# ============================================

echo ""
echo "============================================"
echo "   FinanceOS Suite (5250-5290)"
echo "============================================"

# ExpenseOS
start_service "ExpenseOS" "companies/hojai-ai/services/expense-os" 5250 "npm install && npm run build" "npm start"

# Approval Workflow
start_service "Approval Workflow" "companies/hojai-ai/services/approval-workflow" 5255 "npm install && npm run build" "npm start"

# Reimbursement OS
start_service "Reimbursement OS" "companies/hojai-ai/services/reimbursement-os" 5260 "npm install && npm run build" "npm start"

# Finance Twin Hub
start_service "Finance Twin Hub" "companies/hojai-ai/services/finance-twin-hub" 5270 "npm install && npm run build" "npm start"

# Spend Intelligence
start_service "Spend Intelligence" "companies/hojai-ai/services/spend-intelligence" 5280 "npm install && npm run build" "npm start"

# Corporate Card OS
start_service "Corporate Card OS" "companies/hojai-ai/services/corporate-card-os" 5290 "npm install && npm run build" "npm start"

# ============================================
# SUMMARY
# ============================================

echo ""
echo "============================================"
echo "   FinanceOS Started Successfully!"
echo "============================================"
echo ""
echo "Finance AI Agents (4900-4906):"
echo "  4900 - Finance CFO AI"
echo "  4901 - Finance Accountant"
echo "  4902 - Finance Compliance"
echo "  4903 - Finance Auditor"
echo "  4904 - Finance Collections"
echo "  4905 - Finance Payables"
echo "  4906 - Finance Budget Coach"
echo ""
echo "Core Accounting:"
echo "  5220 - Financial OS"
echo ""
echo "FinanceOS Suite (5250-5290):"
echo "  5250 - ExpenseOS"
echo "  5251 - Approval Workflow"
echo "  5260 - Reimbursement OS"
echo "  5270 - Finance Twin Hub"
echo "  5280 - Spend Intelligence"
echo "  5290 - Corporate Card OS"
echo ""
echo "Health Checks:"
echo "  curl http://localhost:4900/health"
echo "  curl http://localhost:5250/health"
echo "  curl http://localhost:5270/health"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all processes
wait
