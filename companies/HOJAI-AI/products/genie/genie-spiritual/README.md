# SpiritualOS

**Version:** 1.0.0
**Port:** 4751
**Status:** ✅ COMPLETE (Week 16)

## Overview

Spiritual intelligence — prayer times, Ramadan mode, charity reminders.

## API Endpoints

```
GET  /api/spiritual/:userId          # Dashboard
POST /api/spiritual/prayer          # Get prayer times
GET  /api/spiritual/ramadan         # Ramadan status
POST /api/spiritual/zakat           # Calculate Zakat
GET  /api/spiritual/charity         # Charity reminders
```

## Quick Start

```bash
# Get prayer times
curl -X POST http://localhost:4751/api/spiritual/prayer \
  -H "Content-Type: application/json" \
  -d '{"lat": 12.9716, "lng": 77.5946, "timezone": "Asia/Kolkata"}'

# Check Ramadan status
curl http://localhost:4751/api/spiritual/ramadan

# Calculate Zakat
curl -X POST http://localhost:4751/api/spiritual/zakat \
  -H "Content-Type: application/json" \
  -d '{"savings": 500000, "gold": 100000}'
# Returns: { zakatAmount: 15000 }
```

## Features

| Feature | What |
|---------|------|
| **Prayer Times** | 5 daily prayers + Qibla direction |
| **Ramadan Mode** | Full 30-day schedule, recommendations |
| **Zakat Calculator** | 2.5% above Nisab threshold |
| **Charity Reminders** | Zakat, Sadaqah, Fitrah |

## Files

```
genie-spiritual/
├── src/
│   ├── index.ts                        # Express server, port 4751
│   ├── types/
│   │   └── spiritual.ts                # Spiritual types
│   └── services/
│       ├── prayerTracker.ts            # Prayer times
│       ├── ramadanMode.ts              # Ramadan handling
│       └── charityReminder.ts          # Zakat & charity
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE