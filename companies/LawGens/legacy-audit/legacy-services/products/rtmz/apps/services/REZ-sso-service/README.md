# REZ SSO Service

Enterprise SSO service supporting OAuth2 identity providers.

## Features

- OAuth2 Authorization Code Flow
- Okta integration
- Google OAuth integration
- JWT token exchange
- Session management

## Environment Variables

```
PORT=4003
MONGODB_URI=mongodb://localhost:27017/rez-sso
REDIS_URL=redis://localhost:6379
AUTH_SERVICE_URL=http://rez-auth:4002
INTERNAL_SERVICE_TOKEN=your-internal-token
OKTA_CLIENT_ID=your-okta-client-id
OKTA_CLIENT_SECRET=your-okta-client-secret
OKTA_DOMAIN=your-domain.okta.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Endpoints

- `GET /health` - Health check
- `GET /api/v1/oauth/okta` - Okta SSO login
- `GET /api/v1/oauth/google` - Google SSO login
- `GET /api/v1/oauth/callback/:provider` - OAuth callback
- `POST /api/v1/sso/exchange` - Exchange SSO token for JWT

## Usage

```bash
npm install
npm run build
npm start
```