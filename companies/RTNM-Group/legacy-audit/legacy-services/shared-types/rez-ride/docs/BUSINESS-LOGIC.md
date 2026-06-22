# ReZ Ride — Business Logic

## Fare Structure

### Base Fares by Vehicle Type

| Vehicle Type | Base Fare | Per KM | Per Minute | Waiting (₹/min) |
|-------------|----------|--------|------------|-------------------|
| Auto (3-wheeler) | ₹25 | ₹10 | ₹1.5 | ₹1 |
| Cab (4-wheeler) | ₹40 | ₹14 | ₹2 | ₹2 |
| Mini Cab | ₹35 | ₹12 | ₹1.5 | ₹1.5 |
| SUV | ₹60 | ₹18 | ₹2.5 | ₹2.5 |
| Bus (Shared) | ₹15 | ₹5 | ₹0.5 | N/A |

### Fare Calculation Formula

```
Total Fare = Base Fare
           + (Distance × Per KM Rate)
           + (Time × Per Minute Rate)
           + Waiting Charges (if applicable)
           - Discounts/Promos
```

### Surge Pricing (Optional)

```
SURGE_MULTIPLIER based on demand:

Normal:     1.0x
Moderate:   1.2x - 1.5x
High:       1.5x - 2.0x
Extreme:    2.0x - 3.0x (capped)
```

**Note:** Surge pricing is optional and should comply with local regulations.

---

## Cashback Logic

### Cashback Calculation

```
Ride Fare: ₹150
Cashback: 10% = ₹15

User pays: ₹150
Cashback credited: ₹15 (to ReZ Wallet)
Net effective cost: ₹135
```

### Cashback Rules

| Rule | Value |
|------|-------|
| Cashback percentage | 10% of fare |
| Minimum cashback | ₹1 |
| Maximum cashback | ₹50 per ride |
| Crediting timing | Immediately after ride completion |
| Expiry | 90 days from credit |
| Withdrawal | Not allowed (ReZ services only) |
| Use cases | Food, grocery, hotel, flights, etc. |

### Cashback Funding

```
Cashback is funded from Ad Revenue:

Per Ride Economics:
├── Ad CPM: ₹30-50 (target)
├── Impressions per ride: ~20 (30 sec ads, 15 sec each)
├── Ad revenue per ride: ₹0.60 - ₹1.00
├── Cashback per ride: ₹1 - ₹50 (avg ₹10-15)
└── Subsidy needed: Platform covers gap initially

As scale grows:
├── Higher ad fill rate
├── Premium advertisers (higher CPM)
├── Better targeting (higher conversion → higher CPM)
└── Cashback becomes self-sustaining
```

---

## Driver Earnings

### Fare Split

```
FARE_SPLIT:
├── Driver share: 100% (no commission)
└── Platform fee: ₹0
```

### Ad Revenue Split

```
AD_REVENUE_SPLIT:
├── Driver share: 60%
├── Platform share: 40%
└── Minimum screen uptime: 70%
```

### Driver Daily Settlement

```
EXAMPLE: 10 rides × ₹150 avg = ₹1,500 fare + ₹200 ad revenue

Daily Settlement:
├── Ride fares: ₹1,500 (100% to driver)
├── Ad revenue: ₹200 (60% = ₹120 to driver)
├── Platform deduction: ₹0
└── Driver total: ₹1,620

Weekly Payout to Driver:
├── Total earnings: ₹11,340 (7 days)
├── TDS deduction (if applicable): ₹0 (below threshold)
└── Payout amount: ₹11,340
```

### Screen Uptime Compliance

```
SCREEN_UPTIME_RULES:
├── Required uptime: 70% of ride time
├── Compliance check: Auto (per ride)
├── Revenue impact:
│   ├── 90%+ uptime: 100% ad share
│   ├── 70-89% uptime: 75% ad share
│   ├── 50-69% uptime: 50% ad share
│   └── <50% uptime: 0% ad share + warning
└── Repeated non-compliance: Screen deactivation
```

---

