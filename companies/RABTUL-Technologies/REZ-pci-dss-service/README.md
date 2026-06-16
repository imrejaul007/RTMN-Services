# REZ PCI DSS Compliance Service

**Port:** 4325  
**Version:** 1.0.0  
**Company:** RABTUL Technologies

A comprehensive PCI DSS compliance service providing tokenization, encryption, security scanning, and audit logging for the RTMN ecosystem.

## Features

- **Card Tokenization** - Never store raw PANs, use secure tokens instead
- **AES-256-GCM Encryption** - Industry-standard encryption for sensitive data
- **SAQ Support** - Self-Assessment Questionnaire submission and tracking
- **Merchant Compliance Tracking** - Monitor merchant PCI compliance status
- **Security Scanning** - Automated security checks and vulnerability detection
- **Audit Logging** - Complete audit trail for all PCI-related operations
- **Key Management** - Encryption key rotation and lifecycle management
- **Multi-Brand Support** - Visa, Mastercard, Amex, Discover, and more

## Quick Start

```bash
cd companies/RABTUL-Technologies/REZ-pci-dss-service
npm install
npm start
```

## API Endpoints

### Health & Info

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/api/card-brands` | List supported card brands |
| GET | `/api/compliance/status` | Overall compliance statistics |

### Tokenization

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tokenize` | Tokenize a PAN |
| POST | `/api/detokenize` | Retrieve token data (requires API key) |
| POST | `/api/validate` | Validate a PAN |

### Merchant Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/merchants` | Register a new merchant |
| GET | `/api/merchants/:id` | Get merchant details |
| PUT | `/api/merchants/:id/compliance` | Update compliance status |

### SAQ (Self-Assessment Questionnaire)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/saq/types` | List SAQ types |
| POST | `/api/merchants/:id/saq` | Submit SAQ |
| GET | `/api/merchants/:id/saq` | Get merchant SAQ |

### Security & Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scan` | Run security scan |
| POST | `/api/keys/rotate` | Rotate encryption key |
| GET | `/api/keys` | List encryption keys |
| GET | `/api/audit` | Get audit log |

### Encryption

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/encrypt` | Encrypt data |
| POST | `/api/decrypt` | Decrypt data |

## API Examples

### Tokenize a Card

```bash
curl -X POST http://localhost:4325/api/tokenize \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "4111111111111111",
    "merchantId": "merchant-123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "tok_a1b2c3d4e5f6g7h8i9j0...",
    "last4": "1111",
    "brand": "Visa",
    "expiresAt": "2027-06-15T00:00:00.000Z"
  }
}
```

### Validate a Card

```bash
curl -X POST http://localhost:4325/api/validate \
  -H "Content-Type: application/json" \
  -d '{ "pan": "4111111111111111" }'
```

Response:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "cardBrand": "Visa"
  }
}
```

### Register Merchant

```bash
curl -X POST http://localhost:4325/api/merchants \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Acme Corp",
    "contactEmail": "security@acme.com",
    "merchantCategoryCode": "5411",
    "annualVolume": 1000000
  }'
```

### Submit SAQ

```bash
curl -X POST http://localhost:4325/api/merchants/{merchantId}/saq \
  -H "Content-Type: application/json" \
  -d '{
    "saqType": "A",
    "attest": true,
    "signedBy": "John Doe",
    "responses": {
      "1.1": "compliant",
      "2.1": "compliant"
    }
  }'
```

### Run Security Scan

```bash
curl -X POST http://localhost:4325/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "target": "https://api.example.com",
    "type": "full"
  }'
```

### Rotate Encryption Key

```bash
curl -X POST http://localhost:4325/api/keys/rotate
```

## SAQ Types

| Type | Name | Description |
|------|------|-------------|
| A | SAQ A | Card-not-present merchants, fully outsourced |
| A-EP | SAQ A-EP | E-commerce only, partially outsourced |
| B | SAQ B | Stand-alone terminal merchants |
| B-IP | SAQ B-IP | Stand-alone IP terminal merchants |
| C-VT | SAQ C-VT | Web-based virtual terminal merchants |
| C | SAQ C | Merchants with networked payment systems |
| D | SAQ D | All other merchants |
| P2PE-HWDE | SAQ P2PE-HWDE | Hardware-hosted POS |

## Supported Card Brands

- Visa
- Mastercard
- American Express
- Discover
- Diners Club
- JCB
- UnionPay

## Compliance Status Values

| Status | Description |
|--------|-------------|
| `pending` | Initial state, assessment pending |
| `pending_attestation` | SAQ submitted, awaiting signature |
| `compliant` | Fully compliant with PCI DSS |
| `non_compliant` | Failed compliance or expired |
| `revoked` | Compliance status revoked |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 4325 |
| `PCI_ENCRYPTION_KEY` | 32-byte hex encryption key | Auto-generated |
| `PCI_KEY_ID` | Key identifier | Auto-generated |

## Security Best Practices

1. **Never store raw PANs** - Always use tokenization
2. **Rotate keys regularly** - Use the `/api/keys/rotate` endpoint
3. **Monitor audit logs** - Check `/api/audit` regularly
4. **Complete SAQ annually** - Submit before expiration
5. **Run security scans** - Periodic vulnerability assessment

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REZ PCI DSS Service                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Tokenize  │  │ Encrypt  │  │ SAQ Mgmt │  │ Scan    │ │
│  │Service   │  │ Service  │  │          │  │ Service │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │             │              │       │
│  ┌────▼─────────────▼─────────────▼──────────────▼────┐ │
│  │              AES-256-GCM Encryption                │ │
│  └────┬─────────────┬─────────────┬──────────────┬────┘ │
│       │             │             │              │       │
│  ┌────▼─────────────▼─────────────▼──────────────▼────┐ │
│  │                 Key Management                      │ │
│  │                 (Rotation & Storage)               │ │
│  └─────────────────────────────────────────────────────┘ │
│                        │                                 │
│  ┌─────────────────────▼───────────────────────────────┐ │
│  │                  Audit Logger                       │ │
│  │                  (Winston + File)                   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## License

MIT License - RABTUL Technologies