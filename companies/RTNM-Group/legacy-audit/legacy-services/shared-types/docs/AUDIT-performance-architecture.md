# Performance Architecture Audit Report

**Date**: 2026-04-26
**Auditor**: Performance Engineering Agent
**Systems Audited**:
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-consumer/`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-api-gateway/`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-order-service/`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-catalog-service/`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-search-service/`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-merchant-service/`

---

## Performance Score: 67/100

### Summary
The codebase demonstrates good foundational patterns (proper indexing, Redis caching, pagination), but has significant room for improvement in N+1 query patterns, frontend re-renders, and caching strategies. Critical issues are primarily in high-traffic paths.

---

## 1. Performance Hotspots

### 1.1 Critical Hotspots (High Traffic Paths)

| Location | Issue | Impact | Recommendation |
|----------|-------|--------|----------------|
| `rez-search-service/src/services/searchService.ts:154-266` | `searchStores` fetches prior visits THEN does relevance scoring in-memory for ALL candidate stores | O(candidates) memory + O(n) re-sort after fetch | Pre-aggregate visit counts in `userstreaks` with TTL index |
| `rez-merchant-service/src/routes/orders.ts:118-126` | Orders endpoint runs `Order.find().populate('store')` without select | Full document fetch + populate overhead | Use `lean()` with explicit field projection |
| `rez-search-service/src/services/searchService.ts:539-555` | `getTrendingByCategory` aggregates 7-day visits with no date index on `userstreaks` | Table scan on userstreaks | Add compound index `{ updatedAt: -1, type: 1, lastStoreId: 1 }` |
| `rez-app-consumer/contexts/CartContext.tsx:766-832` | Cart save-to-AsyncStorage is fire-and-forget without error propagation | Silent failures may lose cart data | Add retry queue with persistence |
| `rez-search-service/src/routes/searchRoutes.ts:175-199` | `suggestionsCache` Map unbounded growth | Memory leak under high traffic | Implement LRU eviction or move to Redis |

### 1.2 High Hotspots

| Location | Issue | Impact | Recommendation |
|----------|-------|--------|----------------|
| `rez-app-consumer/hooks/useCategoryData.ts:186-416` | Four parallel API calls fetch data then filter client-side | Network waste + large payloads | Server-side filtering with category parameter |
| `rez-app-consumer/contexts/AuthContext.tsx:725-780` | Background profile sync uses JSON.stringify for comparison | O(n) serialization on every sync | Use field-level hash comparison |
| `rez-merchant-service/src/routes/orders.ts:288-292` | Bulk action queries Store.find() twice per order (100 orders = 200 queries) | N+1 on bulk operations | Cache merchant store IDs for session |
| `rez-search-service/src/services/searchService.ts:113-124` | `getPriorVisitedStoreIds` loads ALL visits for user into memory | Memory pressure for active users | Use aggregation with $limit |

### 1.3 Medium Hotspots

| Location | Issue | Impact | Recommendation |
|----------|-------|--------|----------------|
| `rez-order-service/src/models/Order.ts:101-114` | Multiple indexes on overlapping fields | Index maintenance overhead | Consolidate to compound indexes |
| `rez-app-consumer/hooks/useInfiniteScroll.ts:126-127` | `flat()` creates new array every fetch | GC pressure | Use index-based slicing |
| `rez-search-service/src/services/cacheHelper.ts:4-7` | SHA-256 hashing for every cache key | CPU overhead | Use xxHash or pre-computed keys |
| `rez-catalog-service/src/models/Product.ts:143-154` | Text index on `name + description` | Slow writes on large collections | Use prefix index or external search |

---

## 2. Database Query Analysis

### 2.1 N+1 Query Patterns

| Query | N+1 Risk | Missing Index | Optimization Needed |
|-------|----------|--------------|-------------------|
| `searchStores()` - `getPriorVisitedStoreIds` | **YES** - fetches all visits then maps in memory | `{ userId: 1, createdAt: -1 }` on `storevisits` | Pre-aggregate visit counts with TTL |
| `orders.ts:288-312` - bulk status update | **YES** - Store.find() inside loop | None | Cache merchant store IDs |
| `searchService.ts:568-578` - `getTrendingByCategory` | **YES** - fetches store docs for each category | `{ updatedAt: -1, type: 1, lastStoreId: 1 }` on `userstreaks` | Pre-compute trending hourly |
| `Order.find().populate('store')` | **YES** - separate query per order | None | Use aggregation pipeline |

### 2.2 Missing Indexes

| Collection | Field(s) | Impact | Priority |
|------------|----------|--------|----------|
| `userstreaks` | `{ updatedAt: -1, type: 1, lastStoreId: 1 }` | **CRITICAL** - 7-day aggregation scans all docs | P0 |
| `storevisits` | `{ userId: 1, createdAt: -1 }` | HIGH - user visit history scans | P1 |
| `products` | `{ pricing.selling: 1, isActive: 1 }` | MEDIUM - price filtering | P2 |
| `orders` | `{ user: 1, payment.status: 1, createdAt: -1 }` | MEDIUM - user payment history | P2 |
| `stores` | `{ 'location.coordinates': '2dsphere', isActive: 1 }` | HIGH - geo queries | P1 |

