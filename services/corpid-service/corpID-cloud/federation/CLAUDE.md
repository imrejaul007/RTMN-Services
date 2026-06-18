# Identity Federation

**Service:** SSO / Federation
**Port:** 4702 (via gateway)
**Prefix:** `/api/federation`

---

## Overview

The Identity Federation service enables Single Sign-On (SSO) with external identity providers. It supports SAML 2.0, OAuth 2.0, and OpenID Connect (OIDC) protocols.

## Features

- **SAML 2.0:** Enterprise SSO with IdPs
- **OAuth 2.0:** 7 pre-configured providers (Google, Apple, Microsoft, Facebook, GitHub, LinkedIn, Twitter)
- **OIDC:** Any OIDC-compliant provider
- **Account Linking:** Link external accounts to CorpID users
- **PKCE Support:** Enhanced security for public clients
- **Custom Identity Providers:** Bring your own IdP
- **SAML Metadata:** Auto-generated SP metadata
- **SSO Sessions:** Tracked with expiry

## Supported Providers

| Provider | Type | Default Scopes |
|----------|------|----------------|
| Google | OAuth/OIDC | openid, email, profile |
| Apple | OAuth | name, email |
| Microsoft | OAuth/OIDC | openid, email, profile |
| Facebook | OAuth | email, public_profile |
| GitHub | OAuth | user:email, read:user |
| LinkedIn | OAuth | r_liteprofile, r_emailaddress |
| Twitter | OAuth | tweet.read, users.read |

## API Endpoints

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/federation/identity-providers` | Get supported providers |
| POST | `/api/federation/sso/initiate` | Start SSO flow |
| POST | `/api/federation/sso/callback` | SSO callback |
| GET | `/api/federation/sso/sessions/:id` | Get SSO session |

### Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/federation/providers` | List all providers |
| POST | `/api/federation/providers/saml` | Register SAML provider |
| POST | `/api/federation/providers/oauth` | Register OAuth provider |
| POST | `/api/federation/providers/oidc` | Register OIDC provider |
| GET | `/api/federation/providers/:id` | Get provider details |
| PUT | `/api/federation/providers/:id` | Update provider |
| DELETE | `/api/federation/providers/:id` | Delete provider |
| GET | `/api/federation/saml/metadata` | Get SAML SP metadata |
| GET | `/api/federation/stats` | Statistics |

### User Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/federation/me/links` | My SSO links |
| POST | `/api/federation/me/links` | Link SSO account |
| DELETE | `/api/federation/me/links/:providerId` | Unlink SSO |

## Usage Example

### Register OAuth Provider
```bash
curl -X POST http://localhost:4702/api/federation/providers/oauth \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Google OAuth",
    "providerKey": "google",
    "clientId": "your-client-id.apps.googleusercontent.com",
    "clientSecret": "your-client-secret"
  }'
```

### Register SAML Provider
```bash
curl -X POST http://localhost:4702/api/federation/providers/saml \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Enterprise SAML",
    "entityId": "https://corp.example.com",
    "ssoUrl": "https://idp.example.com/sso",
    "sloUrl": "https://idp.example.com/slo",
    "certificate": "-----BEGIN CERTIFICATE-----..."
  }'
```

### Register OIDC Provider
```bash
curl -X POST http://localhost:4702/api/federation/providers/oidc \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Okta OIDC",
    "issuer": "https://dev-12345.okta.com",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "discoveryUrl": "https://dev-12345.okta.com/.well-known/openid-configuration"
  }'
```

### Initiate SSO
```bash
curl -X POST http://localhost:4702/api/federation/sso/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "oauth-abc123",
    "redirectUri": "https://yourapp.com/callback",
    "state": "random-state-value"
  }'
```

Response:
```json
{
  "success": true,
  "sessionId": "sso-abc",
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "random-state-value"
}
```

## SSO Flow

```
User → Frontend → CorpID /sso/initiate
                          ↓
                  Get authorization URL
                          ↓
              ← authorizationUrl
                          ↓
User redirected to IdP (Google, etc.)
                          ↓
User authenticates at IdP
                          ↓
IdP redirects back to your app with code
                          ↓
Your app → CorpID /sso/callback
                          ↓
              Exchange code for tokens
              Fetch user profile
              Create/link account
                          ↓
              ← Access token
```

## File Structure

```
federation/
├── src/
│   ├── models/
│   │   └── federation.model.js
│   └── routes/
│       └── federation.routes.js
└── CLAUDE.md
```
