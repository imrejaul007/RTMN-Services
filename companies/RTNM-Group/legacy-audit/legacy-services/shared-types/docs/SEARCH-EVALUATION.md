# Search Engine Evaluation Report

## Current State
- MongoDB text search (limited)
- No dedicated search engine

## Requirements
- Full-text search
- Faceted search (category, price, location)
- Autocomplete
- Relevance tuning
- Highlighting
- Typo tolerance

## Options Evaluated

### 1. Elasticsearch
**Pros:**
- Industry standard
- Powerful aggregations
- Excellent scaling
**Cons:**
- Heavy infrastructure
- Operational complexity

### 2. Algolia
**Pros:**
- Managed service
- Excellent UX features
- Fast implementation
**Cons:**
- Cost at scale
- Vendor lock-in

### 3. Meilisearch
**Pros:**
- Lightweight
- Easy to operate
- Rust-based (fast)
- Open source
**Cons:**
- Smaller community

### 4. Typesense
**Pros:**
- Designed for typo tolerance
- Easy clustering
- Open source
**Cons:**
- Smaller community

## Recommendation

**Meilisearch** for MVP:
- Easy to deploy
- Good feature set
- Lower operational burden

**Migrate to Elasticsearch** when:
- >10M documents
- Complex aggregations needed
- Dedicated ops team available

## Implementation Plan

### Phase 1: Meilisearch
1. Deploy Meilisearch container
2. Create sync job from MongoDB
3. Update search service to query Meilisearch
4. Add autocomplete endpoint

### Phase 2: Elasticsearch (future)
1. Set up ES cluster
2. Migrate indices
3. Deprecate Meilisearch
