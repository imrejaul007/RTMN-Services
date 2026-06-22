# QR Dashboard Specification

**Document Version:** 1.0
**Date:** 2026-05-03
**Status:** SPECIFICATION COMPLETE

---

## Table of Contents

1. [Overview](#overview)
2. [The Four QR Systems](#the-four-qr-systems)
3. [Dashboard Architecture](#dashboard-architecture)
4. [Tier 1: REZ Partner Dashboard](#tier-1-rez-partner-dashboard)
5. [Tier 2: Simple Dashboard](#tier-2-simple-dashboard)
6. [Onboarding Flows (< 5 Minutes)](#onboarding-flows--5-minutes)
7. [Integration Points](#integration-points)
8. [Data Models](#data-models)
9. [API Specifications](#api-specifications)
10. [UI Mockups](#ui-mockups)

---

## Overview

Each QR system has **TWO dashboard variants** designed for different user personas:

| Dashboard | Target User | Complexity | Features |
|-----------|-------------|------------|----------|
| **REZ Partner Dashboard** | Existing REZ merchants | Full | All features, advanced settings, AI insights |
| **Simple Dashboard** | New/non-REZ merchants | Minimal | Basic metrics, guided setup, quick understanding |

### Design Principles

1. **Progressive Disclosure** - Simple dashboard is a subset of REZ dashboard
2. **Zero Friction Onboarding** - < 5 minutes to first QR code
3. **Universal QR Handling** - All QR types handled by Rez App
4. **Native Fallback** - Web fallback for non-Rez users

---

## The Four QR Systems

### 1. Room QR (Hotel)
**Purpose:** Hotel guest services via QR code
**Use Case:** Guests scan QR in room to order room service, request housekeeping, checkout

```
┌─────────────────────────────────────────────────────────────┐
│  HOTEL ROOM QR FLOW                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Hotel Partner ──► Generate QR Codes ──► Place in Rooms   │
│       │                                      │              │
│       │                                      ▼              │
│       │                              ┌───────────────┐       │
│       │                              │ Guest Checks  │       │
│       │                              │     In        │       │
│       │                              └───────┬───────┘       │
│       │                                      │               │
│       │         ┌───────────────────────────┼───────────┐   │
│       │         │                           │           │   │
│       │         ▼                           ▼           ▼   │
│       │   ┌──────────┐              ┌────────────┐  ┌─────┐ │
│       │   │ Room    │              │ House-     │  │ Mini│ │
│       │   │ Service │              │ keeping    │  │ bar │ │
│       │   └──────────┘              └────────────┘  └─────┘ │
│       │                                                         │
│       │                              ┌────────────┐              │
│       └────────────────────────────►│ Checkout & │◄─────────────┘
│                                    │  Payment   │
│                                    └────────────┘
└─────────────────────────────────────────────────────────────┘
```

### 2. Menu QR (Restaurant)
**Purpose:** Digital menu and ordering via QR code
**Use Case:** Diners scan QR at table to view menu, order food, split bill

```
┌─────────────────────────────────────────────────────────────┐
│  RESTAURANT MENU QR FLOW                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Restaurant ──► Generate QR Codes ──► Place on Tables      │
│       │                                        │             │
│       │                                        ▼             │
│       │                               ┌────────────────┐      │
│       │                               │  Guest Scans  │      │
│       │                               │   & Browses   │      │
│       │                               └───────┬────────┘      │
│       │                                       │               │
│       │         ┌─────────────────────────────┼───────────┐  │
│       │         │                             │           │  │
│       │         ▼                             ▼           ▼  │
│       │   ┌──────────┐              ┌────────────┐  ┌─────┐ │
│       │   │ Dietary  │              │  Order &   │  │Call │ │
│       │   │ Filters  │              │   Cart     │  │Waitr│ │
│       │   └──────────┘              └─────┬──────┘  └─────┘ │
│       │                                 │                  │
│       │         ┌────────────────────────┼──────────────┐  │
│       │         │                        ▼              │  │
│       │         ▼                 ┌──────────┐        │  │
│       └──────────────────────────►│  Pay &  │◄───────┘  │
│                                   │ Split   │            │
│                                   └─────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 3. Rez Now (Linktree)
**Purpose:** Business profile and links via QR code
**Use Case:** Businesses share QR linking to their services, social links, booking

```
┌─────────────────────────────────────────────────────────────┐
│  REZ NOW (LINKTREE) QR FLOW                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Business ──► Create Profile ──► Generate QR ──► Share     │
│       │              │               │                    │
│       │              ▼               ▼                    │
│       │       ┌────────────┐  ┌────────────┐            │
│       │       │ Bio, Links │  │  Download  │            │
│       │       │  Services  │  │ QR Image   │            │
│       │       │   Gallery  │  └─────┬──────┘            │
│       │       └─────┬──────┘        │                    │
│       │             │                 │                    │
│       │             ▼                 ▼                    │
│       │     ┌────────────────────────────────┐             │
│       │     │      Customer Scans QR         │             │
│       │     │      Views Profile & Links     │             │
│       │     └────────────────┬───────────────┘             │
│       │                      │                              │
│       │         ┌────────────┼────────────┐               │
│       │         ▼            ▼            ▼                │
│       │   ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│       │   │  Book    │ │  View    │ │  Contact │        │
│       │   │Appointmt │ │  Menu    │ │ Business │        │
│       │   └──────────┘ └──────────┘ └──────────┘        │
│       │                                                     │
│       └────────────────────────────────────────────────► Analytics
└─────────────────────────────────────────────────────────────┘
```

### 4. Ads QR (Campaign)
**Purpose:** Advertising campaigns via QR code
**Use Case:** Brands create campaigns with QR codes placed anywhere for user engagement

```
┌─────────────────────────────────────────────────────────────┐
│  ADS QR (CAMPAIGN) FLOW                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Brand ──► Create Campaign ──► Generate QR ──► Place QR    │
│       │           │               │              │         │
│       │           ▼               ▼              ▼         │
│       │    ┌────────────┐  ┌──────────┐  ┌──────────┐    │
│       │    │  Offer &  │  │ Download │  │ Poster/  │    │
│       │    │ Rewards   │  │ QR Codes │  │ Banner   │    │
│       │    └─────┬──────┘  └────┬─────┘  └──────────┘    │
│       │          │              │                         │
│       │          │              ▼                         │
│       │          │      ┌────────────────┐                │
│       │          │      │ Bulk QR Export │                │
│       │          │      │ (PNG/PDF)      │                │
│       │          │      └────────────────┘                │
│       │          │                                         │
│       │          ▼                                         │
│       │   ┌──────────────────────────────────┐            │
│       │   │      User Scans QR Campaign      │            │
│       │   │      Views Offer & Claims Reward │            │
│       │   └───────────────┬──────────────────┘            │
│       │                   │                                 │
│       │       ┌───────────┼───────────┐                   │
│       │       ▼           ▼           ▼                   │
│       │  ┌────────┐ ┌──────────┐ ┌──────────┐            │
│       │  │  Scan  │ │  Visit   │ │ Purchase │            │
│       │  │ Reward │ │  Reward  │ │  Reward  │            │
│       │  └────────┘ └──────────┘ └──────────┘            │
│       │                                                     │
│       └────────────────────────────────────────────────► Analytics
└─────────────────────────────────────────────────────────────┘
```

---

## Dashboard Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED DASHBOARD SYSTEM                             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    REZ MERCHANT DASHBOARD                              │ │
│  │                   (Full Featured - REZ Partners)                      │ │
│  │                                                                       │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │ │
│  │  │   Room QR   │ │   Menu QR   │ │  Rez Now   │ │   Ads QR    │  │ │
│  │  │  Dashboard  │ │  Dashboard  │ │  Dashboard │ │  Dashboard  │  │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │ │
│  │                                                                       │ │
│  │  Features: Full Analytics | AI Insights | Advanced Settings |        │ │
│  │           Campaign Management | Custom Branding | API Access         │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │  Same codebase, different UI tier      │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                      SIMPLE DASHBOARD                                  │ │
│  │                   (Basic Features - All Users)                        │ │
│  │                                                                       │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │ │
│  │  │   Room QR   │ │   Menu QR   │ │  Rez Now   │ │   Ads QR    │  │ │
│  │  │   Simple    │ │   Simple    │ │   Simple   │ │   Simple    │  │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │ │
│  │                                                                       │ │
│  │  Features: Basic Metrics | Simple Actions | Guided Setup |          │ │
│  │           Minimal Complexity | Quick Understanding                   │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Tier 1: REZ Partner Dashboard

### Common Features (All 4 QR Types)

| Feature | Room QR | Menu QR | Rez Now | Ads QR |
|---------|---------|---------|---------|--------|
| **Analytics Dashboard** | Scans, requests, revenue | Orders, revenue, popular items | Clicks, conversions | Scans, visits, purchases |
| **QR Code Management** | Generate, download, print | Generate, download, print | Generate, download, print | Bulk generate, download |
| **Campaign Management** | Service schedules | Menu updates | Link updates | Full campaign control |
| **AI Insights** | Peak hours, suggestions | Recommendations, upsells | Engagement patterns | ROAS optimization |
| **Advanced Settings** | Priority levels, automation | Dietary defaults, pricing | Themes, custom links | Reward tiers, budgets |
| **API Access** | Full REST API | Full REST API | Full REST API | Full REST API |
| **Team Management** | Staff accounts, roles | Staff accounts, roles | Staff accounts, roles | Staff accounts, roles |
| **Integrations** | PMS, POS, CRM | POS, Kitchen display | Calendar, booking | Analytics, DSP |

### Room QR - REZ Partner Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ROOM QR - REZ PARTNER DASHBOARD                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ OVERVIEW                                                              │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │   │
│  │  │ Total Scans │ │  Revenue   │ │   Avg      │ │  Pending   │      │   │
│  │  │    1,234   │ │  ₹45,670   │ │  Order ₹   │ │ Requests   │      │   │
│  │  │   ↑ 12%    │ │   ↑ 8%     │ │   210      │ │     23     │      │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ NAVIGATION TABS                                                       │   │
│  │ [Overview] [Rooms] [Services] [Analytics] [Settings] [AI Insights]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ROOMS TAB                                                             │   │
│  │                                                                       │   │
│  │  ┌───────────────────────────────────────────────────────────────┐   │   │
│  │  │  Room       │ Type      │ Scans Today │ Revenue │ Status     │   │   │
│  │  ├─────────────┼───────────┼──────────────┼─────────┼────────────┤   │   │
│  │  │ 101         │ Deluxe    │     12       │ ₹890    │ ● Active   │   │   │
│  │  │ 102         │ Standard   │      8       │ ₹450    │ ● Active   │   │   │
│  │  │ 103         │ Suite      │     15       │ ₹1,200  │ ● Active   │   │   │
│  │  │ 104         │ Deluxe     │      0       │ ₹0      │ ○ Inactive │   │   │
│  │  └───────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  │  [+ Generate QR Codes]  [Download All]  [Print Selected]             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ AI INSIGHTS PANEL                                                     │   │
│  │                                                                       │   │
│  │  💡 "Peak room service hours are 7-9 PM. Consider adding           │   │
│  │     express menu during these hours to increase revenue by 15%."    │   │
│  │                                                                       │   │
│  │  📊 "Room 302 guests order 40% more minibar items than average.    │   │
│  │     Stock additional items in this room type."                      │   │
│  │                                                                       │   │
│  │  🎯 "Implementing priority queue for urgent requests could          │   │
│  │     increase guest satisfaction by 23%."                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Room QR - REZ Partner Features

| Feature | Description |
|---------|-------------|
| **Room Management** | Add/edit rooms, bulk import, room types |
| **QR Generation** | Generate per room, bulk download (PNG/PDF) |
| **Service Catalog** | Full menu management, pricing, categories |
| **Minibar Management** | Track consumption, auto-billing |
| **Priority System** | Low/Medium/High/Urgent request handling |
| **Scheduling** | Pre-schedule services, set availability |
| **Housekeeping** | 16+ housekeeping items, special requests |
| **Spa & Transport** | Spa bookings, transport requests |
| **Feedback System** | 5-star ratings, category ratings |
| **Checkout Folio** | Complete bill generation, payment |
| **Multi-language** | EN/HI support |
| **PMS Integration** | Sync with Hotel OTA/PMS systems |

### Menu QR - REZ Partner Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MENU QR - REZ PARTNER DASHBOARD                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ OVERVIEW                                                              │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │   │
│  │  │ Orders     │ │  Revenue   │ │   Avg      │ │   Table    │      │   │
│  │  │    456    │ │  ₹1,23,456 │ │   Order    │ │   Turns    │      │   │
│  │  │   ↑ 15%    │ │   ↑ 22%    │ │   ₹270     │ │   2.4/day  │      │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ NAVIGATION TABS                                                       │   │
│  │ [Menu] [Orders] [Analytics] [Dietary] [Split Bill] [Settings]      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ MENU TAB                                                              │   │
│  │                                                                       │   │
│  │  ┌───────────────────────────────────────────────────────────────┐   │   │
│  │  │  Category       │ Items │ Popular │ Revenue    │ Actions      │   │   │
│  │  ├─────────────────┼───────┼─────────┼────────────┼──────────────┤   │   │
│  │  │ Starters        │   12  │  3      │  ₹12,500   │ [Edit][View]│   │   │
│  │  │ Main Course     │   18  │  5      │  ₹45,000   │ [Edit][View]│   │   │
│  │  │ Desserts        │    8  │  2      │  ₹8,200    │ [Edit][View]│   │   │
│  │  │ Beverages       │   15  │  4      │  ₹15,600   │ [Edit][View]│   │   │
│  │  └───────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  │  [+ Add Category]  [+ Add Item]  [Import Menu]  [Export Menu]       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DIETARY INSIGHTS                                                      │   │
│  │                                                                       │   │
│  │  🥗 45% of guests use dietary filters (Vegetarian: 60%, GF: 15%)   │   │
│  │  🌶️ Spice level 3 is preferred by 52% of customers                 │   │
│  │  🍷 Wine pairing suggestions increase avg order by ₹180            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Menu QR - REZ Partner Features

| Feature | Description |
|---------|-------------|
| **Menu Management** | Full CRUD, categories, modifiers |
| **Item Customization** | Sizes, add-ons, custom instructions |
| **Nutritional Info** | Calories, macros, ingredients |
| **Dietary Filters** | Vegan, GF, Nut-Free, Halal, Kosher, Jain |
| **Allergen Warnings** | 8 allergen types |
| **Pricing Control** | Dynamic pricing, time-based pricing |
| **Order Management** | Real-time orders, kitchen display |
| **Split Bill** | By item, by person, equal split |
| **Tip Management** | Smart tip suggestions |
| **Waiter Calling** | Priority levels, response tracking |
| **Weather Suggestions** | Weather-based menu recommendations |
| **Upsell Engine** | AI-driven upsell suggestions |
| **POS Integration** | Sync with restaurant POS systems |

### Rez Now - REZ Partner Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REZ NOW - REZ PARTNER DASHBOARD                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ OVERVIEW                                                              │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │   │
│  │  │  Profile   │ │  Total     │ │   Link     │ │  Bookings  │      │   │
│  │  │  Views     │ │   Clicks   │ │   CTR      │ │  Today     │      │   │
│  │  │   2,345    │ │   1,890    │ │   80.5%    │ │     12     │      │   │
│  │  │   ↑ 25%    │ │   ↑ 18%    │ │   ↑ 5%     │ │   ↑ 30%    │      │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ NAVIGATION TABS                                                       │   │
│  │ [Profile] [Links] [Services] [Gallery] [Reviews] [Analytics] [Theme]│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LINKS TAB                                                              │   │
│  │                                                                       │   │
│  │  ┌───────────────────────────────────────────────────────────────┐   │   │
│  │  │  Link Title              │ Type      │ Clicks │ Status      │   │   │
│  │  ├──────────────────────────┼───────────┼────────┼─────────────┤   │   │
│  │  │ 📍 Visit Us              │ location  │  234   │ ● Active   │   │   │
│  │  │ 📞 Call Now              │ phone     │  189   │ ● Active   │   │   │
│  │  │ 📋 Our Menu              │ menu      │  456   │ ● Active   │   │   │
│  │  │ 📅 Book Appointment      │ booking   │   78   │ ● Active   │   │   │
│  │  │ 🛒 Shop Online           │ website   │  523   │ ● Active   │   │   │
│  │  └───────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  │  [+ Add Link]  [Reorder Links]  [Preview Profile]                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ AI RECOMMENDATIONS                                                    │   │
│  │                                                                       │   │
│  │  💡 "Add WhatsApp link - businesses with WhatsApp get 40% more    │   │
│  │     engagement."                                                      │   │
│  │                                                                       │   │
│  │  📊 "Your booking link is underperforming. Consider adding            │   │
│  │     urgency messaging like 'Limited Slots Available'."              │   │
│  │                                                                       │   │
│  │  🎯 "Restaurant profiles with 6+ links get 2x more clicks."         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Rez Now - REZ Partner Features

| Feature | Description |
|---------|-------------|
| **Profile Editor** | Bio, tagline, cover, logo |
| **Custom Links** | 10+ links with icons, ordering |
| **Link Types** | Website, menu, phone, WhatsApp, location, booking, social |
| **Services Catalog** | Service cards with pricing, packages |
| **Appointment Booking** | Multi-step booking, calendar integration |
| **Gallery** | Photos, videos, reordering |
| **Reviews Widget** | Display customer reviews |
| **FAQ Section** | Accordion FAQs |
| **Awards & Badges** | Display achievements |
| **Theme Customization** | Colors, fonts, button styles |
| **Analytics** | Per-link clicks, conversions |
| **QR Generator** | Multiple styles, PNG/SVG/PDF |
| **Social Links** | 11+ social platforms |

### Ads QR - REZ Partner Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADS QR - REZ PARTNER DASHBOARD                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ OVERVIEW                                                              │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │   │
│  │  │   Total    │ │  Cost Per  │ │   Total    │ │   ROAS     │      │   │
│  │  │   Spend    │ │    Scan    │ │  Revenue   │ │           │      │   │
│  │  │  ₹50,000  │ │   ₹8.50   │ │ ₹1,85,000 │ │   3.7x    │      │   │
│  │  │            │ │            │ │            │ │            │      │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ NAVIGATION TABS                                                       │   │
│  │ [Campaigns] [QR Codes] [Locations] [Offers] [Coins] [Analytics]     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CAMPAIGNS TAB                                                          │   │
│  │                                                                       │   │
│  │  ┌───────────────────────────────────────────────────────────────┐   │   │
│  │  │ Campaign      │ Status   │ Budget  │ Scans  │ ROAS   │ Actions│   │   │
│  │  ├───────────────┼──────────┼─────────┼────────┼────────┼────────┤   │   │
│  │  │ Summer Sale   │ ● Active │ ₹25,000 │  3,234 │  4.2x  │[Edit] │   │   │
│  │  │ New Product   │ ● Active │ ₹15,000 │  1,890 │  3.1x  │[Edit] │   │   │
│  │  │ Grand Opening │ ○ Paused │ ₹10,000 │    567 │  2.8x  │[Edit] │   │   │
│  │  │ Weekend Deal  │ ○ Ended  │   -     │  5,432 │  3.9x  │[View] │   │   │
│  │  └───────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  │  [+ Create Campaign]  [Smart Setup]  [Import Locations]               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CONVERSION FUNNEL                                                     │   │
│  │                                                                       │   │
│  │  Scans ████████████████████████████████████████████ 5,891           │   │
│  │  Visits ████████████████████                      2,234  (37.9%)   │   │
│  │  Purchases ██████████                              456   (7.7%)   │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Ads QR - REZ Partner Features

| Feature | Description |
|---------|-------------|
| **Campaign CRUD** | Create, edit, pause, archive |
| **Offer Management** | Discounts, BOGO, free items |
| **Multi-Step Rewards** | Scan, visit, purchase rewards |
| **Hybrid Coin System** | REZ coins + Brand coins |
| **Bulk QR Generation** | PNG/PDF, print-ready |
| **Location Management** | Add, bulk import, map view |
| **Dynamic QR** | Time/location-based redirects |
| **Landing Page Templates** | 8 templates (Video, Coupon, etc.) |
| **GPS Visit Verification** | Reduce fake visits |
| **Attribution Tracking** | Scan → Visit → Purchase |
| **ROAS Analytics** | Full conversion funnel |
| **Brand Coins** | Create, distribute, track |
| **Free Samples** | Sample requests, fulfillment |
| **Consultations** | Book consultations |

---

## Tier 2: Simple Dashboard

### Common Features (All 4 QR Types)

| Feature | Room QR | Menu QR | Rez Now | Ads QR |
|---------|---------|---------|---------|--------|
| **Basic Metrics** | Total scans | Orders today | Profile views | Total scans |
| **QR Download** | Download QR | Download QR | Download QR | Download QR |
| **Guided Setup** | Step-by-step | Step-by-step | Step-by-step | Step-by-step |
| **Quick Actions** | 3 main actions | 3 main actions | 3 main actions | 3 main actions |

### Room QR - Simple Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ROOM QR - SIMPLE DASHBOARD                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Welcome! Let's set up your Room QR codes.                          │   │
│  │  It only takes 2 minutes.                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ YOUR STATS                                                            │   │
│  │                                                                       │   │
│  │   📊 Total Scans This Month: 1,234                                  │   │
│  │   💰 Revenue from Room Service: ₹12,345                             │   │
│  │   ⭐ Average Rating: 4.5                                             │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ QUICK ACTIONS                                                         │   │
│  │                                                                       │   │
│  │   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │   │
│  │   │ 📱              │  │ 🏨              │  │ 📋              │ │   │
│  │   │ Download QR     │  │ Add New Room     │  │ View Requests   │ │   │
│  │   │ for a Room      │  │                  │  │                  │ │   │
│  │   └──────────────────┘  └──────────────────┘  └──────────────────┘ │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SETUP PROGRESS                                                        │   │
│  │                                                                       │   │
│  │   Step 1: Hotel Info ✓                                               │   │
│  │   Step 2: Services ✓                                                │   │
│  │   Step 3: Create QR Codes ➡️ (Tap to complete)                      │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ⚡ UPGRADE TO UNLOCK                                                  │   │
│  │                                                                       │   │
│  │   • AI-powered insights                                               │   │
│  │   • Advanced analytics                                                │   │
│  │   • Priority request handling                                        │   │
│  │   • PMS integration                                                  │   │
│  │                                                                       │   │
│  │   [Upgrade to REZ Partner]                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Menu QR - Simple Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MENU QR - SIMPLE DASHBOARD                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Welcome! Let's set up your Menu QR codes.                         │   │
│  │  It only takes 3 minutes.                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ YOUR STATS                                                            │   │
│  │                                                                       │   │
│  │   📊 Orders This Month: 234                                         │   │
│  │   💰 Revenue: ₹45,678                                               │   │
│  │   👥 Avg Order Value: ₹195                                          │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ QUICK ACTIONS                                                         │   │
│  │                                                                       │   │
│  │   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │   │
│  │   │ 🍽️              │  │ 📝              │  │ 💳              │ │   │
│  │   │ Download QR     │  │ Add Menu Items   │  │ View Orders     │ │   │
│  │   │ for Table       │  │                  │  │                  │ │   │
│  │   └──────────────────┘  └──────────────────┘  └──────────────────┘ │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SETUP PROGRESS                                                        │   │
│  │                                                                       │   │
│  │   Step 1: Restaurant Info ✓                                          │   │
│  │   Step 2: Upload Menu ➡️ (Tap to complete)                           │   │
│  │   Step 3: Place QR Codes ✓                                          │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 💡 QUICK TIP                                                           │   │
│  │                                                                       │   │
│  │   "Add dietary filters to your menu - 45% of diners                  │   │
│  │   prefer restaurants with dietary options."                          │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rez Now - Simple Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REZ NOW - SIMPLE DASHBOARD                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Welcome! Let's create your business profile.                        │   │
│  │  It only takes 2 minutes.                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ YOUR STATS                                                            │   │
│  │                                                                       │   │
│  │   👁️ Profile Views: 1,234                                          │   │
│  │   👆 Total Clicks: 890                                              │   │
│  │   📅 Bookings: 23                                                    │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ QUICK ACTIONS                                                         │   │
│  │                                                                       │   │
│  │   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │   │
│  │   │ 📱              │  │ 🔗              │  │ 📊              │ │   │
│  │   │ Download QR     │  │ Add a Link      │  │ View Analytics  │ │   │
│  │   │                  │  │                  │  │                  │ │   │
│  │   └──────────────────┘  └──────────────────┘  └──────────────────┘ │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ YOUR LINKS                                                            │   │
│  │                                                                       │   │
│  │   ✓ Your Website: https://yoursite.com                              │   │
│  │   ✓ Call Us: +91-XXXXX-XXXXX                                        │   │
│  │   ➕ Add Location                                                    │   │
│  │   ➕ Add Menu Link                                                   │   │
│  │                                                                       │   │
│  │   [Add More Links]                                                   │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📸 PREVIEW YOUR PROFILE                                              │   │
│  │                                                                       │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │                                                             │   │   │
│  │   │              [Your Logo/Photo]                              │   │   │
│  │   │                                                             │   │   │
│  │   │              Your Business Name                             │   │   │
│  │   │              Your tagline here...                           │   │   │
│  │   │                                                             │   │   │
│  │   │   [Your Website]  [Call Us]  [Location]  [Menu]           │   │   │
│  │   │                                                             │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  │   [Edit Profile]                                                    │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Ads QR - Simple Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADS QR - SIMPLE DASHBOARD                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Welcome! Let's create your first ad campaign.                       │   │
│  │  It only takes 5 minutes.                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ YOUR STATS                                                            │   │
│  │                                                                       │   │
│  │   📊 Total Scans: 1,234                                             │   │
│  │   💰 Spend: ₹5,000                                                   │   │
│  │   📈 Revenue: ₹18,500 (3.7x ROAS)                                   │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ QUICK ACTIONS                                                         │   │
│  │                                                                       │   │
│  │   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │   │
│  │   │ 📱              │  │ 🎯              │  │ 📊              │ │   │
│  │   │ Download QR     │  │ Create Campaign  │  │ View Results    │ │   │
│  │   │                  │  │                  │  │                  │ │   │
│  │   └──────────────────┘  └──────────────────┘  └──────────────────┘ │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ YOUR CAMPAIGNS                                                        │   │
│  │                                                                       │   │
│  │   ┌───────────────────────────────────────────────────────────────┐   │   │
│  │   │  🏷️ Summer Sale 2026                                        │   │   │
│  │   │  Status: Active | Budget: ₹5,000 | Scans: 1,234            │   │   │
│  │   │                                                             │   │   │
│  │   │  [View Details]  [Download QR]  [Edit]                      │   │   │
│  │   └───────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  │   [+ Create New Campaign]                                            │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 💡 QUICK TIP                                                           │   │
│  │                                                                       │   │
│  │   "Place your QR codes at eye level near the entrance.              │   │
│  │    This increases scan rates by up to 40%!"                          │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Onboarding Flows (< 5 Minutes)

### Room QR Onboarding

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ROOM QR - ONBOARDING WIZARD                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: Hotel Information                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Hotel Name: [________________________]                                      │
│                                                                              │
│  Address:    [________________________]                                      │
│              [________________________]                                      │
│                                                                              │
│  Contact:    [________________________]                                      │
│                                                                              │
│  (Auto-filled from REZ if partner)                                            │
│                                                                              │
│                              [Next →]                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 2: Room Setup                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  How would you like to add rooms?                                            │
│                                                                              │
│  ○ Auto-detect from PMS integration                                         │
│  ● Enter manually                                                            │
│  ○ Import from CSV                                                           │
│                                                                              │
│  Number of rooms: [____10____]                                               │
│                                                                              │
│  Room number prefix (optional): [Floor__]                                    │
│                                                                              │
│  Room types available:                                                       │
│    ☑ Standard    ☑ Deluxe    ☑ Suite    ☐ Presidential                      │
│                                                                              │
│                              [Next →]                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 3: Services Offered                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Select services to offer via QR:                                           │
│                                                                              │
│  ☑ Room Service (Food & Beverages)                                          │
│  ☑ Housekeeping                                                             │
│  ☑ Minibar                                                                  │
│  ☐ Laundry                                                                  │
│  ☐ Spa & Wellness                                                           │
│  ☐ Transport Assistance                                                     │
│  ☐ Maintenance                                                              │
│  ☐ Concierge                                                                │
│                                                                              │
│                              [Next →]                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 4: Contact Information                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  (Auto-filled from REZ if partner)                                           │
│                                                                              │
│  Front Desk Phone: [________________________]                                │
│  WhatsApp:        [________________________]                                │
│  Email:           [________________________]                                │
│                                                                              │
│                              [Generate QR Codes →]                          │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ COMPLETE!                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Your QR codes are ready!                                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │         ████████████████████████████████                            │  │
│  │         ██                            ██                            │  │
│  │         ██    [QR CODE IMAGE]          ██                            │  │
│  │         ██                            ██                            │  │
│  │         ██    Room 101                 ██                            │  │
│  │         ██    Deluxe                  ██                            │  │
│  │         ████████████████████████████████                            │  │
│  │                                                                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [Download All (ZIP)]  [Print All]  [Go to Dashboard]                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Menu QR Onboarding

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MENU QR - ONBOARDING WIZARD                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: Restaurant Information                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Restaurant Name: [________________________]                                 │
│                                                                              │
│  Cuisine Type:    [Select ▼________________]                                │
│                   Indian | Chinese | Italian | Mexican | Thai | ...         │
│                                                                              │
│  Address:         [________________________]                                 │
│                                                                              │
│  (Auto-filled from REZ if partner)                                           │
│                                                                              │
│                              [Next →]                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 2: Menu Setup                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  How would you like to add your menu?                                       │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│  │  📄             │  │  📝             │  │  ⌨️             │           │
│  │  Upload PDF     │  │  Upload CSV     │  │  Add Items     │           │
│  │  Menu           │  │  Menu Items    │  │  Manually      │           │
│  │                 │  │                 │  │                 │           │
│  │  Drag & drop    │  │  Template      │  │  Quick add    │           │
│  │  your menu      │  │  available     │  │  items one   │           │
│  │                 │  │                 │  │  by one       │           │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘           │
│                                                                              │
│  Accepted: PDF, CSV, JPG, PNG (Max 10MB)                                    │
│                                                                              │
│                              [Next →]                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 3: Dietary Options (Optional)                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Select dietary options your restaurant supports:                            │
│                                                                              │
│  ☐ Vegetarian       ☐ Vegan         ☐ Gluten-Free                         │
│  ☐ Nut-Free         ☐ Dairy-Free    ☐ Halal                               │
│  ☐ Kosher          ☐ Jain                                                  │
│                                                                              │
│  ⚠️ 45% of diners prefer restaurants with dietary options                   │
│                                                                              │
│                              [Next →]                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 4: Table Count                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Number of tables: [____20____]                                             │
│                                                                              │
│  QR Code naming:                                                            │
│  ○ Table number (Table 1, Table 2...)                                       │
│  ● Custom naming (Bar-1, Patio-2...)                                        │
│                                                                              │
│                              [Generate QR Codes →]                           │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ COMPLETE!                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Your Menu QR codes are ready!                                              │
│                                                                              │
│  20 QR codes generated for your tables.                                     │
│                                                                              │
│  [Download All (ZIP)]  [Print Table Stickers]  [Go to Dashboard]            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rez Now Onboarding

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REZ NOW - ONBOARDING WIZARD                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: Business Information                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Business Name: [________________________]                                    │
│                                                                              │
│  Tagline:        [________________________]                                   │
│  (Brief description of your business)                                        │
│                                                                              │
│  Business Type:  [Select ▼________________]                                  │
│                   Restaurant | Salon | Clinic | Shop | ...                   │
│                                                                              │
│  (Auto-filled from REZ if partner)                                           │
│                                                                              │
│                              [Next →]                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 2: Essential Links                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Add at least 1 link to continue:                                            │
│                                                                              │
│  🌐 Website URL:     [________________________]                             │
│  📞 Phone Number:    [________________________]                             │
│  📍 Business Address:[________________________]                             │
│                                                                              │
│  Optional quick links:                                                       │
│  ☐ Add Menu Link       ☐ Add WhatsApp    ☐ Add Instagram                  │
│                                                                              │
│                              [Next →]                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 3: Services (Optional)                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Do you offer services customers can book?                                   │
│                                                                              │
│  ○ No, skip this step                                                       │
│  ● Yes, add services                                                        │
│                                                                              │
│  Add a service:                                                              │
│  Service Name: [________________________]                                    │
│  Price: ₹        [________]                                                  │
│  Duration:       [____30____] minutes                                        │
│                                                                              │
│  [+ Add Another Service]                                                    │
│                                                                              │
│                              [Next →]                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 4: Upload Logo (Optional)                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │                    📷                                              │   │
│  │                                                                     │   │
│  │              Click to upload your logo                             │   │
│  │              or drag and drop                                      │   │
│  │              (JPG, PNG, Max 2MB)                                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                              [Create Profile →]                              │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ COMPLETE!                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Your business profile is live!                                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │                    [Your Logo]                                     │   │
│  │                                                                     │   │
│  │                    Business Name                                   │   │
│  │                    Your tagline here...                            │   │
│  │                                                                     │   │
│  │        [Website]  [Call]  [Location]  [Menu]                       │   │
│  │                                                                     │   │
│  │                    ┌─────────────┐                                  │   │
│  │                    │  ████      │                                  │   │
│  │                    │  ████      │  Scan to view profile             │   │
│  │                    │  ████      │                                  │   │
│  │                    └─────────────┘                                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [Download QR]  [Share Profile]  [Go to Dashboard]                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Ads QR Onboarding

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADS QR - ONBOARDING WIZARD                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: Campaign Basics                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Campaign Name: [________________________]                                    │
│  (e.g., Summer Sale 2026)                                                    │
│                                                                              │
│  Brand/Company: [________________________]                                    │
│  (Auto-filled from REZ if partner)                                          │
│                                                                              │
│                              [Next →]                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 2: Your Offer                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  What offer will users get?                                                 │
│                                                                              │
│  Offer Type:    [Select ▼________________]                                   │
│                 Discount % | Discount ₹ | BOGO | Free Item | ...            │
│                                                                              │
│  Offer Value:   [____20____] % OFF                                         │
│                                                                              │
│  Offer Details: [________________________]                                    │
│  (e.g., 20% off on all items)                                               │
│                                                                              │
│  Valid Until:   [Select date ▼________________]                             │
│                                                                              │
│                              [Next →]                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 3: Set Your Budget                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  How much do you want to spend?                                              │
│                                                                              │
│        ₹500 ────────────────────────────── ₹50,000                         │
│        ●────────────────────────────────────────────────────●               │
│                                  ▲                                           │
│                                ₹10,000                                       │
│                                                                              │
│  Quick select:  [₹500]  [₹2,000]  [₹10,000]  [Custom]                      │
│                                                                              │
│  Estimated reach: 500-1,000 scans                                            │
│                                                                              │
│                              [Next →]                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 4: Where will you place the QR? (Optional)                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Help us optimize your campaign by adding locations:                         │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Location Name          │ Type       │ QR Count                     │   │
│  ├─────────────────────────┼────────────┼──────────────────────────────┤   │
│  │  Main Store Entrance    │ Physical   │ 2                           │   │
│  │  [Add another location]│            │                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                              [Create Campaign →]                              │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ CAMPAIGN CREATED!                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Your QR codes are ready to download!                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │         ████████████████████████████████                            │   │
│  │         ██                            ██                            │   │
│  │         ██    [QR CODE IMAGE]          ██                            │   │
│  │         ██                            ██                            │   │
│  │         ██    Summer Sale 2026         ██                            │   │
│  │         ██    20% OFF                  ██                            │   │
│  │         ████████████████████████████████                            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [Download QR]  [Download All (2)]  [Print]  [Share]                        │
│                                                                              │
│  📊 Track results in your dashboard →                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### Rez App QR Handling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REZ APP - QR CODE HANDLING FLOW                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User Scans QR Code                                                         │
│          │                                                                   │
│          ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    QR CODE DECODER                                    │   │
│  │                                                                      │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │                                                             │   │   │
│  │   │   QR Data Format:                                          │   │   │
│  │   │   {                                                           │   │   │
│  │   │     "type": "room|menu|store|campaign",                      │   │   │
│  │   │     "id": "unique-identifier",                               │   │   │
│  │   │     "hotelId": "optional",                                   │   │   │
│  │   │     "campaignId": "optional"                                │   │   │
│  │   │   }                                                           │   │   │
│  │   │                                                             │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│          │                                                                   │
│          ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TYPE ROUTER                                       │   │
│  │                                                                      │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐              │   │
│  │   │  ROOM   │  │  MENU   │  │  STORE  │  │CAMPAGN  │              │   │
│  │   │    QR   │  │    QR   │  │    QR   │  │    QR   │              │   │
│  │   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘              │   │
│  │        │            │            │            │                     │   │
│  │        ▼            ▼            ▼            ▼                     │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐              │   │
│  │   │ Room    │  │ Restaurant│ │ Business│  │ Campaign│              │   │
│  │   │ Service │  │ Menu    │  │ Profile │  │ Offer   │              │   │
│  │   │ Screen  │  │ Screen  │  │ Screen  │  │ Screen  │              │   │
│  │   └─────────┘  └─────────┘  └─────────┘  └─────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Web Fallback (Non-REZ Users)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WEB FALLBACK - NON-REZ USER EXPERIENCE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User Scans QR (Not REZ User)                                               │
│          │                                                                   │
│          ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MOBILE WEB VIEW                                   │   │
│  │                                                                      │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │                                                             │   │   │
│  │   │                    [Business Logo]                          │   │   │
│  │   │                                                             │   │   │
│  │   │                    Business Name                           │   │   │
│  │   │                                                             │   │   │
│  │   │         ┌───────────────────────────────────────┐           │   │   │
│  │   │         │                                       │           │   │   │
│  │   │         │         [Offer/Content]              │           │   │   │
│  │   │         │                                       │           │   │   │
│  │   │         │                                       │           │   │   │
│  │   │         │                                       │           │   │   │
│  │   │         └───────────────────────────────────────┘           │   │   │
│  │   │                                                             │   │   │
│  │   │   [Call]  [Directions]  [Website]  [Share]               │   │   │
│  │   │                                                             │   │   │
│  │   │   ─────────────────────────────────────────────────────   │   │   │
│  │   │                                                             │   │   │
│  │   │   Download REZ app for rewards:                           │   │   │
│  │   │   [App Store]  [Play Store]                               │   │   │
│  │   │                                                             │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### StayOwn Integration (Room QR)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAYOWN + REZ ROOM QR INTEGRATION                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         STAYOWN APP                                  │   │
│  │                                                                      │   │
│  │   Guest Books Room via StayOwn                                      │   │
│  │          │                                                           │   │
│  │          ▼                                                           │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │              StayOwn Service (rez-stayown-service)           │   │   │
│  │   │                                                              │   │   │
│  │   │   • Creates guest session                                   │   │   │
│  │   │   • Links to Hotel OTA booking                              │   │   │
│  │   │   • Generates Room QR data                                   │   │   │
│  │   │   • Syncs with REZ ecosystem                                 │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │          │                                                           │   │
│  │          ▼                                                           │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │                    HOTEL OTA (PMS)                           │   │   │
│  │   │                                                              │   │   │
│  │   │   • Room assignment                                         │   │   │
│  │   │   • Stay details                                            │   │   │
│  │   │   • QR code generation                                       │   │   │
│  │   │   • Service integration                                     │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │          │                                                           │   │
│  │          ▼                                                           │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │                      REZ QR SDK                               │   │   │
│  │   │                                                              │   │   │
│  │   │   Guest scans QR in room                                     │   │   │
│  │   │   → Accesses room service                                   │   │   │
│  │   │   → Earns REZ coins                                         │   │   │
│  │   │   → Pays via REZ wallet                                     │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### External System Integrations

| System | Integration Type | Data Flow |
|--------|-----------------|-----------|
| **Hotel OTA/PMS** | Webhook + API | Room assignments, bookings, checkout |
| **AdBazaar** | Bidirectional | Campaign sync, audience sharing |
| **POS Systems** | API | Order sync, payment processing |
| **Calendar Apps** | OAuth | Appointment booking |
| **Analytics (GA4)** | Measurement Protocol | Event tracking |
| **CRM Systems** | Webhook | Lead capture, customer data |

---

## Data Models

### Unified QR Code Model

```typescript
interface QRCode {
  id: string;
  type: 'room' | 'menu' | 'store' | 'campaign';
  slug: string; // URL-friendly unique identifier
  metadata: RoomQRMeta | MenuQRMeta | StoreQRMeta | CampaignQRMeta;
  branding?: {
    logo?: string;
    primaryColor?: string;
    customCSS?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Merchant ID
}

interface RoomQRMeta {
  hotelId: string;
  roomId: string;
  roomNumber: string;
  roomType: 'standard' | 'deluxe' | 'suite' | 'presidential';
  floor?: number;
}

interface MenuQRMeta {
  storeId: string;
  tableId?: string;
  tableName?: string;
  sectionId?: string;
  qrCount: number; // For bulk table QRs
}

interface StoreQRMeta {
  storeId: string;
  storeSlug: string;
  profileVersion: number;
}

interface CampaignQRMeta {
  campaignId: string;
  locationId?: string;
  placementType: 'indoor' | 'outdoor' | 'product' | 'event' | 'print';
}
```

### Unified Analytics Model

```typescript
interface QRAnalytics {
  id: string;
  qrId: string;
  eventType: 'scan' | 'view' | 'action' | 'conversion';
  userId?: string; // Null for anonymous
  deviceType: 'ios' | 'android' | 'web' | 'unknown';
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface QRConversionMetrics {
  qrId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalScans: number;
    uniqueScans: number;
    totalViews: number;
    uniqueViews: number;
    totalActions: number;
    conversions: number;
    conversionRate: number;
    revenue?: number;
    coinsEarned?: number;
  };
}
```

---

## API Specifications

### Unified QR Endpoints

```
Base URL: {apiUrl}/qr

POST   /validate                    - Validate QR code, return type & metadata
GET    /:qrSlug                    - Get QR code details
GET    /:qrSlug/content            - Get content based on QR type
POST   /:qrId/track                - Track scan/view event
GET    /:qrId/analytics            - Get analytics for QR code
POST   /bulk/generate               - Generate bulk QR codes
GET    /bulk/:batchId/download      - Download bulk QR codes (ZIP)
```

### Type-Specific Endpoints

```
Room QR: {apiUrl}/qr/room
POST   /requests                   - Submit service request
GET    /requests/:roomId          - Get requests for room
POST   /checkout                   - Process checkout
POST   /feedback                   - Submit feedback

Menu QR: {apiUrl}/qr/menu
GET    /:storeId/menu             - Get menu
POST   /:storeId/orders           - Place order
POST   /:storeId/call-waiter      - Call waiter
POST   /:storeId/split-bill       - Split bill

Store QR: {apiUrl}/qr/store
GET    /:storeSlug                - Get store profile
GET    /:storeSlug/links          - Get store links
GET    /:storeSlug/services       - Get services
POST   /:storeSlug/book           - Book appointment

Campaign QR: {apiUrl}/qr/campaign
GET    /:campaignSlug            - Get campaign details
POST   /:campaignId/claim         - Claim reward
POST   /:campaignId/conversion    - Track conversion
```

---

## UI Mockups

### Unified Dashboard Navigation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REZ MERCHANT DASHBOARD - UNIFIED NAV                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  [REZ Logo]     [Dashboard] [Room QR] [Menu QR] [Rez Now] [Ads]     │  │
│  │                                              [Search] [🔔] [Profile] │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────┐                                                            │
│  │ Quick Stats│    ┌─────────────────────────────────────────────────────┐ │
│  │ ──────────│    │                                                      │ │
│  │ Room: 234 │    │                   MAIN CONTENT AREA                   │ │
│  │ Menu: 456 │    │                                                      │ │
│  │ Store: 123│    │                                                      │ │
│  │ Ads: 12   │    │                                                      │ │
│  │ ──────────│    │                                                      │ │
│  │ [+ Create]│    │                                                      │ │
│  │           │    │                                                      │ │
│  │           │    │                                                      │ │
│  │           │    │                                                      │ │
│  │           │    │                                                      │ │
│  └─────────────┘    └─────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Responsive Design Breakpoints

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RESPONSIVE BREAKPOINTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Desktop (1200px+)                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Sidebar │                        Main Content                      │   │
│  │          │                                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Tablet (768px - 1199px)                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Main Content                                  │   │
│  │  ┌─────────────┐                                                    │   │
│  │  │  Collapsed  │                                                    │   │
│  │  │   Sidebar   │                                                    │   │
│  │  │   (icons)   │                                                    │   │
│  │  └─────────────┘                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Mobile (< 768px)                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [≡] REZ                                    [🔔] [Profile]          │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                     │   │
│  │                        Main Content                                  │   │
│  │                                                                     │   │
│  │                                                                     │   │
│  │                                                                     │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │  [Room]  [Menu]  [Store]  [Ads]                              │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix: Feature Comparison Matrix

| Feature | Simple | REZ Partner |
|---------|--------|-------------|
| **QR Generation** | Single QR | Bulk QR |
| **Analytics** | Basic scans | Full funnel |
| **AI Insights** | Tips | Deep analysis |
| **Custom Branding** | Logo only | Full customization |
| **API Access** | - | Full REST API |
| **Team Management** | - | Multi-user |
| **Integrations** | - | PMS, POS, CRM |
| **Priority Support** | - | Yes |
| **White-label** | - | Yes |

---

**Document Version:** 1.0
**Last Updated:** 2026-05-03
**Author:** REZ Integration Team
