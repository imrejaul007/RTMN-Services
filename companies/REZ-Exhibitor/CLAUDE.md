# REZ Exhibitor - Exhibition OS

**Version:** 1.0.0  
**Last Updated:** June 17, 2026  
**Status:** ✅ **COMPLETE**

---

## Overview

Exhibition OS — Complete exhibition commerce & intelligence platform.

```
Registration → Identity → Wallet → Coins → AI → Leads → Commerce → CRM → Repeat Business
```

---

## Architecture

```
OS LAYER → Organizer, Exhibitor, Attendee, Sponsor, Venue, Staff
INTELLIGENCE → Genie AI, Twins (8), Analytics, Floor Intel, Copilots
COMMERCE → Marketplace, Networking, Appointments, CRM
ECONOMY → REZ Coins, Campaigns, Passport, Missions, Rewards
```

---

## Service Map (Ports 5040-5061)

| Port | Service | Status |
|------|---------|--------|
| 5040 | exhibition-gateway | ✅ |
| 5041 | organizer-service | ✅ |
| 5042 | exhibitor-service | ✅ |
| 5043 | attendee-service | ✅ |
| 5044 | twin-service | ✅ |
| 5045 | badge-service | ✅ |
| 5046 | analytics-service | ✅ |
| 5047 | notification-service | ✅ |
| 5048 | payment-service | ✅ |
| 5049 | intelligence-service | ✅ |
| 5050 | economy-service | ✅ |
| 5051 | marketplace-service | ✅ |
| 5052 | networking-service | ✅ |
| 5053 | appointment-service | ✅ |
| 5054 | passport-service | ✅ |
| 5055 | sponsor-service | ✅ |
| 5056 | venue-ops-service | ✅ |
| 5057 | staff-service | ✅ |
| 5058 | crm-service | ✅ |
| 5059 | document-service | ✅ |
| 5060 | integration-hub | ✅ |
| 5061 | floor-intelligence | ✅ |

---

## DO Exhibitor App

**Location:** `companies/REZ-Exhibitor/do-exhibitor/`

| Screen | Features |
|--------|----------|
| Dashboard | Real-time metrics |
| Leads | Hot/warm/cold filters |
| Scan | Badge scanner |
| Appointments | Meeting scheduler |
| Booth | Settings, team |

---

## Quick Start

```bash
# Gateway
cd exhibition-os && npm start  # Port 5040

# Docker
docker-compose -f docker-compose.exhibition.yml up -d
```

---

## RTMN Integration

| Service | Port |
|---------|------|
| Genie Gateway | 4701 |
| CorpID | 4300 |
| SUTAR Escrow | 4149 |
| WhatsApp Bot | 4718 |

---

## Status

✅ **COMPLETE** - 22 Services + 3 Apps + MongoDB + Redis

---

*Last Updated: June 17, 2026*