## Ad Revenue Model

### CPM Rates (Cost Per 1000 Impressions)

```
TARGET_CPM_RATES:
├── Standard (random): ₹10-15
├── Targeted (category): ₹20-30
├── High-intent (purchase ready): ₹40-60
└── Premium (real-time + personalized): ₹80-100
```

### Ad Revenue Calculation

```
PER RIDE:
├── Average ride duration: 20 minutes
├── Ads shown: 20 (30 sec each)
├── Fill rate: 80%
├── Effective impressions: 16
├── CPM: ₹25 (targeted average)
└── Revenue: 16/1000 × ₹25 = ₹0.40

DAILY (10 rides):
├── Per ride: ₹0.40
├── Daily rides: 10
└── Daily ad revenue: ₹4.00

MONTHLY:
├── Daily: ₹4.00
├── Monthly: ₹120
├── Driver share (60%): ₹72
└── Platform share (40%): ₹48

Note: These are conservative estimates.
With scale and better targeting, CPM should increase.
```

### Ad Revenue by Targeting Quality

```
SCENARIO: 10 rides/day × 30 days = 300 rides/month

RANDOM TARGETING (CPM ₹10):
├── Impressions: 300 × 20 = 6,000
├── Revenue: 6,000/1000 × ₹10 = ₹60
├── Driver share: ₹36
└── Platform share: ₹24

CATEGORY TARGETING (CPM ₹25):
├── Impressions: 6,000
├── Revenue: 6,000/1000 × ₹25 = ₹150
├── Driver share: ₹90
└── Platform share: ₹60

INTENT TARGETING (CPM ₹50):
├── Impressions: 6,000
├── Revenue: 6,000/1000 × ₹50 = ₹300
├── Driver share: ₹180
└── Platform share: ₹120

PREMIUM REAL-TIME (CPM ₹80):
├── Impressions: 6,000
├── Revenue: 6,000/1000 × ₹80 = ₹480
├── Driver share: ₹288
└── Platform share: ₹192
```

---

## Payment Flows

### User Pays Ride

```
PAYMENT_FLOW_USER:
1. User confirms booking
   └── Fare hold on wallet (optional, for first-time users)

2. Ride in progress
   └── Real-time tracking visible

3. Ride completes
   └── Fare calculated based on actual distance/time

4. Payment executed
   └── Fare deducted from ReZ Wallet
   └── OR: UPI/Card if wallet insufficient

5. Cashback credited
   └── 10% added to ReZ Wallet immediately

6. Receipt generated
   └── Trip details + fare breakdown + cashback shown
```

### Driver Gets Paid

```
PAYMENT_FLOW_DRIVER:

Daily Settlement (Automatic):
1. End of day: System calculates
   ├── Total ride fares
   ├── Ad revenue earned
   └── Any deductions (promos, etc.)

2. Settlement report generated
   └── Visible in driver app

3. Ride fare credited
   └── To driver's ReZ Wallet (same wallet)

4. Ad revenue credited
   └── Separate line item visible

Weekly Payout:
1. Driver requests payout
   └── Minimum threshold: ₹500

2. System verifies:
   └── Screen uptime >70%
   └── No pending disputes
   └── KYC verified

3. Transfer initiated
   └── To linked UPI/Bank account
   └── T+1 settlement

4. Confirmation sent
   └── SMS + In-app notification
```

### Advertiser Pays

```
PAYMENT_FLOW_ADVERTISER:

Campaign Setup:
1. Advertiser creates campaign in AdsBazaar
   ├── Sets targeting parameters
   ├── Uploads creatives
   └── Sets daily/monthly budget

2. Pre-payment required
   └── Minimum: ₹5,000
   └── Razorpay/UPI/Card

3. Campaign goes live
   └── Ads serve based on targeting

Daily:
1. CPM deducted per impressions
2. Running total visible in dashboard

Monthly:
1. Invoice generated
2. Reconciliation report
3. Performance analytics
```

---

## Pricing by Vehicle Type (Detailed)

### Auto Rickshaw

