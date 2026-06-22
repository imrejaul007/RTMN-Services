# Tally/ERP Export and Channel Manager Implementation

## Overview

This document describes the implementation of two major features for the REZ Merchant platform:

1. **Tally/ERP Export** - Export accounting data in Tally-compatible XML format
2. **Channel Manager** - Manage OTA (Online Travel Agency) integrations

---

## A. Tally/ERP Export

### Service Location
`/rez-merchant-service/src/services/tallyExport.ts`

### Features

#### 1. Tally XML Export
- Generate Tally-compatible XML format for Tally ERP 9 and Tally Prime
- Support for:
  - Sales invoices
  - Purchase data
  - Expenses
- Proper ledger entries with CGST/SGST split

#### 2. GST Reports
- **GSTR-1**: Outward supplies summary
  - Invoice-wise details
  - Tax collected (CGST, SGST, IGST, Cess)
  - B2B and B2C classification

- **GSTR-3B**: Tax liability summary
  - Taxable value calculation
  - Intra-state vs Inter-state supplies
  - Total tax liability

#### 3. CSV Export
- Export transactions in CSV format
- Compatible with Zoho Books, QuickBooks, and Excel

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/merchant/export/tally` | Generate Tally XML export |
| GET | `/merchant/export/csv` | Generate CSV export |
| GET | `/merchant/export/gstr1` | Get GSTR-1 data |
| GET | `/merchant/export/gstr3b` | Get GSTR-3B data |
| GET | `/merchant/export/report` | Get comprehensive sales report |

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `storeId` | string | Store ID (required) | `60f7c2...` |
| `fromMonth` | string | Start month (YYYY-MM) | `2024-01` |
| `toMonth` | string | End month (YYYY-MM) | `2024-03` |
| `type` | string | Export type: `sales`, `purchase`, `expense` | `sales` |
| `month` | string | Period month (YYYY-MM) | `2024-01` |

### Usage Examples

#### Tally XML Export
```bash
curl -X GET "http://localhost:3007/api/merchant/export/tally?storeId=xxx&fromMonth=2024-01&toMonth=2024-03&type=sales" \
  -H "Authorization: Bearer <token>"
```

#### GSTR-1 Export
```bash
curl -X GET "http://localhost:3007/api/merchant/export/gstr1?storeId=xxx&month=2024-01" \
  -H "Authorization: Bearer <token>"
```

### Data Models

```typescript
interface GSTR1Record {
  invoiceNumber: string;
  invoiceDate: string;
  customerGstin: string;
  customerName: string;
  invoiceValue: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  placeOfSupply: string;
  reverseCharge: boolean;
  invoiceType: 'B2B' | 'B2C';
}

interface GSTR3BRecord {
  period: string;
  gstin: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  interStateSupplies: { taxableValue: number; amount: number };
  intraStateSupplies: { taxableValue: number; amount: number };
}
```

### Tally XML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<DATA>
  <HEADER>
    <VERSION>1</VERSION>
    <TallBaseLang>en-IN</TallBaseLang>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <VOUCHER>
        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
        <VOUCHERNUMBER>ORD-001</VOUCHERNUMBER>
        <DATE>20240115</DATE>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Sundry Debtors</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>1180Dr</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Sales</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>1000Cr</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Output CGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>90Cr</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Output SGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>90Cr</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    </IMPORTDATA>
  </BODY>
</DATA>
```

---

## B. Channel Manager (OTA Integration)

### Service Location
`/rez-merchant-service/src/services/channelManager.ts`

### Supported Channels

| Channel | Channel Type | Status |
|---------|-------------|--------|
| Booking.com | `booking_com` | Active |
| Expedia | `expedia` | Active |
| Airbnb | `airbnb` | Active |
| MakeMyTrip | `makemytrip` | Active |
| Goibibo | `goibibo` | Active |

### Features

#### 1. Channel Connection
- Connect/disconnect OTA channels
- API key and property ID authentication
- Connection status tracking

#### 2. Sync Settings
- Auto-sync availability (real-time, hourly, daily)
- Auto-sync rates
- Manual sync triggers
- Sync status monitoring

#### 3. Booking Management
- Pull bookings from all connected channels
- Filter by channel, status, date
- Booking details (guest info, check-in/out, amounts)

#### 4. Revenue Tracking
- Per-channel revenue breakdown
- Commission tracking
- Net revenue calculation

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/merchant/channels` | Get all channels |
| GET | `/merchant/channels/connected` | Get connected channels |
| POST | `/merchant/channels/connect` | Connect a channel |
| POST | `/merchant/channels/disconnect` | Disconnect a channel |
| PATCH | `/merchant/channels/settings` | Update sync settings |
| GET | `/merchant/channels/sync` | Get sync status |
| POST | `/merchant/channels/sync/availability` | Sync availability |
| GET | `/merchant/channels/bookings` | Get channel bookings |
| GET | `/merchant/channels/revenue` | Get revenue stats |

### Data Models

```typescript
interface ChannelConfig {
  channelType: 'booking_com' | 'expedia' | 'airbnb' | 'makemytrip' | 'goibibo';
  channelName: string;
  isConnected: boolean;
  credentials: {
    apiKey?: string;
    propertyId?: string;
    secretKey?: string;
    propertyCode?: string;
  };
  syncSettings: {
    autoSyncAvailability: boolean;
    autoSyncRates: boolean;
    syncFrequency: 'realtime' | 'hourly' | 'daily';
    lastSyncAt?: Date;
  };
  metadata: {
    connectedAt?: Date;
    connectionStatus: 'active' | 'inactive' | 'error' | 'pending';
    errorMessage?: string;
    apiCallsUsed?: number;
    apiCallsLimit?: number;
  };
}

