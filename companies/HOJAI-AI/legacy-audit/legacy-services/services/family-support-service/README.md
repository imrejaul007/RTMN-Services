# HOJAI Family Support Integration Service

**Port: 4599**

A comprehensive service for HOJAI AI that links family/care circles to support, enabling family members to help with support issues.

## Features

- **Family Support Links**: Connect family members to a customer's support account with granular permissions
- **Support Delegation**: Delegate specific support actions to trusted family members
- **Family Notifications**: Real-time notifications to family members for bookings, prescriptions, appointments, etc.
- **Care Circle Integration**: Sync support access with care circles
- **WhatsApp Notifications**: Send important alerts via WhatsApp
- **Support Sharing**: Share support issues and resolutions with family
- **Emergency Access**: Grant emergency access to family members in critical situations

## Architecture

```
family-support-service/
├── src/
│   ├── models/
│   │   └── familySupport.ts       # Mongoose models and schemas
│   ├── services/
│   │   ├── linkageService.ts      # Family link management
│   │   ├── delegationService.ts  # Delegation handling
│   │   ├── notificationService.ts # Multi-channel notifications
│   │   ├── careCircleIntegration.ts # Care circle sync
│   │   ├── whatsAppNotificationService.ts # WhatsApp messaging
│   │   └── supportSharingService.ts # Sharing logic
│   ├── routes/
│   │   └── familySupportRoutes.ts # API endpoints
│   ├── middleware/
│   │   └── validation.ts         # Zod validation
│   ├── utils/
│   │   └── logger.ts             # Structured logging
│   └── index.ts                  # Application entry
├── package.json
├── tsconfig.json
└── README.md
```

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Production
npm start
```

## Environment Variables

```env
PORT=4599
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/family-support-service
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
LOG_LEVEL=info

# WhatsApp (optional)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
```

## API Endpoints

### Family Links

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/family/link` | Link family member to support |
| GET | `/api/v1/family/links/:customerId` | Get all family links |
| DELETE | `/api/v1/family/link/:linkId` | Remove family link |
| PUT | `/api/v1/family/link/:linkId/permissions` | Update permissions |

### Delegations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/family/delegation` | Create delegation |
| GET | `/api/v1/family/delegations/:customerId` | Get delegations |
| DELETE | `/api/v1/family/delegation/:delegationId` | Revoke delegation |
| POST | `/api/v1/family/delegation/:delegationId/accept` | Accept delegation |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/family/notify` | Send notification |
| GET | `/api/v1/family/notifications/:memberId` | Get notifications |
| PUT | `/api/v1/family/notifications/:notificationId/read` | Mark as read |

### Sharing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/family/share` | Share with family |
| GET | `/api/v1/family/shared/:customerId` | Get shared items |
| DELETE | `/api/v1/family/share/:shareId` | Revoke share |

### Care Circle

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/family/carecircle/link` | Link care circle |
| GET | `/api/v1/family/carecircle/:customerId` | Get circle info |
| DELETE | `/api/v1/family/carecircle/:customerId/:careCircleId` | Unlink circle |

### Emergency Access

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/family/emergency/access` | Grant emergency access |
| GET | `/api/v1/family/emergency/:customerId` | Get emergency access |
| DELETE | `/api/v1/family/emergency/:customerId` | Revoke access |

### History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/family/history/:customerId` | Get support history |

## Data Models

### Support Permission Types

- `VIEW_BOOKINGS` - View booking information
- `MANAGE_BOOKINGS` - Create/modify bookings
- `VIEW_PRESCRIPTIONS` - View prescriptions
- `MANAGE_PRESCRIPTIONS` - Manage prescriptions
- `VIEW_APPOINTMENTS` - View appointments
- `MANAGE_APPOINTMENTS` - Manage appointments
- `VIEW_MEDICAL_RECORDS` - Access medical records
- `VIEW_SUPPORT_ISSUES` - View support tickets
- `CREATE_SUPPORT_ISSUES` - Create support tickets
- `RESOLVE_SUPPORT_ISSUES` - Resolve issues
- `VIEW_BILLING` - View billing information
- `MANAGE_BILLING` - Manage billing
- `VIEW_NOTIFICATIONS` - View notifications
- `EMERGENCY_ACCESS` - Emergency access
- `ALL_ACCESS` - Full access

### Notification Types

- `BOOKING_CREATED` - New booking
- `BOOKING_UPDATED` - Booking changed
- `BOOKING_CANCELLED` - Booking cancelled
- `PRESCRIPTION_ADDED` - New prescription
- `PRESCRIPTION_UPDATED` - Prescription updated
- `APPOINTMENT_REMINDER` - Appointment reminder
- `APPOINTMENT_CANCELLED` - Appointment cancelled
- `SUPPORT_ISSUE_CREATED` - New support ticket
- `SUPPORT_ISSUE_UPDATED` - Ticket updated
- `SUPPORT_RESOLVED` - Issue resolved
- `EMERGENCY_ALERT` - Emergency alert
- `DELEGATION_REQUEST` - Delegation request
- `DELEGATION_ACCEPTED` - Delegation accepted
- `DELEGATION_REVOKED` - Delegation revoked
- `CARE_CIRCLE_UPDATE` - Care circle update

## Example Usage

### Link a Family Member

```bash
curl -X POST http://localhost:4599/api/v1/family/link \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "customer_123",
    "familyMemberId": "family_member_456",
    "familyMemberName": "Jane Doe",
    "relationship": "Spouse",
    "permissions": {
      "permissions": ["VIEW_BOOKINGS", "VIEW_PRESCRIPTIONS", "VIEW_APPOINTMENTS"],
      "canManageBookings": true,
      "canCreateSupportTickets": true
    }
  }'
```

### Send Notification to Family

```bash
curl -X POST http://localhost:4599/api/v1/family/notify \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer_123",
    "customerName": "John Doe",
    "type": "BOOKING_CREATED",
    "title": "New Appointment",
    "message": "You have a new appointment scheduled",
    "data": {
      "bookingId": "booking_789",
      "date": "2026-06-15",
      "time": "10:00 AM"
    },
    "channels": ["in_app", "push", "whatsapp"]
  }'
```

### Grant Emergency Access

```bash
curl -X POST http://localhost:4599/api/v1/family/emergency/access \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer_123",
    "grantedTo": ["emergency_contact_1", "emergency_contact_2"],
    "accessLevel": "full_access",
    "reason": "Primary emergency contact",
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

## Health Check

```bash
curl http://localhost:4599/health
```

## License

Proprietary - RTNM Group
