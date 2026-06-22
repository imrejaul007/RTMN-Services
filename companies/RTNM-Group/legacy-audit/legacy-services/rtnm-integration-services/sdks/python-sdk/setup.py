# RTMN Python SDK

Unified SDK for all RTMN products.

## Installation

```bash
pip install rtmn-sdk
```

## Quick Start

```python
from rtmn import RTMNClient

# Initialize
client = RTMNClient(api_key="your-api-key")

# Chat with AI
response = client.hojai.chat("What is Q3 revenue?")
print(response.data)

# Create employee (auto-creates wallet, SafeQR, Nexha)
employee = client.corpperks.create_employee(
    name="Priya Sharma",
    email="priya@acme.com",
    department="Engineering"
)
print(employee.data.integrations)
```

## Products

### HOJAI AI
```python
# Chat with AI
response = client.hojai.chat("Analyze Q3 sales")

# Execute agent
response = client.hojai.execute_agent("sales-agent", "Generate Q3 report")

# Search
response = client.hojai.search("revenue projections")
```

### RABTUL Payments
```python
# Create payment
response = client.rabtul.create_payment(50000, "ORD-12345")

# Create wallet
response = client.rabtul.create_wallet("user-123", "John", "john@acme.com")

# Top up
response = client.rabtul.top_up_wallet("wal-123", 10000)
```

### CorpPerks HRMS
```python
# Create employee (auto-integrations!)
response = client.corpperks.create_employee(
    name="Priya Sharma",
    email="priya@acme.com",
    department="Engineering"
)
# Automatically creates:
# - RABTUL wallet
# - SafeQR safety badge
# - Nexha identity

# Run payroll
response = client.corpperks.run_payroll(month=6, year=2026)
```

### AdBazaar Marketing
```python
# Create campaign
response = client.adbazaar.create_campaign(
    name="Summer Sale",
    type="social",
    budget=100000
)

# Find influencers
response = client.adbazaar.find_influencers(
    category="fashion",
    followers="100k-500k"
)
```

### SafeQR
```python
# Generate QR
response = client.safeqr.generate_qr("product", "PROD-123")

# Verify (awards loyalty points!)
response = client.safeqr.verify_qr("ACME-PROD-123")

# Safety alert
response = client.safeqr.trigger_alert("sos", latitude=19.07, longitude=72.87)
```

### Nexha Identity
```python
# Create identity
response = client.nexha.create_entity(
    type="person",
    name="Priya Sharma",
    email="priya@acme.com"
)

# Get trust score
response = client.nexha.get_trust_score("entity-123")
```

## License

MIT
