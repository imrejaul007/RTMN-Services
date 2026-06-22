# @hojai/memory

**Customer Memory & Vector Storage**

---

## Overview

Persistent memory for customers, conversation history, and semantic search.

## Features

- Conversation history
- Customer context
- Vector embeddings
- Semantic search
- Memory persistence

## Quick Start

```bash
npm install @hojai/memory
```

```typescript
import { Memory } from '@hojai/memory';

const memory = new Memory({ tenantId: 'merchant_123' });

// Store memory
await memory.store({
  userId: 'user_123',
  type: 'conversation',
  content: 'User prefers express delivery'
});

// Retrieve
const context = await memory.get('user_123');

// Semantic search
const results = await memory.search('delivery preferences');
```

## Storage Types

| Type | Description |
|------|-------------|
| conversation | Chat history |
| preference | User preferences |
| interaction | User actions |
| knowledge | Facts |

---

**Port:** 4520
**Status:** Production Ready
