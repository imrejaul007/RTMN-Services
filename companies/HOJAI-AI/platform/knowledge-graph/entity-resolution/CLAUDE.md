# Entity Resolution Service - Claude.md

## Service Overview

**Entity Resolution Service** deduplicates entities across data sources using probabilistic matching algorithms. It's part of the KnowledgeOS infrastructure layer.

## Architecture

- **Entry Point**: `src/index.ts` - Express server on port 4752
- **Routes**: `src/routes/` - REST API endpoints
- **Services**: `src/services/` - Business logic
- **Algorithms**: `src/algorithms/` - Similarity matching
- **Database**: PostgreSQL with custom schema

## Key Files

| File | Purpose |
|------|---------|
| `src/services/resolution.ts` | Core resolution logic |
| `src/services/database.ts` | Database operations |
| `src/algorithms/string-similarity.ts` | Jaro-Winkler, Levenshtein, Jaccard |
| `src/algorithms/phonetic.ts` | Soundex, Metaphone |
| `src/algorithms/blocking.ts` | Blocking strategies |
| `src/algorithms/scoring.ts` | Match scoring |

## Resolution Flow

1. **Input**: Entity with attributes (name, email, etc.)
2. **Blocking**: Create blocking keys to reduce comparison space
3. **Comparison**: Run string similarity algorithms
4. **Scoring**: Calculate confidence score
5. **Decision**:
   - High confidence (>0.9) → Auto-link
   - Medium (0.7-0.9) → Add to review queue
   - Low (<0.7) → Create new canonical entity

## Integration

- **Upstream**: Knowledge Extraction, Document Processing
- **Downstream**: Knowledge Graph, TwinOS
- **Databases**: PostgreSQL, pgvector for embeddings

## Common Tasks

### Add new similarity algorithm

Add to `src/algorithms/string-similarity.ts`:

```typescript
export function customSimilarity(a: string, b: string): number {
  // Your algorithm
}
```

### Modify blocking strategy

Edit `src/algorithms/blocking.ts`:

```typescript
export function customBlocking(entities: Entity[]): BlockMap {
  // Your blocking logic
}
```

### Extend database schema

Update `src/services/database.ts` and `migrations/` folder.

## Testing

Run tests:
```bash
npm test
```

Add new tests in `__tests__/unit/`.

## Health Check

```bash
curl http://localhost:4752/health
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4752 | Service port |
| DATABASE_URL | - | PostgreSQL connection string |
| JWT_SECRET | - | JWT signing secret |
| THRESHOLD | 0.85 | Match confidence threshold |
