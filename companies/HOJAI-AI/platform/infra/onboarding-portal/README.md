# RTMN Onboarding Portal

A comprehensive self-service onboarding portal for RTMN BrandPulse - enabling clients to register, set up their workspace, add brands, connect review sources, and manage their team.

## Overview

This service provides a complete onboarding experience including:
- User registration and authentication
- Email verification
- Password reset functionality
- Workspace management
- Brand setup and configuration
- Review source integration
- Team member invitations
- Role-based access control

## Features

### Authentication System

- **Registration**: Create new user accounts with email/password
- **Login**: Secure authentication with session tokens
- **Email Verification**: Verify user email addresses
- **Password Reset**: Secure password recovery flow
- **Session Management**: JWT-like token-based authentication

### Workspace Management

- Automatic workspace creation on registration
- Customizable workspace settings (timezone, language, notifications)
- Plan management integration
- Workspace profile updates

### Brand Management

- Create and manage multiple brands
- Configure brand details (website, industry, social links)
- Plan-based brand limits
- Brand status tracking (pending, active, inactive)

### Review Source Integration

- Connect multiple review platforms:
  - Google Reviews
  - Yelp
  - TripAdvisor
  - Facebook Reviews
  - Custom sources
- Verification workflow
- Sync management
- Connection status tracking

### Team Management

- Invite team members via email
- Role-based permissions (owner, admin, member, viewer)
- Invitation acceptance flow
- Member management (update roles, remove members)
- Resend invitations

### Onboarding Workflow

Step-by-step guided onboarding:
1. Account Setup
2. Workspace Setup
3. Add Your First Brand
4. Connect Review Sources
5. Invite Team Members
6. Choose a Plan

Progress tracking and completion status.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Navigate to service directory
cd companies/HOJAI-AI/services/onboarding-portal

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
# PORT=4006
# CORS_ORIGIN=http://localhost:3000
# DASHBOARD_URL=http://localhost:3000
```

### Running the Service

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start

# Run tests
npm test
```

### Verify Service Health

```bash
curl http://localhost:4006/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "onboarding-portal",
  "timestamp": "2026-06-15T10:00:00.000Z",
  "stats": {
    "users": 5,
    "workspaces": 5,
    "brands": 12,
    "teams": 8,
    "reviewSources": 15
  }
}
```

## API Reference

### Authentication

#### Register
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "company": "Acme Inc"
}
```

**Response:**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "owner"
    },
    "workspace": {
      "id": "uuid",
      "name": "Acme Inc's Workspace",
      "plan": "free"
    },
    "verificationToken": "uuid",
    "message": "Registration successful. Please verify your email."
  }
}
```

#### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "data": {
    "token": "uuid",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "owner"
    }
  }
}
```

#### Verify Email
```bash
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

#### Resend Verification Email
```bash
POST /api/v1/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Forgot Password
```bash
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```bash
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "newsecurepassword123"
}
```

