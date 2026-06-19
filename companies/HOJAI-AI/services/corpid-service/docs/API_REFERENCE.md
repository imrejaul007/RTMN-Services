# CorpID Cloud - Complete API Reference v4.0

**Base URL:** `http://localhost:4702`
**Version:** 4.0.0
**Date:** June 18, 2026

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Organizations](#organizations)
4. [Departments](#departments)
5. [Teams](#teams)
6. [Memberships](#memberships)
7. [Invitations](#invitations)
8. [RBAC - Roles & Permissions](#rbac)
9. [API Identity](#api-identity)
10. [Devices](#devices)
11. [Audit](#audit)
12. [Consumers](#consumers)
13. [Merchants](#merchants)
14. [AI Agents](#ai-agents)
15. [Trust Engine](#trust-engine)
16. [Employees](#employees)
17. [Identity Graph](#identity-graph)
18. [Universal Profile](#universal-profile)
19. [Identity Memory](#identity-memory)
20. [Identity Timeline](#identity-timeline)
21. [KYC Platform](#kyc-platform)
22. [Consent Platform](#consent-platform)
23. [Identity Federation](#identity-federation)
24. [Identity Twin](#identity-twin)
25. [Developer Identity](#developer-identity)
26. [Identity Verification](#identity-verification)

---

## General Information

### Authentication
All endpoints (except public ones) require Bearer token in Authorization header:
```
Authorization: Bearer <access_token>
```

### Rate Limits
- Auth endpoints: 5 requests / 15 minutes
- Default API: 100 requests / 1 minute
- Strict operations: 20 requests / 1 minute

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": []
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Missing or invalid token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input
- `CONFLICT` - Resource already exists
- `RATE_LIMIT` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## Authentication

### Register New User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": "1h",
  "tokenType": "Bearer",
  "user": {
    "id": "user-abc12345",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member"
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

### Change Password
```http
PUT /auth/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

### List My Sessions
```http
GET /api/auth/sessions
Authorization: Bearer <token>
```

### Revoke Session
```http
DELETE /api/auth/sessions/:id
Authorization: Bearer <token>
```

---

## Users

### List Users
```http
GET /api/users?page=1&limit=20&role=member
Authorization: Bearer <token>
```

### Get User by ID
```http
GET /api/users/:id
Authorization: Bearer <token>
```

---

## Organizations

### Create Organization
```http
POST /api/organizations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "type": "company",
  "industry": "technology",
  "size": "medium"
}
```

### List Organizations
```http
GET /api/organizations?page=1&limit=20
Authorization: Bearer <token>
```

### Get Organization
```http
GET /api/organizations/:id
Authorization: Bearer <token>
```

### Update Organization
```http
PUT /api/organizations/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "primaryColor": "#FF0000"
}
```

### Delete Organization
```http
DELETE /api/organizations/:id
Authorization: Bearer <token>
```

### Get Organization Stats
```http
GET /api/organizations/:id/stats
Authorization: Bearer <token>
```

### Get Organization Hierarchy
```http
GET /api/organizations/:id/hierarchy
Authorization: Bearer <token>
```

---

## Departments

### Create Department
```http
POST /api/organizations/:orgId/departments
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Engineering",
  "code": "ENG",
  "headId": "user-abc"
}
```

### List Departments
```http
GET /api/organizations/:orgId/departments?parentId=optional
Authorization: Bearer <token>
```

### Get Department
```http
GET /api/organizations/:orgId/departments/:id
Authorization: Bearer <token>
```

### Update Department
```http
PUT /api/organizations/:orgId/departments/:id
Authorization: Bearer <token>
```

### Delete Department
```http
DELETE /api/organizations/:orgId/departments/:id
Authorization: Bearer <token>
```

### Get Department Members
```http
GET /api/organizations/:orgId/departments/:id/members
Authorization: Bearer <token>
```

---

## Teams

### Create Team
```http
POST /api/organizations/:orgId/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Platform Team",
  "departmentId": "dept-abc",
  "type": "functional",
  "private": false
}
```

### List Teams
```http
GET /api/organizations/:orgId/teams?departmentId=optional
Authorization: Bearer <token>
```

### Add Team Member
```http
POST /api/organizations/:orgId/teams/:id/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-abc"
}
```

### Remove Team Member
```http
DELETE /api/organizations/:orgId/teams/:id/members/:userId
Authorization: Bearer <token>
```

---

## Memberships

### List Members
```http
GET /api/organizations/:orgId/members?role=manager&status=active
Authorization: Bearer <token>
```

### Update Member
```http
PUT /api/organizations/:orgId/members/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "admin",
  "title": "Senior Engineer"
}
```

### Suspend Member
```http
POST /api/organizations/:orgId/members/:userId/suspend
Authorization: Bearer <token>
```

### Reactivate Member
```http
POST /api/organizations/:orgId/members/:userId/reactivate
Authorization: Bearer <token>
```

---

## Invitations

### Send Invitation
```http
POST /api/organizations/:orgId/invitations
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "role": "member",
  "departmentId": "dept-abc"
}
```

### List Invitations
```http
GET /api/organizations/:orgId/invitations?status=pending
Authorization: Bearer <token>
```

### Resend Invitation
```http
POST /api/organizations/:orgId/invitations/:id/resend
Authorization: Bearer <token>
```

### Cancel Invitation
```http
DELETE /api/organizations/:orgId/invitations/:id
Authorization: Bearer <token>
```

### Accept Invitation (Public)
```http
POST /api/invitations/:token/accept
Authorization: Bearer <token>
```

---

## RBAC

### List Roles
```http
GET /api/roles
Authorization: Bearer <token>
```

### Get Role
```http
GET /api/roles/:id
Authorization: Bearer <token>
```

### Create Custom Role
```http
POST /api/roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "custom-role",
  "displayName": "Custom Role",
  "description": "A custom role",
  "permissions": ["org:read", "dept:read"]
}
```

### Update Role
```http
PUT /api/roles/:id
Authorization: Bearer <token>
```

### Delete Role
```http
DELETE /api/roles/:id
Authorization: Bearer <token>
```

### List Permissions
```http
GET /api/permissions?category=organization
Authorization: Bearer <token>
```

### Check Access
```http
POST /api/access/check
Authorization: Bearer <token>
Content-Type: application/json

{
  "permission": "org:read"
}
```

### Batch Check Permissions
```http
POST /api/access/batch-check
Authorization: Bearer <token>
Content-Type: application/json

{
  "permissions": ["org:read", "dept:write"]
}
```

### Get My Permissions
```http
GET /api/access/permissions
Authorization: Bearer <token>
```

---

## API Identity

### Create API Key
```http
POST /api/keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Production Key",
  "scopes": ["read:users", "read:organizations"],
  "environment": "production"
}
```

**Response includes the key (shown only once):**
```json
{
  "success": true,
  "apiKey": {
    "id": "ak-abc123",
    "name": "Production Key",
    "key": "cpk_xyz...",
    "keyId": "cpk_xyz...",
    "scopes": ["read:users"]
  }
}
```

### List API Keys
```http
GET /api/keys
Authorization: Bearer <token>
```

### Rotate API Key
```http
POST /api/keys/:id/rotate
Authorization: Bearer <token>
```

### Revoke API Key
```http
DELETE /api/keys/:id
Authorization: Bearer <token>
```

### List Scopes
```http
GET /api/scopes
Authorization: Bearer <token>
```

### Create Webhook
```http
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Webhook",
  "url": "https://example.com/webhook",
  "events": ["user.created", "user.deleted"]
}
```

### List Webhook Events
```http
GET /api/webhooks/events
Authorization: Bearer <token>
```

---

## Devices

### Register Device
```http
POST /api/devices
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My MacBook",
  "type": "desktop",
  "make": "Apple",
  "model": "MacBook Pro",
  "os": "macOS",
  "osVersion": "14.5"
}
```

### List My Devices
```http
GET /api/devices
Authorization: Bearer <token>
```

### Trust Device
```http
POST /api/devices/:id/trust
Authorization: Bearer <token>
```

### Block Device
```http
POST /api/devices/:id/block
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Suspicious activity"
}
```

---

## Audit

### Query Audit Events
```http
GET /api/audit/events?action=auth.login&startDate=2026-01-01&limit=50
Authorization: Bearer <token>
```

### Get User Audit Trail
```http
GET /api/audit/user/:userId?limit=50
Authorization: Bearer <token>
```

### Get Resource Audit Trail
```http
GET /api/audit/resource/:type/:id
Authorization: Bearer <token>
```

### Get Audit Statistics
```http
GET /api/audit/stats
Authorization: Bearer <token>
```

### Export Audit Events
```http
POST /api/audit/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "filters": {
    "startDate": "2026-01-01",
    "endDate": "2026-12-31"
  },
  "format": "json"
}
```

---

## Consumers

### Create Consumer Profile
```http
POST /api/consumers
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "John Consumer",
  "country": "IN",
  "city": "Mumbai"
}
```

### Get My Consumer Profile
```http
GET /api/consumers/me
Authorization: Bearer <token>
```

### Update Preferences
```http
PUT /api/consumers/me/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "hi",
  "notifications": { "email": true }
}
```

### Enable Genie
```http
POST /api/consumers/me/genie/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "en",
  "wakeWord": "Hey Genie",
  "listeningMode": "smart"
}
```

### Link REZ Profile
```http
POST /api/consumers/me/rez/link
Authorization: Bearer <token>
Content-Type: application/json

{
  "tier": "gold"
}
```

### Connect External Account
```http
POST /api/consumers/me/accounts
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "google",
  "providerId": "google-id-123",
  "permissions": ["email", "profile"]
}
```

### Request Data Export (GDPR)
```http
POST /api/consumers/me/export
Authorization: Bearer <token>
```

### Request Account Deletion (GDPR)
```http
POST /api/consumers/me/delete
Authorization: Bearer <token>
```

---

## Merchants

### Create Merchant
```http
POST /api/merchants
Authorization: Bearer <token>
Content-Type: application/json

{
  "legalName": "Test Restaurant Pvt Ltd",
  "displayName": "Test Restaurant",
  "category": "restaurant",
  "type": "pvt-ltd",
  "address": { "city": "Mumbai", "country": "IN" }
}
```

### Add KYC Document
```http
POST /api/merchants/:id/kyc/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "gst_certificate",
  "number": "22AAAAA0000A1Z5"
}
```

### Update KYC Status (Admin)
```http
PUT /api/merchants/:id/kyc
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "level": 2
}
```

### Create Branch
```http
POST /api/merchants/:merchantId/branches
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Main Branch",
  "isMainBranch": true,
  "address": { "city": "Mumbai" }
}
```

### Add Settlement Account
```http
POST /api/merchants/:merchantId/settlements
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "bank",
  "accountHolderName": "Test Restaurant",
  "accountNumber": "1234567890",
  "ifsc": "HDFC0001234"
}
```

---

## AI Agents

### Get Available Capabilities
```http
GET /api/agents/capabilities
Authorization: Bearer <token>
```

### Create Agent
```http
POST /api/agents
Authorization: Bearer <token>
Content-Type: application/json

{
  "agentId": "genie-primary",
  "name": "Genie",
  "type": "assistant",
  "category": "personal",
  "capabilities": ["web-search", "memory-access"]
}
```

### List My Agents
```http
GET /api/agents
Authorization: Bearer <token>
```

### Update Trust Score (Admin)
```http
PUT /api/agents/:id/trust
Authorization: Bearer <token>
Content-Type: application/json

{
  "score": 85,
  "flags": []
}
```

### Record Interaction
```http
POST /api/agents/:id/interactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "query",
  "success": true,
  "duration": 250
}
```

### Pause/Resume Agent
```http
POST /api/agents/:id/pause
POST /api/agents/:id/resume
Authorization: Bearer <token>
```

---

## Trust Engine

### Get My Trust Score
```http
GET /api/trust/me
Authorization: Bearer <token>
```

### Evaluate Trust
```http
POST /api/trust/evaluate
Authorization: Bearer <token>
Content-Type: application/json

{
  "identity": { "emailVerified": true, "mfaEnabled": true },
  "behavior": { "lowFailedAttempts": true }
}
```

### Perform Risk Check
```http
POST /api/trust/risk-check
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "login",
  "context": { "newIp": true, "vpn": true }
}
```

**Response:**
```json
{
  "success": true,
  "check": {
    "riskLevel": "medium",
    "riskScore": 35,
    "decision": "challenge",
    "fraudFlags": ["new_ip", "vpn"],
    "challenges": [{ "type": "mfa", "required": true }]
  }
}
```

### Get Risk Check History
```http
GET /api/trust/risk-checks?limit=50
Authorization: Bearer <token>
```

### Record Anomaly
```http
POST /api/trust/anomalies
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "unusual_login",
  "severity": "high",
  "description": "Login from new country"
}
```

---

## Employees

### Get My Employee Profile
```http
GET /api/employee/me
Authorization: Bearer <token>
```

### Add Skill
```http
POST /api/employee/me/skills
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "JavaScript",
  "level": "expert",
  "certified": true
}
```

### Add Document
```http
POST /api/employee/me/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "id_proof",
  "name": "Passport",
  "url": "https://example.com/doc.pdf"
}
```

---

## Identity Graph

### Get Node/Edge Types
```http
GET /api/graph/types
Authorization: Bearer <token>
```

### Create Node
```http
POST /api/graph/nodes
Authorization: Bearer <token>
Content-Type: application/json

