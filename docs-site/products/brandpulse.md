# BrandPulse

Brand intelligence and sentiment analysis for businesses.

## Overview

BrandPulse aggregates reviews from multiple sources and provides AI-powered sentiment analysis to help you understand what customers are saying about your brand.

## Features

- Multi-source review aggregation (Google, Yelp, TripAdvisor, Facebook)
- Aspect-based sentiment analysis
- Real-time alerts and webhooks
- Custom dashboards
- Historical data and trends
- API access for developers

## Quick Start

```bash
npm install @rtmn/sdk

import { RTMNClient } from '@rtmn/sdk';

const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});

const brands = await rtmn.brands.list();
console.log(brands);
```

## Pricing

| Plan | Price | Brands | Reviews/month |
|------|-------|--------|---------------|
| Free | $0 | 1 | 100 |
| Starter | $99/mo | 5 | 5,000 |
| Professional | $299/mo | 25 | 50,000 |
| Enterprise | Custom | Unlimited | Unlimited |

[Learn more about pricing →](/pricing)
