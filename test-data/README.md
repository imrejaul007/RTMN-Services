# Customer Operations OS - Test Data

Sample test data for demonstrating Customer Operations functionality.

## Files

| File | Records | Description |
|------|---------|-------------|
| `customers.json` | 10 | Customer profiles with contact info |
| `orders.json` | 50 | Order transactions |
| `tickets.json` | 30 | Support tickets |
| `payments.json` | 40 | Payment records |
| `leads.json` | 20 | Sales leads |
| `setup.js` | - | MongoDB import script |

## Usage

### Option 1: MongoDB Import

```bash
# Start MongoDB
mongod --dbpath /data/db

# Import all collections
mongoimport --db customer-ops --collection customers --file customers.json
mongoimport --db customer-ops --collection orders --file orders.json
mongoimport --db customer-ops --collection tickets --file tickets.json
mongoimport --db customer-ops --collection payments --file payments.json
mongoimport --db customer-ops --collection leads --file leads.json
```

### Option 2: Node.js Script

```bash
# Update MongoDB connection in setup.js first
node setup.js
```

### Option 3: Direct API

```bash
# POST each record to your API
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d @customers.json
```

## Data Schema

### Customer
```json
{
  "customerId": "CUST-001",
  "name": "Rahul Sharma",
  "email": "rahul.sharma@email.com",
  "phone": "+91 98765 43210",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "segment": "Premium",
  "lifetimeValue": 150000,
  "orderCount": 12,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Order
```json
{
  "orderId": "ORD-001",
  "customerId": "CUST-001",
  "items": [{ "product": "Smartphone", "quantity": 1, "price": 25000 }],
  "total": 27500,
  "status": "Delivered",
  "city": "Mumbai",
  "createdAt": "2024-06-10T14:20:00Z"
}
```

### Ticket
```json
{
  "ticketId": "TKT-001",
  "customerId": "CUST-001",
  "subject": "Order not delivered",
  "category": "Delivery",
  "priority": "High",
  "status": "Open",
  "createdAt": "2024-06-15T09:00:00Z"
}
```

### Payment
```json
{
  "paymentId": "PAY-001",
  "customerId": "CUST-001",
  "orderId": "ORD-001",
  "amount": 27500,
  "method": "UPI",
  "status": "Success",
  "createdAt": "2024-06-10T14:25:00Z"
}
```

### Lead
```json
{
  "leadId": "LEAD-001",
  "name": "Priya Patel",
  "email": "priya.patel@email.com",
  "phone": "+91 98xxx xxxxx",
  "source": "Website",
  "interest": "Electronics",
  "budget": 30000,
  "status": "Qualified",
  "createdAt": "2024-06-01T11:00:00Z"
}
```

## Sample Queries

```javascript
// Find high-value customers in Mumbai
db.customers.find({ city: "Mumbai", lifetimeValue: { $gt: 100000 } })

// Get orders by status
db.orders.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$total" } } }
])

// Open tickets by priority
db.tickets.find({ status: "Open" }).sort({ priority: 1 })

// Payment success rate
db.payments.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

## Reset Data

```bash
# Drop and reload
mongo customer-ops --eval "db.customers.drop(); db.orders.drop(); db.tickets.drop(); db.payments.drop(); db.leads.drop();"
node setup.js
```
