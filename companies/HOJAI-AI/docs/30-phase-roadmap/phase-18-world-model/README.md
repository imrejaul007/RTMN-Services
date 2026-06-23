# Phase 18: World Model — Knowledge Graph

**Duration:** 3 weeks (Week 42–44)
**Priority:** P1 (High)
**Owner:** ML Engineer

---

## Goal

Connected knowledge graph with entities, relationships, and predictions.

---

## Why This Matters

**Memory ≠ World Understanding.** Memory stores facts; a World Model understands how entities relate, predicts what happens next, and reasons across connections.

---

## 5 World Model Services

### 18.1 Knowledge Graph (Port 4970)

**Purpose:** Store entities and relationships

**Entity Types:**
- Person, Place, Business, Product, Event

**Relationship Types:**
- works_at, located_in, owns, happened_at, causes

**Storage:** Neo4j

---

### 18.2 Entity Extractor (Port 4971)

**Purpose:** Extract entities from text

**Features:**
- NER (Named Entity Recognition)
- Coreference resolution (he → John)
- Entity linking (which John?)
- Confidence scoring

---

### 18.3 Relationship Extractor (Port 4972)

**Purpose:** Extract relationships

**Features:**
- Relation classification
- Temporal ordering (before/after)
- Causal reasoning (X caused Y)
- Confidence scoring

---

### 18.4 Graph Reasoning (Port 4973)

**Purpose:** Answer complex questions

**Features:**
- Multi-hop reasoning (A → B → C)
- Path finding (shortest path)
- Subgraph extraction
- Inference (new facts from existing ones)

---

### 18.5 Predictions (Port 4974)

**Purpose:** Predict future events

**Features:**
- Temporal patterns
- Causal models
- Probability estimation
- Confidence intervals

---

## Example Query

**Question:** "Who is the CEO of the company that acquired the startup founded by John's sister?"

**Reasoning:**
```
John's sister → founded Startup X
Startup X → acquired by Company Y
Company Y → CEO is Alice
Answer: Alice
```

---

## Success Criteria

✅ 5 World Model services deployed
✅ 10M+ entities in knowledge graph
✅ Multi-hop reasoning working
✅ Predictions accurate 80%+

---

*Phase 18 documentation: 2026-06-22*