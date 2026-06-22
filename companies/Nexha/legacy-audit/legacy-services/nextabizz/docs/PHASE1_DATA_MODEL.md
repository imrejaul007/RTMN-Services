# NextaBizz — Phase 1 Data Model

## ERD Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Merchant   │────▶│ InventorySignal  │────▶│ ReorderSignal   │
│  (linked to │     │ (inbound webhooks)│     │ (derived)       │
│  ReZ)       │     └──────────────────┘     └────────┬────────┘
└─────────────┘                                      │
                                                     │ matches
                                                     ▼
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Supplier   │◀────│ SupplierProduct  │◀────│ SupplierCategory│
│              │     │ (catalog items)  │     │                 │
└──────┬──────┘     └────────┬────────┘     └─────────────────┘
       │                      │
       │ creates              │ linked to
       ▼                      ▼
┌─────────────┐     ┌─────────────────┐
│PurchaseOrder│◀────│   POItem        │
│             │     │                 │
└──────┬──────┘     └─────────────────┘
       │
       │ scored by
       ▼
┌─────────────────┐
│  SupplierScore  │
│  (monthly calc) │
└─────────────────┘

┌─────────────┐     ┌─────────────────┐
│  CreditLine │◀────│    Merchant     │     (BNPL via RTMN)
└─────────────┘     └─────────────────┘
```

---

## Core Entities

### 1. Merchant
```typescript
interface Merchant {
  id: string;                    // UUID
  rezMerchantId: string;         // from REZ Auth
  businessName: string;
  category: 'restaurant' | 'hotel' | 'salon' | 'retail' | 'pharmacy';
  city?: string;
  email?: string;
  phone?: string;
  source: 'rez-merchant' | 'restopapa' | 'hotel-pms';
  sourceMerchantId: string;     // ID in source system
  creditLineId?: string;         // link to CreditLine
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Supplier
```typescript
interface Supplier {
  id: string;                    // UUID
  businessName: string;
  gstNumber?: string;            // unique
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  categories: string[];          // ['food', 'beverages', 'packaging']
  rating: number;                // 0-5, default 0
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. SupplierProduct
```typescript
interface SupplierProduct {
  id: string;                    // UUID
  supplierId: string;
  categoryId?: string;
  name: string;
  sku?: string;
  description?: string;
  unit: 'kg' | 'units' | 'liters' | 'packs' | string;
  moq: number;                   // minimum order qty
  price: number;                 // base price per unit
  bulkPricing?: BulkPricing[];   // [{qty: 100, price: 90}]
  images?: string[];
  isActive: boolean;
  deliveryDays?: number;          // typical delivery time
  createdAt: Date;
  updatedAt: Date;
}

interface BulkPricing {
  qty: number;
  price: number;
}
```

### 4. SupplierCategory
```typescript
interface SupplierCategory {
  id: string;                    // UUID
  name: string;
  slug: string;                  // unique
  parentId?: string;             // for subcategories
  icon?: string;
  displayOrder: number;
  createdAt: Date;
}
```

### 5. InventorySignal
```typescript
interface InventorySignal {
  id: string;                    // UUID
  merchantId: string;
  source: 'restopapa' | 'rez-merchant' | 'hotel-pms';
  sourceProductId: string;
  sourceMerchantId: string;
  productName: string;
  sku?: string;
  currentStock: number;
  threshold: number;
  unit: string;
  category?: string;
  severity: 'low' | 'critical' | 'out_of_stock';
  signalType: 'threshold_breach' | 'manual_request' | 'forecast_deficit';
  metadata?: Record<string, unknown>;  // source-specific data
  createdAt: Date;
}
```

### 6. ReorderSignal
```typescript
interface ReorderSignal {
  id: string;                    // UUID
  merchantId: string;
  inventorySignalId?: string;    // link back to source
  suggestedQty?: number;
  urgency: 'high' | 'medium' | 'low';
  status: 'pending' | 'matched' | 'po_created' | 'ignored';
  matchConfidence?: number;       // 0-1
  createdAt: Date;
  updatedAt: Date;
}
```

### 7. PurchaseOrder
```typescript
interface PurchaseOrder {
  id: string;                    // UUID
  orderNumber: string;           // NXB-2026-00001, unique
  merchantId: string;
  supplierId: string;
  status: 'draft' | 'submitted' | 'confirmed' | 'processing' | 'shipped' | 'partial' | 'received' | 'cancelled';
  subtotal: number;
  netAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  paymentMethod: 'prepaid' | 'net_terms' | 'bnpl';
  deliveryAddress?: Address;
  expectedDelivery?: Date;
  actualDelivery?: Date;
  notes?: string;
  source: 'manual' | 'reorder_signal' | 'rfq';
  rfqId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}
```

### 8. POItem
```typescript
interface POItem {
  id: string;                    // UUID
  poId: string;
  supplierProductId?: string;   // null for free-text items
  name: string;
  sku?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  receivedQty: number;           // for variance tracking
  createdAt: Date;
}
```

### 9. SupplierScore
```typescript
interface SupplierScore {
  id: string;                    // UUID
  supplierId: string;
  period: 'monthly' | 'quarterly';
  periodStart: Date;
  periodEnd: Date;
  onTimeDeliveryRate: number;    // 0-1
  qualityRejectionRate: number;  // 0-1
  priceConsistency: number;      // 0-1
  avgLeadTimeDays?: number;
  responseRate: number;          // 0-1 (RFQ response rate)
  overallScore: number;          // 0-5
  creditBoost: number;            // 0-1
  calculatedAt: Date;
}
```

### 10. CreditLine
```typescript
interface CreditLine {
  id: string;                    // UUID
  merchantId: string;            // unique
  creditLimit: number;
  utilized: number;              // amount currently used
  tenorDays: number;             // default 30
  interestRate: number;         // APR on overdue
  status: 'active' | 'suspended' | 'closed';
  tier: 'standard' | 'premium' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}
```

### 11. RFQ
```typescript
interface RFQ {
  id: string;                    // UUID
  rfqNumber: string;             // NXB-RFQ-00001, unique
  merchantId: string;
  title: string;
  description?: string;
  category?: string;
  quantity: number;
  unit: string;
  targetPrice?: number;
  deliveryDeadline?: Date;
  status: 'open' | 'quoted' | 'awarded' | 'cancelled';
  awardedTo?: string;            // supplier ID
  linkedPoId?: string;           // PO created from awarded RFQ
  createdAt: Date;
  expiresAt?: Date;
  updatedAt: Date;
}
```

### 12. RFQResponse
```typescript
interface RFQResponse {
  id: string;                    // UUID
  rfqId: string;
  supplierId: string;
  unitPrice: number;
  totalPrice: number;
  leadTimeDays?: number;
  notes?: string;
  submittedAt: Date;
}
```

---

## Event Schemas

### inventory.signal.received
```typescript
{
  event: 'inventory.signal.received',
  merchantId: string,
  source: 'restopapa' | 'rez-merchant' | 'hotel-pms',
  sourceProductId: string,
  sourceMerchantId: string,
  productName: string,
  sku?: string,
  currentStock: number,
  threshold: number,
  unit: string,
  category?: string,
  severity: 'low' | 'critical' | 'out_of_stock',
  signalType: 'threshold_breach' | 'manual_request' | 'forecast_deficit',
  metadata?: Record<string, unknown>,
  timestamp: string  // ISO 8601
}
```

### reorder.signal.created
```typescript
{
  event: 'reorder.signal.created',
  signalId: string,
  merchantId: string,
  inventorySignalId?: string,
  suggestedQty?: number,
  urgency: 'high' | 'medium' | 'low',
  timestamp: string
}
```

### reorder.signal.matched
```typescript
{
  event: 'reorder.signal.matched',
  signalId: string,
  merchantId: string,
  supplierId: string,
  supplierProductId: string,
  suggestedPrice: number,
  matchConfidence: number,
  timestamp: string
}
```

### po.created
```typescript
{
  event: 'po.created',
  poId: string,
  orderNumber: string,
  merchantId: string,
  supplierId: string,
  source: 'manual' | 'reorder_signal' | 'rfq',
  rfqId?: string,
  totalAmount: number,
  paymentMethod: 'prepaid' | 'net_terms' | 'bnpl',
  timestamp: string
}
```

### po.status_changed
```typescript
{
  event: 'po.status_changed',
  poId: string,
  orderNumber: string,
  merchantId: string,
  supplierId: string,
  previousStatus: string,
  newStatus: string,
  timestamp: string
}
```

### po.delivered
```typescript
{
  event: 'po.delivered',
  poId: string,
  orderNumber: string,
  merchantId: string,
  supplierId: string,
  items: Array<{
    name: string,
    orderedQty: number,
    receivedQty: number,
    variance: number
  }>,
  timestamp: string
}
```

### supplier.scored
```typescript
{
  event: 'supplier.scored',
  supplierId: string,
  period: 'monthly',
  overallScore: number,
  onTimeDeliveryRate: number,
  qualityRejectionRate: number,
  priceConsistency: number,
  creditBoost: number,
  timestamp: string
}
```

### procurement.completed
```typescript
{
  event: 'procurement.completed',
  poId: string,
  orderNumber: string,
  merchantId: string,
  supplierId: string,
  totalAmount: number,
  paymentMethod: 'prepaid' | 'net_terms' | 'bnpl',
  variancePct: number,          // received vs ordered variance
  timestamp: string
}
```

### rfq.created
```typescript
{
  event: 'rfq.created',
  rfqId: string,
  rfqNumber: string,
  merchantId: string,
  title: string,
  category?: string,
  quantity: number,
  unit: string,
  targetPrice?: number,
  deliveryDeadline?: Date,
  timestamp: string
}
```

### rfq.quoted
```typescript
{
  event: 'rfq.quoted',
  rfqId: string,
  rfqNumber: string,
  supplierId: string,
  unitPrice: number,
  totalPrice: number,
  leadTimeDays?: number,
  timestamp: string
}
```

---

## Integration Mapping

### RestoPapa → NextaBizz

| RestoPapa Entity | NextaBizz Entity | Notes |
|---|---|---|
| `InventoryBatch.stock` | `InventorySignal.current_stock` | Per-product stock level |
| `InventoryBatch.lowStockThreshold` | `InventorySignal.threshold` | Reorder trigger |
| `ReorderRequest` | `ReorderSignal` | Auto-generated on threshold breach |
| `Vendor` | `Supplier` | Supplier profiles |
| `VendorApplication` | `Supplier.isVerified` | Onboarding workflow |
| `RFQ` | `RFQ` | Direct map |
| `CreditApplication` | `CreditLine` | BNPL credit line |
| — | `SupplierProduct` | New — vendors list products here |
| — | `SupplierCategory` | New — RestoPapa categories mapped |

**Webhook endpoint:** `POST /api/webhooks/restopapa/inventory`
**Payload:** `inventory.signal.received`

### ReZ Merchant → NextaBizz

| ReZ Merchant Entity | NextaBizz Entity | Notes |
|---|---|---|
| `inventory.stock` | `InventorySignal.current_stock` | Product-level stock |
| `inventory.lowStockThreshold` | `InventorySignal.threshold` | Reorder trigger |
| `inventory.isAvailable` | `InventorySignal.severity` | false → out_of_stock |
| `merchantId` | `Merchant.rezMerchantId` | Link via REZ SSO |
| — | `ReorderSignal` | Derived from threshold breach |

**Webhook endpoint:** `POST /api/webhooks/rez-merchant/inventory`
**Payload:** `inventory.signal.received`

### Hotel PMS → NextaBizz

| Hotel PMS Entity | NextaBizz Entity | Notes |
|---|---|---|
| `InventoryItem` (categories) | `InventorySignal` | Bedding, toiletries, minibar, cleaning |
| `InventoryItem.stockThreshold` | `InventorySignal.threshold` | Per-category reorder trigger |
| `SupplyRequest` (department-level) | `ReorderSignal` | Housekeeping, kitchen, spa |
| `Hotel.hotelId` | `Merchant.sourceMerchantId` | Link via REZ OTA |

**Webhook endpoint:** `POST /api/webhooks/hotel-pms/inventory`
**Payload:** `inventory.signal.received`

---

## Data Flow — Signal to PO

```
[RestoPapa / ReZ Merchant / Hotel PMS]
        │
        │ webhook (inventory.signal.received)
        ▼
[InventorySignal] ← stored in DB
        │
        │ Reorder Engine (background worker)
        ▼
[ReorderSignal] ← derived with urgency + suggested qty
        │
        │ Supplier Matcher
        ▼
[SupplierProduct matches] ← ranked by price, score, delivery
        │
        │ Merchant reviews → taps "Create PO"
        ▼
[PurchaseOrder] ← created with source='reorder_signal'
        │
        │ supplier accepts / fulfills
        ▼
[PurchaseOrder delivered] ← variance tracked
        │
        │ monthly scoring
        ▼
[SupplierScore updated]
```
