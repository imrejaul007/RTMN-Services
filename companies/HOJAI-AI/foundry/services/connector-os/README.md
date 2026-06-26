# ConnectorOS — Enterprise Integration Layer

**Port:** 4585
**Purpose:** Connects AI workers to 38+ real-world business systems

---

## Overview

ConnectorOS is the critical missing piece that makes AI workers actually useful. Without integrations, AI workers are isolated. With ConnectorOS, they connect to the tools businesses already use.

---

## Available Connectors (38 Total)

### CRM (5)
| Connector | Auth | Capabilities |
|------------|------|--------------|
| HubSpot | OAuth2 | Contacts, deals, tasks, email, sequences |
| Salesforce | OAuth2 | Leads, opportunities, accounts, cases, reports |
| Pipedrive | API Key | Deals, persons, organizations, activities |
| Zoho CRM | OAuth2 | Leads, deals, contacts, tasks |
| HubSpot Free | API Key | Contacts, deals, tasks |

### Payments (6)
| Connector | Auth | Capabilities |
|------------|------|--------------|
| Stripe | API Key | Payments, subscriptions, invoicing, Connect |
| Razorpay | API Key | Payments, refunds, settlements, UPI |
| PayPal | OAuth2 | Payments, payouts, subscriptions |
| Square | OAuth2 | Payments, invoices, customers |
| PhonePe | API Key | Payments, refunds |
| Cashfree | API Key | Payments, payouts, vendor payments |

### Commerce (5)
| Connector | Auth | Capabilities |
|------------|------|--------------|
| Shopify | OAuth2 | Products, orders, customers, inventory |
| WooCommerce | OAuth2 | Products, orders, customers, coupons |
| Magento | OAuth2 | Products, orders, inventory |
| BigCommerce | OAuth2 | Products, orders, customers |
| Magento 2 | API Key | Products, orders, customers |

### Email (6)
| Connector | Auth | Capabilities |
|------------|------|--------------|
| Gmail | OAuth2 | Send, read, drafts, labels |
| SendGrid | API Key | Send, templates, campaigns, analytics |
| Mailchimp | API Key | Campaigns, lists, automation |
| Amazon SES | AWS v4 | Send, templates, statistics |
| Brevo | API Key | Email, SMS, CRM |
| Resend | API Key | Send, domains, audiences |

### Calendar (4)
| Connector | Auth | Capabilities |
|------------|------|--------------|
| Google Calendar | OAuth2 | Events, calendars, availability |
| Microsoft Outlook | OAuth2 | Events, calendars, rooms |
| Calendly | API Key | Scheduling, events, webhooks |
| Cal.com | API Key | Scheduling, bookings, teams |

### Storage (4)
| Connector | Auth | Capabilities |
|------------|------|--------------|
| Google Drive | OAuth2 | Files, folders, sharing |
| Dropbox | OAuth2 | Files, folders, sharing |
| Amazon S3 | AWS v4 | Buckets, objects, presigned URLs |
| OneDrive | OAuth2 | Files, folders, sharing |

### Chat (6)
| Connector | Auth | Capabilities |
|------------|------|--------------|
| Slack | OAuth2 | Channels, messages, files, workflows |
| Microsoft Teams | OAuth2 | Channels, messages, meetings |
| Discord | Bot Token | Channels, messages, webhooks |
| WhatsApp Business | API Key | Messages, templates, media |
| Intercom | API Key | Conversations, users, articles |
| Twilio | API Key | SMS, WhatsApp, Voice, Verify |

### Accounting (5)
| Connector | Auth | Capabilities |
|------------|------|--------------|
| QuickBooks | OAuth2 | Invoices, customers, vendors, reports |
| Xero | OAuth2 | Invoices, contacts, bank, reports |
| TallyPrime | XML API | Vouchers, masters, reports, GST |
| Zoho Books | OAuth2 | Invoices, contacts, inventory |
| FreshBooks | OAuth2 | Invoices, clients, expenses |

### HR (5)
| Connector | Auth | Capabilities |
|------------|------|--------------|
| BambooHR | API Key | Employees, time-off, jobs |
| Workday | OAuth2 | Employees, payroll, benefits |
| Gusto | OAuth2 | Employees, payroll, time-tracking |
| Rippling | OAuth2 | Employees, payroll, devices, apps |
| Zoho People | OAuth2 | Employees, attendance, leave |

### Project Management (6)
| Connector | Auth | Capabilities |
|------------|------|--------------|
| Jira | OAuth2 | Issues, projects, boards, sprints |
| Asana | OAuth2 | Projects, tasks, subtasks, teams |
| Monday.com | API Key | Boards, items, groups, updates |
| Linear | API Key | Issues, projects, teams, cycles |
| Notion | OAuth2 | Pages, databases, blocks, comments |
| Trello | API Key | Boards, lists, cards, checklists |

---

## API Endpoints

### Connection Management
```
GET  /api/connectors           - List all connectors
GET  /api/connectors/:category  - List connectors by category
POST /api/connections           - Create connection
GET  /api/connections           - List all connections
GET  /api/connections/:id       - Get connection details
DELETE /api/connections/:id     - Delete connection
POST /api/connections/:id/sync  - Trigger sync
```

### Webhooks
```
POST /api/webhooks             - Create webhook
GET  /api/webhooks             - List webhooks
DELETE /api/webhooks/:id       - Delete webhook
```

### AI Worker Integration
```
POST /api/ai/query             - AI query across connected systems
POST /api/ai/action            - Execute action via connector
GET  /api/ai/actions/:connectorId - List available actions
```

---

## Example Usage

### Connect HubSpot
```bash
curl -X POST http://localhost:4585/api/connections \
  -H 'Content-Type: application/json' \
  -d '{
    "connectorId": "hubspot",
    "credentials": {
      "accessToken": "pat-na1-xxx"
    }
  }'
```

### AI Query
```bash
curl -X POST http://localhost:4585/api/ai/query \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "Find all customers who have not purchased in 30 days",
    "context": {"department": "sales"}
  }'
```

### Execute Action
```bash
curl -X POST http://localhost:4585/api/ai/action \
  -H 'Content-Type: application/json' \
  -d '{
    "connectorId": "stripe",
    "action": "createCustomer",
    "params": {
      "email": "customer@example.com",
      "name": "John Doe"
    }
  }'
```

---

## Architecture

```
AI Worker
    │
    ▼
┌─────────────────────┐
│    ConnectorOS      │
│     (4585)         │
├─────────────────────┤
│  Connection Manager │
│  Webhook Manager   │
│  Sync Engine      │
│  AI Query Router  │
└────────┬──────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
┌─────────┐ ┌─────────┐
│ HubSpot │ │ Stripe  │
│   CRM   │ │Payments │
└─────────┘ └─────────┘
```

---

## Next Steps

1. **Add real OAuth flows** — Currently simulated
2. **Add webhook receivers** — For real-time sync
3. **Add rate limiting** — Per connector limits
4. **Add transformation layer** — Data mapping between systems
