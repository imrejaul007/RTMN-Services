# benchmark-database

**Port:** 5475
**Phase:** 5
**Purpose:** Industry comparisons

## Industries

| Industry | Metrics |
|---|---|---|
| E-Commerce | conversion, cartAbandonment, roas |
| Restaurant | avgOrderValue, repeatRate |
| Hotel | occupancyRate, revpar |
| Healthcare | showRate, avgWaitTime |
| Real Estate | inquiryToVisit, visitToClose |

## API

- `GET /api/benchmark/:industry` — Get benchmarks
- `POST /api/benchmark/compare` — Compare vs industry

## Startup

```bash
cd products/benchmark-database && npm install && npm start
```
