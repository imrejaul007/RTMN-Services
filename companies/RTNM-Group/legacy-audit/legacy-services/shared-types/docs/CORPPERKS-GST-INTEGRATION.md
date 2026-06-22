# CorpPerks GST Architecture — The Wedge

## Why GST is the Competitive Advantage

### The Problem

Indian companies spend significantly on:
- **Business travel**: ₹50,000-5,00,000/month for mid-market
- **Client entertainment**: ₹20,000-1,00,000/month
- **Employee gifts**: ₹10,000-2,00,000/month (festivals)

**Total**: ₹80,000-8,00,000/month in GST-eligible spend

### Current Pain

1. **Manual invoice collection**: Employees forget to collect GST invoices
2. **Wrong invoice format**: Non-compliant invoices rejected by finance
3. **ITC loss**: Missing invoices = no Input Tax Credit claim
4. **Reconciliation nightmare**: Finance manually matches expenses to invoices
5. **Compliance risk**: Incorrect GST filings

### CorpPerks Solution

Every transaction automatically generates **GST-compliant invoices** with:
- Correct HSN/SAC codes
- Proper CGST/SGST breakdown
- ITC eligibility flagged
- Company-specific invoice numbers
- Digital delivery to finance

**Result**: Companies recover 12-18% of travel/entertainment spend via ITC.

---

## GST Fundamentals (India)

### Tax Structure

| Tax | Rate | When Applied |
|-----|------|--------------|
| CGST | 6% | Half of total GST |
| SGST | 6% | Half of total GST |
| IGST | 12% | Interstate transactions |
| Total GST | 12% | Standard rate |

### HSN/SAC Codes for CorpPerks

| Service | HSN/SAC | GST Rate |
|---------|---------|----------|
| Restaurant services (dining) | 9963 | 18% (5% for standalone restaurants) |
| Hotel accommodation | 9963 | 12% (AC), 18% (luxury) |
| Gift items | 9994/7117 | 12-18% |
| Corporate gifts | 7117 | 12% |
| Business travel agency services | 9965 | 18% |

### Input Tax Credit (ITC)

**Rule**: Businesses can claim ITC on GST paid for business purposes.

**Eligibility**:
- Invoice in company name + GSTIN
- Business purpose documented
- Supplier filed GST returns
- Goods/services used for business

**CorpPerks advantage**: Every invoice generated is ITC-eligible by design.

---

## CorpGSTService Architecture

### Location
`rez-finance-service/src/services/CorpGSTService.ts`

### Core Functions

```typescript
class CorpGSTService {

  /**
   * Calculate GST breakdown for any corporate transaction
   */
  async calculateGST(params: {
    amount: number;
    serviceType: 'dining' | 'hotel' | 'gifting' | 'travel';
    companyGSTIN: string;
    placeOfSupply: string;
    isInterstate: boolean;
  }): Promise<GSTCalculation> {
    const config = GST_CONFIG[params.serviceType];
    const { hsnCode, gstRate } = config;

    const taxableAmount = this.extractTaxableAmount(params.amount, gstRate);
    const cgst = taxableAmount * (gstRate / 2) / 100;
    const sgst = cgst;
    const igst = taxableAmount * gstRate / 100;

    return {
      hsnCode,
      taxableAmount,
      cgst: params.isInterstate ? 0 : cgst,
      sgst: params.isInterstate ? 0 : sgst,
      igst: params.isInterstate ? igst : 0,
      totalGST: cgst + sgst,
      grandTotal: params.amount,
    };
  }

  /**
   * Check ITC eligibility based on transaction type and company
   */
  async checkITCeligibility(params: {
    serviceType: string;
    companyType: 'regular' | 'composition' | 'gst_exempt';
    purpose: 'business' | 'employee_welfare' | 'entertainment';
  }): Promise<ITCResult> {
    // Regular GST filers can claim ITC on business expenses
    // Composition dealers cannot claim ITC
    // Entertainment expenses have limitations

    const rules: Record<string, Partial<ITCRule>> = {
      dining: { claimable: true, limit: 0, condition: 'client_meeting' },
      hotel: { claimable: true, limit: 0, condition: 'business_travel' },
      gifting: { claimable: true, limit: 5000, condition: 'per_recipient_per_year' },
    };

    return rules[params.serviceType] || { claimable: false, reason: 'unknown_service' };
  }

  /**
   * Generate unique invoice number
   * Format: CP/{TYPE}/{YYYY-MM}/{XXXXX}
   */
  async generateInvoiceNumber(params: {
    companyPrefix: string;
    serviceType: string;
  }): Promise<string> {
    const sequence = await this.getNextSequence(params.companyPrefix);
    const date = new Date();
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const typeCode = SERVICE_TYPE_CODES[params.serviceType];

    return `CP/${typeCode}/${monthStr}/${String(sequence).padStart(5, '0')}`;
  }

  /**
   * Generate PDF invoice
   */
  async generateInvoicePdf(invoice: GSTInvoice): Promise<Buffer> {
    // Use PDFKit or Puppeteer for generation
    // Template based on GST invoice format
  }

  /**
   * Submit e-invoice to GST portal (for B2B > ₹10,000)
   */
  async submitEInvoice(invoice: GSTInvoice): Promise<EInvoiceResponse> {
    // IRN generation
    // QR code generation
    // GST portal submission via API
  }
}
```

