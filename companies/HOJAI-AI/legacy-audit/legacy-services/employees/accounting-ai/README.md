# @hojai/accounting-ai

**AI-Powered Accounting Automation**

---

## Features

| Feature | Status |
|---------|--------|
| Invoice extraction | ✅ |
| Bank statement import | ✅ |
| Ledger entries | ✅ |
| Party management | ✅ |
| Tally export | ✅ |
| Auto-matching | ✅ |

---

## API

### Invoice
```typescript
POST /upload/invoice { file, type }
GET  /invoices { tenantId }
```

### Ledger
```typescript
POST /ledger/entry { ledger, debit, credit }
GET  /ledger/:name { tenantId }
```

### Bank
```typescript
POST /bank/upload { transactions }
GET  /reconcile { tenantId }
```

### Export
```typescript
GET  /tally/export { tenantId, from, to }
```

---

**Port:** 4950
