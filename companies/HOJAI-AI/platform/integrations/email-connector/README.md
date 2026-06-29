# Email Connector

SendGrid + SMTP.

## Usage

```javascript
const Email = require('./src');

const email = new Email({
  provider: 'sendgrid',
  apiKey: process.env.SENDGRID_API_KEY,
  fromEmail: 'ai@company.com',
  fromName: 'AI Assistant'
});

await email.send({
  to: 'user@company.com',
  subject: 'Welcome!',
  html: '<h1>Hello</h1><p>Your account is ready.</p>'
});
```

## Templates

| Template | Use Case |
|----------|----------|
| welcome | Onboarding |
| lead-nurture | Campaigns |
| support-ticket | Tickets |
| invoice | Billing |
| meeting-reminder | Calendar |
| weekly-digest | Updates |

## Batch Send

```javascript
await email.batchSend({
  name: 'Campaign 1',
  subject: 'Update',
  list: [{ email: 'user@x.com' }],
  templateId: 'd-xxx'
});
```

## Environment

```
SENDGRID_API_KEY=SG.xxx
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
```