### GST Configuration

```typescript
const GST_CONFIG: Record<string, GSTServiceConfig> = {
  dining: {
    hsnCode: '9963',
    description: 'Accommodation and restaurant services',
    gstRate: 18,
    itcClaimable: true,
    conditions: ['business_purpose', 'client_entertainment_limited'],
  },
  hotel: {
    hsnCode: '9963',
    description: 'Hotel accommodation services',
    gstRate: 12,
    itcClaimable: true,
    conditions: ['business_travel', 'employee_accommodation'],
  },
  gifting: {
    hsnCode: '7117',
    description: 'Articles of jewellery, imitation jewellery',
    gstRate: 12,
    itcClaimable: true,
    conditions: ['per_recipient_limit_5000', 'business_purpose'],
  },
  travel: {
    hsnCode: '9965',
    description: 'Travel agency services',
    gstRate: 18,
    itcClaimable: true,
    conditions: ['business_travel'],
  },
};
```

---

## Invoice Data Model

### GSTInvoice Interface

```typescript
interface GSTInvoice {
  // System fields
  _id: ObjectId;
  invoiceNumber: string;        // Generated by CorpGSTService
  invoiceDate: Date;
  generatedAt: Date;

  // Issuer (CorpPerks/company operating)
  issuer: {
    name: string;
    address: Address;
    gstIn: string;
    pan: string;
    email: string;
    phone: string;
  };

  // Recipient (corporate customer)
  recipient: {
    companyName: string;
    contactPerson: string;
    address: Address;
    gstIn: string;
    email: string;
  };

  // Transaction details
  transaction: {
    type: 'dining' | 'hotel' | 'gifting' | 'travel';
    description: string;
    invoiceType: 'tax_invoice' | 'bill_of_supply';
    reverseCharge: boolean;
    placeOfSupply: string;
    supplyDate: Date;
  };

  // Line items
  items: GSTLineItem[];

  // Tax calculation
  taxSummary: {
    taxableAmount: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalTax: number;
    grandTotal: number;
    amountInWords: string;
  };

  // ITC details
  itc: {
    eligible: boolean;
    itcAmount: number;
    itcReason?: string;
  };

  // Metadata
  metadata: {
    companyId: string;
    bookingId?: string;
    orderId?: string;
    paymentId?: string;
    createdBy: string;
  };

  // E-invoice (if > ₹10,000)
  eInvoice?: {
    irn: string;
    ackNo: string;
    ackDate: string;
    qrCode: string;
  };

  // Status
  status: 'draft' | 'issued' | 'cancelled' | 'amended';
}

interface GSTLineItem {
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  taxableValue: number;
}
```

### Invoice Schema (MongoDB)

