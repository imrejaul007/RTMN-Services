# Phase 3: Commerce Templates
> **Duration:** Weeks 25-32
> **Purpose:** Convert 26 Industry OS into commerce-enabled Nexha templates
> **Depends on:** Phase 1 completion

---

## Overview

**26 Industry OS already exist** at ports 4751-5240. We need to convert them into commerce-enabled Nexha templates.

A template includes:
- CommerceOS module configurations
- BAM workers for the industry
- SUTAR department structures
- RABTUL financial rules
- ACP negotiation flows
- Trust requirements

---

## Template Architecture

```
COMMERCE TEMPLATE
│
├── manifest.yaml                  # Template definition
├── config/
│   ├── commerce.yaml            # CommerceOS config
│   ├── workers.yaml            # BAM workers
│   ├── sutars.yaml             # SUTAR departments
│   ├── rabtul.yaml            # RABTUL rules
│   ├── acp.yaml               # ACP flows
│   └── trust.yaml             # Trust requirements
├── services/                   # Industry-specific services
├── workflows/                  # Automation workflows
└── tests/                      # Template tests
```

---

## Week 25-26: Restaurant Commerce Template (Reference)

### Template Structure

```bash
# Path: companies/HOJAI-AI/platform/commerce-templates/restaurant/

restaurant-template/
├── manifest.yaml
│   name: restaurant-commerce
│   version: 1.0.0
│   industry: restaurant
│   description: Complete restaurant commerce template
│   icon: 🍽️
│   tier: core
│
├── config/
│   ├── commerce.yaml
│   │   modules:
│   │     - catalog        # Menu management
│   │     - inventory     # Ingredient tracking
│   │     - order         # Order management
│   │     - checkout      # Payment processing
│   │     - pricing       # Dynamic pricing
│   │     - promotion    # Offers, combos
│   │     - loyalty      # Rewards, points
│   │     - subscription  # Meal plans
│   │
│   ├── workers.yaml
│   │   workers:
│   │     - chef-worker
│   │     - procurement-worker
│   │     - marketing-worker
│   │     - finance-worker
│   │     - customer-worker
│   │     - delivery-worker
│   │     - inventory-worker
│   │
│   ├── sutars.yaml
│   │   departments:
│   │     - kitchen-department
│   │     - front-office-department
│   │     - procurement-department
│   │     - finance-department
│   │
│   ├── rabtul.yaml
│   │   payments:
│   │     - customer-payments     # UPI, cards, wallets
│   │     - supplier-payments    # Net-15, net-30
│   │   escrow:
│   │     - event-orders        # Large orders
│   │   finance:
│   │     - working-capital     # Inventory financing
│   │
│   ├── acp.yaml
│   │   flows:
│   │     - supplier-negotiation # RFQ → Quote → Contract
│   │     - customer-order      # Order → Payment → Delivery
│   │     - delivery-tracking  # Pickup → Transit → Delivered
│   │
│   └── trust.yaml
│       requirements:
│         - fssai-license
│         - gst-registration
│         - food-safety-cert
│         - bank-account
```

### Industry-Specific Commerce Flows

```yaml
# config/commerce-flows.yaml

flows:
  order_to_delivery:
    name: Order to Delivery
    steps:
      - step: order_received
        service: order-engine
        action: create_order
      - step: kitchen_prep
        service: chef-worker
        action: assign_kitchen
      - step: ingredient_check
        service: inventory-worker
        action: check_stock
      - step: procurement_if_needed
        service: procurement-worker
        action: auto_order
        condition: stock_below_threshold
      - step: prep_complete
        service: chef-worker
        action: mark_ready
      - step: delivery_assigned
        service: delivery-worker
        action: assign_driver
      - step: delivered
        service: delivery-worker
        action: confirm_delivery
        triggers:
          - payment_release
          - review_request

  supplier_negotiation:
    name: Supplier Negotiation
    steps:
      - step: inventory_alert
        service: inventory-worker
        action: trigger_reorder
      - step: supplier_discovery
        service: discovery
        action: find_suppliers
        filters:
          - fssai_certified
          - minimum_aci: 700
      - step: rfq_sent
        service: acp
        action: send_query
      - step: quotes_received
        service: acp
        action: collect_quotes
      - step: negotiation
        service: negotiation-worker
        action: counter_offer
        if: multiple_quotes
      - step: contract_signed
        service: contract
        action: create_contract
      - step: order_placed
        service: order
        action: create_po
```

