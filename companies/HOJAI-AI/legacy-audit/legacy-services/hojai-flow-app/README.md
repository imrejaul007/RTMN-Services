# Hojai Flow App

Voice-first AI companion with L1-L5 memory tiers, intent routing, and persona system.

## Quick Start

```bash
npm install
npx expo start
```

## Structure

```
src/
├── screens/       # UI screens
├── services/      # Voice, VAD, TTS, Context
├── hooks/         # useHojai, usePersona
└── modules/       # Native modules
```

## Environment

```bash
HOJAI_FLOW_URL=http://localhost:4580
VOICE_SERVICE_URL=http://localhost:4033
```

## Key Features

- 11 voice layers
- L1-L5 memory tiers
- Intent routing
- Persona switching
- TTS responses
