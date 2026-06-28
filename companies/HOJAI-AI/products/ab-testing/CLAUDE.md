# ab-testing

**Port:** 5467
**Phase:** 3
**Purpose:** Traffic split, significance, auto-winner

## Features

- Create experiments
- Traffic split (weighted)
- Track conversions
- Statistical significance (Z-test)
- Auto-winner declaration

## API

- `POST /api/experiments` — Create experiment
- `GET /api/experiments/:id` — Get results
- `POST /api/experiments/:id/conversions` — Track

## Startup

```bash
cd products/ab-testing && npm install && npm start
```