{
  "entityType": "user",
  "entityId": "user-123",
  "properties": { "name": "John" }
}
```

### Create Edge (Relationship)
```http
POST /api/graph/edges
Authorization: Bearer <token>
Content-Type: application/json

{
  "sourceNodeId": "node-abc",
  "targetNodeId": "node-xyz",
  "type": "member_of",
  "properties": { "role": "owner" }
}
```

### Get Node Edges
```http
GET /api/graph/nodes/:id/edges?direction=all
Authorization: Bearer <token>
```

### Get Related Nodes
```http
GET /api/graph/nodes/:id/related?type=member_of&depth=2
Authorization: Bearer <token>
```

### Find Shortest Path
```http
GET /api/graph/path/:fromId/:toId
Authorization: Bearer <token>
```

### Graph Statistics
```http
GET /api/graph/stats
Authorization: Bearer <token>
```

---

## Universal Profile

### Get Badges
```http
GET /api/universal/badges
Authorization: Bearer <token>
```

### Get My Universal Profile
```http
GET /api/universal/me
Authorization: Bearer <token>
```

### Refresh Profile
```http
POST /api/universal/me/refresh
Authorization: Bearer <token>
```

### Update Privacy
```http
PUT /api/universal/me/privacy
Authorization: Bearer <token>
Content-Type: application/json

