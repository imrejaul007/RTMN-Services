# Vertical Templates

**Port:** 5455
**Purpose:** 5 Vertical Templates - Retail, Restaurant, Hotel, Healthcare, Real Estate

## What It Does

Provides industry-specific agent configurations that connect HOJAI SiteOS to existing Industry OS services.

## Verticals

| Vertical | Industry | Key Intents | Connects To |
|---|---|---|---|
| Retail | E-commerce, Fashion | product_search, price_check, returns, loyalty | Retail OS (5030) |
| Restaurant | QSR, Cloud Kitchen | menu_browse, order_food, table_reservation | Restaurant OS (5010) |
| Hotel | Hotels, Resorts | room_search, booking, upgrade, spa_booking | Hotel OS (5025) |
| Healthcare | Clinics, Pharmacy | appointment_book, doctor_search, prescription_refill | Healthcare OS (5020) |
| Real Estate | Property Sales | property_search, site_visit, loan_check | Real Estate OS (5230) |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/verticals` | List all verticals |
| GET | `/api/verticals/:name` | Get vertical config |
| POST | `/api/verticals/activate` | Activate for company |
| GET | `/api/verticals/:name/intents` | Get intents |
| POST | `/api/verticals/:name/intent-match` | Match user message to intent |
| POST | `/api/verticals/detect` | Auto-detect vertical |

## Startup

```bash
cd products/vertical-templates && npm install && npm start  # Port 5455
```
