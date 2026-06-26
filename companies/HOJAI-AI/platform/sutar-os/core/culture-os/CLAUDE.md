# CultureOS - Port 4870

## Overview
Communication norms, decision styles, operating principles.

## Purpose
Defines how AI agents should communicate and make decisions.

## Key Features
- Communication norms
- Decision styles
- Meeting etiquette
- Risk appetite
- Tone management

## API Endpoints

### Norms
- `GET /api/norms` - List norms
- `POST /api/norms` - Create norm
- Categories: `communication`, `decision`, `meeting`, `email`, `feedback`

### Profiles
- `GET /api/profiles` - List profiles
- `POST /api/profiles` - Create profile

## Norm Categories
- `communication` - How to communicate
- `decision` - Decision-making style
- `meeting` - Meeting norms
- `email` - Email etiquette
- `feedback` - Feedback style

## Tests
Vitest tests: `__tests__/culture-os.test.ts`

## Environment
- Port: 4870

## Startup
```bash
cd platform/sutar-os/core/culture-os && npm run dev
```