### SUTAR Department Configuration

```yaml
# config/sutars.yaml

departments:
  kitchen_department:
    name: Kitchen
    lead: chef-worker
    agents:
      - chef-worker
      - prep-worker
      - quality-worker
    metrics:
      - prep_time
      - waste_percentage
      - quality_score
    workflows:
      - order_to_prep
      - inventory_alerts

  front_office_department:
    name: Front Office
    lead: customer-worker
    agents:
      - customer-worker
      - order-worker
      - complaint-worker
    metrics:
      - order_value
      - customer_satisfaction
      - resolution_time
    workflows:
      - order_management
      - customer_support

  procurement_department:
    name: Procurement
    lead: procurement-worker
    agents:
      - procurement-worker
      - supplier-relation-worker
      - quality-check-worker
    metrics:
      - cost_savings
      - supplier_reliability
      - inventory_turnover
    workflows:
      - supplier_negotiation
      - auto_reorder

  finance_department:
    name: Finance
    lead: finance-worker
    agents:
      - finance-worker
      - payment-worker
      - reporting-worker
    metrics:
      - profit_margin
      - cash_flow
      - payment_timing
    workflows:
      - supplier_payments
      - customer_refunds
```

---

## Week 27-28: Hotel + Healthcare Templates

### Hotel Commerce Template

```bash
hotel-template/
├── manifest.yaml
│   name: hotel-commerce
│   industry: hospitality
│   description: Complete hotel commerce template
│
├── config/
│   ├── commerce.yaml
│   │   modules:
│   │     - catalog        # Rooms, packages
│   │     - inventory     # Room availability
│   │     - order         # Reservations
│   │     - checkout      # Guest payments
│   │     - pricing       # Dynamic rates
│   │     - promotion    # Packages
│   │     - loyalty      # Loyalty program
│   │     - subscription  # Membership plans
│   │
│   ├── workers.yaml
│   │   workers:
│   │     - booking-worker
│   │     - revenue-worker
│   │     - housekeeping-worker
│   │     - concierge-worker
│   │     - f&b-worker
│   │     - event-worker
│   │     - maintenance-worker
│   │
│   ├── sutars.yaml
│   │   departments:
│   │     - front-office-department
│   │     - housekeeping-department
│   │     - revenue-department
│   │     - f&b-department
│   │
│   └── acp.yaml
│       flows:
│         - booking_to_checkout
│         - event_inquiry_to_contract
│         - restaurant_reservation
```

### Healthcare Commerce Template

```bash
healthcare-template/
├── manifest.yaml
│   name: healthcare-commerce
│   industry: healthcare
│   description: Complete healthcare commerce template
│
├── config/
│   ├── commerce.yaml
│   │   modules:
│   │     - catalog        # Services, procedures
│   │     - inventory     # Medicine stock
│   │     - order         # Appointments, bookings
│   │     - checkout      # Billing
│   │     - pricing       # Insurance rates
│   │     - subscription  # Health plans
│   │
│   ├── workers.yaml
│   │   workers:
│   │     - doctor-worker
│   │     - pharmacy-worker
│   │     - insurance-worker
│   │     - lab-worker
│   │     - scheduling-worker
│   │     - billing-worker
│   │
│   ├── sutars.yaml
│   │   departments:
│   │     - clinical-department
│   │     - pharmacy-department
│   │     - billing-department
│   │     - insurance-department
│   │
│   └── trust.yaml
│       requirements:
│         - medical-license
│         - nabac-accreditation
│         - pharmacy-license
│         - insurance-empanelment
```

---

## Week 29-30: Retail + Fashion + Automotive

### Retail Commerce Template

```bash
retail-template/
├── manifest.yaml
├── config/
│   ├── commerce.yaml
│   │   modules:
│   │     - catalog        # Products, SKUs
│   │     - inventory     # Multi-location stock
│   │     - order         # POS, online
│   │     - checkout      # Multi-channel
│   │     - pricing       # MSRP, discounts
│   │     - promotion    # BOGO, bundles
│   │     - loyalty      # Points, tiers
│   │     - subscription  # Subscribe & save
│   │
│   ├── workers.yaml
│   │   workers:
│   │     - inventory-worker
│   │     - pricing-worker
│   │     - merchandising-worker
│   │     - customer-worker
│   │     - loss-prevention-worker
│   │     - replenishment-worker
│   │
│   └── sutars.yaml
│       departments:
│         - merchandising-department
│         - operations-department
│         - customer-service-department
│         - loss-prevention-department
```