#### Logout
```bash
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

### Workspace

#### Get Workspace
```bash
GET /api/v1/workspace/:id
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Acme Inc Workspace",
    "ownerId": "uuid",
    "plan": "starter",
    "status": "active",
    "settings": {
      "timezone": "America/New_York",
      "language": "en",
      "notifications": true
    },
    "createdAt": "2026-06-15T10:00:00.000Z"
  }
}
```

#### Update Workspace
```bash
PATCH /api/v1/workspace/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Workspace Name",
  "settings": {
    "timezone": "UTC",
    "language": "en"
  }
}
```

#### Get Current Workspace (Authenticated)
```bash
GET /api/v1/workspace
Authorization: Bearer <token>
```

### Onboarding

#### Get Onboarding Steps
```bash
GET /api/v1/onboarding/:workspaceId/steps
```

**Response:**
```json
{
  "data": {
    "steps": [
      {
        "id": "account",
        "name": "Account Setup",
        "status": "completed",
        "description": "Create your account",
        "order": 1
      },
      {
        "id": "brand",
        "name": "Add Your First Brand",
        "status": "pending",
        "description": "Add your brand to start monitoring",
        "order": 3
      }
    ],
    "progress": 33,
    "isComplete": false
  }
}
```

#### Complete Onboarding Step
```bash
POST /api/v1/onboarding/:workspaceId/steps/:stepId/complete
Authorization: Bearer <token>
```

### Brands

#### Get Brands
```bash
GET /api/v1/brands/:workspaceId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "name": "Acme Restaurant",
      "website": "https://acme-restaurant.com",
      "industry": "restaurant",
      "status": "active",
      "createdAt": "2026-06-15T10:00:00.000Z"
    }
  ]
}
```

#### Create Brand
```bash
POST /api/v1/onboarding/:workspaceId/brands
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Acme Restaurant",
  "website": "https://acme-restaurant.com",
  "industry": "restaurant",
  "description": "Fine dining experience",
  "socialLinks": {
    "facebook": "https://facebook.com/acme",
    "instagram": "https://instagram.com/acme"
  }
}
```

**Response:**
```json
{
  "data": {
    "brand": {
      "id": "uuid",
      "name": "Acme Restaurant",
      "status": "pending"
    },
    "message": "Brand created. Next: Connect review sources.",
    "nextStep": "sources"
  }
}
```

#### Update Brand
```bash
PATCH /api/v1/brands/:brandId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Brand Name",
  "website": "https://new-website.com"
}
```

#### Delete Brand
```bash
DELETE /api/v1/brands/:brandId
Authorization: Bearer <token>
```

### Review Sources

#### Get Review Sources
```bash
GET /api/v1/sources/:brandId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "brandId": "uuid",
      "sourceType": "google",
      "sourceId": "yelp-business-id",
      "status": "active",
      "lastSync": "2026-06-15T10:00:00.000Z",
      "createdAt": "2026-06-15T10:00:00.000Z"
    }
  ]
}
```

#### Add Review Source
```bash
POST /api/v1/onboarding/:workspaceId/sources
Authorization: Bearer <token>
Content-Type: application/json

{
  "sourceType": "google",
  "sourceId": "123456789",
  "brandId": "optional-brand-uuid"
}
```

**Response:**
```json
{
  "data": {
    "connection": {
      "id": "uuid",
      "sourceType": "google",
      "status": "pending_verification"
    },
    "message": "Source added. Verification pending.",
    "instructions": "Verify ownership via Google Search Console or add a verification meta tag",
    "verificationMethods": [
      "Add meta tag to your website",
      "Upload HTML file to your domain",
      "Verify via Google Search Console"
    ]
  }
}
```

#### Verify Source
```bash
POST /api/v1/sources/:sourceId/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "verificationCode": "optional-verification-code"
}
```

#### Sync Source
```bash
POST /api/v1/sources/:sourceId/sync
Authorization: Bearer <token>
```

#### Delete Source
```bash
DELETE /api/v1/sources/:sourceId
Authorization: Bearer <token>
```

### Team

#### Get Team Members
```bash
GET /api/v1/team/:workspaceId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "member@example.com",
      "name": "Jane Smith",
      "role": "admin",
      "status": "active",
      "invitedAt": "2026-06-15T10:00:00.000Z",
      "joinedAt": "2026-06-15T11:00:00.000Z"
    }
  ]
}
```

#### Invite Team Member
```bash
POST /api/v1/workspace/:id/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newmember@example.com",
  "name": "New Member",
  "role": "member"
}
```

**Response:**
```json
{
  "data": {
    "inviteToken": "uuid",
    "inviteUrl": "http://localhost:3000/invite/uuid",
    "member": {
      "id": "uuid",
      "email": "newmember@example.com",
      "role": "member",
      "status": "pending"
    },
    "message": "Invitation sent successfully"
  }
}
```

#### Accept Invitation
```bash
POST /api/v1/invite/:token/accept
Content-Type: application/json

{
  "email": "newmember@example.com",
  "password": "securepassword123",
  "name": "New Member"
}
```

#### Update Team Member Role
```bash
PATCH /api/v1/team/:memberId
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "admin"
}
```

#### Remove Team Member
```bash
DELETE /api/v1/team/:memberId
Authorization: Bearer <token>
```

#### Resend Invitation
```bash
POST /api/v1/team/:memberId/resend
Authorization: Bearer <token>
```

### User Profile

#### Get Current User
```bash
GET /api/v1/user
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "company": "Acme Inc",
    "role": "owner",
    "emailVerified": true,
    "createdAt": "2026-06-15T10:00:00.000Z",
    "lastLogin": "2026-06-15T12:00:00.000Z"
  }
}
```

#### Update Profile
```bash
PATCH /api/v1/user
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "company": "New Company Name"
}
```

#### Change Password
```bash
POST /api/v1/user/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "currentpassword123",
  "newPassword": "newpassword123"
}
```

## Onboarding Flow

### New User Journey

```
1. Register
   └── Create account + workspace
   └── Receive verification email

