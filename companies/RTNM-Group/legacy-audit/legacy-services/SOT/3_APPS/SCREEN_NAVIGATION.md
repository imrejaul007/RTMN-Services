# SCREEN NAVIGATION - COMPLETE APP STRUCTURE

**Date:** May 10, 2026

---

## REZ APP (CONSUMER)

### Main Tabs

| Screen | Route | Purpose |
|--------|-------|---------|
| Home | `(tabs)/_layout.tsx` | Tab navigation |
| Search | `(tabs)/_layout.tsx` | Search tab |
| Orders | `(tabs)/_layout.tsx` | Order history |
| Profile | `(tabs)/_layout.tsx` | User settings |

---

### Savings Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Savings Home | `savings/_layout.tsx` | Savings dashboard |
| Savings Details | `savings/[id]` | View savings |
| Add Savings | `savings/add` | Create savings goal |

---

### Cash Store Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Cash Store | `cash-store/_layout.tsx` | ReZ coins store |
| Coin Details | `cash-store/[id]` | View coin product |
| Purchase | `cash-store/purchase` | Buy coins |

---

### Prive Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Prive Home | `prive/_layout.tsx` | Premium offers |
| Prive Offers | `prive/offers` | Exclusive deals |
| Prive Redeem | `prive/redeem` | Redeem rewards |

---

### Mall Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Mall Home | `mall/_layout.tsx` | Shopping mall |
| Mall Category | `mall/[slug]` | Category products |
| Mall Product | `mall/product/[id]` | Product details |
| Mall Cart | `mall/cart` | Shopping cart |
| Mall Checkout | `mall/checkout` | Payment flow |

---

### Order Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Orders | `order/_layout.tsx` | Order management |
| Order Details | `order/[id]` | View order |
| Track Order | `order/track/[id]` | Delivery tracking |

---

### Vouchers Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Vouchers | `vouchers/_layout.tsx` | Coupon wallet |
| Voucher Details | `vouchers/[id]` | View voucher |

---

### Survey Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Surveys | `survey/_layout.tsx` | Feedback forms |
| Survey Details | `survey/[id]` | Take survey |
| Survey Thanks | `survey/[id]/thanks` | Submission complete |

---

### Account Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Account | `account/_layout.tsx` | User profile |
| Settings | `account/settings` | App settings |
| Notifications | `account/notifications` | Push settings |
| Help | `account/help` | Support |
| Legal | `account/legal` | Privacy, Terms |

---

### Travel/Hotels Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Hotels | `travel/hotels/_layout.tsx` | Hotel booking |
| Hotel Details | `travel/hotels/[id]/_layout.tsx` | Property info |
| Hotel Booking | `travel/hotels/booking/_layout.tsx` | Reserve room |
| Room Options | `travel/hotels/booking/rooms` | Select room |
| Guest Details | `travel/hotels/booking/guest` | Guest info |
| Payment | `travel/hotels/booking/payment` | Pay booking |

---

### Rendez Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Rendez Home | `rendez/_layout.tsx` | Social features |
| Rendez Events | `rendez/events` | Event discovery |
| Rendez Event | `rendez/event/[id]` | Event details |

---

### Karma Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Karma Home | `karma/_layout.tsx` | NGO/giving |
| Karma Missions | `karma/missions` | View missions |
| Karma Mission | `karma/missions/[id]` | Mission details |
| Civic Corps | `karma/civic-corps/_layout.tsx` | Community groups |
| Karma Impact | `karma/impact` | View impact report |

---

### Category Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Categories | `category/[slug]/_layout.tsx` | Browse category |
| Category Products | `category/[slug]/products` | Product list |
| Category Offers | `category/[slug]/offers` | Category deals |

---

### Main Category Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Main Categories | `MainCategory/_layout.tsx` | All categories |
| Category Detail | `MainCategory/[slug]/_layout.tsx` | Category page |
| Subcategories | `MainCategory/[slug]/[sub]` | Browse subcategory |
| Experiences | `MainCategory/[slug]/experiences` | Experiences |
| Loyalty | `MainCategory/[slug]/loyalty` | Merchant loyalty |

---

### Habixo Stack (Home Services)

| Screen | Route | Purpose |
|--------|-------|---------|
| Habixo Home | `habixo/_layout.tsx` | Home services |
| Habixo Services | `habixo/services` | Service categories |
| Habixo Booking | `habixo/book/[id]` | Book service |

---

### Events Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Events | `events/_layout.tsx` | Event discovery |
| Event Details | `events/[id]` | Event info |
| Book Event | `events/book/[id]` | Purchase tickets |

---

### Onboarding

| Screen | Route | Purpose |
|--------|-------|---------|
| Onboarding | `onboarding/_layout.tsx` | New user flow |
| Welcome | `onboarding/welcome` | Get started |
| Location | `onboarding/location` | Set location |
| Interests | `onboarding/interests` | Select preferences |

---

## MERCHANT APP

### Dashboard Tabs

| Screen | Route | Purpose |
|--------|-------|---------|
| Dashboard | `(tabs)/_layout.tsx` | Overview |
| Orders | `(tabs)/orders` | Order management |
| Menu | `(tabs)/menu` | Product management |
| Analytics | `(tabs)/analytics` | Business insights |
| Profile | `(tabs)/profile` | Account settings |

