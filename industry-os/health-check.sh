#!/bin/bash
#
# RTMN Industry OS - Health Check Script
# Checks status of all running services
#

echo "╔══════════════════════════════════════════════════════════╗"
echo "║         RTMN INDUSTRY OS - HEALTH CHECK              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

SERVICES=(
    "Sales OS:5055"
    "Restaurant OS:5010"
    "Hotel OS:5025"
    "Healthcare OS:5020"
    "Retail OS:5030"
    "Legal OS:5035"
    "Hospitality OS:5050"
    "Education OS:5060"
    "Agriculture OS:5070"
    "Automotive OS:5080"
    "Beauty OS:5090"
    "Fashion OS:5095"
    "Energy OS:5100"
    "Fitness OS:5110"
    "Gaming OS:5120"
    "Government OS:5130"
    "Home Services OS:5140"
    "Manufacturing OS:5150"
    "Non-Profit OS:5160"
    "Professional OS:5170"
    "Sports OS:5180"
    "Travel OS:5190"
    "Entertainment OS:5200"
    "Construction OS:5210"
    "Financial OS:5220"
    "Real Estate OS:5230"
    "Transport OS:5240"
    "Media OS:5600"
    "Service Registry:4399"
    "Event Bus:4510"
)

healthy=0
unhealthy=0

for svc in "${SERVICES[@]}"; do
    name="${svc%:*}"
    port="${svc#*:}"

    response=$(curl -s -w "\n%{http_code}" "http://localhost:$port/health" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "200" ]; then
        version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        echo -e "✓ \033[0;32m$name\033[0m (port $port) - v$version"
        ((healthy++))
    else
        echo -e "✗ \033[0;31m$name\033[0m (port $port) - unreachable"
        ((unhealthy++))
    fi
done

echo ""
echo "══════════════════════════════════════════════════════════"
echo " Total: $((healthy + unhealthy)) | Healthy: $healthy | Unhealthy: $unhealthy"
echo "══════════════════════════════════════════════════════════"
