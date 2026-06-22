# CorpPerks — Service Integration Specifications

## Overview

CorpPerks is built by **assembling** existing ReZ services with new corporate-specific extensions. This document details the exact integration points, API contracts, and data flows.

---

## 1. Corporate Dining Integration

### 1.1 Service Dependencies

| Service | Role | Integration Type |
|---------|------|------------------|
| `rez-merchant-service` | Restaurant network | Extend |
| `rez-order-service` | Order management | Extend |
| `rez-wallet-service` | Meal benefits | Extend |
| `rez-payment-service` | Settlement | Extend |
| `rez-finance-service` | GST invoices | New module |

### 1.2 rez-merchant-service Changes

#### New Model: MerchantCorporateConfig

```typescript
// rez-merchant-service/src/models/MerchantCorporateConfig.ts

interface IMerchantCorporateConfig extends Document {
  merchantId: Types.ObjectId;
  isCorporatePartner: boolean;
  corporateSettings: {
    acceptsMealBenefits: boolean;
    mealBenefitTypes: ('meal_allowance' | 'dining_credit')[];
    discountPercent: number;          // CorpPerks commission
    gstInclusive: boolean;
    minOrderValue: number;
    maxOrderValue: number;
    preparationTimeMinutes: number;
    deliveryAvailable: boolean;
    cateringAvailable: boolean;
  };
  corporateCategories: string[];      // ['fine_dining', 'casual', 'cafeteria']
  corporateLocations: {
    address: string;
    lat: number;
    lng: number;
    maxCapacity: number;
  }[];
  corporateRating: {
    averageRating: number;
    totalReviews: number;
    corporateSpecificRating: number;  // Rating from corp users
  };
  contractDetails: {
    contractStart: Date;
    contractEnd: Date;
    commissionTier: 'standard' | 'premium';
    paymentTerms: number;              // Days
  };
  stats: {
    totalCorporateOrders: number;
    monthlyCorporateOrders: number;
    totalRevenueFromCorporate: number;
  };
}

const MerchantCorporateConfigSchema = new Schema({
  merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, unique: true },
  isCorporatePartner: { type: Boolean, default: false },
  corporateSettings: {
    acceptsMealBenefits: { type: Boolean, default: false },
    mealBenefitTypes: [{ type: String, enum: ['meal_allowance', 'dining_credit'] }],
    discountPercent: { type: Number, default: 0, min: 0, max: 30 },
    gstInclusive: { type: Boolean, default: true },
    minOrderValue: { type: Number, default: 0 },
    maxOrderValue: { type: Number, default: 0 },
    preparationTimeMinutes: { type: Number, default: 30 },
    deliveryAvailable: { type: Boolean, default: false },
    cateringAvailable: { type: Boolean, default: false },
  },
  corporateCategories: [{ type: String }],
  corporateLocations: [{
    address: String,
    lat: Number,
    lng: Number,
    maxCapacity: Number,
  }],
  corporateRating: {
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    corporateSpecificRating: { type: Number, default: 0 },
  },
  contractDetails: {
    contractStart: Date,
    contractEnd: Date,
    commissionTier: { type: String, enum: ['standard', 'premium'], default: 'standard' },
    paymentTerms: { type: Number, default: 30 },
  },
  stats: {
    totalCorporateOrders: { type: Number, default: 0 },
    monthlyCorporateOrders: { type: Number, default: 0 },
    totalRevenueFromCorporate: { type: Number, default: 0 },
  },
}, { timestamps: true });
```

#### Extend Merchant Model

```typescript
// Add to Merchant.ts in rez-merchant-service

interface MerchantDocument {
  // ... existing fields

  // NEW: Corporate partner fields
  corporatePartner?: {
    isActive: boolean;
    configId: Types.ObjectId;
    enrolledAt: Date;
  };
}
```

### 1.3 rez-order-service Changes

#### Extend Order Schema

