# Phase 9: RAG Production-Readiness

**Duration:** 1 week (Week 14)
**Priority:** P2 (Medium)
**Owner:** ML Engineer

---

## Goal

Best-in-class retrieval with reranking, hybrid search, and multi-hop reasoning.

---

## Deliverables

### 9.1 Add Reranking

**File:** `platform/intelligence/rag-platform/src/rerank.js`

**Tasks:**

1. Implement cross-encoder reranking
2. Rerank Top-100 → Top-10
3. Add reranking metrics (nDCG, MRR)

**Implementation:**

```javascript
// Cross-encoder reranking
async function rerank(query, documents, topK = 10) {
  // Use cross-encoder model for more accurate relevance scoring
  const scores = await Promise.all(
    documents.map(async (doc) => {
      const prompt = `Query: ${query}\nDocument: ${doc.content}\nRelevance (0-10):`;

      const response = await inferenceGateway.complete({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
        maxTokens: 10
      });

      return { doc, score: parseFloat(response.content) || 0 };
    })
  );

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, topK).map(s => s.doc);
}

// Calculate nDCG
function calculateNDCG(ranked, groundTruth, k = 10) {
  let dcg = 0;
  for (let i = 0; i < Math.min(ranked.length, k); i++) {
    if (groundTruth.includes(ranked[i].id)) {
      dcg += 1 / Math.log2(i + 2);
    }
  }

  let idcg = 0;
  for (let i = 0; i < Math.min(groundTruth.length, k); i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  return idcg > 0 ? dcg / idcg : 0;
}
```

---

### 9.2 Add Hybrid Search

**File:** `platform/intelligence/rag-platform/src/hybrid.js`

**Tasks:**

1. Combine vector search + BM25 keyword search
2. Weighted fusion: 0.7 vector + 0.3 BM25
3. Add query expansion

**Implementation:**

```javascript
// Hybrid search combining vector + BM25
async function hybridSearch(query, documents, topK = 10) {
  // 1. Vector search
  const queryEmbedding = await generateEmbedding(query);
  const vectorResults = await vectorSearch(queryEmbedding, documents, topK * 2);

  // 2. BM25 keyword search
  const bm25Results = await bm25Search(query, documents, topK * 2);

  // 3. Normalize scores
  const vectorScores = normalizeScores(vectorResults);
  const bm25Scores = normalizeScores(bm25Results);

  // 4. Fusion
  const fusedScores = new Map();

  for (const [docId, score] of vectorScores) {
    fusedScores.set(docId, (fusedScores.get(docId) || 0) + 0.7 * score);
  }

  for (const [docId, score] of bm25Scores) {
    fusedScores.set(docId, (fusedScores.get(docId) || 0) + 0.3 * score);
  }

  // 5. Sort and return top-K
  return Array.from(fusedScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([docId, score]) => ({
      ...documents.find(d => d.id === docId),
      score
    }));
}
```

---

### 9.3 Add Multi-Hop Retrieval

**File:** `platform/intelligence/rag-platform/src/multihop.js`

**Tasks:**

1. Detect multi-hop questions
2. Decompose into sub-questions
3. Retrieve for each sub-question
4. Synthesize final answer

**Implementation:**

```javascript
async function multiHopRetrieval(question, documents) {
  // 1. Detect if multi-hop
  const isMultiHop = await detectMultiHop(question);

  if (!isMultiHop) {
    return await hybridSearch(question, documents, 10);
  }

  // 2. Decompose into sub-questions
  const subQuestions = await decomposeQuestion(question);

  // 3. Retrieve for each sub-question
  const subResults = await Promise.all(
    subQuestions.map(async (subQ) => {
      return await hybridSearch(subQ, documents, 5);
    })
  );

  // 4. Synthesize final answer
  const allDocs = subResults.flat();
  const uniqueDocs = Array.from(
    new Map(allDocs.map(d => [d.id, d])).values()
  );

  const context = uniqueDocs.map(d => d.content).join('\n\n');
  const answer = await inferenceGateway.complete({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Context: ${context}\n\nQuestion: ${question}\n\nAnswer:`
    }]
  });

  return {
    answer: answer.content,
    subQuestions,
    sources: uniqueDocs
  };
}

async function detectMultiHop(question) {
  const prompt = `Is this a multi-hop question requiring multiple reasoning steps?

Question: ${question}

Answer with ONLY "yes" or "no".`;

  const response = await inferenceGateway.complete({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.0,
    maxTokens: 10
  });

  return response.content.trim().toLowerCase() === 'yes';
}

async function decomposeQuestion(question) {
  const prompt = `Break this multi-hop question into sub-questions:

Question: ${question}

Return as JSON array of sub-questions.`;

  const response = await inferenceGateway.complete({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.0,
    maxTokens: 200
  });

  try {
    return JSON.parse(response.content);
  } catch {
    return [question];
  }
}
```

---

## Success Criteria

✅ Reranking improves nDCG by 15%+
✅ Hybrid search recall@10 > 0.85
✅ Multi-hop QA accuracy >70%

---

*Phase 9 documentation: 2026-06-22*