{
  "profileVisibility": "public",
  "showEmail": false
}
```

### Add Badge (Admin)
```http
POST /api/universal/user/:userId/badges
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "verified"
}
```

---

## Identity Memory

### Get Memory Categories
```http
GET /api/memory/categories
Authorization: Bearer <token>
```

### Get My Memory Link
```http
GET /api/memory/me
Authorization: Bearer <token>
```

### Update Memory Settings
```http
PUT /api/memory/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "memoryTypes": { "preferences": true, "behavioral": true }
}
```

### Store Memory
```http
POST /api/memory/me/memories
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "preferences",
  "category": "ui",
  "key": "theme",
  "value": "dark",
  "confidence": 0.9,
  "source": "user"
}
```

### Search Memories
```http
GET /api/memory/me/memories/search?q=theme
Authorization: Bearer <token>
```

### Archive/Delete Memory
```http
POST /api/memory/me/memories/:id/archive
DELETE /api/memory/me/memories/:id
Authorization: Bearer <token>
```

### Memory Statistics
```http
GET /api/memory/me/stats
Authorization: Bearer <token>
```

### Bulk Store (Agent Sync)
```http
POST /api/memory/me/memories/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "memories": [
    { "type": "behavioral", "key": "active_hours", "value": "9-17" },
    { "type": "preferences", "key": "language", "value": "en" }
  ]
}
```

---

## Identity Timeline

### Get Event Types
```http
GET /api/timeline/types
Authorization: Bearer <token>
```

### Get My Timeline
```http
GET /api/timeline/me?category=authentication&limit=50
Authorization: Bearer <token>
```

### Get Recent Activity
```http
GET /api/timeline/me/recent?limit=10
Authorization: Bearer <token>
```

### Timeline Statistics
```http
GET /api/timeline/me/stats
Authorization: Bearer <token>
```

### Search Timeline
```http
GET /api/timeline/me/search?q=login
Authorization: Bearer <token>
```

---

## KYC Platform

### Get KYC Config
```http
GET /api/kyc/config
Authorization: Bearer <token>
```

### Get My KYC
```http
GET /api/kyc/me
Authorization: Bearer <token>
```

### Update Personal Info
```http
PUT /api/kyc/me/personal
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15"
}
```

### Add Document
```http
POST /api/kyc/me/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "passport",
  "number": "A1234567",
  "documentUrls": ["https://example.com/front.jpg", "https://example.com/back.jpg"]
}
```

### Update Biometric
```http
PUT /api/kyc/me/biometric
Authorization: Bearer <token>
Content-Type: application/json

