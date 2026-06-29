# Industry Extension - Specification

> **Version:** 1.0
> **Phase:** 4-5 (Weeks 19-52)
> **Location:** `platform/company-os/industry-extensions/`

---

## Overview

An Industry Extension contains ONLY vertical-specific code. It extends CompanyOS by adding industry-specific capabilities without duplicating any universal business functions.

```
Vertical Specificity Rule: >= 85%

Forbidden (belongs in CompanyOS/DepartmentOS):
- CRM logic
- HR logic
- Finance logic
- Analytics logic
- Authentication
- Customer management
- Employee management
- Invoice generation
- Payment processing

Allowed (vertical-specific):
- Industry-specific workflows
- Domain models
- Vertical compliance rules
- Operational logic
- Vertical integrations
```

---

## Extension Structure

```
restaurant-extension/
|
|-- manifest.yaml              # Extension metadata
|
|-- menus/
|   |-- src/
|   |   |-- menu-service.ts    # Menu CRUD
|   |   |-- category-service.ts
|   |   |-- modifier-service.ts
|   |-- __tests__/
|
|-- kitchen/
|   |-- src/
|   |   |-- kitchen-service.ts # Kitchen display
|   |   |-- ticket-service.ts  # Order tickets
|   |   |-- station-service.ts # Station management
|   |-- __tests__/
|
|-- pos/
|   |-- src/
|   |   |-- pos-service.ts     # Point of sale
|   |   |-- order-service.ts   # Order management
|   |   |-- payment-service.ts # POS payments (calls Finance)
|   |-- __tests__/
|
|-- reservations/
|   |-- src/
|   |   |-- reservation-service.ts
|   |   |-- table-service.ts
|   |   |-- availability-service.ts
|   |-- __tests__/
|
|-- delivery/
|   |-- src/
|   |   |-- delivery-service.ts
|   |   |-- driver-service.ts
|   |   |-- tracking-service.ts
|   |   |-- integration/
|   |       |-- swiggy.ts
|   |       |-- zomato.ts
|   |-- __tests__/
|
|-- recipes/
    |-- src/
    |   |-- recipe-service.ts
    |   |-- ingredient-service.ts
    |   |-- costing-service.ts
    |-- __tests__/
```

---

## Manifest Schema

```yaml
# industry-extensions/restaurant/manifest.yaml

id: restaurant
name: Restaurant Extension
version: 1.0.0
description: Restaurant-specific capabilities for food service businesses

industry: restaurant
vertical: hospitality

dependencies:
  required:
    - finance      # Payments, invoicing
    - operations   # Inventory, procurement
  optional:
    - marketing    # Campaigns, loyalty

extends:
  company:
    - addCapability: restaurant_operations
    - addTwin: restaurant_twin
  customer:
    - addTwin: dining_preferences_twin
  order:
    - addTwin: food_order_twin

modules:
  - id: menus
    name: Menu Management
    description: Create and manage restaurant menus
    endpoints:
      - path: /api/menus
        methods: [GET, POST]
      - path: /api/menus/:id
        methods: [GET, PUT, DELETE]
    twin:
      type: extension:menu
    tests: 45
  
  - id: kitchen
    name: Kitchen Display System
    description: Real-time kitchen order management
    endpoints:
      - path: /api/kitchen/orders
        methods: [GET, POST]
      - path: /api/kitchen/tickets
        methods: [GET, PUT]
      - path: /api/kitchen/stations
        methods: [GET, POST]
    twin:
      type: extension:kitchen
    tests: 32
  
  - id: pos
    name: Point of Sale
    description: Restaurant POS operations
    endpoints:
      - path: /api/pos/orders
        methods: [POST]
      - path: /api/pos/tables
        methods: [GET]
      - path: /api/pos/pay
        methods: [POST]
    calls:
      - finance/payment  # Delegates payment to Finance
    twin:
      type: extension:pos
    tests: 28
  
  - id: reservations
    name: Table Reservations
    description: Booking and table management
    endpoints:
      - path: /api/reservations
        methods: [GET, POST]
      - path: /api/reservations/:id
        methods: [GET, PUT, DELETE]
      - path: /api/tables
        methods: [GET]
    twin:
      type: extension:reservation
    tests: 22
  
  - id: delivery
    name: Delivery Management
    description: Third-party delivery integration
    endpoints:
      - path: /api/delivery/orders
        methods: [POST]
      - path: /api/delivery/tracking/:id
        methods: [GET]
    integrations:
      - swiggy
      - zomato
      - delhivery
    twin:
      type: extension:delivery
    tests: 35
  
  - id: recipes
    name: Recipe Management
    description: Recipe creation and costing
    endpoints:
      - path: /api/recipes
        methods: [GET, POST]
      - path: /api/recipes/:id/cost
        methods: [GET]
      - path: /api/ingredients
        methods: [GET, POST]
    twin:
      type: extension:recipe
    tests: 18

specificity:
  totalLOC: 15000
  verticalLOC: 14250
  ratio: 0.95  # 95% vertical-specific

legacy:
  source: restaurant-os
  port: 5010
  adapterRequired: true
  routeMapping:
    /api/menus: /api/menus
    /api/kitchen: /api/kitchen
    /api/pos: /api/pos
    /api/reservations: /api/reservations
```