```typescript
// Add to Order.ts in rez-order-service

interface CorporateOrderFields {
  isCorporateOrder: boolean;
  companyId: Types.ObjectId;
  companyName: string;
  costCenter: string;
  gstIn: string;

  // Booking details
  bookingType: 'team_lunch' | 'client_dinner' | 'catering' | 'delivery';
  guestCount: number;
  dietaryRequirements: string[];
  occasion?: string;

  // Budget
  budgetRange: {
    min: number;
    max: number;
    perPersonLimit: number;
  };

  // Approval
  approvalRequired: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approverId?: Types.ObjectId;

  // GST
  gstInvoiceRequired: boolean;
  invoiceId?: Types.ObjectId;
  placeOfSupply: string;

  // Payment
  paymentSource: 'corporate_wallet' | 'employee_meal_benefit' | 'expense_claim';
  benefitType?: 'meal_allowance' | 'dining_credit';

  // Fulfillment
  selectedLocationId?: string;
  scheduledDateTime?: Date;
  specialInstructions?: string;
}
```

#### New API Routes

```typescript
// rez-api-gateway/src/routes/corp/dining.ts

router.post('/corp/dining/orders', auth, async (req, res) => {
  const {
    restaurantId,
    bookingType,
    guestCount,
    scheduledDateTime,
    dietaryRequirements,
    costCenter,
    gstIn,
    invoiceRequired,
  } = req.body;

  // Validate corporate partner
  const merchant = await services.merchant.getCorporateConfig(restaurantId);
  if (!merchant?.isCorporatePartner) {
    return res.status(400).json({ success: false, error: 'Not a corporate partner' });
  }

  // Create order
  const order = await services.order.createCorporateOrder({
    merchantId: restaurantId,
    userId: req.user.id,
    companyId: req.user.companyId,
    costCenter,
    gstIn,
    bookingType,
    guestCount,
    scheduledDateTime,
    dietaryRequirements,
    isCorporateOrder: true,
    gstInvoiceRequired: invoiceRequired,
  });

  // Generate GST invoice if required
  if (invoiceRequired) {
    const invoice = await services.gst.createInvoice({
      orderId: order.id,
      serviceType: 'dining',
      companyGSTIN: gstIn,
    });
    order.invoiceId = invoice.id;
    await order.save();
  }

  res.json({ success: true, data: { order, invoice } });
});

router.get('/corp/dining/orders', auth, async (req, res) => {
  const { status, startDate, endDate, costCenter } = req.query;

  const orders = await services.order.listCorporateOrders({
    companyId: req.user.companyId,
    status,
    startDate,
    endDate,
    costCenter,
  });

  res.json({ success: true, data: orders });
});

router.post('/corp/dining/orders/:orderId/approve', auth, async (req, res) => {
  const order = await services.order.approveCorporateOrder(req.params.orderId, req.user.id);
  res.json({ success: true, data: order });
});
```

### 1.4 rez-wallet-service Changes

#### New Coin Type: meal_benefit

```typescript
// Extend ICoinBalance in Wallet.ts

type CorporateCoinType = 'meal_benefit' | 'dining_credit' | 'travel_benefit' | 'gift_benefit';

interface ICoinBalance {
  type: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral' | CorporateCoinType;
  amount: number;
  isActive: boolean;
  expiryDate?: Date;

  // Corporate-specific
  benefitType?: 'meal' | 'travel' | 'gift';
  periodType?: 'monthly' | 'quarterly' | 'yearly';
  periodStart?: Date;
  periodEnd?: Date;
  rolloverEnabled?: boolean;
  rolloverAmount?: number;
}
```

#### New Model: BenefitAllocation

```typescript
// rez-wallet-service/src/models/BenefitAllocation.ts

interface IBenefitAllocation extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  employeeId: Types.ObjectId;
  benefitType: 'meal' | 'travel' | 'gift' | 'wellness' | 'flex';
  coinType: CorporateCoinType;
  amount: number;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  periodStart: Date;
  periodEnd: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BenefitAllocationSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  benefitType: { type: String, enum: ['meal', 'travel', 'gift', 'wellness', 'flex'], required: true },
  coinType: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  periodType: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

BenefitAllocationSchema.index({ companyId: 1, employeeId: 1, benefitType: 1 });
```

