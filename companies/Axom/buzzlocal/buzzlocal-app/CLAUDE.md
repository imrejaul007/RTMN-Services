# BuzzLocal App

**Version:** 1.0.0  
**Last Updated:** June 17, 2026  
**Company:** Axom | **Parent:** BuzzLocal Platform

---

## Overview

BuzzLocal is a **hyperlocal community app** that combines:
- Local news and social feed
- Safety alerts and SOS
- Nearby business discovery
- Society management
- Crowd intelligence

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Expo SDK 50 (React Native) |
| Navigation | expo-router 3.4 |
| Icons | @expo/vector-icons (Ionicons) |
| Storage | AsyncStorage |
| Location | expo-location |

---

## Project Structure

```
buzzlocal-app/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout (Stack)
│   ├── (tabs)/                  # Tab navigation
│   │   ├── _layout.tsx         # Tab bar config
│   │   ├── index.tsx           # Feed (news, offers, events)
│   │   ├── map.tsx             # Interactive map
│   │   ├── safety.tsx           # Safety & SOS
│   │   ├── business.tsx         # Nearby businesses
│   │   └── society.tsx          # Society management
│   ├── business/[id].tsx        # Business detail
│   └── item/[id].tsx            # Feed item detail
├── src/
│   └── constants/index.ts        # Design system
├── package.json
└── app.json                      # (Missing - needs to be created)
```

---

## Features

### 5 Main Tabs

| Tab | Icon | Description | Status |
|-----|------|-------------|--------|
| Feed | 📰 | Local news, offers, events | ✅ MVP |
| Map | 🗺️ | Interactive map | ⚠️ Placeholder |
| Safety | 🛡️ | SOS, alerts, reports | ✅ MVP |
| Nearby | 🏪 | Nearby businesses | ✅ MVP |
| Society | 🏢 | Society management | ✅ MVP |

### Feed Screen
- Location-aware header (shows city/neighborhood)
- Category filtering: For You, News, Events, Offers, Alerts, Trending
- Feed cards with type badges, location, ratings
- Engagement: like, comment, share, bookmark
- Pull-to-refresh

### Safety Screen
- **SOS Button** - Long-press 3 seconds to trigger
- **Report Issue Grid** - Traffic, Accident, Fire, Crime, Flood, Power Cut
- **Nearby Alerts** - Real-time safety alerts
- **Crowd Intelligence** - Place crowd status
- **Trusted Circles** - Family, apartment groups

### Business Screen
- Business discovery with search
- Category filtering: Restaurant, Cafe, Gym, Salon, Shopping
- Business cards with ratings, reviews, distance
- Open/closed status badges
- Local offers banner

### Society Screen
- Society overview with stats
- Quick actions: Notices, Visitors, Complaints, Polls, Facilities, Maintenance
- Expected visitors management
- Emergency contacts (Security, Society Office)

---

## Design System

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| primary | #FF6B35 | CTAs, highlights (Orange) |
| accent | #4ECDC4 | Secondary actions (Teal) |
| background | #F8F9FA | App background |
| card | #FFFFFF | Cards, surfaces |
| text | #2D3436 | Primary text |
| textSecondary | #636E72 | Secondary text |
| textMuted | #B2BEC3 | Muted text |
| success | #00B894 | Success states |
| warning | #FDCB6E | Warnings |
| error | #E17055 | Errors |
| danger | #D63031 | Danger/SOS |
| safe | #00B894 | Safe status |
| caution | #FDCB6E | Caution |

### Spacing

| Token | Value |
|-------|-------|
| xs | 4 |
| sm | 8 |
| md | 16 |
| lg | 24 |
| xl | 32 |
| 2xl | 48 |

### Radius

| Token | Value |
|-------|-------|
| sm | 8 |
| md | 12 |
| lg | 16 |
| xl | 24 |
| full | 9999 |

---

## Backend Services

| Service | Port | Purpose |
|---------|------|---------|
| buzzlocal-feed-service | 4200 | Local feed, news, offers |
| buzzlocal-society-service | 4210 | Society management |
| buzzlocal-safety-service | 4220 | Safety & SOS |
| buzzlocal-business-service | 4230 | Local businesses |
| buzzlocal-crowd-service | 4240 | Crowd intelligence |
| buzzlocal-weather-service | 4250 | Weather alerts |

---

## Quick Start

```bash
# Install dependencies
cd buzzlocal-app
npm install

# Start development
npx expo start

# Build for Android
npx expo run:android

# Build for iOS
npx expo run:ios
```

---

## TODO

- [ ] Create app.json for Expo configuration
- [ ] Create tsconfig.json
- [ ] Create .env.example
- [ ] Create reusable UI components
- [ ] Create API service layer
- [ ] Create TypeScript types
- [ ] Add error boundaries
- [ ] Add loading skeletons
- [ ] Implement offline support
- [ ] Add Sentry crash reporting
- [ ] Write unit tests
- [ ] Create CI/CD pipeline

---

## Related Apps

| App | Path | Purpose |
|-----|------|---------|
| Z-Events | z-events-app/ | Event discovery |
| DO Exhibitor | REZ-Exhibitor/do-exhibitor | Exhibitor side |

---

*Last Updated: June 17, 2026*
*BuzzLocal - Know what's happening around you*
