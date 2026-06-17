# Z-Events App

**Version:** 1.0.0 | **Framework:** Expo SDK 50 | **Port:** 4008

---

## Overview

Event discovery app - find events, book tickets, meet people.

---

## Features

- Event discovery with live status
- Booth exploration with metrics
- Session registration
- Ticket management with QR
- AI Genie recommendations
- Payment via SUTAR Escrow

---

## Setup

```bash
cd z-events-app
npm install
npm start
```

---

## API Services

| Service | Port | Purpose |
|---------|------|---------|
| ExhibitionService | 4008 | Events, booths, sessions |
| AuthService | 4002 | Authentication |
| PaymentService | 4004 | SUTAR Escrow |

---

## Environment

```env
EXPO_PUBLIC_API_URL=http://localhost:4008
```