{
  "faceVerified": true,
  "livenessCheck": true,
  "livenessScore": 95,
  "faceMatchScore": 98
}
```

### Submit for Review
```http
POST /api/kyc/me/submit
Authorization: Bearer <token>
```

### Approve KYC (Admin)
```http
POST /api/kyc/user/:userId/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "All documents verified"
}
```

### Reject KYC (Admin)
```http
POST /api/kyc/user/:userId/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Document quality insufficient"
}
```

### List Pending Reviews (Admin)
```http
GET /api/kyc/pending
Authorization: Bearer <token>
```

---

## Consent Platform

### Get Consent Config
```http
GET /api/consent/config
```

### Get My Consent
```http
GET /api/consent/me
Authorization: Bearer <token>
```

### Update Consent
```http
PUT /api/consent/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "marketing",
  "permissions": {
    "email": true,
    "sms": false,
    "push": true
  }
}
```

### Grant Consent
```http
POST /api/consent/me/grant
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "data_processing",
  "purpose": "Service improvement",
  "legalBasis": "consent"
}
```

### Withdraw Consent
```http
POST /api/consent/me/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "marketing"
}
```

### Data Subject Rights

**Export (GDPR Article 15):**
```http
POST /api/consent/me/data/export
Authorization: Bearer <token>
```

**Delete (GDPR Article 17):**
```http
POST /api/consent/me/data/delete
Authorization: Bearer <token>
```

**Portability (GDPR Article 20):**
```http
POST /api/consent/me/data/portability
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "json"
}
```

**Rectification (GDPR Article 16):**
```http
POST /api/consent/me/data/rectify
Authorization: Bearer <token>
Content-Type: application/json

