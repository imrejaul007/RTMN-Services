# Hotel OTA Refactoring Guide

**Date:** 2026-04-30
**Effort:** 8-12 weeks

---

## Executive Summary

This guide outlines a phased approach to refactoring the Hotel OTA API from a flat MVC structure to a domain-driven modular architecture.

## Current State

### File Counts
| Category | Count |
|----------|-------|
| Route files | 27 |
| Route definitions | 185 |
| Service files | 36 |
| Service classes | ~73 |
| Total TS files | 89 |

### Issues
- No clear domain boundaries
- High coupling between modules
- Hard to onboard new developers
- Difficult to test in isolation

---

## Proposed Architecture

```
src/
├── domains/
│   ├── booking/           # Booking domain
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── dto/
│   │   └── __tests__/
│   ├── hotel/            # Hotel management
│   ├── guest/            # Guest management
│   ├── payment/          # Payment processing
│   ├── inventory/        # Room inventory
│   └── settlement/       # Payouts
├── shared/
│   ├── middleware/
│   ├── utils/
│   └── errors/
├── config/
└── app.ts
```

## Phased Migration Plan

### Phase 1: Setup & Shared Infrastructure (2 weeks)

1. Create domain directory structure
2. Move shared utilities to `/shared`
3. Set up dependency injection container
4. Configure ESLint/Prettier for new structure

### Phase 2: Extract Booking Domain (3 weeks)

**Priority:** High — Bookings are the core business logic

1. Create `domains/booking/` structure
2. Move booking routes → `domains/booking/routes/`
3. Move booking services → `domains/booking/services/`
4. Create booking DTOs
5. Write tests
6. Update imports

### Phase 3: Extract Hotel Domain (2 weeks)

1. Create `domains/hotel/` structure
2. Move hotel management routes/services
3. Create hotel DTOs
4. Write tests

### Phase 4: Extract Payment Domain (2 weeks)

1. Create `domains/payment/` structure
2. Move payment routes/services
3. Create payment DTOs
4. Write tests

### Phase 5: Extract Remaining Domains (3 weeks)

1. Guest management
2. Inventory management
3. Settlement

### Phase 6: Cleanup (2 weeks)

1. Remove old flat structure
2. Update barrel exports
3. Full integration testing
4. Update documentation

---

## Migration Checklist

### Phase 1
- [ ] Create domain directory structure
- [ ] Move middleware to `/shared/middleware/`
- [ ] Move utilities to `/shared/utils/`
- [ ] Move error classes to `/shared/errors/`
- [ ] Set up dependency injection
- [ ] Configure new ESLint rules

### Phase 2 (Booking)
- [ ] Create `domains/booking/` structure
- [ ] Create `BookingRoute`
- [ ] Create `BookingService`
- [ ] Create `BookingDto`
- [ ] Write unit tests
- [ ] Update imports in consumers

### Phase 3 (Hotel)
- [ ] Create `domains/hotel/` structure
- [ ] Move hotel routes/services
- [ ] Create DTOs
- [ ] Write tests

### Phase 4 (Payment)
- [ ] Create `domains/payment/` structure
- [ ] Move payment routes/services
- [ ] Create DTOs
- [ ] Write tests

### Phase 5 (Remaining)
- [ ] Guest domain
- [ ] Inventory domain
- [ ] Settlement domain

### Phase 6 (Cleanup)
- [ ] Remove old files
- [ ] Update all imports
- [ ] Full integration tests
- [ ] Update docs

---

## Code Examples

### Before (Flat Structure)

```typescript
// routes/booking.routes.ts
router.post('/bookings', async (req, res) => {
  const { roomId, guestId, checkIn, checkOut } = req.body;
  const booking = await BookingService.create({ roomId, guestId, checkIn, checkOut });
  res.json(booking);
});
```

### After (Domain Structure)

```typescript
// domains/booking/routes/booking.routes.ts
import { BookingService } from '../services/booking.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { validateBody } from '@rez/shared-types/validation';

const bookingService = new BookingService();

router.post('/',
  validateBody(CreateBookingDto),
  async (req, res) => {
    const dto = req.body as CreateBookingDto;
    const booking = await bookingService.create(dto);
    res.json(booking);
  }
);
```

### DTO Example

```typescript
// domains/booking/dto/create-booking.dto.ts
import { z } from 'zod';

export const CreateBookingDto = z.object({
  roomId: z.string().regex(/^[a-f\d]{24}$/i),
  guestId: z.string().regex(/^[a-f\d]{24}$/i),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
});

export type CreateBookingDto = z.infer<typeof CreateBookingDto>;
```

---

## Testing Strategy

### Unit Tests
- Test each service in isolation
- Mock dependencies
- Aim for 80% coverage

### Integration Tests
- Test domain boundaries
- Test HTTP layer
- Use test database

### E2E Tests
- Critical booking flows
- Payment flows

---

## Rollback Plan

If migration encounters issues:

1. Keep old files alongside new structure
2. Feature flag to switch between old/new
3. Incremental rollout by route

---

## Resources

- Domain-Driven Design patterns
- NestJS module structure (for reference)
- TypeScript strict mode