```typescript
// rez-finance-service/src/models/GSTInvoice.ts
const GSTInvoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  invoiceDate: { type: Date, required: true },
  generatedAt: { type: Date, default: Date.now },

  issuer: {
    name: { type: String, required: true },
    address: AddressSchema,
    gstIn: { type: String, required: true },
    pan: { type: String },
  },

  recipient: {
    companyName: { type: String, required: true },
    contactPerson: { type: String },
    address: AddressSchema,
    gstIn: { type: String, required: true },
  },

  transaction: {
    type: { type: String, enum: ['dining', 'hotel', 'gifting', 'travel'] },
    description: { type: String },
    invoiceType: { type: String, enum: ['tax_invoice', 'bill_of_supply'] },
    reverseCharge: { type: Boolean, default: false },
    placeOfSupply: { type: String },
    supplyDate: { type: Date },
  },

  items: [GSTLineItemSchema],

  taxSummary: {
    taxableAmount: { type: Number, required: true },
    cgstRate: { type: Number },
    cgstAmount: { type: Number },
    sgstRate: { type: Number },
    sgstAmount: { type: Number },
    igstRate: { type: Number },
    igstAmount: { type: Number },
    totalTax: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    amountInWords: { type: String },
  },

  itc: {
    eligible: { type: Boolean, default: true },
    itcAmount: { type: Number },
    itcReason: { type: String },
  },

  metadata: {
    companyId: { type: Schema.Types.ObjectId, ref: 'CorporateCompany' },
    bookingId: { type: String },
    orderId: { type: String },
    paymentId: { type: String },
    createdBy: { type: String },
  },

  eInvoice: {
    irn: { type: String },
    ackNo: { type: String },
    ackDate: { type: String },
    qrCode: { type: String },
  },

  status: {
    type: String,
    enum: ['draft', 'issued', 'cancelled', 'amended'],
    default: 'draft',
  },
}, { timestamps: true });

GSTInvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
GSTInvoiceSchema.index({ 'recipient.gstIn': 1, invoiceDate: -1 });
GSTInvoiceSchema.index({ 'metadata.companyId': 1, invoiceDate: -1 });
```

---

## E-Invoice Integration (India)

### When Required

For B2B transactions > ₹10,000, India mandates e-invoicing via GST portal.

### Flow

```
CorpPerks Invoice Generated (B2B > 10k)
  ↓
Generate IRN (Invoice Reference Number)
  ↓
Submit to GST e-Invoice Portal API
  ↓
Receive ACK + QR Code
  ↓
Append QR Code to Invoice PDF
  ↓
Send to recipient
```

### API Integration

```typescript
class EInvoiceService {
  private readonly GST_PORTAL_URL = 'https://einvoice.gst.gov.in';
  private readonly SANDPIT_URL = 'https://einvoice.gst.gov.in/staging';

  async submitEInvoice(invoice: GSTInvoice): Promise<EInvoiceResponse> {
    // 1. Generate JSON payload
    const payload = this.buildPayload(invoice);

    // 2. Sign with GST API credentials
    const signedPayload = await this.signPayload(payload);

    // 3. Submit to GST portal
    const response = await this.post('/ewb/b2b', signedPayload);

    // 4. Parse response
    return {
      irn: response.Irn,
      ackNo: response.AckNo,
      ackDate: response.AckDt,
      qrCode: response.QrCode,
      signedInvoice: response.SignedInvoice,
    };
  }

  private buildPayload(invoice: GSTInvoice): EInvoicePayload {
    return {
      Version: '1.1',
      TranDtls: {
        gstin: invoice.issuer.gstIn,
        supplyType: invoice.transaction.placeOfSupply !== invoice.issuer.address.state
          ? 'Interstate' : 'Intrastate',
      },
      DocDtls: {
        Typ: 'INV',
        No: invoice.invoiceNumber,
        Dt: formatDate(invoice.invoiceDate),
      },
      SellerDtls: this.mapAddress(invoice.issuer),
      BuyerDtls: this.mapAddress(invoice.recipient),
      ItemList: invoice.items.map(item => ({
        SlNo: String(item.sequence),
        PrdDesc: item.description,
        HsnCd: item.hsnCode,
        Qty: item.quantity,
        Unit: item.unit,
        UnitPrice: item.unitPrice,
        TotAmt: item.totalPrice,
        Discount: item.discount,
        AssAmt: item.taxableValue,
        GstRt: invoice.taxSummary.cgstRate + invoice.taxSummary.sgstRate,
        IgstRt: invoice.taxSummary.igstRate,
        CesRt: 0,
        CesAmt: 0,
        OthChrg: 0,
        TotInvVal: invoice.taxSummary.grandTotal,
      })),
      ValDtls: {
        AssVal: invoice.taxSummary.taxableAmount,
        CgstVal: invoice.taxSummary.cgstAmount,
        SgstVal: invoice.taxSummary.sgstAmount,
        IgstVal: invoice.taxSummary.igstAmount,
        CesVal: 0,
        OthChrg: 0,
        TotInvVal: invoice.taxSummary.grandTotal,
      },
    };
  }
}
```

