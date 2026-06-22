# REZ Shared Types - SPEC.md

**Version:** 2.0.0
**Company:** RTNM-Group
**Category:** SDK

---

## Overview

Canonical TypeScript interfaces, Zod schemas, FSM helpers, branded IDs, and runtime guards for all REZ services. Single source of truth for type definitions across the ecosystem.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REZ Shared Types                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Packages:                                                                  │
│  ├── Core Types   → Common interfaces and types                          │
│  ├── FSM Helpers  → State machine utilities                              │
│  ├── Guards       → Runtime type validation                              │
│  ├── Branded IDs  → Type-safe branded identifiers                        │
│  └── Validation   → Shared validation schemas                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Exports

### Core Types
```typescript
// Entity interfaces
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
```

### FSM Helpers
```typescript
export type State = string
export type Event = string
export type TransitionMap = Record<State, Record<Event, State>>
export function createFSM(initial: State, transitions: TransitionMap): FSM
```

### Branded IDs
```typescript
export type UserId = string & { readonly brand: 'UserId' }
export type OrderId = string & { readonly brand: 'OrderId' }
export type TransactionId = string & { readonly brand: 'TransactionId' }
// ... service-specific branded types
```

### Guards
```typescript
export function isUserId(id: string): id is UserId
export function isOrderId(id: string): id is OrderId
export function isTransactionId(id: string): id is TransactionId
```

### Validation Schemas
```typescript
export const userIdSchema = z.string().uuid()
export const orderIdSchema = z.string()
export const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(100)
})
```

---

## Package Exports

```json
{
  ".": "Main types",
  "./fsm": "State machine helpers",
  "./guards": "Runtime guards",
  "./branded": "Branded ID types",
  "./validation": "Validation schemas"
}
```

---

## Dependencies

```json
{
  "zod": "^3.22.0"
}
```

---

## Peer Dependencies

```json
{
  "express": "^4.18.0"
}
```

---

## Usage

```typescript
import {
  UserId,
  OrderId,
  isUserId,
  createFSM,
  paginationSchema
} from '@rez/shared-types';

// Type-safe IDs
const userId = '123' as UserId;

// Runtime validation
if (isUserId(userId)) {
  // userId is UserId here
}

// Zod validation
const result = paginationSchema.safeParse({ page: 1, limit: 10 });
```

---

## Status

- [x] Core types
- [x] FSM helpers
- [x] Runtime guards
- [x] Branded IDs
- [x] Validation schemas