### 1.5 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HR Admin Portal │
│ Creates team lunch booking │
└─────────────────────────────────┬───────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ CorpPerks API │
│ POST /corp/dining/orders │
│ Validates: merchant is corporate partner, within budget │
└─────────────────────────────────┬───────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ rez-order-service │
│ Creates order with corporate fields │
│ Status: pending (if approval required) │
└─────────────────────────────────┬───────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ rez-finance-service (CorpGSTService) │
│ Generates GST invoice │
│ • HSN: 9963 │
│ • CGST/SGST: 9%/9% │
│ • ITC eligible: true │
└─────────────────────────────────┬───────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ If approval required: │
│ Notification to manager │
│ Manager approves in portal │
└─────────────────────────────────┬───────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ rez-payment-service │
│ Charges corporate wallet OR deducts meal benefit coins │
│ Settlement to restaurant │
└─────────────────────────────────┬───────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Notifications │
│ • Invoice email to HR │
│ • Order confirmation to employee │
│ • Stats update to merchant │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Corporate Hotel Booking Integration

### 2.1 Service Dependencies

| Service | Role | Integration Type |
|---------|------|------------------|
| `Hotel OTA` | Booking engine | External API |
| `rez-finance-service` | GST invoices | Extend |
| `rez-wallet-service` | Travel benefits | Extend |
| `rez-payment-service` | Corporate payment | Extend |

### 2.2 Hotel OTA Extension

#### New Routes for Corporate

```typescript
// Extend Hotel OTA with corporate endpoints

interface CorporateHotelBooking {
  bookingId: string;
  companyId: string;
  employeeId: string;
  costCenter: string;
  gstIn: string;

  // Hotel details
  hotelId: string;
  roomType: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  guestNames: string[];

  // Corporate-specific
  purpose: 'business' | 'training' | 'client_visit' | 'team_outing';
  approverId?: string;
  approvalStatus: 'auto' | 'pending' | 'approved' | 'rejected';

  // Rates
  rateCode: string;              // Corporate rate code
  roomRate: number;
  totalRoomCharges: number;
  taxes: number;
  gstAmount: number;
  grandTotal: number;

  // GST
  invoiceRequired: boolean;
  invoiceId?: string;
  itcEligible: boolean;

  // Status
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
}

// Corporate rate code validation
router.post('/corp/hotels/rates', async (req, res) => {
  const { hotelId, checkIn, checkOut, rateCode } = req.body;

  // Validate corporate rate code
  const corporateRate = await validateCorporateRate(hotelId, rateCode);

  if (!corporateRate.valid) {
    return res.status(400).json({ success: false, error: 'Invalid corporate rate code' });
  }

  // Get available rooms with corporate rate
  const availability = await getAvailability({
    hotelId,
    checkIn,
    checkOut,
    corporateRate: corporateRate.data,
  });

  res.json({ success: true, data: availability });
});

// Corporate booking creation
router.post('/corp/hotels/bookings', auth, async (req, res) => {
  const {
    hotelId,
    roomType,
    checkIn,
    checkOut,
    guestDetails,
    costCenter,
    gstIn,
    rateCode,
    purpose,
  } = req.body;

  // Create booking with corporate fields
  const booking = await createCorporateBooking({
    hotelId,
    roomType,
    checkIn,
    checkOut,
    guestDetails,
    companyId: req.user.companyId,
    employeeId: req.user.id,
    costCenter,
    gstIn,
    rateCode,
    purpose,
    invoiceRequired: true,
  });

  // Generate GST invoice
  const invoice = await services.gst.createInvoice({
    bookingId: booking.id,
    serviceType: 'hotel',
    companyGSTIN: gstIn,
    taxableAmount: booking.totalRoomCharges,
    itcEligible: true,
  });

  res.json({ success: true, data: { booking, invoice } });
});
```

### 2.3 Hotel GST Configuration

