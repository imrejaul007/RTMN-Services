# Connector Ecosystem

> **Version:** 1.0.0
> **Date:** June 26, 2026
> **Status:** ✅ Complete

Complete connector ecosystem for integrating with external software tools and services.

---

## 📋 Connector Inventory

### Communication

| Connector | Port | API Required | Status |
|-----------|------|--------------|--------|
| Slack | 4790 | SLACK_BOT_TOKEN | ✅ |
| Microsoft Teams | 4781 | TEAMS_CLIENT_ID | ✅ |
| Zoom | 4782 | ZOOM_JWT_TOKEN | ✅ |
| Gmail | 4792 | GMAIL_CLIENT_ID | ✅ |

### CRM

| Connector | Port | API Required | Status |
|-----------|------|--------------|--------|
| Salesforce | 4786 | SF_CLIENT_ID | ✅ |
| HubSpot | 4780 | HUBSPOT_API_KEY | ✅ |
| Zoho CRM | 4784 | ZOHO_CLIENT_ID | ✅ |
| Freshworks | 4801 | FRESHSALES_API_KEY | ✅ |
| Freshdesk | 4802 | FRESHDESK_API_KEY | ✅ |
| Intercom | 4803 | INTERCOM_ACCESS_TOKEN | ✅ |

### Project Management

| Connector | Port | API Required | Status |
|-----------|------|--------------|--------|
| Jira | 4793 | JIRA_URL | ✅ |
| Linear | 4798 | LINEAR_API_KEY | ✅ |
| Asana | 4799 | ASANA_ACCESS_TOKEN | ✅ |
| Notion | 4794 | NOTION_TOKEN | ✅ |

### Finance

| Connector | Port | API Required | Status |
|-----------|------|--------------|--------|
| QuickBooks | 4783 | QUICKBOOKS_CLIENT_ID | ✅ |
| Stripe | 4788 | STRIPE_SECRET_KEY | ✅ |

### Enterprise ERP

| Connector | Port | API Required | Status |
|-----------|------|--------------|--------|
| SAP | 4796 | SAP_HOST | ✅ |
| Oracle | 4797 | ORACLE_CLIENT_ID | ✅ |

### Commerce

| Connector | Port | API Required | Status |
|-----------|------|--------------|--------|
| Shopify | 4787 | SHOPIFY_ACCESS_TOKEN | ✅ |

### Productivity

| Connector | Port | API Required | Status |
|-----------|------|--------------|--------|
| Calendar | 4795 | GOOGLE_CALENDAR_ID | ✅ |

---

## 🚀 Quick Start

```bash
# Start all connectors
bash scripts/start-connectors.sh

# List all connectors
curl http://localhost:4753/api/connectors

# Check health
curl http://localhost:4753/api/health/connectors

# Find connectors by capability
curl http://localhost:4753/api/capabilities/messages/connectors
```

---

## 🔌 Common API Patterns

### Slack

```bash
# Post message
curl -X POST http://localhost:4790/api/channels/C001/messages \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from Twin!"}'

# Get messages
curl http://localhost:4790/api/channels/C001/messages
```

### GitHub

```bash
# Create issue
curl -X POST http://localhost:4791/api/repos/owner/repo/issues \
  -H "Content-Type: application/json" \
  -d '{"title": "Bug fix needed", "labels": ["bug"]}'

# List PRs
curl http://localhost:4791/api/repos/owner/repo/pulls
```

### CRM Connectors

```bash
# HubSpot - Create contact
curl -X POST http://localhost:4780/api/contacts \
  -d '{"email": "john@example.com", "firstname": "John"}'

# Salesforce - Create lead
curl -X POST http://localhost:4786/api/leads \
  -d '{"email": "jane@example.com"}'
```

### Finance

```bash
# Stripe - Create customer
curl -X POST http://localhost:4788/api/customers \
  -d '{"email": "customer@example.com", "name": "Customer"}'

# QuickBooks - Create invoice
curl -X POST http://localhost:4783/api/invoices \
  -d '{"customer": "Acme Corp", "amount": 1000}'
```

---

## 🔍 Capability Search

The Connector Registry (4753) provides capability-based search:

```bash
# Find all connectors that support messages
curl http://localhost:4753/api/capabilities/messages/connectors

# Find all connectors for CRM
curl http://localhost:4753/api/connectors?category=crm

# Find connectors by search term
curl http://localhost:4753/api/connectors?search=email
```

---

## 📡 Observer Events

All connectors provide events for the Twin Observer:

```bash
# Get events for a user from any connector
curl http://localhost:4753/api/connectors/slack/observer/events/user123

# Health check all connectors
curl http://localhost:4753/api/health/connectors
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Twin Observer (4747)                     │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│              Connector Registry (4753)                    │
│  • 20+ Connectors                                      │
│  • Capability Search                                    │
│  • Health Monitoring                                   │
└─────────────────────────────────────────────────────────┘
                              │
    ┌──────────┬──────────┬──────────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Slack  │ │ GitHub │ │ Gmail  │ │ Jira   │ │ HubSpot│ │ Stripe │
│ 4790   │ │ 4791   │ │ 4792   │ │ 4793   │ │ 4780   │ │ 4788   │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

---

## 🔐 Authentication

Each connector supports different auth methods:

| Auth Type | Connectors |
|-----------|-----------|
| OAuth2 | Slack, GitHub, Gmail, Teams, Zoom, HubSpot, Stripe |
| API Key | Jira, QuickBooks, Stripe |
| Basic | Custom ERP systems |

Set credentials via environment variables:

```bash
export SLACK_BOT_TOKEN=xoxb-...
export GITHUB_TOKEN=ghp_...
export STRIPE_SECRET_KEY=sk_...
```

---

## 📁 Project Structure

```
platform/connectors/
├── connector-registry/    # Central registry (4753)
├── slack-connector/      # Slack (4790)
├── github-connector/     # GitHub (4791)
├── gmail-connector/      # Gmail (4792)
├── jira-connector/       # Jira (4793)
├── notion-connector/     # Notion (4794)
├── calendar-connector/    # Calendar (4795)
├── hubspot-connector/     # HubSpot (4780)
├── teams-connector/      # Teams (4781)
├── zoom-connector/        # Zoom (4782)
├── quickbooks-connector/  # QuickBooks (4783)
├── zoho-connector/        # Zoho (4784)
├── salesforce-connector/  # Salesforce (4786)
├── shopify-connector/     # Shopify (4787)
├── stripe-connector/      # Stripe (4788)
├── sap-connector/         # SAP (4796)
├── oracle-connector/      # Oracle (4797)
├── linear-connector/      # Linear (4798)
├── asana-connector/      # Asana (4799)
├── freshworks-connector/  # Freshsales (4801)
├── freshdesk-connector/   # Freshdesk (4802)
└── intercom-connector/    # Intercom (4803)
```

---

## 🚢 Deployment

```bash
# Start all connectors
bash scripts/start-connectors.sh

# Or with Docker Compose
docker-compose -f docker-compose.connectors.yml up -d
```

---

**Last Updated:** June 26, 2026
