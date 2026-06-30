# InternetOS Deep Code Audit

**Date:** June 30, 2026
**Path:** `companies/HOJAI-AI/platform/internet-os/`
**Overall Health: 30%**

---

## EXECUTIVE SUMMARY

| Aspect | Status | Finding |
|--------|--------|---------|
| **Source Files** | ✅ | 9 TypeScript files present |
| **Compilation** | ❌ BROKEN | No `tsconfig.json` |
| **Tests** | ❌ MISSING | No test files exist |
| **Dependencies** | ❌ INCOMPLETE | Missing in package.json |
| **Database** | ❌ MISSING | In-memory only |
| **Actual Scraping** | ⚠️ FRAGILE | CSS selectors + DOMParser (no Puppeteer) |
| **Documentation Accuracy** | ❌ WRONG | Claims 14,632 LOC, actual is 612 lines (96% inflated) |

---

## CRITICAL ISSUES (P0)

### 1. TypeScript Won't Compile ❌

**File:** All actor packages

**Problem:** No `tsconfig.json` exists anywhere in the platform.

```
platform/internet-os/
├── actor-runtime/
│   ├── package.json  ✅
│   └── src/index.ts  ✅
│   └── ❌ tsconfig.json MISSING
├── watcher-runtime/
│   └── ❌ tsconfig.json MISSING
├── actors/
│   ├── google-maps-actor/  ❌ tsconfig.json MISSING
│   ├── zomato-actor/       ❌ tsconfig.json MISSING
│   └── ...
```

**Impact:** `npm run build` fails. Code cannot compile.

**Fix Required:**
```json
// actor-runtime/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### 2. DOMParser Won't Work in Node.js ❌

**File:** `actor-runtime/src/index.ts` (lines 245-248)

```typescript
export function parseHtml(html: string): Document {
  const parser = new DOMParser(); // ❌ BROWSER-ONLY API
  return parser.parseFromString(html, 'text/html');
}
```

**Problem:** `DOMParser` is a **browser-only API**. This throws `ReferenceError: DOMParser is not defined` in Node.js.

**Impact:** The `parseHtml()` utility used by all actors will crash in Node.js.

**Fix Required:** Use `cheerio` library instead.
```typescript
import * as cheerio from 'cheerio';