2. Verify Email
   └── Click verification link
   └── Workspace activated

3. Add Brand
   └── Enter brand details
   └── Brand created (pending)

4. Connect Review Sources
   └── Select source type (Google, Yelp, etc.)
   └── Enter credentials/ID
   └── Verify ownership
   └── Brand activated

5. Invite Team (Optional)
   └── Send invitations
   └── Team members accept
   └── Roles assigned

6. Choose Plan
   └── Free: Limited features
   └── Starter: $99/mo - 5 brands
   └── Professional: $299/mo - 25 brands
   └── Enterprise: Unlimited + dedicated support
```

### Verification Methods by Source

| Source | Verification Method |
|--------|---------------------|
| Google | Meta tag, HTML file, Search Console, DNS |
| Yelp | Business ID |
| TripAdvisor | Restaurant ID |
| Facebook | OAuth authentication |
| Custom | API credentials or webhook |

## Role Permissions

| Role | Workspace | Brands | Sources | Team | Billing |
|------|-----------|--------|---------|------|---------|
| Owner | Full access | Full access | Full access | Full access | Full access |
| Admin | Full access | Full access | Full access | Manage | View only |
| Member | View only | View + Edit | View + Edit | View only | View only |
| Viewer | View only | View only | View only | View only | No access |

## Error Handling

All API errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `EMAIL_EXISTS` | 409 | Email already registered |
| `ALREADY_MEMBER` | 409 | User already in team |
| `PLAN_LIMIT_REACHED` | 403 | Brand limit exceeded |
| `TOKEN_EXPIRED` | 400 | Token has expired |

## Security Features

1. **Password Hashing**: bcrypt with 12 rounds
2. **Token Expiration**: Verification tokens expire in 24 hours, reset tokens in 1 hour, invitations in 7 days
3. **Session Invalidation**: Password changes invalidate all sessions
4. **Rate Limiting**: Recommended for production deployment
5. **Input Validation**: All inputs sanitized and validated
6. **CORS Configuration**: Configurable allowed origins

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 4006
CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  onboarding-portal:
    build: .
    ports:
      - "4006:4006"
    environment:
      - PORT=4006
      - CORS_ORIGIN=${CORS_ORIGIN}
      - DASHBOARD_URL=${DASHBOARD_URL}
    restart: unless-stopped
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: onboarding-portal
spec:
  replicas: 2
  selector:
    matchLabels:
      app: onboarding-portal
  template:
    metadata:
      labels:
        app: onboarding-portal
    spec:
      containers:
        - name: onboarding-portal
          image: rtmnonboarding:latest
          ports:
            - containerPort: 4006
          env:
            - name: PORT
              value: "4006"
            - name: CORS_ORIGIN
              valueFrom:
                configMapKeyRef:
                  name: onboarding-config
                  key: cors-origin
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 4006 | Server port |
| `NODE_ENV` | No | development | Environment |
| `CORS_ORIGIN` | No | * | Allowed CORS origins |
| `DASHBOARD_URL` | No | http://localhost:3000 | Frontend URL |

## Production Considerations

1. **Database**: Replace in-memory storage with MongoDB/PostgreSQL
2. **Email Service**: Integrate SendGrid/AWS SES for emails
3. **Rate Limiting**: Add express-rate-limit
4. **Logging**: Add Winston or Pino logging
5. **Monitoring**: Add health checks and metrics
6. **SSL/TLS**: Ensure HTTPS in production
7. **Session Storage**: Use Redis for token storage

## Integration with Billing Service

The onboarding portal integrates with the billing service for:
- Plan upgrades during onboarding
- Workspace plan updates
- Billing portal access via customer portal

### Flow:
1. User completes onboarding (up to step 5)
2. User clicks "Choose Plan" in onboarding
3. Redirect to billing checkout or portal
4. On return, update workspace plan
5. Complete onboarding

## Support

For issues or questions:
- Check API responses for error details
- Review service logs
- Verify environment configuration

## License

MIT License - RTMN BrandPulse