### Fashion Commerce Template

```bash
fashion-template/
├── manifest.yaml
├── config/
│   ├── commerce.yaml
│   │   modules:
│   │     - catalog        # Styles, variants, sizes
│   │     - inventory     # Size/color matrix
│   │     - order         # Orders, returns
│   │     - checkout      # Payments
│   │     - pricing       # Seasonal, trend-based
│   │     - promotion    # Launch, clearance
│   │     - loyalty      # Style rewards
│   │
│   ├── workers.yaml
│   │   workers:
│   │     - designer-worker
│   │     - production-worker
│   │     - inventory-worker
│   │     - marketing-worker
│   │     - wholesale-worker
│   │     - trend-worker
│   │
│   └── acp.yaml
│       flows:
│         - design_to_production
│         - wholesale_order
│         - d2c_sale
```

### Automotive Commerce Template

```bash
automotive-template/
├── manifest.yaml
├── config/
│   ├── commerce.yaml
│   │   modules:
│   │     - catalog        # Vehicles, parts
│   │     - inventory     # Stock, availability
│   │     - order         # Sales, bookings
│   │     - checkout      # Financing
│   │     - pricing       # Market-based
│   │     - subscription  # Leasing
│   │
│   ├── workers.yaml
│   │   workers:
│   │     - sales-worker
│   │     - service-worker
│   │     - parts-worker
│   │     - finance-worker
│   │     - crm-worker
│   │     - warranty-worker
│   │
│   └── acp.yaml
│       flows:
│         - vehicle_sale
│         - service_booking
│         - parts_order
```

---

## Week 31-32: Remaining 21 Templates + Vendor Pools

### Template List

| # | Template | Industry | Port | Status |
|---|----------|----------|------|--------|
| 1 | restaurant | Restaurant | 5010 | ⏳ |
| 2 | hotel | Hotel | 5025 | ⏳ |
| 3 | healthcare | Healthcare | 5020 | ⏳ |
| 4 | events | Events | 4751 | ⏳ |
| 5 | exhibitions | Exhibitions | 5040 | ⏳ |
| 6 | retail | Retail | 5030 | ⏳ |
| 7 | legal | Legal | 5035 | ⏳ |
| 8 | education | Education | 5060 | ⏳ |
| 9 | agriculture | Agriculture | 5070 | ⏳ |
| 10 | automotive | Automotive | 5080 | ⏳ |
| 11 | beauty | Beauty | 5090 | ⏳ |
| 12 | fashion | Fashion | 5095 | ⏳ |
| 13 | fitness | Fitness | 5110 | ⏳ |
| 14 | gaming | Gaming | 5120 | ⏳ |
| 15 | government | Government | 5130 | ⏳ |
| 16 | home-services | Home Services | 5140 | ⏳ |
| 17 | manufacturing | Manufacturing | 5150 | ⏳ |
| 18 | non-profit | Non-Profit | 5160 | ⏳ |
| 19 | professional | Professional | 5170 | ⏳ |
| 20 | sports | Sports | 5180 | ⏳ |
| 21 | travel | Travel | 5190 | ⏳ |
| 22 | entertainment | Entertainment | 5200 | ⏳ |
| 23 | construction | Construction | 5210 | ⏳ |
| 24 | financial | Financial | 5220 | ⏳ |
| 25 | real-estate | Real Estate | 5230 | ⏳ |
| 26 | transport | Transport | 5240 | ⏳ |

### Vendor Liquidity Pools

```bash
# Path: companies/HOJAI-AI/platform/vendor-pools/

vendor-pools/
├── pools/
│   ├── electronics-pool/
│   │   ├── manifest.yaml
│   │   │   name: electronics-vendors
│   │   │   count: 500
│   │   │   verified: true
│   │   │   categories:
│   │   │     - smartphones
│   │   │     - laptops
│   │   │     - accessories
│   │   │
│   │   └── vendors/
│   │       ├── vendor-001.yaml
│   │       ├── vendor-002.yaml
│   │       └── ...
│   │
│   ├── fashion-pool/
│   ├── food-pool/
│   ├── healthcare-pool/
│   ├── hospitality-pool/
│   ├── automotive-pool/
│   └── general-merchandise-pool/
│
└── pool-registry.yaml
    pools:
      - id: electronics-pool
        count: 500
        filters:
          - verified: true
          - minimum_aci: 700
      - id: fashion-pool
        count: 300
      - id: food-pool
        count: 200
```