```
AUTO_PRICING:
Base: ₹25
First 1.5 km: Included in base
After 1.5 km: ₹10/km
Waiting: ₹1/min (after 2 min free)
Luggage: ₹0 (included)
Night charges: 1.25x (11 PM - 6 AM)

EXAMPLE_10KM_RIDE:
├── Base: ₹25
├── Distance (8.5 km × ₹10): ₹85
├── Time (15 min × ₹1.5): ₹22.5
├── Total: ₹132.5
├── Cashback (10%): ₹13.25
└── User net: ₹119.25
```

### Cab (Sedan/Hatchback)

```
CAB_PRICING:
Base: ₹40
First 2 km: Included in base
After 2 km: ₹14/km
Waiting: ₹2/min (after 3 min free)
Luggage: ₹0 (up to 2 bags)
Night charges: 1.25x (11 PM - 6 AM)

EXAMPLE_10KM_RIDE:
├── Base: ₹40
├── Distance (8 km × ₹14): ₹112
├── Time (15 min × ₹2): ₹30
├── Total: ₹182
├── Cashback (10%): ₹18.20
└── User net: ₹163.80
```

### SUV

```
SUV_PRICING:
Base: ₹60
First 2 km: Included in base
After 2 km: ₹18/km
Waiting: ₹2.5/min (after 3 min free)
Luggage: ₹0 (up to 4 bags)
Night charges: 1.25x (11 PM - 6 AM)

EXAMPLE_10KM_RIDE:
├── Base: ₹60
├── Distance (8 km × ₹18): ₹144
├── Time (15 min × ₹2.5): ₹37.5
├── Total: ₹241.5
├── Cashback (10%): ₹24.15
└── User net: ₹217.35
```

### Bus (Shared)

```
BUS_PRICING:
Base: ₹15
First 3 km: Included in base
After 3 km: ₹5/km
No waiting charges
Multiple stops allowed
Fixed route or request-based

EXAMPLE_15KM_RIDE:
├── Base: ₹15
├── Distance (12 km × ₹5): ₹60
├── Total: ₹75
├── Cashback (10%): ₹7.5
└── User net: ₹67.5
```

---

## Driver Onboarding Economics

```
ONBOARDING_INCENTIVES (Optional):

Referral Bonus:
├── Referrer: ₹500 per active driver
└── Referred: ₹500 joining bonus

First 100 Rides:
├── Bonus: ₹10 per ride
└── Condition: Complete within 30 days

Screen Installation:
├── Incentive: ₹200 per ride (first 200 rides)
└── Condition: Screen installed and active
```

---

## Platform Economics

```
PLATFORM_UNIT_ECONOMICS (Per Ride):

Revenue:
├── Ad revenue: ₹0.40 (avg)
├── Platform share (40%): ₹0.16
└── Total: ₹0.16

Costs:
├── Server/infrastructure: ₹0.05
├── Payment processing: ₹0.02
├── Customer support: ₹0.01
└── Total: ₹0.08

Contribution Margin: ₹0.08/ride

At Scale (1M rides/month):
├── Monthly ad revenue: ₹160,000
├── Monthly costs: ₹80,000
└── Monthly margin: ₹80,000

Note: This doesn't include:
- Customer acquisition costs (CAC)
- Driver acquisition costs
- Screen hardware subsidies
- Marketing spend
```

---

## Cashback Pool Management

```
CASHBACK_POOL_LOGIC:

Funding Sources:
├── Primary: Ad revenue (per ride)
├── Secondary: Promotional budget
└── Tertiary: Platform subsidy (early stage)

Pool Rules:
├── Daily credit limit: 10% of daily rides
├── Rollover: Unused pool rolls to next day
├── Expiry: 90 days from credit
└── Audit: Monthly reconciliation

Sustainability Check:
├── If ad revenue covers 100% cashback → profitable
├── If ad revenue covers 80% → platform subsidizes 20%
├── If ad revenue covers 50% → unsustainable long-term
└── Target: Self-sustaining by Month 6
```
