# AdBazaar - Customer Growth Platform

**Last Updated:** June 16, 2026  
**Location:** `companies/AdBazaar/`  
**Status:** ✅ **PRODUCTION READY** - 157 Services | 30 Connected to RTMN OS

---

## Overview

AdBazaar provides the complete customer growth platform for the RTMN ecosystem. Connected via **Layer 2 (Customer Growth)** to all 25 Industry OS services.

---

## Connected Services (30)

### CRM & Customer (2)

| Service | Port | Purpose |
|---------|------|---------|
| crmHub | 4056 | Customer database, contact management, 360° view |
| leadIntelligence | 4057 | Lead scoring, intent signals, pipeline management |

### Ads & Campaigns (6)

| Service | Port | Purpose |
|---------|------|---------|
| adsApi | 4060 | Ad campaign management, creative serving |
| adAi | 4061 | AI-powered ad optimization, auto-bidding |
| aiCampaignBuilder | 4062 | Drag-and-drop campaign builder |
| dspPortal | 4063 | DSP portal for programmatic ad buying |
| programmaticBidding | 4064 | Real-time bidding automation |
| emailCampaign | 4065 | Email marketing, automation flows |

### Loyalty & Rewards (5)

| Service | Port | Purpose |
|---------|------|---------|
| loyaltyService | 4070 | Points system, tier management |
| anniversaryRewards | 4071 | Anniversary celebration campaigns |
| birthdayRewards | 4072 | Birthday rewards automation |
| gamification | 4073 | Game mechanics, challenges, badges |
| referralGraph | 4074 | Referral tracking, multi-level rewards |

### Creator & Influencer (3)

| Service | Port | Purpose |
|---------|------|---------|
| creatorStudio | 4080 | Creator campaign management, collaboration |
| creatorCommerce | 4081 | Creator storefront, affiliate products |
| ugcManagement | 4082 | User generated content moderation |

### Analytics & Intelligence (4)

| Service | Port | Purpose |
|---------|------|---------|
| marketingAnalytics | 4090 | Marketing dashboard, attribution |
| mediaAnalytics | 4091 | Social media analytics, engagement |
| intelligenceBridge | 4092 | Cross-platform intelligence aggregation |
| revenueIntelligence | 4093 | Revenue attribution, ROI tracking |

### DOOH & Display (3)

| Service | Port | Purpose |
|---------|------|---------|
| doohService | 4100 | Digital signage network management |
| doohSdk | 4101 | DOOH integration SDK |
| videoAds | 4102 | Video ad serving, pre-roll |

### Chat & Widgets (2)

| Service | Port | Purpose |
|---------|------|---------|
| liveChat | 4110 | Live chat widget, visitor tracking |
| feedbackService | 4111 | Feedback collection, NPS surveys |

### Intent & Audience (2)

| Service | Port | Purpose |
|---------|------|---------|
| intentExchange | 4120 | Purchase intent signals marketplace |
| audienceMarketplace | 4121 | Audience segments, targeting |

---

## RTMN OS Endpoints

```
# CRM & Leads
GET  /api/crm/contacts        - Get all contacts
POST /api/crm/contacts        - Create contact
GET  /api/crm/leads           - Get leads

# Ads & Campaigns
GET  /api/ads/campaigns       - Get ad campaigns
POST /api/ads/campaigns       - Create campaign
GET  /api/ads/budget         - Get ad budget
POST /api/ads/ai-optimize     - AI optimization

# Loyalty & Rewards
GET  /api/loyalty/points      - Get loyalty points
POST /api/loyalty/points      - Update points
GET  /api/loyalty/rewards     - Get rewards
GET  /api/loyalty/gamification - Get games
GET  /api/loyalty/referrals   - Get referrals

# Creator & Influencer
GET  /api/creator/campaigns   - Get campaigns
GET  /api/creator/influencers - Get influencers
GET  /api/creator/commerce    - Get products
GET  /api/creator/ugc         - Get UGC

# Analytics
GET  /api/analytics/marketing - Marketing dashboard
GET  /api/analytics/media     - Media insights
GET  /api/analytics/revenue  - Revenue report

# DOOH
GET  /api/dooh/screens       - Get screens
GET  /api/dooh/campaigns     - DOOH campaigns
GET  /api/dooh/video-ads     - Video ads

# Chat & Feedback
GET  /api/chat/widget        - Chat widget config
POST /api/chat/message        - Send message
GET  /api/feedback           - Get feedback

# Audience
GET  /api/audience/targets   - Get audiences
GET  /api/intent/signals     - Get intent signals
```

---

## Industry OS Integration

All 25 Industry OS services connect to AdBazaar via Layer 2:

| Industry OS | Connection |
|-------------|------------|
| Restaurant OS | CRM, Loyalty, Analytics |
| Hotel OS | CRM, Loyalty, DOOH |
| Healthcare OS | CRM, Feedback, Analytics |
| Retail OS | CRM, Ads, Loyalty |
| Legal OS | CRM, Lead Intelligence |
| Education OS | CRM, Gamification |
| All 24 Industries | Full suite |

---

## Available but Not Connected (127)

These AdBazaar services exist but are not yet connected to RTMN OS:
- adBazaar-service, adBazaar-backend, adBazaar-creator
- adbazaar-api-gateway, adbazaar-cdp, adbazaar-clean-room
- DOOH integrations, social integrations
- Partner SDKs, OEM SDKs

---

*Last Updated: June 16, 2026*
