# Buyer Twin

## Overview
Customer/buyer behavior and preferences.

## Purpose
Models buyer behavior, preferences, and purchasing patterns.

## Key Features
- Buyer profiles
- Purchase history
- Preference tracking
- Intent prediction

## API Endpoints

### Buyers
- `GET /api/buyers` - List buyers
- `POST /api/buyers` - Create buyer
- `GET /api/buyers/:id` - Get buyer

### Preferences
- `GET /api/buyers/:id/preferences` - Get preferences
- `POST /api/buyers/:id/preferences` - Update preferences

## Startup
```bash
cd platform/twins/buyer-twin && npm run dev
```
