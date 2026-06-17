# REZ Exhibitor - Exhibitor-Facing App

**Version:** 1.0.0  
**Last Updated:** June 17, 2026  
**Status:** ✅ **COMPLETE**

---

## Overview

REZ Exhibitor provides the exhibitor-facing mobile app (DO Exhibitor) for trade shows and exhibitions.

> **Note:** The Exhibition OS **services** are part of the RTMN Platform, not this company.

```
REZ Exhibitor → DO Exhibitor App → Exhibition OS Services (5040-5061)
```

---

## Structure

```
RTMN Platform/
├── exhibition-os/           # Services (5040-5061)
└── companies/
    └── REZ-Exhibitor/     # This company
        ├── do-exhibitor/   # Mobile app
        ├── CLAUDE.md
        └── FEATURES.md
```

---

## DO Exhibitor Mobile App

**Location:** `companies/REZ-Exhibitor/do-exhibitor/`

| Screen | Purpose |
|--------|---------|
| Dashboard | Real-time booth metrics |
| Leads | Lead capture, hot/warm/cold filters |
| Scan | Badge scanner |
| Appointments | Meeting scheduler |
| Booth | Settings, team management |

---

## API Integration

| Service | Port | Purpose |
|---------|------|---------|
| Exhibition Gateway | 5040 | All API calls |
| Exhibitor Service | 5042 | Booth, leads |
| Analytics | 5046 | Metrics |

---

## Quick Start

```bash
cd companies/REZ-Exhibitor/do-exhibitor
npm install
npx expo start
```

---

## Connected Companies

| Company | Connection |
|---------|-----------|
| RTMN Platform | Exhibition OS Services |
| REZ-Consumer | Shared attendees |
| Axom/BuzzLocal | Shared events |

---

*Last Updated: June 17, 2026*
