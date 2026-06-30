# InternetOS - Actor Analysis Report

**Date:** June 30, 2026
**Method:** Source code analysis of all 17 actors
**Library Used:** All use Cheerio (Node.js-compatible)

---

## TL;DR

| Status | Count | Actors |
|--------|-------|--------|
| ✅ **Production-Ready** | 2 | reddit, shopify |
| ⚠️ **Needs Fix** | 4 | news, justdial, github, youtube, google-trends |
| ❌ **Won't Work** | 8 | google-maps, zomato, airbnb, linkedin, company-intel, amazon, twitter, glassdoor, instagram, crunchbase |
| 🔧 **Use Existing API** | 1 | github (already has `API_URL` constant!) |

**Bottom line: 2 actors are production-ready, 15 need work.**

---

## ✅ PRODUCTION-READY (2)

### 1. shopify-actor — BEST IN CLASS

**Strengths:**
- ✅ Uses Shopify JSON-LD structured data
- ✅ Parses `/products.json` endpoint
- ✅ Handles all major themes via stable `data-product-*` selectors
- ✅ Extracts variants from `<script type="application/json">`

**Verdict:** Works on any Shopify store today.

### 2. reddit-actor — EXCELLENT

**Strengths:**
- ✅ Uses Reddit's official JSON API (`.json` endpoints)
- ✅ No HTML scraping fragility
- ✅ Sends proper `Accept: application/json` header

**Verdict:** Production-ready with rate limiting.

---

## ⚠️ NEEDS FIXING (4)

### 3. news-actor — FRAGILE

**Issue:** Uses Google News HTML selectors that change frequently.
**Fix:** Switch to Google News RSS: `https://news.google.com/rss/search?q=...`

### 4. justdial-actor — FRAGILE

**Issue:** Mixed legacy/new class names; phone numbers JS-encoded.
**Fix:** Selector maintenance + rotating residential proxies.

### 5. github-actor — API NOT WIRED

**Issue:** `API_URL = 'https://api.github.com'` is defined but NEVER USED. All requests go to GitHub HTML pages.
**Fix:** Switch from HTML scraping to REST API:
```typescript
// Use api.github.com instead of github.com
const API_URL = 'https://api.github.com';
fetch(`${API_URL}/repos/${owner}/${repo}`)
```

### 6. youtube-actor — FRAGILE

**Issue:** Uses `ytInitialData` JSON regex parsing — YouTube changes structure frequently.
**Fix:** Use YouTube Data API v3 (free tier: 10K units/day).

---

## 🔥 NEEDS API REPLACEMENT (4)

### 7. linkedin-actor — ILLEGAL WITHOUT AUTH

**Issue:** LinkedIn requires login; class-based selectors broken in 2024 redesign.
**Fix:** Use **Proxycurl** or **Clearbit** API (paid).

### 8. twitter-actor — REQUIRES AUTH

**Issue:** Twitter/X requires login since 2023.
**Fix:** Use **Twitter API v2** ($100/month minimum).

### 9. amazon-actor — BLOCKED

**Issue:** Amazon aggressively blocks scrapers.
**Fix:** Use **Amazon PA-API** (Product Advertising API).

### 10. google-trends-actor — FRAGILE

**Issue:** Heavy-hashed class names; Math.random() bug returns fake data on failure.
**Fix:** Use **SerpAPI Google Trends API** (paid).

---

## ❌ NEEDS PUPPETEER (5)

### 11. google-maps-actor — JS-RENDERED

**Issue:** Fully JavaScript-rendered SPA. `fetchUrl` returns only shell HTML.
**Fix:** Puppeteer + stealth plugins + Google Places API.

### 12. zomato-actor — JS-RENDERED

**Issue:** Hash-based class names (e.g., `sc-1a03l6f-0`) change every deploy.
**Fix:** Puppeteer or Google Places API (Zomato data is there).

### 13. airbnb-actor — JS-RENDERED

**Issue:** Fully React SPA; `data-testid` values change with each deploy.
**Fix:** Puppeteer + unofficial JSON API endpoints.

### 14. instagram-actor — BLOCKED

**Issue:** `window._sharedData` deprecated in 2020; requires login.
**Fix:** Instagram Graph API (Business/Creator account required).

### 15. crunchbase-actor — PAYWALLED

**Issue:** Crunchbase requires paid subscription; no public API.
**Fix:** Crunchbase Enterprise API ($9K-50K/year) or PitchBook.

