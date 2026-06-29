# CRM Connector

HubSpot + Salesforce unified API.

## Usage

```javascript
const CRM = require('./src');

const crm = new CRM({
  provider: 'hubspot',
  accessToken: process.env.HUBSPOT_TOKEN
});

await crm.createContact({ email: 'john@acme.com', firstName: 'John', company: 'Acme Corp' });
```

## Methods

| Method | Description |
|--------|-------------|
| `createContact(data)` | New lead |
| `updateContact(email, data)` | Update fields |
| `getContact(email)` | Find by email |
| `createDeal(data)` | New opportunity |
| `syncLead(data)` | Auto-create + deal pipeline |

## Deal Stages

1. `appointmentscheduled`
2. `qualifiedtobuy`
3. `presentationscheduled`
4. `decisionmakerboughtin`
5. `contractsent`
6. `closedwon` / `closedlost`

## Quick Stats

```javascript
const stats = await crm.getStats();
```

## Environment

```
HUBSPOT_TOKEN=pat-xxx
SALESFORCE_CLIENT_ID=xxx
SALESFORCE_CLIENT_SECRET=xxx
```