export function parseHtml(html: string): cheerio.Root {
  return cheerio.load(html);
}
```

---

### 3. No Test Files Exist ❌

**Expected:**
```
actor-runtime/
├── src/
│   └── index.ts
├── __tests__/
│   ├── index.test.ts
│   ├── actor-runtime.test.ts
│   └── fetch-url.test.ts
└── vitest.config.ts
```

**Actual:** No test directories or configuration files exist.

**Impact:** Cannot verify code correctness. No regression protection.

**Fix Required:** Add vitest configuration and tests.

---

### 4. Missing Dependencies in package.json ❌

**Current state (actor-runtime/package.json):**
```json
{
  "name": "@hojai/actor-runtime",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest"
  }
  // ❌ NO "dependencies" field!
  // ❌ NO "devDependencies" field!
}
```

**Missing:**
```json
{
  "dependencies": {
    "cheerio": "^1.0.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

### 5. Dynamic Content Won't Scrape ❌

**Problem:** All actors use `fetchUrl()` which only gets initial HTML — **does NOT execute JavaScript**.

**Sites that require JavaScript rendering:**

| Actor | Issue |
|-------|-------|
| **Google Maps** | React-rendered, requires JS execution |
| **Zomato** | React/Vue-rendered |
| **Airbnb** | Heavily JavaScript-rendered |
| **LinkedIn** | Requires JS for dynamic content |
| **Company Intel** | Similarweb, Crunchbase block scrapers |

**Impact:** These actors will likely return **empty or incomplete results**.

**Fix Required:** Add Puppeteer/Playwright for JavaScript-rendered sites.
```typescript
import puppeteer from 'puppeteer';

async function scrapeWithJS(url: string): Promise<string> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const html = await page.content();
  await browser.close();
  return html;
}
```

---

## HIGH PRIORITY ISSUES (P1)

### 6. In-Memory Storage Only ❌

**Problem:** All data stored in memory — **lost on restart**.

```typescript
// actor-runtime - In-memory Map
const actorRegistry = new Map<string, Actor>();

// watcher-runtime - In-memory storage
const watchers = new Map<string, Watcher>();
const changeHistory: WatcherChange[] = []; // Array, not DB
```

**Missing:**
- MongoDB connection
- Redis for pub/sub
- PostgreSQL for persistence

**Impact:** Watcher change history, actor run logs, and all state is ephemeral.

---

### 7. Proxy Implementation Incomplete ⚠️

**File:** `actor-runtime/src/index.ts` (lines 221-224)

```typescript
if () {
  // Use  if configured
  fetchOptions.duplex = 'half'; // ❌ This does nothing
}
```

**Problem:** Setting `duplex: 'half'` doesn't route traffic through a proxy. Need actual proxy library like `https-proxy-agent`.

**Fix:**
```typescript
import { HttpsProxyAgent } from 'https-proxy-agent';

const agent = new HttpsProxyAgent(proxyUrl);
fetchOptions.duplex = 'half';
(fetchOptions as any).agent = agent;
```

---

### 8. SSRF Security Risk ⚠️

**Problem:** No URL validation before fetching.

```typescript
// No validation - could hit internal services
const response = await fetch(url, fetchOptions);
```

**Attack vector:** User could pass `http://169.254.169.254/` (AWS metadata) or `http://localhost:4399/`.

**Fix:**
```typescript
function validateUrl(url: string): void {
  const parsed = new URL(url);
  
  // Block private IP ranges
  const blocked = [
    '127.0.0.1', 'localhost', '0.0.0.0',
    /^10\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^192\.168\./,
    /^169\.254\./  // AWS metadata
  ];
  
  if (blocked.some(b => 
    typeof b === 'string' ? parsed.hostname === b : b.test(parsed.hostname)
  )) {
    throw new Error('Invalid URL: private IP ranges not allowed');
  }
}
```

---

## MEDIUM PRIORITY ISSUES (P2)

### 9. LinkedIn Actor Blocked ❌

**File:** `linkedin-actor/src/index.ts`

**Problem:** LinkedIn actively blocks scraping. Without:
- Proper headers
- Session cookies
- Headless browser

This actor will fail 100% of the time.

---

### 10. Company Intel Actor Has No Working Sources ❌

**File:** `company-intel-actor/src/index.ts`

| Source | Status |
|--------|--------|
| Similarweb | ❌ Blocks scrapers |
| Crunchbase | ❌ Requires login |
| Twitter/X | ❌ Requires API auth |
| LinkedIn | ❌ Blocked |

**Impact:** The `getCompetitors()`, `getFundingHistory()`, and `getSocialMetrics()` methods will all fail.

---

### 11. Airbnb Actor Has Hardcoded Indian Pricing ⚠️

**File:** `airbnb-actor/src/index.ts`

```typescript
const priceMatch = priceText.match(/₹([\d,]+)/);  // ❌ Rupee only
```

**Problem:** No currency support. Won't work for USD, AED, etc.

---

### 12. News Actor Uses Simple Keyword Sentiment ⚠️

**File:** `news-actor/src/index.ts`

```typescript
const positiveWords = ['good', 'great', 'excellent', 'amazing', ...];
const negativeWords = ['bad', 'terrible', 'awful', 'horrible', ...];
```

**Problem:** Basic keyword matching, not ML-based sentiment analysis.

---

## FILE-BY-FILE ANALYSIS

### actor-runtime/src/index.ts (266 lines)

| Check | Status | Issue |
|-------|--------|-------|
| TypeScript types | ✅ OK | Well-typed interfaces |
| Error handling | ✅ OK | Try-catch throughout |
| Rate limiting | ✅ OK | Working implementation |
| `fetchUrl` retries | ✅ OK | 3 retries with backoff |
| `parseHtml` | ❌ FAILS | DOMParser is browser-only |
| `extractJson` | ⚠️ WARNING | Returns `null` silently |
| Memory | ❌ PROBLEM | Singleton persists forever |

---

### watcher-runtime/src/index.ts (346 lines)

| Check | Status | Issue |
|-------|--------|-------|
| Watcher management | ✅ OK | Add, remove, start, stop |
| State management | ❌ FAILS | In-memory Map, lost on restart |
| Change detection | ✅ OK | Added/removed/modified types |
| Pre-built watchers | ✅ OK | Price, Review, Competitor |

---

### google-maps-actor/src/index.ts (243 lines)

| Check | Status | Issue |
|-------|--------|-------|
| `scrape()` method | ⚠️ FRAGILE | CSS selectors will break |
| Rate limit | ✅ OK | 10 requests/minute |
| Error handling | ✅ OK | Graceful degradation |

**Known issues:** Google Maps selectors like `[data-result-id]` are proprietary and change frequently.

---

### zomato-actor/src/index.ts (228 lines)

| Check | Status | Issue |
|-------|--------|-------|
| `scrape()` method | ⚠️ FRAGILE | CSS selectors likely outdated |
| `getReviews` | ⚠️ FRAGILE | Reviews loaded via JS |

---

### airbnb-actor/src/index.ts (262 lines)

| Check | Status | Issue |
|-------|--------|-------|
| `scrape()` method | ⚠️ FRAGILE | Airbnb heavily JS-rendered |
| Currency | ❌ FAILS | Hardcoded ₹ symbol |

---

### linkedin-actor/src/index.ts (185 lines)

| Check | Status | Issue |
|-------|--------|-------|
| LinkedIn scraping | ❌ BLOCKED | Requires auth, blocks scrapers |
| Rate limit | ⚠️ WARNING | 5/min is too high |

---

### news-actor/src/index.ts (260 lines)

| Check | Status | Issue |
|-------|--------|-------|
| News sources | ⚠️ PARTIAL | Google News may work |
| `analyzeSentiment` | ⚠️ SIMPLE | Keyword-based only |

---

### company-intel-actor/src/index.ts (319 lines)

| Check | Status | Issue |
|-------|--------|-------|
| `getCompanyProfile` | ⚠️ PARTIAL | 3 sources, graceful fallback |
| `getCompetitors` | ❌ BLOCKED | Similarweb blocks |
| `getFundingHistory` | ❌ BLOCKED | Crunchbase requires login |

---

### justdial-actor/src/index.ts (83 lines)

| Check | Status | Issue |
|-------|--------|-------|
| Basic functionality | ⚠️ FRAGILE | Layout changes frequently |
| Phone extraction | ✅ OK | Regex works |

---

## LINE COUNT DISCREPANCY

| Location | Docs Say | Actual | Inflation |
|----------|----------|--------|-----------|
| actor-runtime | 6,561 LOC | 266 lines | **96%** |
| watcher-runtime | 8,071 LOC | 346 lines | **96%** |
| **Total** | **14,632 LOC** | **612 lines** | **96%** |

The documentation claims 14,632 lines but the actual codebase is 612 lines.

---

## RECOMMENDED FIXES (Priority Order)

### Week 1: Make It Compile

```bash
# 1. Add tsconfig.json to all packages
# 2. Add missing dependencies to package.json
# 3. Replace DOMParser with cheerio
# 4. Add vitest.config.ts
# 5. Write basic tests
```

### Week 2: Make It Work

```bash
# 1. Add Puppeteer for JS-rendered sites
# 2. Add MongoDB for persistence
# 3. Fix SSRF validation
# 4. Fix proxy implementation
# 5. Add rate limit headers
```

### Week 3-4: Make It Production-Ready

```bash
# 1. Add Redis pub/sub
# 2. Add API server (port 4595)
# 3. Add actor versioning
# 4. Add metrics/observability
# 5. Write integration tests
```

---

## ARCHITECTURE SCORE

| Layer | Score | Notes |
|-------|-------|-------|
| **Architecture** | 85% | Good abstraction, clean interfaces |
| **Implementation** | 40% | Fragile selectors, no JS rendering |
| **Infrastructure** | 15% | No DB, no tests, won't compile |
| **Security** | 30% | SSRF risk, no auth |
| **Documentation** | 50% | 96% inflated line counts |

**Overall: 30% Production Ready**

---

## CONCLUSION

The InternetOS platform has a **solid architectural foundation** but is **not production-ready**:

1. **Won't compile** — Missing tsconfig.json
2. **Won't run** — DOMParser is browser-only
3. **Won't persist** — In-memory only
4. **Won't scrape dynamic sites** — No Puppeteer
5. **No tests** — Zero test coverage

**Estimated time to production-ready:** 2-3 weeks.

---

*Last Updated: June 30, 2026*
*InternetOS Code Audit — HOJAI AI*