---

## GST Reporting

### Monthly GST Reports

#### GSTR-1 (Outward Supplies)

```typescript
interface GSTR1Report {
  companyId: string;
  period: { month: number; year: number };

  summary: {
    totalInvoices: number;
    totalTaxableValue: number;
    totalCGST: number;
    totalSGST: number;
    totalIGST: number;
    totalITCClaimable: number;
  };

  invoices: Array<{
    invoiceNumber: string;
    invoiceDate: Date;
    recipientGSTIN: string;
    recipientName: string;
    taxableValue: number;
    rate: number;
    cgst: number;
    sgst: number;
    igst: number;
    placeOfSupply: string;
  }>;

  // HSN-wise summary
  hsnSummary: Array<{
    hsnCode: string;
    description: string;
    totalQuantity: number;
    totalValue: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
  }>;
}
```

#### ITC Dashboard

```typescript
interface ITCDashboard {
  companyId: string;
  period: { month: number; year: number };

  totalITCEligible: number;
  totalITCClaimed: number;
  totalITCLost: number;  // Due to missing invoices

  byCategory: {
    dining: { eligible: number; claimed: number };
    hotel: { eligible: number; claimed: number };
    gifting: { eligible: number; claimed: number };
    travel: { eligible: number; claimed: number };
  };

  itcSavings: {
    thisMonth: number;
    ytd: number;
    projectedAnnual: number;
  };
}
```

---

## CorpPerks GST Workflow

### Complete Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Corporate Transaction Initiated │
│ HR books team dinner / Hotel stay / Gift order │
└─────────────────────────────────┬───────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Transaction Processing │
│ rez-order-service / Hotel OTA / nextabizz │
└─────────────────────────────────┬───────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. GST Calculation │
│ CorpGSTService.calculateGST() │
│ • Determine HSN/SAC code │
│ • Calculate CGST/SGST or IGST │
│ • Check ITC eligibility │
│ • Check e-invoice requirement │
└─────────────────────────────────┬───────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Invoice Generation │
│ CorpGSTService.generateInvoicePdf() │
│ • Generate invoice number │
│ • Create compliant format │
│ • Store in database │
└─────────────────────────────────┬───────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. E-Invoice (if > ₹10,000) │
│ EInvoiceService.submitEInvoice() │
│ • Generate IRN │
│ • Submit to GST portal │
│ • Receive QR code │
└─────────────────────────────────┬───────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. Delivery │
│ • Email to company finance │
│ • Email to employee │
│ • Available in admin portal │
│ • Synced to accounting (future) │
└─────────────────────────────────┬───────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. Reporting │
│ • Monthly GSTR-1 generation │
│ • ITC dashboard │
│ • Cost center allocation │
│ • Finance reconciliation │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Integration with Existing Services

### rez-finance-service Extension

```typescript
// rez-finance-service/src/services/index.ts

// Add CorpGSTService
import { CorpGSTService } from './CorpGSTService';

export const services = {
  // ... existing services

  corpGST: new CorpGSTService({
    db: mongoose.connection.db,
    cache: redis,
    config: {
      issuerGSTIN: process.env.CORPPERKS_GSTIN,
      issuerName: 'CorpPerks by RTMN Digital',
      eInvoiceSandbox: process.env.NODE_ENV !== 'production',
    },
  }),
};
```

### API Routes

