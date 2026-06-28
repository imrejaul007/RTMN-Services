# Secrets OS

## Purpose
AES-256-GCM encrypted secrets management with access logging, versioning, and API key generation.

## Port
4872

## Features
- AES-256-GCM encryption for all secret values
- Automatic versioning with rollback capability
- Access logging with IP and user agent tracking
- API key generation with permission levels (read, write, admin)
- Tag-based organization
- Metadata support
- Secret rotation with history

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /ready | Readiness check |
| POST | /api/secrets | Create a new secret |
| GET | /api/secrets | List all secrets (names only) |
| GET | /api/secrets/:name | Get secret value (decrypted) |
| PUT | /api/secrets/:name | Update a secret |
| DELETE | /api/secrets/:name | Delete a secret |
| POST | /api/secrets/:name/rotate | Rotate a secret with new value |
| POST | /api/secrets/:name/rollback | Rollback to previous version |
| GET | /api/secrets/:name/versions | Get version history |
| GET | /api/secrets/:name/logs | Get access logs for secret |
| GET | /api/keys | List API keys |
| POST | /api/keys | Create new API key |
| DELETE | /api/keys/:key | Delete an API key |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4872 | Service port |
| SECRETS_KEY | auto-generated | 32-byte hex encryption key |

## Commands

```bash
npm run dev     # Development with hot reload
npm start       # Production
npm test        # Run tests
```

## Encryption Format

Secrets are encrypted using AES-256-GCM with the format:
```
iv:authTag:ciphertext
```

All three components are hex-encoded. The IV is 16 bytes, auth tag is 16 bytes.

## Validation

Secret names must match: `/^[a-zA-Z0-9_-]+$/`

API key permissions: `read`, `write`, `admin`

## Access Log Fields

| Field | Description |
|-------|-------------|
| accessedBy | User email or API key |
| accessType | read, update, delete, rotate |
| ip | Client IP address |
| userAgent | Client user agent |
| success | Whether access was successful |