# Quick Start - Rez Now Setup

> **Create digital business cards with shareable QR codes**

---

## Overview

Rez Now enables:
- Digital business card creation
- QR code generation for profiles
- Social link sharing
- Profile view analytics
- Reclaim attribution tracking

---

## Prerequisites

- [Basic Setup Complete](./SETUP.md)
- Rez Now app running

---

## Step 1: Create Profile

### Via Dashboard

1. Go to `rez-now/profile/create`
2. Fill in profile details
3. Upload avatar (optional)
4. Add social links
5. Click "Create Profile"

### Via API

```bash
curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "title": "Hotel Manager",
    "email": "john@hotel.com",
    "phone": "+919876543210",
    "bio": "Passionate hospitality professional",
    "socialLinks": {
      "linkedin": "https://linkedin.com/in/johndoe",
      "twitter": "@johndoe"
    }
  }'

# Response
{
  "id": "PROFILE-uuid",
  "name": "John Doe",
  "qrUrl": "rez://profile/PROFILE-uuid",
  "webUrl": "https://reznow.app/profile/PROFILE-uuid"
}
```

---

## Step 2: Generate QR Code

### Auto-Generated

QR code is automatically generated when profile is created.

### Manual Generation

```bash
curl -X POST http://localhost:3000/api/profile/{profileId}/qr \
  -H "Authorization: Bearer {user_token}"

# Response
{
  "profileId": "PROFILE-uuid",
  "qrImage": "data:image/png;base64,...",
  "downloadUrl": "/api/profile/{profileId}/qr/download"
}
```

### Custom QR Options

```bash
curl -X POST http://localhost:3000/api/profile/{profileId}/qr \
  -H "Content-Type: application/json" \
  -d '{
    "style": "round",
    "color": "#6B46C1",
    "logo": "https://example.com/logo.png",
    "size": 400
  }'
```

---

## Step 3: Download and Share

### Download Options

| Format | Use Case |
|--------|----------|
| PNG | Digital sharing |
| PDF | Print-ready |
| SVG | Editable graphics |

### Share Links

- **Web Profile**: `https://reznow.app/profile/{id}`
- **QR Redirect**: `https://reznow.app/s/{slug}`

---

## Step 4: Configure Social Links

Supported platforms:

```typescript
const SOCIAL_PLATFORMS = [
  'linkedin',
  'twitter',
  'instagram',
  'facebook',
  'youtube',
  'tiktok',
  'whatsapp',
  'telegram',
  'website',
  'email',
  'phone',
  'address',
];
```

Update profile with links:

```bash
curl -X PUT http://localhost:3000/api/profile/{profileId} \
  -H "Content-Type: application/json" \
  -d '{
    "socialLinks": {
      "linkedin": "https://linkedin.com/in/johndoe",
      "twitter": "@johndoe",
      "whatsapp": "+919876543210",
      "website": "https://johndoe.com"
    }
  }'
```

---

## Step 5: Test the Flow

### Scan Test

1. Open camera/QR scanner
2. Scan profile QR
3. Verify profile page loads
4. Check all links work

### Analytics Test

```bash
# Check profile views
curl http://localhost:3000/api/profile/{profileId}/analytics

# Response
{
  "profileId": "PROFILE-uuid",
  "totalViews": 150,
  "viewsThisMonth": 45,
  "topCountries": ["India", "USA", "UK"],
  "deviceBreakdown": {
    "mobile": 120,
    "desktop": 30
  }
}
```

---

## Reclaim Attribution

Rez Now supports commission tracking via Reclaim.ai integration.

### Enable Reclaim

```env
RECLAIM_API_KEY=your-reclaim-key
RECLAIM_CALENDAR_ID=your-calendar-id
```

### Track Attribution

```bash
# Create reclaim link
curl -X POST http://localhost:3000/api/profile/{profileId}/reclaim \
  -H "Content-Type: application/json" \
  -d '{
    "destinationUrl": "https://cal.com/johndoe",
    "commission": 5
  }'

# Response
{
  "reclaimId": "RECLAIM-uuid",
  "shortUrl": "https://reznow.app/r/abc123",
  "commission": 5
}
```

---

## API Reference

### Create Profile
```
POST /api/profile

Request:
{
  "name": "John Doe",
  "title": "Hotel Manager",
  "email": "john@hotel.com",
  "phone": "+919876543210",
  "bio": "...",
  "socialLinks": {...}
}
```

### Get Profile
```
GET /api/profile/{id}

Response:
{
  "id": "PROFILE-uuid",
  "name": "John Doe",
  "title": "Hotel Manager",
  "avatar": "...",
  "socialLinks": {...},
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Update Profile
```
PUT /api/profile/{id}

Request:
{
  "name": "John Doe Jr",
  "title": "Senior Manager"
}
```

### Get Analytics
```
GET /api/profile/{id}/analytics

Response:
{
  "views": 150,
  "clicks": 45,
  "topLinks": [...]
}
```

---

## Database Schema

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  social_links JSONB DEFAULT '{}',
  slug VARCHAR(100) UNIQUE,
  qr_image_url TEXT,
  view_count INTEGER DEFAULT 0,
  wallet_balance DECIMAL(10,2) DEFAULT 0,
  reclaim_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  visitor_id UUID,
  device_type VARCHAR(50),
  country VARCHAR(100),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  platform VARCHAR(50),
  click_count INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## Troubleshooting

### QR not scanning
- Check QR image is not corrupted
- Verify URL scheme is correct
- Test with multiple scanners

### Profile not loading
- Check profile ID exists
- Verify public profile setting
- Review Supabase permissions

### Links not working
- Ensure URLs are complete (https://)
- Verify social platform names
- Check link validation

---

## Next Steps

| Task | Guide |
|------|-------|
| Set up Ads QR | [Ads QR Guide](./ADS-QR.md) |
| Full testing | [Testing Guide](./TESTING.md) |
| Integration | [QR Systems Guide](../QR-SYSTEMS-COMPLETE-GUIDE.md) |

---

## Flow Diagram

```
User creates profile
         │
         ▼
┌─────────────────┐
│ QR generated    │
│ automatically   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Download/Share  │
│ QR or link      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Attendee scans  │
│ QR at event     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ View profile    │
│ + social links  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click links     │
│ (LinkedIn, etc) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Analytics track │
│ view + clicks   │
└─────────────────┘
```
