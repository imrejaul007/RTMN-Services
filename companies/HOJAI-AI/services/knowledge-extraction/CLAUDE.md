# Knowledge Extraction Service

**Port:** 4784
**Status:** ✅ Production Ready (v1.0.0)
**Layer:** HOJAI AI → Division 6 (Data & Knowledge Cloud)
**Path:** `/Users/rejaulkarim/Documents/RTMN/services/knowledge-extraction`

## What It Does

Extracts structured knowledge from unstructured text. Provides Named Entity Recognition (NER), entity linking against built-in catalogs, and fact extraction (subject-predicate-object triples) — all without external dependencies.

**Use it for:**
- Building knowledge graphs from documents (pair with `graph-database` 4783)
- Customer feedback analysis (entities + facts)
- News/article structured-data extraction
- Email/document enrichment
- Search-engine pre-processing
- Compliance & PII detection (complements `ai-safety` 4774)
- Conversational memory enrichment (pair with `memory-os` 4703)

## Capabilities

### NER (Named Entity Recognition)
- **POST /api/ner/extract** — extract entities from text
- **GET /api/ner/types** — list all 15 supported entity types with descriptions
- **15 entity types:** PERSON, ORG, LOCATION, DATE, TIME, MONEY, PERCENT, EMAIL, PHONE, URL, IP_ADDRESS, HASHTAG, MENTION, PRODUCT, EVENT

### Entity Linking
- **POST /api/link** — link entities to canonical KB entries
  - **Exact match** (score 1.0): canonical or alias matches text
  - **Fuzzy match** (Levenshtein): catches typos like "Stevie Jobs" → "Steve Jobs"
  - **Configurable threshold** (default 0.7)
- **Built-in catalogs** seeded at startup:
  - 202 TECH terms (Python, JavaScript, TensorFlow, etc.)
  - 34 persons (Steve Jobs, Tim Cook, Elon Musk, etc.)
  - 38 organizations (Apple, Google, Microsoft, etc.)
  - 69 locations (Cupertino, San Francisco, Tokyo, etc.)
  - 5 products (iPhone, Windows, etc.)

### Fact Extraction
- **POST /api/facts/extract** — extract (subject, predicate, object) triples
  - **8+ pattern types:** founded, based_in, ceo_of, acquired, born_in, works_at, located_in, etc.
  - Returns sentence span + confidence score
- **POST /api/extract-all** — combined one-shot: NER + linking + facts in single call

### Knowledge Base
- **GET /api/kb** — list all KB entities (filter by type, search by text)
- **POST /api/kb** — add new KB entry (custom canonical + aliases)
- **GET /api/kb/:id** — get single entry
- **PATCH /api/kb/:id** — update entry
- **DELETE /api/kb/:id** — remove entry

### Catalogs (read-only views into KB)
- **GET /api/catalog/tech** — 202 tech terms
- **GET /api/catalog/persons** — 34 famous persons
- **GET /api/catalog/orgs** — 38 organizations
- **GET /api/catalog/locations** — 69 locations

### Utility
- **GET /api/health** — service health + stats
- **GET /api/stats** — counts (extractionsRun, entitiesFound, factsExtracted, linksMade, errors)
- **POST /api/stats/reset** — reset counters
- **GET /api/audit** — recent operations log

## How It Works

### NER
- **Regex-based** — 15 pre-compiled regex patterns run against input text
- **Position-aware** — returns start/end character offsets
- **Confidence scored** — each type has a base confidence (e.g. EMAIL=0.99, PERSON=0.85)

### Entity Linking
- **Exact match** — case-insensitive lookup in canonical + alias index (O(1))
- **Fuzzy match** — Levenshtein distance normalized to similarity score (O(n) scan if no exact)
- **Type-aware** — only matches against KB entries of compatible type (PERSON→PERSON, ORG→ORG, etc.)

### Fact Extraction
- **Sentence-splitting** — splits on `.`, `!`, `?`
- **Pattern matching** — 8+ regex-based rules:
  - `<SUBJ> founded <OBJ>` → predicate=`founded`
  - `<SUBJ> is the CEO of <OBJ>` → predicate=`ceo_of`
  - `<SUBJ> is based in <OBJ>` → predicate=`origin`
  - `<SUBJ> works at <OBJ>` → predicate=`works_at`
  - `<SUBJ> acquired <OBJ>` → predicate=`acquired`
  - `<SUBJ> was born in <OBJ>` → predicate=`born_in`
  - `<SUBJ> lives in <OBJ>` → predicate=`lives_in`
  - `<SUBJ> is the founder of <OBJ>` → predicate=`founder_of`