```typescript
// Hotel GST rates by room type

const HOTEL_GST_RATES = {
  'ac_room': { hsn: '996311', gstRate: 12 },
  'non_ac_room': { hsn: '996312', gstRate: 12 },
  'luxury_suite': { hsn: '996313', gstRate: 18 },
  'business_class': { hsn: '996314', gstRate: 18 },
  'executive_suite': { hsn: '996315', gstRate: 18 },
};

// GST calculation for hotel
async function calculateHotelGST(params: {
  roomRate: number;
  nights: number;
  roomType: string;
  companyGSTIN: string;
}): Promise<GSTBreakdown> {
  const config = HOTEL_GST_RATES[params.roomType] || HOTEL_GST_RATES['ac_room'];
  const taxableAmount = params.roomRate * params.nights;

  // GST is calculated on room rent
  const cgst = taxableAmount * (config.gstRate / 2) / 100;
  const sgst = cgst;

  return {
    hsnCode: config.hsn,
    taxableAmount,
    cgst,
    sgst,
    totalGST: cgst + sgst,
    itcEligible: true,
    grandTotal: taxableAmount + cgst + sgst,
  };
}
```

---

## 3. Corporate Gifting Integration

### 3.1 Service Dependencies

| Service | Role | Integration Type |
|---------|------|------------------|
| `nextabizz` | Gift procurement | External API |
| `rez-catalog-service` | Gift catalog | Extend |
| `rez-merchant-service` | Gift vendors | Extend |
| `rez-wallet-service` | Gift benefits | Extend |
| `rez-payment-service` | Bulk payment | Extend |

### 3.2 nextabizz Integration

```typescript
// nextabizz integration for corporate gifting

interface NextaBizzIntegration {
  // Get corporate gift catalog
  async getCorporateCatalog(params: {
    companyId: string;
    category?: string;
    minBudget?: number;
    maxBudget?: number;
  }): Promise<GiftCatalog>;

  // Get bulk pricing
  async getBulkPricing(params: {
    productId: string;
    quantities: number[];
  }): Promise<BulkPricingResponse>;

  // Create bulk order
  async createBulkOrder(params: {
    companyId: string;
    items: { productId: string; quantity: number }[];
    recipients: { name: string; address: string; phone: string }[];
    personalization: {
      giftMessage?: string;
      companyLogo?: string;
      giftWrapping?: string;
    };
    deliveryDate: Date;
  }): Promise<BulkOrderResponse>;

  // Track delivery
  async getDeliveryStatus(orderId: string): Promise<DeliveryStatus>;
}

// nextabizz API wrapper
class NextaBizzClient {
  private baseUrl = process.env.NEXTABIZZ_API_URL;
  private apiKey = process.env.NEXTABIZZ_API_KEY;

  async request<T>(endpoint: string, options: RequestOptions): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`NextaBizz API error: ${response.status}`);
    }

    return response.json();
  }
}
```

### 3.3 rez-catalog-service Extension

```typescript
// Extend catalog for corporate gifting

interface CorporateGiftProduct {
  productId: string;
  sku: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  category: string;

  // Corporate-specific
  isCorporateGift: boolean;
  corporatePricing: {
    standard: number;
    bulk50: number;
    bulk100: number;
    bulk500: number;
  };
  personalizationOptions: {
    giftWrapping: { available: boolean; price: number };
    customMessage: { available: boolean; price: number };
    companyBranding: { available: boolean; price: number };
  };
  logistics: {
    canShipBulk: boolean;
    individualDeliveryAvailable: boolean;
    deliveryTimeDays: number;
  };
  inventory: {
    inStock: boolean;
    quantity: number;
    lowStockThreshold: number;
  };
}
```

### 3.4 Gift Campaign Flow

