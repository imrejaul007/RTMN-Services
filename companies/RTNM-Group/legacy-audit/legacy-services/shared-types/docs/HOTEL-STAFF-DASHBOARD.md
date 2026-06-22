# Hotel Staff Dashboard - Complete Implementation Guide

## Overview

The Hotel Staff Dashboard is a comprehensive system for managing hotel room service requests, staff assignments, SLA tracking, and real-time communication. Built with Next.js for the frontend and Express.js for the backend.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │Dashboard│ │Requests │ │ Rooms   │ │Messages │ │Checkout │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Server (Express)                          │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐│
│  │ Auto-Assignment  │ │  SLA Tracking    │ │  Notifications   ││
│  │    Service      │ │    Service       │ │    Service       ││
│  └──────────────────┘ └──────────────────┘ └──────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│    Prisma DB     │ │   Socket.io     │ │  Push/SMS/WA     │
│                  │ │   Real-time     │ │  Notifications   │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

## Features

### 1. Dashboard Overview (`/staff`)
- Today's statistics at a glance
- Quick actions for common tasks
- Recent activity feed
- Notification center
- Room status overview

### 2. Request Management (`/staff/requests`)
- **Kanban Board**: Visual workflow with columns (Pending, Assigned, In Progress, Completed)
- **Drag and Drop**: Move requests between columns
- **Auto-Assignment**: Automatically assign to best available staff
- **Filters**: By type, priority, room number
- **SLA Timers**: Visual countdown for each request

### 3. Room Management (`/staff/rooms`)
- **Room Grid**: Visual room status map
- **Status Indicators**: Occupied, Vacant, Cleaning, Maintenance
- **Guest Information**: Current guest details
- **Pending Requests Badge**: Quick view of pending tasks per room
- **Quick Actions**: Update room status instantly

### 4. Guest Messaging (`/staff/messages`)
- **Conversation List**: All guest threads
- **Real-time Chat**: Instant messaging with guests
- **Quick Replies**: Pre-defined responses
- **Escalation**: Forward to manager
- **Message Status**: Read receipts

### 5. Checkout Management (`/staff/checkout`)
- **Scheduled Checkouts**: Today's departures
- **Pending Requests**: Checkouts with pending service requests
- **Bill Review**: View and manage charges
- **Late Checkout**: Approve extended stays
- **Status Tracking**: Pending, Approved, Completed

### 6. Performance Metrics (`/staff/performance`)
- **Staff Rankings**: Based on requests, response time, SLA compliance
- **Team Statistics**: Overall performance
- **Response Time Trends**: Historical data
- **SLA Compliance**: Per department and overall

### 7. Reports (`/staff/reports`)
- **Daily/Weekly/Monthly Reports**: Flexible time ranges
- **Requests by Type**: Breakdown of service categories
- **Response Time Analysis**: Trends and averages
- **SLA Compliance Reports**: Detailed breakdowns
- **Export Options**: PDF and CSV formats

### 8. Mobile App (`/mobile/src/screens/StaffApp.tsx`)
- **Mobile-optimized Interface**: For staff on the go
- **Real-time Notifications**: Push alerts
- **Request Management**: Accept, start, complete tasks
- **Guest Messaging**: Chat interface
- **Status Updates**: Online, Busy, On Break

## Auto-Assignment System

### Algorithm
The auto-assignment service uses a weighted scoring system:

```
Score = (Load Score × 0.4) + (Location Score × 0.3) + (Skill Score × 0.3)
```

### Factors
1. **Current Load**: Staff with fewer tasks get higher scores
2. **Location**: Closer staff (same floor) get higher scores
3. **Skills**: Staff with matching skills get higher scores

### Service-to-Department Mapping
```typescript
const SERVICE_TO_DEPARTMENT = {
  housekeeping: ['housekeeping'],
  room_service: ['room_service', 'food_beverage'],
  spa: ['spa', 'wellness'],
  laundry: ['laundry'],
  maintenance: ['maintenance', 'engineering'],
  concierge: ['concierge'],
  transport: ['concierge', 'transport'],
};
```

## SLA Tracking

### Targets (in minutes)
| Service Type | Target Time |
|-------------|-------------|
| Housekeeping | 30 min |
| Room Service | 20 min |
| Spa & Wellness | 60 min |
| Laundry | 120 min |
| Maintenance | 45 min |
| Concierge | 15 min |
| Transport | 30 min |
| Minibar | 15 min |

### Status Thresholds
- **OK**: < 75% of target time
- **Warning**: 75-100% of target time
- **Breach**: > 100% of target time

### Alerts
- **Warning Notification**: At 75% threshold
- **Breach Alert**: When SLA is exceeded
- **Manager Notification**: For urgent breaches

## Real-time Updates

