# Rendez - Social Connecting App

**Version:** 1.0.0 | **Framework:** Expo SDK 50 | **Company:** Axom

---

## Vision

> *"Find people. Meet safely. Build relationships. Do things together."*

A **Relationship OS** combining dating, networking, events, AI, and commerce.

---

## Features

### Discovery
- Tinder-style swipe matching
- AI compatibility scoring (0-100%)
- Business networking (founder/investor)
- Events matching

### Connection
- Real-time chat (Socket.io)
- Gift system (REZ coins)
- Video calls
- Plans & meetups

### Safety
- SOS emergency
- Live location sharing
- ID verification
- Screenshot detection

### AI Powered
- Compatibility breakdown
- Chat suggestions (Genie)
- Personality analysis
- Date recommendations

### Special Features
- Couple Mode (shared timeline)
- Experience Wallet (BRONZE→PLATINUM tiers)
- Karma scoring
- Trusted circles

---

## App Structure

```
rendez-app/
├── app/
│   ├── (tabs)/           # Tab navigation
│   │   ├── index.tsx     # Home
│   │   ├── discover.tsx   # Swipe
│   │   ├── matches.tsx    # Matches
│   │   ├── chat.tsx      # Messages
│   │   └── profile.tsx   # Profile
│   ├── (auth)/           # Auth flows
│   ├── plans/            # Plans/meetups
│   └── settings/         # Settings
└── src/
    ├── services/         # API clients
    ├── hooks/            # Custom hooks
    ├── store/            # Zustand store
    └── types/            # TypeScript types
```

---

## Screens (25+)

| Screen | Description |
|--------|-------------|
| Onboarding | Welcome flow |
| Login | Phone OTP |
| Discover | Swipe cards |
| Matches | Your matches |
| Chat | Real-time messaging |
| Profile | User profile |
| Plans | Social plans |
| Safety | Safety center |
| Wallet | Experience credits |

---

## API Services

| Service | Purpose |
|---------|---------|
| MatchService | Matching algorithm |
| DiscoveryService | User discovery |
| MessagingService | Real-time chat |
| MeetupService | Date planning |
| GiftService | Gift exchange |
| WalletService | REZ coins |
| SafetyService | Emergency alerts |
| KarmaService | Reputation scoring |

---

## Setup

```bash
cd rendez-app
npm install
npm start
```

---

## Environment

```env
EXPO_PUBLIC_API_URL=https://api.rendez.app
EXPO_PUBLIC_SOCKET_URL=wss://socket.rendez.app
```

---

## State Management

- **Zustand** for global state
- **TanStack Query** for API caching

---

## Strategic Positioning

| Product | Role |
|---------|------|
| Rendez | Social connecting |
| BuzzLocal | Hyperlocal community |
| Z-Events | Event discovery |
| REZ | Commerce & rewards |

---

*Last Updated: June 17, 2026*