```typescript
// Gift campaign creation

interface GiftCampaign {
  id: string;
  companyId: string;
  name: string;
  type: 'festival' | 'milestone' | 'client' | 'thank_you';

  // Products
  products: {
    productId: string;
    minQuantity: number;
    maxQuantity: number;
  }[];

  // Recipients
  recipientCriteria: {
    type: 'all_employees' | 'department' | 'level' | 'custom';
    departmentIds?: string[];
    levels?: string[];
    customEmails?: string[];
  };

  // Budget
  budget: {
    perPersonMin: number;
    perPersonMax: number;
    totalBudget: number;
    costCenter: string;
  };

  // Personalization
  personalization: {
    giftMessage: string;           // "Happy Diwali from Team Acme!"
    companyLogoUrl: string;
    giftWrappingStyle: string;
    includeCard: boolean;
  };

  // Schedule
  schedule: {
    sendDate: Date;
    allowEarlyRedemption: boolean;
    expiryDate: Date;
    reminderDaysBefore: number[];
  };

  // Status
  status: 'draft' | 'pending_approval' | 'approved' | 'ordered' | 'delivered';
  approvalDetails: {
    requestedBy: string;
    requestedAt: Date;
    approvedBy?: string;
    approvedAt?: Date;
  };
}

// Create campaign API
router.post('/corp/gifting/campaigns', auth, async (req, res) => {
  const campaign = await services.gifting.createCampaign({
    ...req.body,
    companyId: req.user.companyId,
    requestedBy: req.user.id,
  });

  // If auto-approved (within budget), proceed
  if (isWithinAutoApprovalLimit(campaign)) {
    await services.gifting.approveCampaign(campaign.id, 'auto');
  } else {
    // Notify approver
    await services.notification.send({
      to: getApproverEmail(req.user.companyId),
      template: 'campaign_pending_approval',
      data: { campaign },
    });
  }

  res.json({ success: true, data: campaign });
});

// Bulk order placement
router.post('/corp/gifting/campaigns/:campaignId/order', auth, async (req, res) => {
  const order = await services.gifting.placeBulkOrder(req.params.campaignId);

  // Sync with nextabizz
  const nextaOrder = await nextabizz.createBulkOrder({
    items: order.items,
    recipients: order.recipients,
    personalization: order.personalization,
    deliveryDate: order.schedule.sendDate,
  });

  // Update order with nextabizz ID
  order.externalOrderId = nextaOrder.id;
  await order.save();

  // Generate GST invoice
  const invoice = await services.gst.createInvoice({
    orderId: order.id,
    serviceType: 'gifting',
    companyGSTIN: req.user.companyGstIn,
  });

  res.json({ success: true, data: { order, invoice } });
});
```

---

## 4. Shared API Contracts

### 4.1 Common Types

```typescript
// Shared types for all CorpPerks modules

interface Company {
  id: string;
  name: string;
  gstIn: string;
  pan: string;
  address: Address;
  contactEmail: string;
  contactPhone: string;
  settings: {
    defaultCostCenter: string;
    invoiceEmail: string;
    approverEmails: string[];
    autoApprovalLimit: number;
  };
}

interface CorporateUser {
  id: string;
  email: string;
  name: string;
  companyId: string;
  department: string;
  level: string;
  role: 'corp_admin' | 'corp_hr' | 'corp_finance' | 'corp_manager' | 'corp_employee';
  managerId?: string;
}

interface CostCenter {
  id: string;
  companyId: string;
  name: string;
  code: string;
  budget: number;
  spent: number;
  managerId: string;
}
```

### 4.2 Error Codes

```typescript
const CORP_ERROR_CODES = {
  // Authentication
  AUTH_COMPANY_NOT_FOUND: 'CP001',
  AUTH_USER_NOT_ENROLLED: 'CP002',
  AUTH_INVALID_ROLE: 'CP003',

  // Booking
  BOOKING_RESTAURANT_NOT_CORP_PARTNER: 'CP101',
  BOOKING_OUTSIDE_BUDGET: 'CP102',
  BOOKING_APPROVAL_REQUIRED: 'CP103',
  BOOKING_APPROVAL_REJECTED: 'CP104',
  BOOKING_SLOT_UNAVAILABLE: 'CP105',

  // Payment
  PAYMENT_INSUFFICIENT_BALANCE: 'CP201',
  PAYMENT_BENEFIT_EXPIRED: 'CP202',
  PAYMENT_BENEFIT_EXHAUSTED: 'CP203',

  // GST
  GST_INVALID_GSTIN: 'CP301',
  GST_INVOICE_GENERATION_FAILED: 'CP302',
  GST_EINVOICE_SUBMISSION_FAILED: 'CP303',

  // Gifting
  GIFT_CAMPAIGN_INVALID_RECIPIENTS: 'CP401',
  GIFT_BUDGET_EXCEEDED: 'CP402',
  GIFT_DELIVERY_FAILED: 'CP403',
};
```

