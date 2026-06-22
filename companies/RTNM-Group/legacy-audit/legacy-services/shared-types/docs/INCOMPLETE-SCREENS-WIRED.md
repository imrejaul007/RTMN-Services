# Incomplete Screens - Wiring Status Report

**Date:** 2026-04-29
**App:** REZ Merchant App (`rez-app-marchant`)
**Backend:** REZ Merchant Service (`rez-merchant-service`)

---

## Summary

After a comprehensive analysis of the REZ Merchant App screens, the following findings were made:

### Screens Already Wired (No Changes Needed)
All previously identified screens were already properly wired to API endpoints:

| Screen | Location | Status | Notes |
|--------|----------|--------|-------|
| Automations List | `app/automation/index.tsx` | Wired | Uses `automation-rules` endpoint |
| Automation Edit | `app/automation/edit.tsx` | Wired | Uses `automation-rules/:id` |
| Consultation Forms | `app/consultation-forms/index.tsx` | Wired | Uses `consultation-forms` endpoint |
| Consultation Builder | `app/consultation-forms/builder.tsx` | Wired | CRUD endpoints |
| Treatment Rooms | `app/treatment-rooms/index.tsx` | Wired | Uses `treatment-rooms` endpoint |
| Class Schedule | `app/class-schedule/index.tsx` | Wired | Uses `class-schedules` endpoint |
| Khata | `app/khata/index.tsx` | Wired | Uses `/merchant/khata` endpoint |
| Khata Customer | `app/khata/[customerId].tsx` | Wired | Uses `/merchant/khata/:id` |
| Khata Add | `app/khata/add.tsx` | Wired | Uses POST `/merchant/khata` |
| Upsell Rules | `app/upsell-rules/index.tsx` | Wired | Uses `upsellRulesService` |
| Service Packages | `app/service-packages/index.tsx` | Wired | Uses `service-packages` endpoint |
| Recipes | `app/recipes/index.tsx` | Wired | Uses `food-cost/by-product` endpoint |
| Recipe Builder | `app/recipes/[productId].tsx` | Wired | Uses `/merchant/recipes/:id` |
| Analytics Forecast | `app/analytics/forecast.tsx` | Wired | Uses `merchant/analytics/forecast/sales` |
| Analytics NPS | `app/analytics/nps.tsx` | Wired | Uses `/merchant/analytics/nps` |
| Analytics Cohorts | `app/analytics/cohorts.tsx` | Wired | Uses `merchant/analytics/cohorts` |
| Audit Logs | `app/audit/index.tsx` | Wired | Uses React Query hooks with `auditService` |
| Audit Archives | `app/audit/archives.tsx` | Wired | Uses `useArchivedLogs`, `useRetentionStatistics` |
| Audit Compliance | `app/audit/compliance.tsx` | Wired | Uses `useComplianceReport` |

### Missing Backend Services (CREATED)

The following backend routes and models were missing and have been created:

#### 1. Automation Rules

**Files Created:**
- Model: `/src/models/AutomationRule.ts`
- Routes: `/src/routes/automationRules.ts`

**Endpoints:**
- `GET /api/merchant/automation-rules` - List rules
- `GET /api/merchant/automation-rules/:id` - Get single rule
- `POST /api/merchant/automation-rules` - Create rule
- `PUT /api/merchant/automation-rules/:id` - Update rule
- `PATCH /api/merchant/automation-rules/:id/toggle` - Toggle status
- `DELETE /api/merchant/automation-rules/:id` - Delete rule

#### 2. Consultation Forms

**Files Created:**
- Model: `/src/models/ConsultationForm.ts`
- Routes: `/src/routes/consultationForms.ts`

**Endpoints:**
- `GET /api/merchant/consultation-forms` - List forms
- `GET /api/merchant/consultation-forms/:id` - Get single form
- `POST /api/merchant/consultation-forms` - Create form
- `PUT /api/merchant/consultation-forms/:id` - Update form
- `DELETE /api/merchant/consultation-forms/:id` - Delete form