### WebSocket Events
```typescript
// Request events
'request:created'      // New request submitted
'request:updated'      // Status changed
'request:assigned'      // Assigned to staff
'request:completed'    // Marked done

// SLA events
'sla:warning'          // Approaching limit
'sla:breach'           // SLA exceeded

// Message events
'message:new'          // New guest message
'message:read'         // Message read

// Checkout events
'checkout:requested'   // Checkout requested
'checkout:completed'   // Checkout done
```

### Namespaces
- `/staff` - Staff dashboard
- `/kitchen` - Kitchen display
- `/admin` - Hotel admin

## Notifications

### Channels
1. **Push Notifications**: Via FCM (Firebase Cloud Messaging)
2. **SMS**: Via Twilio
3. **WhatsApp**: Via Twilio WhatsApp
4. **Email**: Standard email

### Notification Types
- New request assigned
- SLA warning (75% threshold)
- SLA breach
- Guest message received
- Checkout reminder

### Quiet Hours
- Configurable quiet hours (e.g., 10 PM - 7 AM)
- Urgent notifications still sent during quiet hours
- Other notifications queued

## API Reference

### Staff Dashboard Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/staff/dashboard` | Dashboard statistics |
| GET | `/v1/staff/requests` | List all requests |
| GET | `/v1/staff/requests/:id` | Request details |
| PUT | `/v1/staff/requests/:id/status` | Update status |
| PUT | `/v1/staff/requests/:id/assign` | Assign to staff |
| POST | `/v1/staff/auto-assign` | Auto-assign request |
| GET | `/v1/staff/:staffId/load` | Staff workload |
| GET | `/v1/staff/requests/:id/sla` | SLA status |
| GET | `/v1/staff/requests/sla-alerts` | All SLA alerts |
| GET | `/v1/staff/rooms` | Room list |
| PUT | `/v1/staff/rooms/:id/status` | Update room status |
| GET | `/v1/staff/messages` | Conversations |
| GET | `/v1/staff/messages/:threadId` | Thread messages |
| POST | `/v1/staff/messages/:threadId` | Send message |
| GET | `/v1/staff/checkouts` | Checkout list |
| POST | `/v1/staff/checkout/:id/approve` | Approve checkout |
| GET | `/v1/staff/performance` | Staff performance |
| GET | `/v1/staff/reports` | Generate reports |

## File Structure

```
Hotel OTA/
├── apps/
│   ├── ota-web/src/app/staff/
│   │   ├── page.tsx                    # Dashboard overview
│   │   ├── _layout.tsx                 # Layout with sidebar
│   │   ├── requests/page.tsx           # Kanban board
│   │   ├── rooms/page.tsx              # Room management
│   │   ├── messages/page.tsx           # Guest messaging
│   │   ├── checkout/page.tsx           # Checkout management
│   │   ├── performance/page.tsx        # Staff metrics
│   │   └── reports/page.tsx            # Reports & analytics
│   │
│   ├── api/src/
│   │   ├── routes/staff/
│   │   │   └── staff-dashboard.routes.ts  # All staff routes
│   │   ├── services/
│   │   │   ├── room/
│   │   │   │   ├── autoAssignment.ts    # Auto-assignment logic
│   │   │   │   └── slaTracking.ts        # SLA monitoring
│   │   │   └── notifications/
│   │   │       └── staff.ts             # Push/SMS/WhatsApp
│   │   └── socket/
│   │       └── staffSocket.ts           # WebSocket handlers
│   │
│   └── mobile/src/screens/
│       └── StaffApp.tsx                 # Mobile staff interface
│
└── docs/
    └── HOTEL-STAFF-DASHBOARD.md        # This documentation
```

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# FCM (Push Notifications)
FCM_ENABLED=true
FCM_SERVER_KEY=...

# Twilio (SMS/WhatsApp)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...
TWILIO_WHATSAPP_FROM=...

# Socket.io
FRONTEND_URL=https://your-domain.com
```

### Database Models

```prisma
model RoomServiceRequest {
  id            String   @id @default(uuid())
  hotelId       String
  roomId        String?
  roomNumber    String
  bookingId     String?
  guestName     String?
  serviceType   String
  description   String?
  status        String   @default("pending")
  priority      String   @default("medium")
  assignedTo    String?
  assignedToName String?
  assignedAt    DateTime?
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Staff {
  id           String   @id @default(uuid())
  hotelId      String
  name         String
  department   String
  phone        String?
  deviceTokens String[] // For push notifications
  status       String   @default("online")
  createdAt    DateTime @default(now())
}
```

## Getting Started

1. **Install Dependencies**
   ```bash
   cd Hotel OTA
   npm install
   ```

2. **Set up Database**
   ```bash
   npx prisma migrate dev
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Run API Server**
   ```bash
   cd apps/api
   npm run dev
   ```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- staff-dashboard.test.ts

# Run with coverage
npm run test:coverage
```

## Deployment

### Frontend (Vercel)
```bash
npm run build
vercel deploy
```

### API (Railway/Fly.io/Docker)
```bash
docker build -t hotel-staff-api .
docker run -p 3000:3000 hotel-staff-api
```

## Support

For issues or feature requests, please contact the development team.