### 4.3 Webhook Events

```typescript
// Webhooks for external integrations

interface CorpWebhookEvents {
  // Order events
  'corp.order.created': { orderId: string; companyId: string; amount: number; type: string };
  'corp.order.approved': { orderId: string; approvedBy: string };
  'corp.order.completed': { orderId: string; completedAt: Date };

  // Payment events
  'corp.payment.processed': { paymentId: string; amount: number; type: string };
  'corp.payment.failed': { paymentId: string; error: string };

  // Invoice events
  'corp.invoice.generated': { invoiceId: string; invoiceNumber: string; amount: number };
  'corp.invoice.einvoice_submitted': { invoiceId: string; irn: string };

  // Gifting events
  'corp.gift.shipped': { orderId: string; trackingId: string };
  'corp.gift.delivered': { orderId: string; recipientId: string };
  'corp.gift.redeemed': { campaignId: string; recipientId: string; productId: string };
}
```

---

## 5. Testing Strategy

### 5.1 Integration Tests

```typescript
// Test corporate dining flow
describe('Corporate Dining Integration', () => {
  it('should create order with GST invoice', async () => {
    // Setup
    const company = await createTestCompany();
    const merchant = await createCorporatePartner();
    const employee = await createCorporateEmployee(company.id);

    // Create order
    const order = await api.post('/corp/dining/orders', {
      restaurantId: merchant.id,
      bookingType: 'team_lunch',
      guestCount: 10,
      costCenter: 'SALES',
      gstIn: company.gstIn,
      invoiceRequired: true,
    });

    // Verify order
    expect(order.isCorporateOrder).toBe(true);
    expect(order.invoiceId).toBeDefined();

    // Verify invoice
    const invoice = await api.get(`/corp/gst/invoice/${order.invoiceId}`);
    expect(invoice.taxSummary.totalGST).toBeGreaterThan(0);
    expect(invoice.itc.eligible).toBe(true);
  });
});
```

### 5.2 Contract Tests

```typescript
// Verify API contracts with Pact or Dredd
import { Pact } from '@pact-foundation/pact';

const provider = new Pact({
  consumer: 'corpperks-admin',
  provider: 'rez-wallet-service',
  port: 1234,
});

describe('Wallet Service Contract', () => {
  it('should create benefit allocation', async () => {
    await provider.addInteraction({
      state: 'user exists with wallet',
      uponReceiving: 'a request to create benefit allocation',
      withRequest: {
        method: 'POST',
        path: '/benefits/allocation',
        body: {
          employeeId: 'user123',
          benefitType: 'meal',
          amount: 5000,
        },
      },
      willRespondWith: {
        status: 201,
        body: {
          id: MATCHERS.string,
          employeeId: 'user123',
          benefitType: 'meal',
          amount: 5000,
        },
      },
    });
  });
});
```

---

## 6. Monitoring & Observability

### 6.1 Metrics

```typescript
// CorpPerks specific metrics

const corpMetrics = {
  // Order metrics
  'corp.dining.orders.total': Counter,
  'corp.dining.orders.value': Histogram,
  'corp.hotel.bookings.total': Counter,
  'corp.hotel.bookings.value': Histogram,
  'corp.gifting.orders.total': Counter,
  'corp.gifting.campaigns.total': Counter,

  // GST metrics
  'corp.gst.invoices.generated': Counter,
  'corp.gst.itc.eligible_amount': Counter,
  'corp.gst.einvoices.submitted': Counter,
  'corp.gst.einvoices.failed': Counter,

  // Approval metrics
  'corp.approval.required': Counter,
  'corp.approval.auto_approved': Counter,
  'corp.approval.manual_approved': Counter,
  'corp.approval.rejected': Counter,
  'corp.approval.latency': Histogram,

  // Error metrics
  'corp.errors': Counter,
  'corp.errors.by_type': Counter,
};
```

### 6.2 Alerting

```critical
# CorpPerks Critical Alerts
- GST invoice generation failure rate > 1%
- Approval SLA breach (pending > 24h)
- Payment failure rate > 5%
- E-invoice submission failure > 10%
```