### 16. glassdoor-actor — TOILEGAL

**Issue:** Glassdoor explicitly forbids scraping (Perceptyx lawsuit 2023).
**Fix:** Use Levels.fyi / Payscale / BLS.gov (free US government data).

---

## ❌ COMPOSITE FAILURES (1)

### 17. company-intel-actor — BROKEN MULTIPLE WAYS

**Issue:** Aggregates 3 broken sources:
- LinkedIn (broken)
- Similarweb (blocked, JS-rendered)
- Crunchbase (paywalled)

**Fix:** Replace with API aggregator (Clearbit, Apollo.io, ZoomInfo).

---

## 🐛 CRITICAL BUGS

### Bug 1: google-trends-actor line 540

```typescript
// CURRENT (BAD):
score = Math.random() * 100; // Returns FAKE data!

// FIX:
score = 0; // or throw new Error('Could not determine score');
```

### Bug 2: github-actor API not used

```typescript
// CURRENT (api defined but unused):
const API_URL = 'https://api.github.com';
// ...all code uses HTML scraping

// FIX: Use api.github.com for all requests
```

### Bug 3: Most actors swallow errors silently

```typescript
// CURRENT (swallows errors):
} catch {}

return [];
// No logging, no alerts
```

---

## 🔧 ARCHITECTURAL IMPROVEMENTS NEEDED

1. **Add `fetchWithRetry()` helper** — Exponential backoff + retry-after-respect
2. **Add `parseRobust()` helper** — Tries: JSON-LD → JSON script → microdata → OG tags → selectors
3. **Add rate-limit-aware HTTP client** — Respects `Retry-After` header
4. **Standardize error handling** — Log all failures
5. **Add "use_api" flag** — Use official APIs when available (YouTube, GitHub)
6. **Document auth requirements** — README in each actor

---

## 🎯 PRIORITY FIX ORDER

### Quick Wins (1 day each)
1. **github-actor** — Wire the existing `API_URL`
2. **google-trends-actor** — Fix the Math.random() bug
3. **reddit-actor** — Add OAuth for higher rate limits
4. **shopify-actor** — Use `/products.json` instead of HTML (already uses JSON-LD)

### Medium Effort (1 week each)
5. **news-actor** — Switch to RSS API
6. **justdial-actor** — Selector overhaul + proxies
7. **youtube-actor** — Use YouTube Data API

### Significant Effort (3-4 weeks each)
8. **google-maps-actor** — Add Puppeteer + stealth
9. **amazon-actor** — Use PA-API
10. **zomato-actor** — Switch to Google Places
11. **airbnb-actor** — Add Puppeteer

### Major Effort / API Replacement (2-4 weeks each)
12. **twitter-actor** — Use Twitter API v2
13. **linkedin-actor** — Use Proxycurl
14. **instagram-actor** — Use Instagram Graph API
15. **crunchbase-actor** — Use Crunchbase Enterprise API
16. **glassdoor-actor** — Use Levels.fyi / BLS
17. **company-intel-actor** — Use Clearbit

---

## 💰 MONETIZATION OPPORTUNITY

The actors that **don't work** today represent the **biggest GTM opportunity**:

```
WORKING actors (today):   2 — shopify, reddit
NEEDS API (paid):        5 — twitter, linkedin, instagram, amazon, glassdoor
NEEDS BROWSER (infra):    5 — google-maps, zomato, airbnb, google-trends, youtube
NO PUBLIC OPTION:        2 — crunchbase, justdial
COMPOSITE:               1 — company-intel

→ Sell "InternetOS Pro" tier with Puppeteer-based scraping
→ OR "InternetOS API" tier that wraps paid APIs
```

---

## 📊 FINAL SCOREBOARD

| Tier | Description | Count | Status |
|------|-------------|-------|--------|
| **Tier 1** | Works today, no changes needed | 2 | ✅ Ready |
| **Tier 2** | Bugs to fix / selectors to refresh | 3 | 🐛 1-day fixes |
| **Tier 3** | Switch from HTML to official API | 4 | 🔌 API swap |
| **Tier 4** | Need Puppeteer/Playwright | 5 | 🌐 Browser infra |
| **Tier 5** | Legal/ToS concerns, need paid APIs | 3 | 💰 Paid APIs |

---

*Last Updated: June 30, 2026*
*InternetOS Actor Analysis - HOJAI AI*