interface ChannelBooking {
  bookingId: string;
  channelType: string;
  channelBookingId: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  roomType: string;
  totalAmount: number;
  commission: number;
  netAmount: number;
  status: 'confirmed' | 'cancelled' | 'modified' | 'pending' | 'completed';
}

interface ChannelRevenue {
  channelType: string;
  totalBookings: number;
  grossRevenue: number;
  commission: number;
  netRevenue: number;
  averageBookingValue: number;
  occupancyRate: number;
}
```

### Usage Examples

#### Connect a Channel
```bash
curl -X POST "http://localhost:3007/api/merchant/channels/connect" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "storeId": "xxx",
    "channelType": "booking_com",
    "credentials": {
      "apiKey": "your-api-key",
      "propertyId": "your-property-id"
    }
  }'
```

#### Get Channel Bookings
```bash
curl -X GET "http://localhost:3007/api/merchant/channels/bookings?storeId=xxx&limit=50" \
  -H "Authorization: Bearer <token>"
```

#### Get Revenue
```bash
curl -X GET "http://localhost:3007/api/merchant/channels/revenue?storeId=xxx&fromDate=2024-01-01&toDate=2024-01-31" \
  -H "Authorization: Bearer <token>"
```

---

## Merchant App Screens

### Tally Export Screen
**Location**: `/rez-app-marchant/app/documents/tally-export.tsx`

**Features**:
- Month/year selector for date range
- Export type selector (Sales, Purchase, Expense)
- Tally XML download
- CSV export
- GSTR-1 and GSTR-3B views
- Download GST reports as JSON

**Navigation**: Documents > Export for Accountant

### Channel Manager Screen
**Location**: `/rez-app-marchant/app/channels/index.tsx`

**Features**:
- List of all OTA channels
- Connect/disconnect channels
- Toggle sync settings
- View sync status
- Bookings list with filters
- Revenue statistics per channel

**Navigation**: Home > Channel Manager

---

## Implementation Details

### File Structure

```
rez-merchant-service/
├── src/
│   ├── services/
│   │   ├── tallyExport.ts       # Tally export service
│   │   └── channelManager.ts    # Channel manager service
│   ├── routes/
│   │   ├── tallyExport.ts       # Export API routes
│   │   └── channelManager.ts   # Channel API routes
│   └── index.ts                 # Updated with new routes

rez-app-marchant/
├── app/
│   ├── documents/
│   │   └── tally-export.tsx     # Tally export screen
│   └── channels/
│       └── index.tsx            # Channel manager screen
└── services/
    └── api/
        ├── tallyExport.ts       # Export API service
        └── channels.ts         # Channel API service
```

### Authentication
Both features use `merchantAuth` middleware for authentication. All API calls require:
- Valid merchant authentication token
- Store ID in query/body parameters

### Security Considerations
1. **Tally Export**: Data is generated server-side and returned as XML/CSV
2. **Channel Manager**: Credentials are stored but not exposed in API responses
3. **Sync Status**: Only aggregated statistics are exposed, not raw API responses

### Error Handling
All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

### Future Enhancements
1. **Tally Export**:
   - Push directly to Tally via Tally Gateway
   - Auto-sync to accounting software
   - Invoice reconciliation

2. **Channel Manager**:
   - Real-time booking notifications
   - Dynamic pricing integration
   - Multi-property support
   - Channel-specific widgets

---

## Testing

### Tally Export Tests
```typescript
// Test GSTR-1 generation
const gstr1 = await TallyExportService.generateGSTR1(
  merchantId,
  storeId,
  1, // January
  2024
);

// Test Tally XML generation
const xml = await TallyExportService.generateSalesXML(
  merchantId,
  storeId,
  startDate,
  endDate
);
```

### Channel Manager Tests
```typescript
// Test channel connection
const channel = await ChannelManagerService.connectChannel(
  merchantId,
  storeId,
  'booking_com',
  { apiKey: 'test-key', propertyId: 'test-property' }
);

// Test booking fetch
const { bookings, total } = await ChannelManagerService.getChannelBookings(
  merchantId,
  storeId,
  { status: 'confirmed', limit: 50 }
);
```

---

## Deployment Notes

1. **Environment Variables**:
   - No new environment variables required
   - Uses existing MongoDB and Redis connections

2. **Database Changes**:
   - New collection `channel_credentials` for storing OTA credentials
   - Uses existing `orders` and `expenses` collections

3. **Caching**:
   - Sync status cached in Redis
   - Channel configurations cached per merchant

4. **Rate Limiting**:
   - Standard API rate limits apply
   - OTA sync endpoints have additional throttling