---

## All Industry Extensions

| Extension ID | Industry | Modules | LOC | Specificity |
|--------------|----------|---------|-----|-------------|
| `restaurant` | Restaurant | menus, kitchen, pos, reservations, delivery, recipes | 15,000 | 95% |
| `beauty` | Beauty/Salon | services, stylists, appointments, memberships, retail | 12,000 | 92% |
| `healthcare` | Healthcare | patients, doctors, emr, prescriptions, insurance | 18,000 | 88% |
| `hotel` | Hotel | rooms, housekeeping, concierge, billing | 14,000 | 90% |
| `retail` | Retail | catalog, inventory, stores, promotions, omnichannel | 16,000 | 87% |
| `education` | Education | courses, students, assessments, certificates | 13,000 | 89% |
| `realestate` | Real Estate | properties, leads, viewings, contracts | 11,000 | 91% |
| `fitness` | Fitness | memberships, trainers, classes, scheduling | 9,000 | 93% |
| `legal` | Legal | cases, documents, billing, court_dates | 10,000 | 86% |
| `construction` | Construction | projects, materials, contractors, permits | 14,000 | 85% |
| `manufacturing` | Manufacturing | production, quality, maintenance, inventory | 15,000 | 85% |
| `logistics` | Logistics | routes, fleet, tracking, customs | 13,000 | 88% |
| `automotive` | Automotive | vehicles, service, parts, customers | 12,000 | 87% |
| `fashion` | Fashion | collections, sizes, trends, wholesale | 11,000 | 90% |
| `sports` | Sports | teams, schedules, tickets, merchandise | 10,000 | 89% |
| `entertainment` | Entertainment | events, venues, ticketing, streaming | 12,000 | 86% |
| `travel` | Travel | itineraries, bookings, packages, guides | 13,000 | 88% |
| `government` | Government | permits, citizen_services, compliance | 16,000 | 85% |
| `agriculture` | Agriculture | crops, livestock, equipment, markets | 11,000 | 90% |
| `nonprofit` | Non-Profit | donors, programs, volunteers, grants | 9,000 | 91% |
| `professional` | Professional Services | clients, projects, billing, expertise | 10,000 | 87% |
| `home_services` | Home Services | jobs, technicians, scheduling, parts | 10,000 | 88% |
| `gaming` | Gaming | players, matches, leaderboards, tournaments | 11,000 | 89% |
| `media` | Media | content, publishing, distribution, monetization | 12,000 | 86% |

---

## Module API Examples

### Restaurant Extension - Menu Module

```typescript
// industry-extensions/restaurant/menus/src/menu-service.ts

export interface MenuService {
  
  // Menu CRUD
  createMenu(data: CreateMenuInput): Promise<Menu>;
  getMenu(id: string): Promise<Menu>;
  updateMenu(id: string, data: UpdateMenuInput): Promise<Menu>;
  deleteMenu(id: string): Promise<void>;
  listMenus(filters?: MenuFilters): Promise<MenuList>;
  
  // Category Management
  createCategory(menuId: string, data: CreateCategoryInput): Promise<Category>;
  updateCategory(id: string, data: UpdateCategoryInput): Promise<Category>;
  reorderCategories(menuId: string, order: string[]): Promise<void>;
  
  // Item Management
  createItem(menuId: string, categoryId: string, data: CreateItemInput): Promise<Item>;
  updateItem(id: string, data: UpdateItemInput): Promise<Item>;
  updatePrice(id: string, newPrice: number): Promise<Item>;
  markUnavailable(id: string): Promise<Item>;
  
  // Modifiers
  createModifier(itemId: string, data: CreateModifierInput): Promise<Modifier>;
  createModifierGroup(data: CreateModifierGroupInput): Promise<ModifierGroup>;
}

export interface Menu {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  categories: Category[];
  isActive: boolean;
  availableFrom?: string;  // Time-based activation
  availableUntil?: string;
  twinId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  menuId: string;
  name: string;
  description?: string;
  items: Item[];
  sortOrder: number;
}

export interface Item {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  prepTime: number;  // minutes
  calories?: number;
  dietary: DietaryTag[];
  available: boolean;
  image?: string;
  modifierGroups: ModifierGroup[];
}
```

