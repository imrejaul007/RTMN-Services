# Channel Stitcher

**Port:** 5452
**Purpose:** Identity resolution across all channels — stitch anonymous + known customers

## What It Does

Stitches together anonymous visitors and known customers across ALL channels:
- Website (cookies, visitor ID)
- WhatsApp (phone number)
- Email (email address)
- Phone (phone number)
- Mobile app (device ID)
- Physical store (loyalty card)
- QR codes (scan data)

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/identity/resolve` | Resolve identity across channels |
| GET | `/api/identity/profile/:id` | Get unified profile |
| POST | `/api/identity/merge` | Merge two identities |
| POST | `/api/identity/link` | Link new channel to existing identity |
| GET | `/api/identity/lookup` | Lookup by email/phone/visitorId |

## Example

```bash
# Resolve identity when user enters email
curl -X POST http://localhost:5452/api/identity/resolve \
  -H 'Content-Type: application/json' \
  -d '{"channel": "website", "identifier": "visitor-abc123", "email": "john@example.com", "visitorId": "v_abc123"}'

# Link WhatsApp when user shares phone
curl -X POST http://localhost:5452/api/identity/link \
  -H 'Content-Type: application/json' \
  -d '{"identityId": "id_xxx", "channel": "whatsapp", "identifier": "+919876543210"}'
```

## Reuses

| Service | Port | Purpose |
|---|---|---|
| CorpID | 4702 | Universal identity lookup |
| Customer Twin | 4895 | Unified customer profile |
| MemoryOS | 4703 | Persistent memory |

## Startup

```bash
cd products/channel-stitcher && npm install && npm start  # Port 5452
```