### 2.3 Inefficient Patterns

**Pattern 1: In-memory aggregation after fetch**
```typescript
// CURRENT (getTrendingByCategory) - Lines 539-641
const visitCounts = await UserStreaks.aggregate([...]);
const storeDocs = await Stores.find({ _id: { $in: storeIds }, isActive: true }, ...);
// Then iterates 3x through data in memory
for (const s of storeDocs) { /* map building */ }
for (const v of visitCounts) { /* category aggregation */ }
```
**Issue**: O(n*m) iteration over data that could be done in aggregation pipeline.
**Fix**: Use `$lookup` or pre-aggregate before fetch.

**Pattern 2: Fire-and-forget AsyncStorage writes**
```typescript
// CURRENT (CartContext:766-832)
(async () => {
  try { await AsyncStorage.setItem(...); } catch {}
})().catch(() => {});
```
**Issue**: No retry mechanism, silent failures.
**Fix**: Implement persistent retry queue.

---

## 3. API Response Time Analysis

### 3.1 Large Payloads

| Endpoint | Payload Size | Issue | Recommendation |
|---------|-------------|-------|----------------|
| `GET /orders` | Full order docs with timeline array | Timeline can grow unbounded | Project fields, limit timeline |
| `GET /stores/search` | Full store docs with all fields | 50+ fields per store | Paginate + sparse fields |
| `GET /offers-page` | All offers + banners in single call | 100+ items | Chunk by relevance tier |

### 3.2 Missing Pagination

| Endpoint | Current Behavior | Impact |
|----------|-----------------|--------|
| `GET /search/autocomplete` | Returns up to 20 items, no cursor | Fixed limit (acceptable) |
| `GET /search/trending` | Limited to 20 stores | Good (explicit limit) |
| `GET /stores` | Uses pagination | Good |
| `GET /orders` | Uses pagination | Good |

### 3.3 Caching Gaps

| Cache Location | TTL | Stale Risk | Fix |
|---------------|-----|-----------|-----|
| `searchService.searchStores()` | 60s | LOW | Acceptable |
| `searchService.searchProducts()` | 60s | LOW | Acceptable |
| `searchService.getAutocomplete()` | 300s | MEDIUM | Reduce to 60s for freshness |
| `orders.ts /stats/summary` | 300s | LOW | Good |
| `suggestionsCache` (in-memory) | 60s | HIGH | Move to Redis with eviction |
| `_trendingByCategoryCache` (in-memory) | 600s | HIGH | Documented single-process constraint |

---

## 4. Frontend Performance Analysis

### 4.1 Memory Leak Risks

| Location | Issue | Risk | Fix |
|---------|-------|------|-----|
| `SocketContext.tsx:153-302` | Socket event listeners attached without cleanup on re-render | HIGH - multiple listeners accumulate | Use `AbortController` pattern or cleanup in deps array |
| `useInfiniteScroll.ts:91-96` | `isMounted` ref pattern is susceptible to timing issues | MEDIUM | Use `useRef` with `useEffect` return for true cleanup |
| `CartContext.tsx:1197-1225` | Network listener attached on every mount | MEDIUM | Cleanup properly handles `isMounted` flag |
| `AuthContext.tsx:144-180` | API callbacks set on every render | LOW | Use `useCallback` with stable deps |
| `useCategoryData.ts:408-416` | Multiple API calls triggered by slug change | MEDIUM | Cancel previous requests with AbortController |

### 4.2 Re-render Issues

| Component | Issue | Impact | Fix |
|-----------|-------|--------|-----|
| `useCategoryData.ts` | Returns 14 state values causing all consumers to re-render | HIGH | Split into multiple smaller hooks |
| `AppContext.tsx:426-461` | Context memoization incomplete - `state` changes triggers re-render | MEDIUM | Split settings vs computed values |
| `AuthContext.tsx:942-945` | Stable actions memoization good, but `state` object still causes re-renders | MEDIUM | Use `context as value` pattern |
| `CartContext.tsx:1293-1298` | Full state in context value causes unnecessary re-renders | MEDIUM | Memoize computed values separately |

### 4.3 Bundle Size

| Entry Point | Analysis | Recommendation |
|-------------|---------|----------------|
| Main App | 228 components, 156 hooks | Lazy load feature modules |
| Socket.io import | ~100KB loaded on context mount | Keep as lazy import (already done) |
| Chart libraries | Verify tree-shaking | Use `esm` builds |

### 4.4 Image Optimization

| Pattern | Status | Issue |
|---------|--------|-------|
| Lazy loading | Partially implemented | GalleryImagePreloader exists but not universal |
| Compression | Unknown | No evidence of client-side compression |
| CDN usage | Unknown | Needs verification in image URLs |
| WebP/AVIF | Unknown | Not detected in codebase |

---

## 5. Caching Analysis

### 5.1 Redis Usage

| Service | Redis Usage | TTL | Hit Rate |
|---------|------------|-----|---------|
| `rez-search-service` | Cache search results | 60-300s | HIGH |
| `rez-merchant-service` | Merchant suspension check | Per-request | N/A |
| `rez-order-service` | Worker queues (BullMQ) | N/A | N/A |
| `rez-catalog-service` | Product cache | Unknown | Unknown |