{
  "corrections": {
    "name": "Corrected Name",
    "address": "New Address"
  }
}
```

### Cookie Consent (Public)
```http
POST /api/consent/cookies
Content-Type: application/json

{
  "visitorId": "visitor-123",
  "functional": true,
  "analytics": false,
  "advertising": false
}
```

---

## Identity Federation

### Get Supported Providers
```http
GET /api/federation/identity-providers
```

### List All Providers
```http
GET /api/federation/providers
Authorization: Bearer <token>
```

### Register SAML Provider (Admin)
```http
POST /api/federation/providers/saml
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Enterprise SAML",
  "entityId": "https://corp.example.com",
  "ssoUrl": "https://idp.example.com/sso",
  "sloUrl": "https://idp.example.com/slo",
  "certificate": "-----BEGIN CERTIFICATE-----..."
}
```

### Register OAuth Provider (Admin)
```http
POST /api/federation/providers/oauth
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Google OAuth",
  "providerKey": "google",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret"
}
```

### Register OIDC Provider (Admin)
```http
POST /api/federation/providers/oidc
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Okta OIDC",
  "issuer": "https://dev-12345.okta.com",
  "clientId": "your-client-id",
  "clientSecret": "your-secret",
  "discoveryUrl": "https://dev-12345.okta.com/.well-known/openid-configuration"
}
```

### Initiate SSO
```http
POST /api/federation/sso/initiate
Content-Type: application/json

{
  "providerId": "oauth-abc123",
  "redirectUri": "https://yourapp.com/callback",
  "state": "random-state"
}
```

### SSO Callback
```http
POST /api/federation/sso/callback
Content-Type: application/json

