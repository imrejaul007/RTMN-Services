# RealEstate OS - Features

**Version:** 1.0.0  
**Last Updated:** June 15, 2026  
**Port:** 5230  
**Status:** ✅ RUNNING

---

## Core Features

### 1. Property Management

| Feature | Description | Status |
|---------|-------------|--------|
| Property CRUD | Manage properties | ✅ |
| Address | Full address | ✅ |
| Features | Amenities list | ✅ |
| View Counter | Track views | ✅ |
| Status | available, sold, rented | ✅ |

### 2. Listings

| Feature | Description | Status |
|---------|-------------|--------|
| Creation | Create listings | ✅ |
| Type | Sale, rent | ✅ |
| Price | Listing price | ✅ |
| Expiration Tracking | Auto-expire | ✅ |
| Featured | Featured listings | ✅ |

### 3. Lead Management

| Feature | Description | Status |
|---------|-------------|--------|
| Lead CRUD | Manage leads | ✅ |
| Source Tracking | web, referral, agent | ✅ |
| Score Calculation | Lead scoring | ✅ |
| Status | new, contacted, qualified, lost | ✅ |
| Notes | Lead notes | ✅ |

### 4. Agent Management

| Feature | Description | Status |
|---------|-------------|--------|
| Agent CRUD | Manage agents | ✅ |
| License | License number | ✅ |
| Specialties | Residential, commercial | ✅ |
| Deals Closed | Track closed deals | ✅ |

### 5. Viewings

| Feature | Description | Status |
|---------|-------------|--------|
| Scheduling | Book viewings | ✅ |
| Agent Assignment | Assign agent | ✅ |
| Status | scheduled, completed, cancelled | ✅ |
| Notes | Viewing notes | ✅ |

### 6. Offers

| Feature | Description | Status |
|---------|-------------|--------|
| Submission | Submit offers | ✅ |
| Amount | Offer amount | ✅ |
| Contingencies | Offer conditions | ✅ |
| Accept/Reject/Counter | Response actions | ✅ |

---

## API Endpoints

### Properties

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | List properties |
| POST | `/api/properties` | Add property |
| GET | `/api/properties/:id` | Get property |
| PUT | `/api/properties/:id` | Update property |

### Listings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/listings` | List listings |
| POST | `/api/listings` | Create listing |
| GET | `/api/listings/:id` | Get listing |

### Leads

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | List leads |
| POST | `/api/leads` | Add lead |
| GET | `/api/leads/:id` | Get lead |
| PATCH | `/api/leads/:id/status` | Update status |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Add agent |
| GET | `/api/agents/:id` | Get agent |

### Viewings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/viewings` | List viewings |
| POST | `/api/viewings` | Schedule viewing |

### Offers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/offers` | List offers |
| POST | `/api/offers` | Submit offer |
| PATCH | `/api/offers/:id/respond` | Respond to offer |

---

*Last Updated: June 15, 2026*
*RealEstate OS - Real Estate Industry OS*