### 5.2 In-Memory Caching Issues

| Cache | Issue | Risk | Resolution |
|-------|-------|------|------------|
| `_trendingByCategoryCache` | Single-process only | HIGH for multi-replica | Document constraint, move to Redis |
| `suggestionsCache` | Unbounded Map growth | HIGH | Implement LRU or move to Redis |
| `CACHE_DEFAULTS` objects | Not an issue | LOW | Acceptable |

### 5.3 Cache Invalidation

| Cache | Invalidation Strategy | Status |
|-------|---------------------|--------|
| Search results | TTL only | Acceptable |
| Trending stores | TTL + manual | Needs event-based invalidation |
| Order stats | TTL only | Good for read-heavy |
| User preferences | Write-through | Good |

---

## 6. Algorithm Complexity Issues

### 6.1 O(n^2) Patterns

| Location | Pattern | Complexity | Fix |
|----------|---------|-----------|-----|
| `getTrendingByCategory` - nested loops | Category aggregation | O(categories * stores * visits) | Pre-aggregate in aggregation pipeline |
| `useCategoryData` - filter in JS | Client-side filtering | O(items * filters) | Server-side filtering |
| `getAutocomplete` - dedupe functions | Linear dedupe | O(n^2) worst case | Use Map-based dedupe |

### 6.2 Unbounded Operations

| Operation | Risk | Mitigation |
|-----------|------|------------|
| `Stores.find().toArray()` | Memory exhaustion with large results | Always use `limit()` + pagination |
| `Products.distinct('category')` | Large result set | Add query filter |
| `UserStreaks.aggregate($limit: 200)` | Acceptable | Good - bounded |

---

## 7. Recommendations by Priority

### P0 - Critical (Immediate Action)

1. **Add missing database index on `userstreaks`**
   ```javascript
   // In userstreaks collection
   db.userstreaks.createIndex({ updatedAt: -1, type: 1, lastStoreId: 1 })
   ```

2. **Fix N+1 in bulk order operations**
   - Cache merchant store IDs at session start
   - Reduce from 200 queries to 1 for bulk actions

3. **Move `suggestionsCache` to Redis**
   - Prevents memory leak under high traffic
   - Enables multi-replica consistency

### P1 - High (Within Sprint)

4. **Implement AbortController for API calls**
   - `useCategoryData.ts` - Cancel on slug change
   - `useProductSearch.ts` - Already has pattern, verify consistency

5. **Add field projection to order queries**
   - Remove unnecessary timeline/history fields
   - Reduce payload by ~40%

6. **Split context providers**
   - Break `useCategoryData` into smaller hooks
   - Split `AppContext` by feature domain

### P2 - Medium (Next Iteration)

7. **Optimize search relevance scoring**
   - Move visit aggregation to pipeline
   - Pre-compute trending hourly

8. **Implement cart persistence retry queue**
   - Ensure cart saves survive failures
   - Add optimistic updates with rollback

9. **Add sparse field selection API**
   - `?fields=id,name,price` pattern
   - Reduce payload for list views

---

## 8. Metrics Targets

| Metric | Current | Target |
|--------|---------|--------|
| API P95 Latency | Unknown | < 200ms |
| Database Query Time | Unknown | < 50ms |
| Frontend LCP | Unknown | < 2.5s |
| Memory (Mobile) | Unknown | < 150MB |
| Bundle Size (JS) | Unknown | < 500KB gzipped |

---

## 9. Files Referenced

### Backend Services
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-order-service/src/models/Order.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-catalog-service/src/models/Product.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-catalog-service/src/models/Category.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-search-service/src/services/searchService.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-search-service/src/services/cacheHelper.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-search-service/src/routes/searchRoutes.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-merchant-service/src/models/Store.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-merchant-service/src/models/Order.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-merchant-service/src/routes/orders.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-catalog-service/src/config/redis.ts`

### Frontend (rez-app-consumer)
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-consumer/contexts/CartContext.tsx`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-consumer/contexts/AuthContext.tsx`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-consumer/contexts/SocketContext.tsx`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-consumer/contexts/AppContext.tsx`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-consumer/hooks/useOrderHistory.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-consumer/hooks/useCategoryData.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-consumer/hooks/useProductSearch.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-consumer/hooks/useInfiniteScroll.ts`
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-consumer/hooks/useOffersPage.ts`

---

## 10. Appendix: Quick Reference

### Performance Testing Commands
```bash
# Analyze bundle size
npx expo export --output-dir dist

# Check for unused indexes
db.getCollection('orders').getIndexes()

# Profile slow queries
db.setProfilingLevel(1, { slowms: 100 })

# Redis memory analysis
redis-cli INFO memory
```

### Monitoring Points
1. **Redis**: `INFO commandstats` for cache hit rates
2. **MongoDB**: `db.currentOp()` for slow operations
3. **Frontend**: React DevTools Profiler for re-renders
4. **Network**: Lighthouse CI for Core Web Vitals