{
  "sessionId": "sso-abc",
  "code": "auth-code",
  "state": "random-state",
  "profile": {
    "id": "external-id",
    "email": "user@example.com",
    "name": "John"
  }
}
```

### Get My SSO Links
```http
GET /api/federation/me/links
Authorization: Bearer <token>
```

### Unlink SSO Account
```http
DELETE /api/federation/me/links/:providerId
Authorization: Bearer <token>
```

### Get SAML Metadata
```http
GET /api/federation/saml/metadata
Authorization: Bearer <token>
```

---

## Identity Twin

### Get My Twin
```http
GET /api/twin/me
Authorization: Bearer <token>
```

### Refresh Twin
```http
POST /api/twin/me/refresh
Authorization: Bearer <token>
```

### Run Simulation
```http
POST /api/twin/me/simulate
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Engagement Campaign",
  "type": "engagement_campaign",
  "parameters": {}
}
```

**Simulation types:** `price_change`, `engagement_campaign`, `tier_upgrade`

### Get Predictions
```http
GET /api/twin/me/predictions
Authorization: Bearer <token>
```

### Get Twin Profile
```http
GET /api/twin/me/profile
Authorization: Bearer <token>
```

---

## Developer Identity

### Get Plans
```http
GET /api/developer/plans
```

### Get My Developer Profile
```http
GET /api/developer/me
Authorization: Bearer <token>
```

### Create Project
```http
POST /api/developer/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My App",
  "type": "web",
  "description": "My awesome app"
}
```

### Create App (OAuth Client)
```http
POST /api/developer/projects/:projectId/apps
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Web App",
  "type": "web",
  "redirectUris": ["https://myapp.com/callback"],
  "scopes": ["read:users"]
}
```

### Create Developer Key
```http
POST /api/developer/projects/:projectId/keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Production Key",
  "environment": "production",
  "scopes": ["read:users", "read:organizations"]
}
```

### List Project Keys
```http
GET /api/developer/projects/:projectId/keys
Authorization: Bearer <token>
```

### Revoke Key
```http
DELETE /api/developer/keys/:id
Authorization: Bearer <token>
```

### Get Usage Stats
```http
GET /api/developer/me/usage
Authorization: Bearer <token>
```

### Upgrade Plan
```http
POST /api/developer/me/upgrade
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan": "startup"
}
```

---

## Identity Verification

### Email Verification

**Send:**
```http
POST /api/verification/email/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Verify:**
```http
GET /api/verification/email/:token
```

**Check format:**
```http
POST /api/verification/email/check
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Phone Verification

**Send OTP:**
```http
POST /api/verification/phone/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "+919876543210"
}
```

**Verify OTP:**
```http
POST /api/verification/phone/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Check format:**
```http
POST /api/verification/phone/check
Content-Type: application/json

{
  "phone": "+919876543210"
}
```

### Domain Verification

**Initiate:**
```http
POST /api/verification/domain
Authorization: Bearer <token>
Content-Type: application/json

{
  "domain": "example.com",
  "method": "dns"  // or "meta_tag" or "file"
}
```

**Check:**
```http
POST /api/verification/domain/check
Authorization: Bearer <token>
Content-Type: application/json

{
  "domain": "example.com",
  "method": "dns",
  "token": "verification-token"
}
```

### Business Verification

**Create:**
```http
POST /api/verification/business
Authorization: Bearer <token>
Content-Type: application/json

{
  "businessId": "BIZ-001",
  "legalName": "Acme Corp",
  "registrationNumber": "REG123",
  "taxId": "TAX123"
}
```

**Get:**
```http
GET /api/verification/business/:id
Authorization: Bearer <token>
```

### Employee Verification

**Create:**
```http
POST /api/verification/employee
Authorization: Bearer <token>
Content-Type: application/json

{
  "employeeId": "EMP-001",
  "organizationId": "ORG-001",
  "email": "personal@gmail.com",
  "workEmail": "john@company.com",
  "department": "Engineering",
  "title": "Senior Engineer",
  "managerId": "user-abc"
}
```

---

## Appendix: Available Roles

| Role | Description |
|------|-------------|
| `superadmin` | Full system access |
| `org-owner` | Organization owner |
| `org-admin` | Organization administrator |
| `department-manager` | Department manager |
| `team-lead` | Team lead |
| `member` | Standard member |
| `viewer` | Read-only access |
| `guest` | Limited guest access |

## Appendix: Permission Categories

- `organization` - Organization management
- `department` - Department management
- `team` - Team management
- `user` - User management
- `role` - Role/permission management
- `api-key` - API key management
- `session` - Session management
- `audit` - Audit log access
- `billing` - Billing management
- `system` - System administration

---

*CorpID Cloud API Reference v4.0 - June 18, 2026*
