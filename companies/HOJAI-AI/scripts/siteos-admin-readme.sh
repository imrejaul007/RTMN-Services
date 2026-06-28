#!/bin/bash
# HOJAI SiteOS — One-line startup
# Installs all services and starts the platform

BASE="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI"
cd "$BASE/products"

echo "🚀 Installing all SiteOS services..."
for svc in siteos-gateway business-context-wrapper channel-stitcher event-tracker heatmap-aggregator vertical-templates review-scrapers lookalike-generator lead-scoring marketing-automation customer-twin-full event-taxonomy workflow-visual-builder voice-widget crm-connectors knowledge-base ab-testing product-federation agent-protocol do-app-integration agent-reputation ai-business-advisor campaign-auto-creation dynamic-pricing benchmark-database; do
  [ -d "$svc" ] && npm install --prefix "$svc" 2>/dev/null &
done

wait
echo "✅ All services installed"

echo "🚀 Starting all services..."
for svc in siteos-gateway business-context-wrapper channel-stitcher event-tracker heatmap-aggregator vertical-templates review-scrapers lookalike-generator lead-scoring marketing-automation customer-twin-full event-taxonomy workflow-visual-builder voice-widget crm-connectors knowledge-base ab-testing product-federation agent-protocol do-app-integration agent-reputation ai-business-advisor campaign-auto-creation dynamic-pricing benchmark-database; do
  [ -f "$svc/package.json" ] && (npm start --prefix "$svc" &)
done

echo "✅ All services started"
echo "📊 Dashboard: http://localhost:5450/admin"
