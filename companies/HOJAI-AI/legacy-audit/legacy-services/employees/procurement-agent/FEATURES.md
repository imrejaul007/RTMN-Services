# Procurement Agent - Features

**Company:** HOJAI AI
**Employee Type:** L2 Specialist
**Industry:** Procurement/Supply Chain
**Port:** 4786
**Status:** ✅ Connected & Working

---

## Core Features

### 1. RFQ Management
- [x] Create RFQs (Request for Quote)
- [x] Supplier matching by category
- [x] Deadline management
- [x] Quote tracking
- [x] Status monitoring
- [x] Active RFQ listing
- [x] RFQ status retrieval

### 2. Negotiation
- [x] Calculate target prices
- [x] Volume discount strategies
- [x] Counter-offer handling
- [x] Savings calculations
- [x] Multi-round negotiation
- [x] Strategy recommendations
- [x] Auto-accept thresholds

### 3. Supplier Management
- [x] Supplier discovery
- [x] Category matching
- [x] Trust score evaluation
- [x] Rating-based selection
- [x] Contract generation
- [x] Multi-supplier comparison
- [x] Delivery rating tracking

### 4. Auto-Procurement
- [x] Low stock detection
- [x] Auto-RFQ creation
- [x] Multi-supplier comparison
- [x] Best price selection
- [x] Contract auto-generation
- [x] Emergency ordering

---

## Negotiation Strategies

| Strategy | Target Discount | Max Rounds | Use Case |
|----------|---------------|------------|----------|
| standard | 10% | 3 | Regular procurement |
| aggressive | 20% | 5 | High-value orders |
| friendly | 5% | 2 | Long-term suppliers |

---

## Supplier Categories

| Category | Suppliers | Location |
|----------|-----------|----------|
| AC/HVAC | CoolAir Solutions, Climate Pro, Metro Cooling | Bangalore, Mumbai |
| Plumbing | AquaFix Services, PipeMaster Pro | Bangalore |
| Electrical | Spark Electric, PowerSafe Solutions | Bangalore |
| Linen | SoftLinens Hotel Supply, Hotel Essentials | Bangalore, Coimbatore |
| Food | FreshFarm Foods, Quality Meats & More | Bangalore |
| General | ABC Supplies, XYZ Traders, Quality Goods Co | Multi-city |

---

## Service Connections

| Service | Port | Protocol | Status |
|---------|------|----------|--------|
| Nexha Procurement OS | 4320 | HTTP | ✅ Connected |
| RABTUL Auth | 4002 | HTTP | ✅ Connected |
| RABTUL Payment | 4001 | HTTP | ✅ Connected |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/rfq` | Create RFQ |
| GET | `/api/rfq` | List active RFQs |
| GET | `/api/rfq/:rfqId` | Get RFQ status |
| POST | `/api/negotiate` | Calculate negotiation strategy |
| POST | `/api/negotiate/counter` | Submit counter offer |
| GET | `/api/suppliers` | Find suppliers |
| POST | `/api/suppliers/evaluate` | Evaluate supplier |
| POST | `/api/suppliers/contract` | Generate contract |

---

## Recommendations Generated

| Priority | Recommendation | Potential Savings |
|----------|---------------|-------------------|
| high | Request volume discount for orders above ₹50,000 | 15% |
| medium | Negotiate faster payment terms for 2% additional discount | 2% |
| low | Consider alternative suppliers for comparison | 5% |

---

## Story Coverage

| Chapter | Description | Status |
|---------|------------|--------|
| Ch 11 | Procurement → Nexha | ✅ Working |

---

**Last Updated:** June 14, 2026
