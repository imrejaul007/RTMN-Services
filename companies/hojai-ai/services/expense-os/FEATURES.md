# ExpenseOS Features

**Version:** 1.0.0 | **Port:** 5250 | **Updated:** June 17, 2026

---

## Core Features

### 1. Multi-Channel Expense Capture

| Channel | Description | Status |
|---------|-------------|--------|
| WhatsApp | Forward receipts via WhatsApp | ✅ |
| Email | Forward invoices via email | ✅ |
| Mobile App | Camera capture + manual entry | ✅ |
| API | REST API integration | ✅ |
| Genie | Voice/text submission | ✅ |

### 2. AI Receipt Extraction

| Feature | Description | Status |
|---------|-------------|--------|
| Vendor extraction | Auto-detect vendor name | ✅ |
| Amount extraction | Parse total amount | ✅ |
| Date extraction | Parse receipt date | ✅ |
| Category classification | Auto-categorize expense | ✅ |
| GST/VAT extraction | Tax amount detection | ✅ |
| Duplicate detection | Flag duplicate receipts | ✅ |

### 3. Policy Engine

| Feature | Description | Status |
|---------|-------------|--------|
| Category limits | Max spend per category | ✅ |
| Vendor restrictions | Whitelist/blacklist vendors | ✅ |
| Approval thresholds | Auto-approve small amounts | ✅ |
| Weekend restrictions | Block weekend spending | ✅ |
| Custom rules | User-defined policies | ✅ |

### 4. Approval Workflow

| Feature | Description | Status |
|---------|-------------|--------|
| Manager approval | First-level approval | ✅ |
| Finance approval | Second-level approval | ✅ |
| CFO approval | High-value approvals | ✅ |
| Auto-approve | Below threshold amounts | ✅ |
| SLA tracking | Approval time limits | ✅ |
| Delegation | Forward to alternate | ✅ |

### 5. Categories

| Category | Description |
|----------|-------------|
| Travel | Flights, hotels, transport |
| Meals | Food and entertainment |
| Office Supplies | Stationery, supplies |
| Software | SaaS, subscriptions |
| Marketing | Ads, promotions |
| Equipment | Hardware, furniture |
| Utilities | Electricity, water, internet |
| Rent | Office rent |
| Salaries | Employee payments |
| Training | Courses, certifications |
| Other | Miscellaneous |

### 6. Integrations

| Integration | Description | Status |
|-------------|-------------|--------|
| Finance Twin Hub | Budget sync | ✅ |
| Approval Workflow | Approval routing | ✅ |
| Reimbursement OS | Payment processing | ✅ |
| Corporate Card OS | Card transactions | ✅ |
| Spend Intelligence | Analytics | ✅ |

---

## API Reference

### POST /api/expenses

Create a new expense.

```json
{
  "companyId": "COMP-123",
  "employeeId": "EMP-456",
  "amount": 1500,
  "currency": "INR",
  "category": "Travel",
  "vendor": "Uber",
  "description": "Client meeting transport",
  "receiptUrl": "https://storage/receipt.jpg"
}
```

### GET /api/expenses

List expenses with filters.

Query params: `companyId`, `status`, `category`, `startDate`, `endDate`

### PATCH /api/expenses/:id/status

Update expense status.

```json
{
  "status": "approved",
  "approvedBy": "MGR-789"
}
```

---

## Deployment

```bash
# Start service
npm start

# Health check
curl http://localhost:5250/health
```

---

**Last Updated:** June 17, 2026