- **Confidence scored** — based on pattern specificity (0.65-0.85 typical)

## Quick Start

```bash
cd services/knowledge-extraction
npm install
npm start              # listens on :4784
```

```bash
# NER
curl -X POST http://localhost:4784/api/ner/extract -H "Content-Type: application/json" \
  -d '{"text":"Apple was founded by Steve Jobs in Cupertino on April 1, 1976."}'

# Entity linking (with fuzzy match)
curl -X POST http://localhost:4784/api/link -H "Content-Type: application/json" \
  -d '{"entities":[{"text":"Stevie Jobs","type":"PERSON"}]}'

# Fact extraction
curl -X POST http://localhost:4784/api/facts/extract -H "Content-Type: application/json" \
  -d '{"text":"Steve Jobs founded Apple in 1976. Tim Cook is the CEO of Apple."}'

# Combined (NER + link + facts in one call)
curl -X POST http://localhost:4784/api/extract-all -H "Content-Type: application/json" \
  -d '{"text":"Steve Jobs founded Apple in Cupertino in 1976."}'
```

## Seed Data

At startup loads **348 KB entities** across 5 types: PERSON (34), ORG (38), LOCATION (69), TECH (202), PRODUCT (5). Index covers **432 lookups** (canonical + aliases).

## Integration with HOJAI Intelligence (4881)

Wired into ai-intelligence `/api/route` and `/api/agents`:

```
GET /api/route -> services.knowledge = http://localhost:4784
GET /api/agents -> 'knowledge' agent (capabilities: ner, entity-link, fact-extract, extract-all, catalog-lookup, kb-management)

capabilities:
  nerExtract:           POST /api/ner/extract
  entityLink:           POST /api/link
  factExtract:          POST /api/facts/extract
  knowledgeExtractAll:  POST /api/extract-all
```

## Use Cases

### Knowledge Graph Construction
```js
// 1. Extract facts from a corpus
const facts = await fetch('http://localhost:4784/api/facts/extract', {
  method: 'POST',
  body: JSON.stringify({ text: documentText })
});

// 2. Push facts into graph-database as triples
for (const f of facts.facts) {
  await fetch('http://localhost:4783/api/nodes', {
    method: 'POST',
    body: JSON.stringify({ labels: ['Entity'], properties: { name: f.subject } })
  });
  // ... create edge from subject to object
}
```

### Customer Feedback Pipeline
```js
const result = await fetch('http://localhost:4784/api/extract-all', {
  method: 'POST',
  body: JSON.stringify({ text: feedback })
});
// result.entities: extracted mentions of products, people, places
// result.linked: which are known to our catalog
// result.facts: "customer X mentioned Y had issue Z"
```

### Search Index Enrichment
```js
// Extract entities from each document, store alongside for filterable search
const { entities, facts } = await extractAll(documentText);
await indexDocument(document, { entities, facts });
```

## Architecture Notes

- **Single process** — no external services
- **In-memory KB** — additions to /api/kb do NOT persist across restart
- **Regex NER** — not as accurate as transformer models but ~1000x faster, no GPU
- **CommonJS** — same shape as `ai-safety`, `semantic-cache`, etc.
- **Lightweight** — 4 deps only (express, helmet, cors, uuid)

## TODO (Production)

- [ ] Use transformer-based NER (BERT-NER, spaCy) for higher recall
- [ ] LLM-backed fact extraction for open-domain patterns
- [ ] Persist KB to PostgreSQL or MongoDB
- [ ] Add entity disambiguation using context (e.g. "Apple" the company vs. the fruit)
- [ ] Multi-language support (CJK, Arabic, etc.)
- [ ] Relation extraction between arbitrary entities, not just catalog
- [ ] Coreference resolution ("Steve Jobs" → "he" → "Steve Jobs")

## Files

- `package.json` — 4 deps: express, helmet, cors, uuid
- `src/index.js` — 1,443 lines (CommonJS)
- `CLAUDE.md` — this file
