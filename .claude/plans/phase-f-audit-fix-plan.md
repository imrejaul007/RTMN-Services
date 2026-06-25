# Phase F Code Audit — Fix Plan

**Audited:** Voice Gateway v1.1 (HOJAI-AI), Nexha Supplier Registry v1.0 (Nexha), RTMN Hub wiring
**Date:** 2026-06-25
**Severity scale:** 🔴 Critical → 🟡 Medium → 🟢 Low

---

## 🔴 CRITICAL — Fix Immediately

### 1. Deepgram API key header is wrong
**File:** `voice-gateway/src/adapters/stt/deepgram.adapter.ts` line 31
**Bug:** Uses `Authorization: Token ${apiKey}` — Deepgram expects `DG-API-Key`
**Fix:**
```typescript
// BEFORE
'Authorization': `Token ${config.stt.engines.deepgram.apiKey}`,
// AFTER
'DG-API-Key': config.stt.engines.deepgram.apiKey,
```

### 2. Port 4293 collision in Hub
**File:** `REZ-ecosystem-connector/src/index.ts` lines 24 & 133
**Bug:** Both `sutar-negotiation` (from SUTAR_SERVICES) and `nexha-autonomous-logistics` (from NEXHA_SERVICES) map to `http://localhost:4293`
**Fix:** Move `nexha-autonomous-logistics` to port 4296 (it's described as logistics in the ADR-0012 plan, port 4293 was already used by sutar-negotiation). Update the NEXHA_SERVICES entry and the Hub port registry.

### 3. `supplier-registry` capability maps to wrong service
**File:** `REZ-ecosystem-connector/src/index.ts` line 294
**Bug:** `'supplier-registry': ['nexha-supplier-network']` — but `nexha-supplier-network` (4280) is discovery/scoring, NOT the registry (4281). The Phase F entry at line 358 correctly maps to `nexha-supplier-registry`, but the generic `supplier-registry` entry at line 294 shadows it.
**Fix:** Remove the old `'supplier-registry': ['nexha-supplier-network']` entry entirely. Keep the Phase F entries with `supplier-registry-v2`.

### 4. `updateTracking` receives shipmentId but uses it as poId
**File:** `nexha-supplier-registry/src/services/trade.service.ts` lines 240-241
**Bug:** Route `PATCH /api/v2/trade/shipment/:id/track` passes `req.params.id` (shipmentId) to `updateTracking(poId, ...)`. The function then calls `getShipmentForPO(poId)` searching by the wrong ID.
**Fix:** Either (a) rename the route param to `poId` and pass `req.params.poId`, or (b) change `updateTracking` to accept `shipmentId` and search by shipment.

### 5. PATCH/PUT endpoints have no input validation
**Files:** `nexha-supplier-registry/src/index.ts` — multiple `app.patch/app.put` routes
**Bug:** `app.patch('/api/v1/suppliers/:id', ...)` and similar accept raw `req.body` with no Zod validation. Any field can be injected.
**Fix:** Add Zod schemas for each PATCH endpoint: `UpdateSupplierSchema`, `UpdateContractSchema`, `UpdatePOStatusSchema`, `AddShipmentEventSchema`, `ResolveDisputeSchema`.

### 6. `audioHashSet` grows unbounded
**File:** `voice-gateway/src/index.ts` line 47
**Bug:** Module-level `Set<string>` with no max size, TTL, or cleanup. Memory leak at scale.
**Fix:** Add a capped LRU cache. When size > 100,000, evict oldest 10%. Or use a Map with timestamp and periodically clean entries older than 7 days.

### 7. `asyncRoute` maps all errors to HTTP 400
**File:** `voice-gateway/src/index.ts` lines 76-84
**Bug:** `catch (e) { res.status(400).json(...) }` — validation errors, server crashes, Redis failures all return 400.
**Fix:** Distinguish error types:
- Zod validation errors → 400
- Business logic errors → 422
- Server/network errors → 500
- Upstream API errors → 502

---

## 🟡 MEDIUM — Fix Soon

### 8. Audio duration estimate is ~8x wrong
**File:** `voice-gateway/src/index.ts` line 249
**Bug:** `const audioSeconds = audioBuffer.length / 16000` — `length` is bytes, not samples. Works for 16-bit mono PCM at 16kHz but wrong for all compressed formats.
**Fix:** Use `formatMeta.durationMs / 1000` from the pre-flight analysis result (which is already computed and available).

### 9. `recordAccuracy` always passes empty ground truth
**File:** `voice-gateway/src/index.ts` line 245
**Bug:** `recordAccuracy(effectiveEngine, result.text, '', domain, finalLang)` — 3rd param is always `''`. Accuracy tracking is always 100% (since `refWords.size === 0` → `acc = 1`).
**Fix:** Either (a) remove the call since there's no ground truth available at inference time, or (b) only call `recordAccuracy` when ground truth is available (e.g., in benchmark mode).

### 10. `config.tts.hojaiAccuracyThreshold` is undefined — TTS promotion unreachable
**File:** `voice-gateway/src/services/routing.ts` line 191
**Bug:** `config.tts` has no `hojaiAccuracyThreshold` field. `undefined > 0` is false. The entire HOJAI TTS promotion path never executes.
**Fix:** Add `hojaiAccuracyThreshold: 0.88` to `config.tts` in `src/config/index.ts`.

### 11. `TTS_PROFILES.hojai.quality = 0` — HOJAI TTS never selected
**File:** `voice-gateway/src/services/routing.ts` line 30
**Bug:** `hojai: { quality: 0, ... }` and the condition at line 193 checks `hojaiQ > 0`. HOJAI TTS is never routed to.
**Fix:** Change `quality: 0` to `quality: 88` in `TTS_PROFILES.hojai` to reflect the actual quality when HOJAI's model is available.

### 12. `indic_first` routing misses 4 Indic languages
**File:** `voice-gateway/src/services/routing.ts` line 126
**Bug:** Only `['hi', 'bn', 'ta', 'te', 'mr', 'kn', 'ml']` — missing `gu` (Gujarati), `pa` (Punjabi), `or` (Odia), `as` (Assamese).
**Fix:** Add all 4 missing languages to the array. Also fix `LANGUAGE_ENGINE_MAP` to include `gu`, `pa`, `or`, `as` mapping to `sarvam`.

### 13. VAD segment endMs off-by-one (30ms error per segment)
**File:** `voice-gateway/src/services/audio-preprocessor.ts` line 164
**Bug:** `endMs: i * FRAME_SIZE_MS` should be `endMs: (i - 1) * FRAME_SIZE_MS` since `i` is the current frame index (where speech ended).
**Fix:** Change line 164 from `endMs: i * FRAME_SIZE_MS` to `endMs: (i - 1) * FRAME_SIZE_MS`.

### 14. `training/export` is a stub returning fake data
**File:** `voice-gateway/src/index.ts` lines 566-575
**Bug:** Returns `{ samples: audioHashSet.size, path: '...' }` with a comment "Export implemented by draining event bus — wire to S3 or file write". No actual export.
**Fix:** Implement real export: read events from Redis stream or in-memory queue, write to JSONL file at `config.training.outputPath`, stream as download response with proper `Content-Disposition` header.

### 15. `verifyDocument` function has no API route
**File:** `nexha-supplier-registry/src/services/verification.service.ts`
**Bug:** `verifyDocument(supplierId, docIndex, ...)` is exported but never called from any route.
**Fix:** Add `app.post('/api/v1/documents/:supplierId/:docIndex/verify', ...)` route that calls `verificationService.verifyDocument()`.

### 16. `express.raw({ type: 'audio/*' })` is invalid
**File:** `voice-gateway/src/index.ts` line 68
**Bug:** `audio/*` is not a valid type for `express.raw()`. This middleware silently fails.
**Fix:** Use `express.raw({ type: /audio\//, limit: '50mb' })` with a regex, or an array of specific MIME types.

### 17. `express.raw` consumes body before Zod parsing
**File:** `voice-gateway/src/index.ts` lines 67-68
**Bug:** `express.raw({ type: 'audio/*' })` matches `.webm` audio requests and returns raw Buffer, but the route expects `req.body.audio` (base64 string). The STT endpoint uses `Buffer.from(req.body.audio, 'base64')` — so audio should come as base64 in JSON, not raw binary. The raw body parser is unnecessary and wrong.
**Fix:** Remove `app.use(express.raw(...))` entirely since all audio comes as base64 in JSON bodies.

### 18. `benchmarkResults` Map grows forever
**File:** `voice-gateway/src/index.ts` line 87
**Bug:** `Map<string, {...}>` with no TTL or cleanup. Every benchmark run adds entries.
**Fix:** Add a 24-hour TTL check before storing. Remove entries older than 24h on new benchmark run.

### 19. Batch STT has no fallback chain
**File:** `voice-gateway/src/index.ts` lines 313-317
**Bug:** Unlike the single STT endpoint (which uses `transcribeWithFallback`), batch STT directly calls adapters. One engine failure fails the whole batch.
**Fix:** In the batch map loop, wrap each adapter call in a try-fallback similar to `transcribeWithFallback`.

### 20. Unused variable in benchmark.ts
**File:** `voice-gateway/src/services/benchmark.ts` line 157
**Bug:** `const hojaiResults: EngineBenchmarkResult['perSample'] | null = null;` — declared but never read.
**Fix:** Remove the unused line.

### 21. Whisper confidence from `avg_logprob` is wrong
**File:** `voice-gateway/src/adapters/stt/whisper.adapter.ts` lines 77-79
**Bug:** `Math.exp(data.segments?.[0]?.avg_logprob)` — `avg_logprob` is negative (~-0.5), `exp(-0.5) ≈ 0.607`. This gives ~60% confidence for good transcriptions.
**Fix:** Use a proper confidence mapping. Whisper's `avg_logprob` should be normalized to 0-1 range differently, or use word-level `tokens` with `logprob` for better confidence scores.

### 22. In-memory stores unbounded growth (cost-tracking, event-bus)
**Files:** `voice-gateway/src/services/cost-tracking.ts`, `voice-gateway/src/services/event-bus.ts`
**Bug:** `dailyStats`, `userStats`, `inMemoryQueue` all grow without bounds.
**Fix:** Add max size limits with eviction policies:
- `dailyStats`: cap at 90 days, remove older on insert
- `userStats`: cap at 1000 users, LRU eviction
- `inMemoryQueue`: already capped at 10k with 10% eviction

### 23. `renewContract` overwrites `signedAt`
**File:** `nexha-supplier-registry/src/services/contract.service.ts` line 142
**Bug:** Sets `signedAt = new Date().toISOString()` on every renewal, losing the original signing date.
**Fix:** Add `originalSignedAt: string` field. On first sign, set both. On renewal, only update `signedAt`.

---

## 🟢 LOW — Polish

### 24. Magic numbers throughout Voice Gateway
- `100` (min audio bytes) → named constant `MIN_AUDIO_BYTES`
- `16000` (sample rate) → use from formatMeta
- `0.65` (audio lang confidence) → named constant
- `0.5` (text min length) → named constant
- `0.1` (VAD speech threshold) → named constant `VAD_SPEECH_RATIO_THRESHOLD`
- `0.15` (WER threshold) → named constant
- `12` (webm bytes-per-second) → named constant

### 25. `indic_first` mode gets lower confidence (0.85) than language-map (0.9)
**File:** `voice-gateway/src/services/routing.ts` lines 118 vs 127
**Fix:** Make `indic_first` confidence 0.9 since it's a specific routing instruction.

### 26. `textLength` always 0 in TTS router
**File:** `voice-gateway/src/services/routing.ts` line 201
**Fix:** Either remove the dead code or pass `textLength` in `RouteContext` from the TTS route.

### 27. `consumer-${process.pid}` is unstable on Redis reconnect
**File:** `voice-gateway/src/services/event-bus.ts` line 172
**Fix:** Use a stable name like `consumer-${require('os').hostname()}` or a UUID.

### 28. Dead type member `quote_accepted` in OrderStatus
**File:** `nexha-supplier-registry/src/types/index.ts`
**Fix:** Remove `'quote_accepted'` from `OrderStatus` union since `acceptQuote` sets `status: 'accepted'`.

### 29. `express.raw` double-parse issue with batch endpoint
**File:** `voice-gateway/src/index.ts` line 299
**Bug:** `z.object({ requests: z.array(TranscribeSchema) }).safeParse(req.body)` — express.json already parsed this. But the TranscribeSchema also expects `audio: z.string()` (base64), which is fine.
**Fix:** Already correct after removing express.raw.

### 30. Inconsistent error response format
**File:** `voice-gateway/src/index.ts` line 377
**Bug:** TTS error at line 377 returns raw `{ success: false, error }` instead of `apiResponse()`.
**Fix:** Use `apiResponse()` consistently.

---

## Implementation Order

| # | Fix | Files | Est. |
|---|-----|-------|------|
| 1 | Deepgram API key header | deepgram.adapter.ts | 2 min |
| 2 | Port 4293 collision | Hub index.ts | 3 min |
| 3 | supplier-registry capability map | Hub index.ts | 1 min |
| 4 | updateTracking parameter bug | trade.service.ts | 5 min |
| 5 | Add Zod schemas for PATCH | supplier-registry index.ts | 20 min |
| 6 | audioHashSet bounded growth | voice-gateway index.ts | 10 min |
| 7 | asyncRoute error distinction | voice-gateway index.ts | 15 min |
| 8 | Audio duration fix | voice-gateway index.ts | 2 min |
| 9 | Remove dead recordAccuracy call | voice-gateway index.ts | 2 min |
| 10 | TTS hojaiAccuracyThreshold config | config/index.ts + routing.ts | 3 min |
| 11 | TTS_PROFILES.hojai quality = 88 | routing.ts | 1 min |
| 12 | Add missing Indic languages | routing.ts | 3 min |
| 13 | VAD endMs off-by-one | audio-preprocessor.ts | 2 min |
| 14 | Implement training/export | voice-gateway index.ts | 20 min |
| 15 | Add verifyDocument route | supplier-registry index.ts | 10 min |
| 16 | Remove express.raw middleware | voice-gateway index.ts | 2 min |
| 17 | benchmarkResults TTL | voice-gateway index.ts | 5 min |
| 18 | Batch STT fallback chain | voice-gateway index.ts | 10 min |
| 19 | Remove unused hojaiResults | benchmark.ts | 1 min |
| 20 | renewContract signedAt preservation | contract.service.ts | 5 min |
| 21-30 | Low-priority polish | various | 30 min |

**Total: ~150 minutes across 30 fixes**

---

## What NOT to fix (acceptable tradeoffs)

- **No auth on endpoints**: These are internal gateway services behind the Hub's network boundary. Auth belongs at the Hub level (which proxies these services). The Hub itself also has no auth — that's a separate concern.
- **Audio-based language detection stub**: Acknowledged as a stub in the code. Real implementation would use Silero VAD or a lightweight audio classifier.
- **In-memory storage**: Both services are designed as in-memory stores (noted in docs). Production would wire MongoDB/Redis persistence. This is intentional for the MVP.
- **No rate limiting**: Same reasoning — belongs at API gateway level (Kong, nginx), not in application code.
