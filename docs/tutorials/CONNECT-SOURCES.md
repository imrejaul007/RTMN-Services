# Tutorial: Connect Review Sources

**Integrate Google, Yelp, TripAdvisor, and Facebook reviews into BrandPulse.**

**Time:** 15 minutes per source
**Prerequisites:** BrandPulse account, API key, source credentials

---

## Supported Sources

| Source | Auth Method | API Access |
|--------|-------------|------------|
| Google Business Profile | OAuth 2.0 | Google Places API |
| Yelp | API Key | Yelp Fusion API |
| TripAdvisor | API Key | TripAdvisor Content API |
| Facebook | Page Access Token | Facebook Graph API |

---

## Step 1: Connect Google Business Profile

### Prerequisites

1. Have a Google Business Profile for your business
2. Verify ownership in Google Search Console

### OAuth Flow

```typescript
import { RTMNClient } from '@rtmn/sdk';

const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});

// Generate OAuth URL
const authUrl = await rtmn.sources.google.getAuthUrl({
  brandId: 'brand_abc123',
  redirectUri: 'https://your-app.com/oauth/callback'
});

console.log('Visit this URL to authorize:', authUrl);
// https://accounts.google.com/o/oauth2/auth?...
```

### Handle OAuth Callback

```typescript
// In your OAuth callback handler
app.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;

  // Exchange code for tokens
  const tokens = await rtmn.sources.google.exchangeCode({
    code,
    brandId: JSON.parse(Buffer.from(state, 'base64').toString()).brandId
  });

  // Store tokens securely
  await rtmn.sources.google.saveTokens({
    brandId: 'brand_abc123',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date
  });

  res.send('Google Business Profile connected successfully!');
});
```

### Manual Setup (API Key)

```typescript
// If you have a Google API Key
await rtmn.sources.connect({
  brandId: 'brand_abc123',
  type: 'google',
  config: {
    apiKey: process.env.GOOGLE_PLACES_API_KEY,
    placeId: 'ChIJN1t1De2pWR4RYVQNob5R2Vs' // Your Google Place ID
  }
});
```

---

## Step 2: Connect Yelp

### Prerequisites

1. Create a Yelp Fusion API app at [developers.yelp.com](https://developers.yelp.com)
2. Get your API Key

### Configuration

```typescript
await rtmn.sources.connect({
  brandId: 'brand_abc123',
  type: 'yelp',
  config: {
    apiKey: process.env.YELP_API_KEY,
    businessId: 'xM1j8VH4VZTaLGqm6vXXLQ' // Your Yelp Business ID
  }
});
```

### Verify Connection

```typescript
const status = await rtmn.sources.getStatus({
  brandId: 'brand_abc123',
  type: 'yelp'
});

console.log('Yelp connection status:', status);
// { connected: true, lastSync: '2026-06-15T10:30:00Z', reviewCount: 234 }
```

---

## Step 3: Connect TripAdvisor

### Prerequisites

1. Apply for TripAdvisor Content API at [tripadvisor.com/developers](https://www.tripadvisor.com/developers)
2. Get your API Key and Location ID

### Configuration

```typescript
await rtmn.sources.connect({
  brandId: 'brand_abc123',
  type: 'tripadvisor',
  config: {
    apiKey: process.env.TRIPADVISOR_API_KEY,
    locationId: '12345' // Your TripAdvisor Location ID
  }
});
```

### Find Your TripAdvisor Location ID

```typescript
// Search for your business
const results = await rtmn.sources.tripadvisor.search({
  query: 'Grand Hotel NYC',
  location: 'New York, NY'
});

console.log('Location ID:', results.locations[0].locationId);
// 12345
```

---

## Step 4: Connect Facebook

### Prerequisites

1. Have a Facebook Page for your business
2. Get a Page Access Token with `pages_read_engagement` permission

### Configuration

```typescript
await rtmn.sources.connect({
  brandId: 'brand_abc123',
  type: 'facebook',
  config: {
    pageAccessToken: process.env.FACEBOOK_PAGE_TOKEN,
    pageId: '123456789012345' // Your Facebook Page ID
  }
});
```

### Get a Page Access Token

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a Facebook App (App Type: Business)
3. Add Facebook Login product
4. Get a short-lived token from Graph API Explorer
5. Exchange for long-lived token:
   ```
   GET https://graph.facebook.com/v18.0/oauth/access_token?
     grant_type=fb_exchange_token&
     client_id=YOUR_APP_ID&
     client_secret=YOUR_APP_SECRET&
     fb_exchange_token=SHORT_LIVED_TOKEN
   ```

---

## Step 5: Verify All Connections

```typescript
// Check all sources for a brand
const allSources = await rtmn.sources.list({
  brandId: 'brand_abc123'
});

console.log('Connected sources:');
allSources.data.forEach(source => {
  console.log(`  ${source.type}: ${source.status} (${source.reviewCount} reviews)`);
});
```

Output:
```
Connected sources:
  google: connected (342 reviews)
  yelp: connected (156 reviews)
  tripadvisor: connected (89 reviews)
  facebook: connected (67 reviews)
```

---

## Step 6: Trigger Initial Sync

```typescript
// Sync all sources
await rtmn.sources.sync({
  brandId: 'brand_abc123',
  sources: ['google', 'yelp', 'tripadvisor', 'facebook']
});

// Monitor sync progress
const syncStatus = await rtmn.sources.getSyncStatus({
  brandId: 'brand_abc123'
});

console.log('Sync progress:', syncStatus);
// { google: 'complete', yelp: 'complete', tripadvisor: 'in_progress', facebook: 'pending' }
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Google OAuth error | Ensure redirect URI matches exactly in Google Console |
| Yelp 403 error | Check API key is active and has correct permissions |
| TripAdvisor rate limit | Yelp limits 5000 req/day; contact them for increase |
| Facebook token expired | Re-authorize; long-lived tokens expire after 60 days |
| No reviews found | Check that location IDs match across all sources |

---

## Auto-Sync Schedule

BrandPulse syncs review sources automatically:

| Source | Default Frequency | Configurable |
|--------|------------------|---------------|
| Google | Every 15 minutes | Yes (min 5 min) |
| Yelp | Every 30 minutes | Yes (min 15 min) |
| TripAdvisor | Every 30 minutes | Yes (min 15 min) |
| Facebook | Every 30 minutes | Yes (min 15 min) |

To change sync frequency:

```typescript
await rtmn.sources.updateSyncSchedule({
  brandId: 'brand_abc123',
  type: 'google',
  frequency: '5m' // 5 minutes
});
```

---

## Next Steps

- [Set Up Sentiment Alerts](SENTIMENT-ALERTS.md)
- [Build Your First Dashboard](BRAND-DASHBOARD.md)
- [API Reference: Sources](docs/api-reference/BRANDPULSE-API.md#sources)