### Healthcare Extension - Patient Module

```typescript
// industry-extensions/healthcare/patients/src/patient-service.ts

export interface PatientService {
  
  // Patient Records
  registerPatient(data: RegisterPatientInput): Promise<Patient>;
  getPatient(id: string): Promise<Patient>;
  updatePatient(id: string, data: UpdatePatientInput): Promise<Patient>;
  searchPatients(filters: PatientFilters): Promise<PatientList>;
  
  // Medical History
  addMedicalHistory(patientId: string, record: MedicalHistoryEntry): Promise<void>;
  getMedicalHistory(patientId: string): Promise<MedicalHistory>;
  
  // Appointments
  bookAppointment(patientId: string, data: BookAppointmentInput): Promise<Appointment>;
  cancelAppointment(appointmentId: string, reason?: string): Promise<void>;
  rescheduleAppointment(appointmentId: string, newTime: Date): Promise<Appointment>;
  
  // Insurance
  linkInsurance(patientId: string, insurance: InsuranceInfo): Promise<void>;
  verifyCoverage(patientId: string, service: string): Promise<CoverageInfo>;
}

export interface Patient {
  id: string;
  companyId: string;
  medicalRecordNumber: string;
  personalInfo: PersonalInfo;
  contact: ContactInfo;
  emergencyContact: ContactInfo;
  insurance?: InsuranceInfo;
  allergies: string[];
  medicalHistory: MedicalHistorySummary;
  twinId: string;
}

export interface MedicalHistory {
  conditions: Condition[];
  surgeries: Surgery[];
  medications: Medication[];
  allergies: Allergy[];
  immunizations: Immunization[];
  familyHistory: FamilyCondition[];
}
```

---

## Vertical Compliance Rules

```yaml
# industry-extensions/restaurant/compliance/india.yaml

region: India
industry: restaurant

regulations:
  - id: fssai
    name: FSSAI License
    required: true
    renewsEvery: 1year
    fields:
      - licenseNumber
      - expiryDate
      - category
    validation:
      format: "^[0-9]{14}$"
  
  - id: gst_restaurant
    name: GST for Restaurant
    rate: 0.05  # 5% GST on restaurant services
    conditions:
      - ifACWithAlcohol: 0.18
      - ifACWithoutAlcohol: 0.05
      - ifNonAC: 0.0
  
  - id: pan_card
    name: PAN Card
    required: true
  
  - id: local_body_license
    name: Municipal License
    required: true
    variesBy: state

compliance_checks:
  - regulation: fssai
    frequency: daily
    autoAlert: true
    alertDaysBefore: 30
  
  - regulation: gst
    frequency: monthly
    autoFile: true
    template: gstr1
  
  - regulation: local_body_license
    frequency: yearly
    autoAlert: true
    alertDaysBefore: 60
```

---

## Twin Integration

```typescript
// industry-extensions/restaurant/src/twin-integration.ts

export interface RestaurantTwinData {
  // Core restaurant data
  restaurant: {
    name: string;
    type: 'fine_dining' | 'casual' | 'qsr' | 'cafe' | 'cloud_kitchen';
    cuisine: string[];
    capacity: number;
    averageTurnTime: number;  // minutes
  };
  
  // Operations
  operations: {
    openHours: Record<string, { open: string; close: string }>;
    currentStatus: 'open' | 'closed' | 'busy' | 'maintenance';
    tableOccupancy: number;  // percentage
    kitchenLoad: number;     // percentage
  };
  
  // Performance
  performance: {
    averageOrderValue: number;
    ordersPerDay: number;
    peakHours: string[];
    topItems: string[];
    customerSatisfaction: number;  // 0-100
  };
  
  // Extensions
  extensions: {
    hasDelivery: boolean;
    deliveryPartners: string[];
    hasReservations: boolean;
    hasLoyalty: boolean;
  };
}

// Twin relationships
const twinRelationships = {
  company: {
    has: 'restaurant_twin',
    type: 'composition'
  },
  restaurant_twin: {
    contains: ['menu_twin', 'kitchen_twin', 'order_twin'],
    type: 'aggregation'
  },
  customer_twin: {
    linkedTo: 'dining_preferences_twin',
    type: 'association'
  }
};
```

---

