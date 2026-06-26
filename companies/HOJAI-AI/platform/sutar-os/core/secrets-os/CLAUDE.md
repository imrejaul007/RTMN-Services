# SecretsOS - Port 4872

## Overview
Enterprise secrets vault with zero-trust architecture.

## Purpose
Secure storage for API keys, tokens, certificates, and sensitive data.

## Key Features
- AES-256-GCM encryption at rest
- API key management
- OAuth token rotation
- SSH key management
- Certificate management
- Approval workflows
- Full audit trail

## API Endpoints

### Secrets
- `GET /api/secrets` - List secrets
- `POST /api/secrets` - Create secret
- `GET /api/secrets/:id` - Get secret value
- `PATCH /api/secrets/:id` - Update metadata
- `DELETE /api/secrets/:id` - Delete secret
- `POST /api/secrets/:id/rotate` - Rotate secret

### API Keys
- `POST /api/secrets/:id/api-keys` - Generate API key
- `POST /api/validate` - Validate API key

### Approvals
- `POST /api/approvals` - Request approval
- `GET /api/approvals` - List pending
- `POST /api/approvals/:id/approve` - Approve
- `POST /api/approvals/:id/reject` - Reject

### Audit
- `GET /api/audit` - View audit logs

## Secret Types
- `api_key` - API keys
- `oauth_token` - OAuth tokens
- `ssh_key` - SSH keys
- `certificate` - SSL certificates
- `password` - Passwords
- `custom` - Custom secrets

## Security
- All values encrypted with AES-256-GCM
- Access policies per secret
- Approval required for sensitive access
- Complete audit trail

## Tests
Vitest tests: `__tests__/secrets-os.test.ts`

## Environment
- Port: 4872
- Requires: ENCRYPTION_KEY environment variable

## Startup
```bash
cd platform/sutar-os/core/secrets-os && npm run dev
```
