# AdBazaar Dashboard

A comprehensive advertising dashboard for managing campaigns, tracking QR code scans, fraud detection, brand coins, and free samples distribution.

## Dashboard Overview

The AdBazaar dashboard provides a centralized platform for advertisers and vendors to manage their advertising campaigns with full attribution tracking.

### Key Features

- **Campaign Management**: Create, edit, pause, and monitor advertising campaigns
- **QR Code Generation**: Generate dynamic and static QR codes for ad attribution
- **Fraud Detection**: Real-time monitoring and blocking of suspicious scan activity
- **Brand Coins**: Loyalty coin system for rewarding customers
- **Free Samples**: Manage and distribute free product samples
- **Analytics**: Comprehensive analytics with attribution funnel and ROI tracking

## Campaigns

### Campaign Types

- **Billboard**: Traditional outdoor advertising spaces
- **Retail**: In-store advertising and promotions
- **Influencer**: Social media influencer partnerships
- **Digital**: Online and digital advertising

### Campaign Statuses

- `active` - Campaign is currently running
- `paused` - Campaign is temporarily paused
- `completed` - Campaign has finished
- `draft` - Campaign not yet published

### Campaign Features

- Budget allocation and spending tracking
- Multi-location support
- Performance metrics (scans, conversions, ROI)
- Quick actions (edit, pause, duplicate, delete)

## Fraud Detection

### Fraud Prevention Features

- **VPN Detection**: Identifies and blocks scans from VPN connections
- **Geo Mismatch**: Detects location inconsistencies
- **Rapid Scanning**: Flags unusual scanning patterns
- **Bot Pattern Detection**: Identifies automated scanning behavior
- **Duplicate Scan Detection**: Prevents multiple scans from same source

### Risk Score Distribution

- **Low Risk (0-25)**: Normal user activity
- **Medium Risk (26-50)**: Requires monitoring
- **High Risk (51-75)**: Suspicious activity
- **Critical Risk (76-100)**: Likely fraudulent, blocked automatically

### Suspicious Patterns

- Device clustering analysis
- Location anomaly detection
- Time-based pattern analysis
- Conversion fraud detection

## Brand Coins

### Brand Coin Features

- Create custom loyalty coins for your brand
- Define coin value, supply, and expiration
- Distribute coins to customers
- Track redemption statistics
- Manage multiple coin types

### Coin Management

- **Create**: Define name, symbol, value, supply, expiration
- **Distribute**: Grant coins to users via campaigns
- **Redeem**: Process coin redemptions for rewards
- **Track**: Monitor distribution and redemption rates

### Distribution History

Track all coin distributions with:
- Recipient information
- Campaign association
- Timestamp
- Amount

## Free Samples

### Sample Management

- Add and manage sample products
- Track inventory (available, claimed)
- Set expiration dates
- Categorize samples (Beauty, Food, Electronics, Health)

### Request Workflow

1. **Pending**: Customer requests a sample
2. **Approved**: Request approved by vendor
3. **Ready**: Sample prepared for pickup
4. **Claimed**: Customer picked up the sample

### QR Codes for Pickup

Each sample request generates a unique QR code for:
- Verification at pickup location
- Status tracking
- Fraud prevention

## Analytics

### Attribution Funnel

Track the complete customer journey:
1. **Impressions**: Ad views
2. **Scans**: QR code scans
3. **Visits**: Website/app visits
4. **Purchases**: Completed conversions

### Performance Metrics

- **Conversion Rate**: Purchases / Scans
- **Cost per Acquisition (CPA)**: Total spend / Conversions
- **Return on Ad Spend (ROAS)**: Revenue / Ad spend
- **Average Order Value (AOV)**: Total revenue / Orders

### Geographic Analysis

- Top performing locations
- Regional performance comparison
- Location-based optimization

### Device Breakdown

- Mobile vs Desktop vs Tablet
- Browser distribution
- Device-specific conversion rates

### Time Analysis

- Scans by hour of day
- Peak activity times
- Conversion patterns
- Day-of-week performance

## QR Codes

### QR Code Types

- **Static QR Codes**: Fixed destination URL, cannot be changed
- **Dynamic QR Codes**: Editable destination, trackable, more powerful

### QR Code Features

- Bulk generation
- Campaign association
- Multiple download formats (PNG, SVG, PDF)
- Print-ready labels
- Dynamic content updates

### Download Options

- **PNG**: High-resolution image
- **SVG**: Scalable vector format
- **PDF**: Print-ready with labels

## API Reference

### Fraud API

```
GET /api/fraud?endpoint=stats
GET /api/fraud?endpoint=blocked
GET /api/fraud?endpoint=suspicious
GET /api/fraud?endpoint=risk
```

### Brand Coins API

```
GET /api/brand-coins?endpoint=list
GET /api/brand-coins?endpoint=coin&coinId={id}
POST /api/brand-coins?action=create
POST /api/brand-coins?action=distribute
POST /api/brand-coins?action=redeem
```

### Samples API

```
GET /api/samples?endpoint=list
GET /api/samples?endpoint=sample&sampleId={id}
GET /api/samples?endpoint=requests
POST /api/samples?action=create
POST /api/samples?action=request
POST /api/samples?action=update-status
```

## Settings

### Profile Settings

- Update personal information
- Change avatar
- Manage contact details

### Notification Settings

- Email notifications
- Push notifications
- Alert preferences

### Security

- Password management
- Two-factor authentication
- Active session management

### Billing

- Current plan information
- Payment method management
- Billing history

### Integrations

- Google Analytics
- Facebook Pixel
- Shopify
- Mailchimp
- Slack

## Getting Started

1. **Create an account** on AdBazaar
2. **Set up your profile** with company information
3. **Create your first campaign** with QR codes
4. **Monitor performance** in the analytics dashboard
5. **Enable fraud protection** for secure attribution

## Support

For additional help, contact support@adbazaar.com