#### 3. Treatment Rooms

**Files Created:**
- Model: `/src/models/TreatmentRoom.ts`
- Routes: `/src/routes/treatmentRooms.ts`

**Endpoints:**
- `GET /api/merchant/treatment-rooms` - List rooms
- `GET /api/merchant/treatment-rooms/:id` - Get single room
- `POST /api/merchant/treatment-rooms` - Create room
- `PUT /api/merchant/treatment-rooms/:id` - Update room
- `DELETE /api/merchant/treatment-rooms/:id` - Delete room

#### 4. Class Schedules

**Files Created:**
- Model: `/src/models/ClassSchedule.ts`
- Routes: `/src/routes/classSchedules.ts`

**Endpoints:**
- `GET /api/merchant/class-schedules` - List schedules
- `GET /api/merchant/class-schedules/:id` - Get single schedule
- `POST /api/merchant/class-schedules` - Create schedule
- `PUT /api/merchant/class-schedules/:id` - Update schedule
- `DELETE /api/merchant/class-schedules/:id` - Delete schedule

#### 5. Service Packages

**Files Created:**
- Model: `/src/models/ServicePackage.ts`
- Routes: `/src/routes/servicePackages.ts`

**Endpoints:**
- `GET /api/merchant/service-packages` - List packages
- `GET /api/merchant/service-packages/:id` - Get single package
- `POST /api/merchant/service-packages` - Create package
- `PUT /api/merchant/service-packages/:id` - Update package
- `DELETE /api/merchant/service-packages/:id` - Delete package

#### 6. Food Cost Analytics

**Files Modified:**
- `/src/routes/analytics/products.ts` - Added `/food-cost/by-product` endpoint

**Endpoints:**
- `GET /api/merchant/analytics/food-cost/by-product` - Get food cost data by product

---

## Files Modified

### Backend

| File | Change |
|------|--------|
| `src/routers/operations.ts` | Registered new routes |
| `src/models/index.ts` | Added exports for new models |
| `src/routes/analytics/products.ts` | Added food-cost endpoint |

### Backend (New Files)

| File | Purpose |
|------|---------|
| `src/models/AutomationRule.ts` | Automation rules schema |
| `src/models/ConsultationForm.ts` | Consultation forms schema |
| `src/models/TreatmentRoom.ts` | Treatment rooms schema |
| `src/models/ClassSchedule.ts` | Class schedules schema |
| `src/models/ServicePackage.ts` | Service packages schema |
| `src/routes/automationRules.ts` | Automation rules CRUD |
| `src/routes/consultationForms.ts` | Consultation forms CRUD |
| `src/routes/treatmentRooms.ts` | Treatment rooms CRUD |
| `src/routes/classSchedules.ts` | Class schedules CRUD |
| `src/routes/servicePackages.ts` | Service packages CRUD |

---

## API Routes Registration

All new routes are registered in the operations router at `/api/merchant/`:

```
/api/merchant/automation-rules     -> AutomationRule CRUD
/api/merchant/consultation-forms  -> ConsultationForm CRUD
/api/merchant/treatment-rooms      -> TreatmentRoom CRUD
/api/merchant/class-schedules     -> ClassSchedule CRUD
/api/merchant/service-packages     -> ServicePackage CRUD
```

Food cost analytics is registered in the analytics router:
```
/api/merchant/analytics/food-cost/by-product
```

---

## Security Features

All new routes include:
- `merchantAuth` middleware for authentication
- Field allowlisting for mass assignment protection
- Input validation
- Error handling with proper HTTP status codes
- MongoDB ObjectId validation

---

## Next Steps

1. Run database migrations to create new collections
2. Test all new endpoints with the frontend
3. Add any missing indexes if performance issues arise
4. Consider adding caching for list endpoints with large datasets
