# NeXha Mobile

React Native app for NeXha B2B Commerce Network.

## Features

- 🔐 OTP Login
- 🚚 Find Distributors
- 🏪 Browse Franchise Opportunities
- 📋 Manage RFQs
- 💼 Business Profile

## Getting Started

```bash
# Install dependencies
npm install

# Start development
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | / | OTP authentication |
| Home | /home | Main dashboard |
| Distributors | /distributors | Find distributors |
| Franchises | /franchises | Browse opportunities |
| RFQs | /rfq | Manage RFQs |
| Profile | /profile | Account settings |

## Tech Stack

- React Native (Expo)
- React Navigation
- TanStack Query
- Zustand

## API Integration

```typescript
// Connect to DistributionOS
const API_URL = 'http://localhost:4300/api';

// Connect to FranchiseOS
const API_URL = 'http://localhost:4310/api';
```