```typescript
// rez-api-gateway/src/routes/corp/gst.ts

router.post('/gst/calculate', async (req, res) => {
  const { amount, serviceType, companyGSTIN, placeOfSupply } = req.body;

  const calculation = await services.corpGST.calculateGST({
    amount,
    serviceType,
    companyGSTIN,
    placeOfSupply,
    isInterstate: checkInterstate(req.body),
  });

  res.json({ success: true, data: calculation });
});

router.post('/gst/invoice', async (req, res) => {
  const { transactionId, serviceType } = req.body;

  // Generate invoice for existing transaction
  const invoice = await services.corpGST.generateInvoice(transactionId, serviceType);

  res.json({ success: true, data: invoice });
});

router.get('/gst/invoice/:invoiceNumber', async (req, res) => {
  const invoice = await services.corpGST.getInvoice(req.params.invoiceNumber);

  res.json({ success: true, data: invoice });
});

router.get('/gst/invoice/:invoiceNumber/pdf', async (req, res) => {
  const pdf = await services.corpGST.generatePdf(req.params.invoiceNumber);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.invoiceNumber}.pdf"`);
  res.send(pdf);
});

router.get('/gst/reports/gstr1/:companyId/:period', async (req, res) => {
  const report = await services.corpGST.generateGSTR1(
    req.params.companyId,
    req.params.period
  );

  res.json({ success: true, data: report });
});
```

---

## UI Components Needed

### Admin Portal: Invoice List

```
┌─────────────────────────────────────────────────────────────────────────┐
│ GST Invoices │ Company: Acme Corp ▼ │ Period: Apr 2024 ▼ │
├─────────────────────────────────────────────────────────────────────────┤
│ Filter: [All Types ▼] [All Status ▼] [Search: invoice #, GSTIN...] │
├─────────────────────────────────────────────────────────────────────────┤
│ │ │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ CP/DIN/2024-04/00001 │ Team Lunch │ ₹4,500 │ 18% │ ITC ✓ │ PDF │ │
│ │ Apr 15, 2024 │ Restaurant XYZ │ Acme Corp │ Issued │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ │ │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ CP/HOT/2024-04/00002 │ Hotel Stay │ ₹12,000 │ 12% │ ITC ✓ │ PDF │ │
│ │ Apr 18, 2024 │ Hotel ABC │ Acme Corp │ Issued │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ │ │
├─────────────────────────────────────────────────────────────────────────┤
│ Summary │ Total ITC │
│ ₹16,500 │ CGST ₹396 │ SGST ₹396 │ IGST ₹0 │ ₹792 │
└─────────────────────────────────────────────────────────────────────────┘
```

### ITC Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ITC Dashboard │ Q1 2024 │
├─────────────────────────────────────────────────────────────────────────┤
│ │ │
│  ITC Claimed This Quarter: ₹2,34,500 │
│  ITC Lost (missing invoices): ₹12,300 │
│  Recovery Rate: 95% │
│ │ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Dining │ Hotel │ Gifting │ Travel │ │
│  │ ₹45,000 │ ₹1,45,000 │ ₹24,500 │ ₹20,000 │ │
│  │ 100% │ 92% │ 100% │ 100% │ │
│  └──────────────────────────────────────────────────────────────┘ │
│ │ │
│  Missing Invoice Alerts: │
│  • Hotel booking #12345 - Missing GST invoice (₹3,500) │
│  • Client dinner Mar 20 - Missing GST invoice (₹4,200) │
│ │ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Compliance Checklist

- [ ] Invoice format matches GST rules
- [ ] HSN/SAC codes are accurate
- [ ] CGST/SGST split is correct
- [ ] E-invoice submitted for B2B > ₹10,000
- [ ] QR code present on invoice
- [ ] ITC eligibility flagged correctly
- [ ] Invoice numbers are sequential
- [ ] Audit trail maintained
- [ ] Data retention as per GST rules (8 years)
- [ ] Panic button for invoice cancellation

---

## Competitive Advantage Summary

| Feature | Competitors | CorpPerks |
|---------|-------------|-----------|
| GST invoice generation | Manual | **Auto** |
| ITC tracking | None | **Full dashboard** |
| E-invoice compliance | Partial | **Built-in** |
| GST reports | Excel export | **Auto GSTR-1** |
| Invoice reconciliation | Manual | **Auto-match** |

**Bottom line**: CorpPerks makes GST invisible for finance teams while maximizing ITC recovery.