---

### Dashboard Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Stats | `(dashboard)/stats` | KPI overview |
| Quick Actions | `(dashboard)/quick-actions` | Shortcuts |
| Notifications | `(dashboard)/notifications` | Alerts |

---

### QR Hub

| Screen | Route | Purpose |
|--------|-------|---------|
| QR Hub | `(dashboard)/qr-hub/_layout.tsx` | QR management |
| Manage QR | `(dashboard)/qr-hub/manage/page` | QR codes |
| QR Analytics | `(dashboard)/qr-hub/analytics/page` | Scan statistics |

---

### Loyalty Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Loyalty | `(dashboard)/loyalty/_layout.tsx` | Rewards program |
| Rewards | `(dashboard)/loyalty/rewards` | Manage rewards |
| Customers | `(dashboard)/loyalty/customers` | Loyalty members |
| Campaigns | `(dashboard)/loyalty/campaigns` | Run promotions |

---

### Menu Management

| Screen | Route | Purpose |
|--------|-------|---------|
| Menu Editor | `(tabs)/menu/_layout.tsx` | Edit products |
| Add Product | `(tabs)/menu/add` | Create product |
| Edit Product | `(tabs)/menu/edit/[id]` | Modify product |
| Categories | `(tabs)/menu/categories` | Manage categories |
| Offers | `(tabs)/menu/offers` | Create deals |

---

### Onboarding

| Screen | Route | Purpose |
|--------|-------|---------|
| Onboarding V2 | `onboarding-v2/page.tsx` | Business setup |
| Store Profile | `onboarding/store-profile` | Business info |
| Verification | `onboarding/verification` | KYC documents |
| Bank Details | `onboarding/bank` | Payment setup |
| Complete | `onboarding/complete` | Go live |

---

### Analytics Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Sales | `(tabs)/analytics/sales` | Revenue data |
| Customers | `(tabs)/analytics/customers` | Customer insights |
| Products | `(tabs)/analytics/products` | Top items |

---

### Profile Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Settings | `(tabs)/profile/settings` | App settings |
| Business Info | `(tabs)/profile/business` | Business details |
| Help Support | `(tabs)/profile/help` | Contact support |
| Logout | `(tabs)/profile/logout` | Sign out |

---

## DO APP

### Main Navigation

| Screen | Route | Purpose |
|--------|-------|---------|
| Home | `_layout.tsx` | AI-powered assistant |
| Chat | `/chat` | Conversations |
| Orders | `/orders` | Order history |
| Profile | `/profile` | Account |

---

### Chat/Copilot Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Chat Home | `chat/_layout.tsx` | AI conversations |
| Chat Details | `chat/[id]` | Conversation thread |
| New Chat | `chat/new` | Start conversation |

---

### Order Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Orders | `orders/_layout.tsx` | All orders |
| Order Details | `orders/[id]` | View order |
| Track | `orders/track/[id]` | Delivery status |

---

## ADBAZAAR (Creator/Ad Platform)

### Main Navigation

| Screen | Route | Purpose |
|--------|-------|---------|
| Home | `(tabs)/_layout.tsx` | Dashboard tabs |
| Create | `(tabs)/create` | Create ad campaign |
| Analytics | `(tabs)/analytics` | Performance |
| Profile | `(tabs)/profile` | Account |

---

### Auth Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Login | `(auth)/login` | User login |
| Register | `(auth)/register` | Create account |
| Forgot Password | `(auth)/forgot-password` | Reset password |
| Verify 2FA | `(auth)/verify-2fa` | Two-factor auth |

---

### Ad Creation Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Create Ad | `create/_layout.tsx` | Ad wizard |
| Select Type | `create/type` | Choose ad format |
| Target Audience | `create/audience` | Set targeting |
| Set Budget | `create/budget` | Pricing |
| Preview | `create/preview` | Review ad |
| Payment | `create/payment` | Checkout |

---

### Campaign Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Campaigns | `campaigns/_layout.tsx` | All campaigns |
| Campaign Details | `campaigns/[id]` | View stats |
| Edit Campaign | `campaigns/[id]/edit` | Modify settings |
| Pause/Resume | `campaigns/[id]/status` | Control campaign |

---

## VERIFY SERVICE (Product Authentication)

### Verify Stack

| Screen | Route | Purpose |
|--------|-------|---------|
| Verify Home | `verify/_layout.tsx` | Scan page |
| Scan QR | `verify/scan` | Camera scan |
| Enter Serial | `verify/serial` | Manual entry |
| Result | `verify/result` | Authenticity check |
| Karma Earned | `verify/reward` | Rewards screen |

---

## SUMMARY

| App | Total Screens | Status |
|-----|--------------|--------|
| ReZ Consumer | 50+ | Documented |
| ReZ Merchant | 30+ | Documented |
| DO App | 15+ | Documented |
| AdBazaar | 25+ | Documented |
| Verify Service | 10+ | Documented |

---

**Last Updated:** May 10, 2026