---

## Template Builder Service

```javascript
// services/template-builder/src/index.js

class TemplateBuilder {
  // Create template from Industry OS
  async createTemplate(industryOsId) {
    const industryOs = await this.getIndustryOS(industryOsId);
    
    const template = {
      manifest: {
        name: `${industryOs.industry}-commerce`,
        industry: industryOs.industry,
        version: '1.0.0',
        source: industryOs.id
      },
      config: {
        commerce: this.generateCommerceConfig(industryOs),
        workers: this.generateWorkerConfig(industryOs),
        sutars: this.generateSutarConfig(industryOs),
        rabtul: this.generateRabtulConfig(industryOs),
        acp: this.generateACPConfig(industryOs),
        trust: this.generateTrustConfig(industryOs)
      }
    };
    
    return template;
  }
  
  // Generate commerce config from Industry OS
  generateCommerceConfig(industryOs) {
    const modules = [];
    
    // Always needed
    modules.push('catalog', 'order', 'checkout', 'pricing');
    
    // Based on industry type
    if (industryOs.hasInventory) modules.push('inventory');
    if (industryOs.hasLoyalty) modules.push('loyalty');
    if (industryOs.hasSubscriptions) modules.push('subscription');
    if (industryOs.hasPromotions) modules.push('promotion');
    
    return { modules };
  }
  
  // Generate worker config
  generateWorkerConfig(industryOs) {
    return {
      workers: industryOs.workers.map(w => ({
        id: w.id,
        skills: w.skills,
        capabilities: w.capabilities
      }))
    };
  }
  
  // Generate SUTAR config
  generateSutarConfig(industryOs) {
    return {
      departments: industryOs.departments.map(d => ({
        id: d.id,
        lead: d.leadWorker,
        members: d.workerIds,
        workflows: d.workflows
      }))
    };
  }
  
  // Deploy template
  async deployTemplate(templateId, businessConfig) {
    const template = await this.getTemplate(templateId);
    
    // Compile commerce OS
    const commerceOs = await this.compileCommerceOS(template.config.commerce);
    
    // Compile workers
    const workers = await this.compileWorkers(template.config.workers);
    
    // Compile SUTAR
    const sutars = await this.compileSutars(template.config.sutars);
    
    // Create company
    const company = await companyFactory.create({
      template: templateId,
      config: businessConfig
    });
    
    // Deploy to company
    await deploymentService.deploy({
      companyId: company.id,
      commerceOs,
      workers,
      sutars,
      rabtul: template.config.rabutl
    });
    
    return company;
  }
}
```

---

## API Reference

### Template Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/templates` | GET | List all templates |
| `/templates/:id` | GET | Get template details |
| `/templates/:id/config` | GET | Get template config |
| `/templates/:id/preview` | POST | Preview template |
| `/templates/:id/deploy` | POST | Deploy template |

### Vendor Pool Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/pools` | GET | List all pools |
| `/pools/:id` | GET | Get pool details |
| `/pools/:id/vendors` | GET | Get vendors in pool |
| `/pools/import` | POST | Import vendors into pool |

---

## Testing

```bash
# List templates
curl http://localhost:4399/api/templates

# Get restaurant template
curl http://localhost:4399/api/templates/restaurant

# Preview restaurant template
curl -X POST http://localhost:4399/api/templates/restaurant/preview \
  -d '{"businessName": "Spice Garden"}'

# Deploy restaurant template
curl -X POST http://localhost:4399/api/templates/restaurant/deploy \
  -d '{"businessName": "Spice Garden", "location": "Bangalore"}'

# List vendor pools
curl http://localhost:4399/api/pools

# Get vendors in pool
curl http://localhost:4399/api/pools/electronics-pool/vendors
```

---

## Deliverables

| Deliverable | Week | Status |
|------------|------|--------|
| Restaurant Template | 26 | ⏳ |
| Hotel Template | 28 | ⏳ |
| Healthcare Template | 28 | ⏳ |
| Retail Template | 30 | ⏳ |
| Fashion Template | 30 | ⏳ |
| Automotive Template | 30 | ⏳ |
| 21 More Templates | 32 | ⏳ |
| Vendor Liquidity Pools | 32 | ⏳ |
| Template Builder Service | 32 | ⏳ |

---

*Phase 3 Status: Ready to start after Phase 1*
*Estimated Completion: Week 32*