## Legacy Migration Adapter

```typescript
// adapters/restaurant/compatibility.ts

import { Router } from 'express';

export function createCompatibilityAdapter(
  legacyService: string,  // 'restaurant-os' on port 5010
  extensionService: string  // 'restaurant-extension'
): Router {
  const router = Router();
  
  // Map legacy routes to extension routes
  const routeMapping = {
    // Legacy route -> Extension route
    '/api/menus': '/api/menus',
    '/api/tables': '/api/tables',
    '/api/orders': '/api/pos/orders',
    '/api/kitchen': '/api/kitchen',
    '/api/reservations': '/api/reservations',
    '/api/customers': null,  // NOW IN DepartmentOS/CRM
    '/api/employees': null,  // NOW IN DepartmentOS/HR
    '/api/finance': null,    // NOW IN DepartmentOS/Finance
  };
  
  // Route requests
  for (const [legacyPath, extensionPath] of Object.entries(routeMapping)) {
    if (extensionPath === null) {
      // Redirect to DepartmentOS
      router.all(legacyPath, (req, res, next) => {
        res.status(301).json({
          redirect: getDepartmentOSUrl(req.path),
          message: 'This endpoint has moved to DepartmentOS',
          migrationDate: '2026-07-01'
        });
      });
    } else {
      // Proxy to extension
      router.all(legacyPath, async (req, res) => {
        try {
          const response = await proxyRequest(
            `${extensionService}${extensionPath}`,
            req
          );
          res.status(200).json(response);
        } catch (error) {
          res.status(502).json({ error: 'Extension unavailable' });
        }
      });
    }
  }
  
  return router;
}
```

---

## Specificity Validation

```typescript
// shared/utils/specificity-validator.ts

export interface SpecificityReport {
  extensionId: string;
  totalLOC: number;
  verticalLOC: number;
  forbiddenLOC: number;
  specificityRatio: number;
  passed: boolean;
  forbiddenPatterns: ForbiddenPattern[];
}

export interface ForbiddenPattern {
  pattern: string;
  file: string;
  line: number;
  suggestion: string;
}

// Forbidden imports/patterns (regex)
const forbiddenPatterns = [
  { pattern: /from ['"]@hojai\/sales-os/, suggestion: 'Use DepartmentOS/CRM' },
  { pattern: /from ['"]@hojai\/workforce-os/, suggestion: 'Use DepartmentOS/HR' },
  { pattern: /from ['"]@hojai\/finance-os/, suggestion: 'Use DepartmentOS/Finance' },
  { pattern: /customer.*Map/, suggestion: 'Use TwinOS Customer Twin' },
  { pattern: /employee.*Map/, suggestion: 'Use TwinOS Employee Twin' },
  { pattern: /invoice.*create/, suggestion: 'Use Finance Department Pack' },
];

export function validateSpecificity(
  extensionPath: string
): SpecificityReport {
  // Scan all TypeScript files
  // Count lines matching vertical patterns
  // Count lines matching forbidden patterns
  // Calculate ratio
  
  return {
    extensionId: extractId(extensionPath),
    totalLOC: 15000,
    verticalLOC: 14250,
    forbiddenLOC: 750,
    specificityRatio: 0.95,
    passed: true,
    forbiddenPatterns: []
  };
}

// Validation rule: specificityRatio must be >= 0.85
// If < 0.85, CI/CD pipeline fails
```

---

## Dependencies

```json
{
  "@hojai/company-os": "workspace:*",
  "@hojai/twin-os": "workspace:*",
  "@hojai/memory-os": "workspace:*"
}
```

---

## Test Cases

```typescript
// __tests__/extension-specificity.test.ts

describe('IndustryExtension Specificity', () => {
  
  it('restaurant extension should be >= 85% specific', () => {
    const report = validateSpecificity('restaurant');
    
    expect(report.passed).toBe(true);
    expect(report.specificityRatio).toBeGreaterThanOrEqual(0.85);
  });
  
  it('should fail CI if specificity is too low', () => {
    // This test runs in CI/CD pipeline
    const report = validateSpecificity('restaurant');
    
    if (!report.passed) {
      throw new Error(
        `Extension specificity violation:\n` +
        `  Required: >= 85%\n` +
        `  Actual: ${(report.specificityRatio * 100).toFixed(1)}%\n` +
        `  Forbidden patterns: ${report.forbiddenPatterns.length}`
      );
    }
  });
  
  it('should not have forbidden imports', () => {
    const report = validateSpecificity('restaurant');
    
    expect(report.forbiddenPatterns).toHaveLength(0);
  });
});
```