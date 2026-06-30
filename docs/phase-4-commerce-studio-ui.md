# Phase 4: Commerce Studio UI
> **Duration:** Weeks 33-38
> **Purpose:** Build the wizard that lets anyone create a commerce Nexha
> **Depends on:** Phase 1, 2, 3 completion

---

## Overview

Commerce Studio UI is the no-code/low-code interface for creating commerce-enabled Nexhas.

Currently:
- No Commerce Studio UI exists
- No wizard for creating businesses
- No deployment pipeline

**Goal:** Build a complete Studio UI with 6-step wizard and dashboard.

---

## Studio Architecture

```
COMMERCE STUDIO
│
├── Landing Page
│   ├── Hero section
│   ├── Features
│   ├── Pricing
│   └── CTA
│
├── Template Marketplace
│   ├── Browse by industry
│   ├── Filter by features
│   ├── Preview templates
│   └── Select template
│
├── Commerce Builder Wizard
│   ├── Step 1: Template Selection
│   ├── Step 2: Commerce Configuration
│   ├── Step 3: Workers Selection
│   ├── Step 4: Trust Setup
│   ├── Step 5: Finance Setup
│   └── Step 6: Review & Deploy
│
├── Dashboard
│   ├── Commerce Overview
│   ├── Orders
│   ├── Inventory
│   ├── Workers
│   ├── Analytics
│   └── Settings
│
└── Settings
    ├── Profile
    ├── Team
    ├── Integrations
    └── Billing
```

---

## Directory Structure

```bash
companies/HOJAI-AI/products/commerce-studio/
│
├── studio-gateway/                 # Backend API
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   ├── templates.js
│   │   │   ├── builder.js
│   │   │   ├── deployment.js
│   │   │   └── dashboard.js
│   │   └── services/
│   │       ├── template-service.js
│   │       ├── builder-service.js
│   │       └── deployment-service.js
│   └── tests/
│
├── web/                            # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Landing
│   │   │   ├── templates/
│   │   │   │   ├── page.tsx      # Template marketplace
│   │   │   │   └── [id]/page.tsx # Template preview
│   │   │   ├── builder/
│   │   │   │   ├── page.tsx      # Wizard container
│   │   │   │   ├── step-1/page.tsx
│   │   │   │   ├── step-2/page.tsx
│   │   │   │   ├── step-3/page.tsx
│   │   │   │   ├── step-4/page.tsx
│   │   │   │   ├── step-5/page.tsx
│   │   │   │   └── step-6/page.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── orders/page.tsx
│   │   │   │   ├── inventory/page.tsx
│   │   │   │   ├── workers/page.tsx
│   │   │   │   └── analytics/page.tsx
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── templates/
│   │   │   ├── builder/
│   │   │   └── dashboard/
│   │   └── lib/
│   │       ├── api.ts
│   │       └── utils.ts
│   ├── package.json
│   └── next.config.js
│
└── mobile/                         # React Native (optional)
    └── ...
```

---

## Week 33-34: Studio Core + Template Marketplace

### Landing Page

```tsx
// web/src/app/page.tsx

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero">
        <h1>Create Your Commerce Nexha</h1>
        <p>The AI-powered platform to build and scale your commerce business</p>
        
        <div className="cta">
          <Link href="/templates">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/demo">
            <Button variant="outline" size="lg">Watch Demo</Button>
          </Link>
        </div>
        
        <div className="stats">
          <div className="stat">
            <span className="number">26+</span>
            <span className="label">Industry Templates</span>
          </div>
          <div className="stat">
            <span className="number">500+</span>
            <span className="label">Commerce Workers</span>
          </div>
          <div className="stat">
            <span className="number">7 days</span>
            <span className="label">Time to Launch</span>
          </div>
        </div>
      </section>
      
      {/* Features */}
      <section className="features">
        <FeatureCard
          icon={<CommerceIcon />}
          title="CommerceOS"
          description="Complete commerce primitives built in"
        />
        <FeatureCard
          icon={<WorkersIcon />}
          title="AI Workers"
          description="BAM workers for every commerce function"
        />
        <FeatureCard
          icon={<SutarIcon />}
          title="AI Departments"
          description="SUTAR-organized workforce"
        />
        <FeatureCard
          icon={<TrustIcon />}
          title="Trust & Compliance"
          description="Built-in KYC and trust scoring"
        />
        <FeatureCard
          icon={<FinanceIcon />}
          title="Financial Infrastructure"
          description="Payments, escrow, trade finance"
        />
        <FeatureCard
          icon={<NetworkIcon />}
          title="Global Network"
          description="Connect to Global Nexha federation"
        />
      </section>
      
      {/* Pricing */}
      <section className="pricing">
        <PricingCard
          name="Starter"
          price="₹999"
          features={['1 Industry Template', '5 Workers', 'Basic Support']}
        />
        <PricingCard
          name="Growth"
          price="₹4,999"
          features={['3 Industry Templates', '20 Workers', 'Priority Support']}
          popular
        />
        <PricingCard
          name="Enterprise"
          price="Custom"
          features={['Unlimited Templates', 'Unlimited Workers', 'Dedicated Support']}
        />
      </section>
    </div>
  );
}
```

### Template Marketplace

```tsx
// web/src/app/templates/page.tsx

export default function TemplateMarketplace() {
  const [filter, setFilter] = useState<IndustryFilter>('all');
  const [sort, setSort] = useState<SortOption>('popular');
  
  const { data: templates } = useQuery({
    queryKey: ['templates', filter, sort],
    queryFn: () => api.getTemplates({ filter, sort })
  });
  
  return (
    <div className="marketplace">
      <header>
        <h1>Choose Your Template</h1>
        <SearchBar placeholder="Search templates..." />
      </header>
      
      <Filters>
        <FilterButton 
          active={filter === 'all'} 
          onClick={() => setFilter('all')}
        >
          All
        </FilterButton>
        <FilterButton 
          active={filter === 'restaurant'} 
          onClick={() => setFilter('restaurant')}
        >
          Restaurant
        </FilterButton>
        <FilterButton 
          active={filter === 'retail'} 
          onClick={() => setFilter('retail')}
        >
          Retail
        </FilterButton>
        {/* ... more filters */}
      </Filters>
      
      <div className="template-grid">
        {templates?.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => router.push(`/templates/${template.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
```

### Template Preview

```tsx
// web/src/app/templates/[id]/page.tsx

export default function TemplatePreview({ params }: { params: { id: string } }) {
  const { data: template } = useQuery({
    queryKey: ['template', params.id],
    queryFn: () => api.getTemplate(params.id)
  });
  
  return (
    <div className="preview">
      <header>
        <BackButton href="/templates" />
        <h1>{template.name}</h1>
        <Badge>{template.industry}</Badge>
      </header>
      
      <div className="preview-content">
        {/* Preview Image */}
        <div className="preview-image">
          <Image src={template.previewImage} alt={template.name} />
        </div>
        
        {/* Features */}
        <div className="preview-features">
          <h2>What's Included</h2>
          <FeatureList features={template.features} />
        </div>
        
        {/* Workers */}
        <div className="preview-workers">
          <h2>AI Workers</h2>
          <WorkerList workers={template.workers} />
        </div>
        
        {/* Pricing */}
        <div className="preview-pricing">
          <h2>Pricing</h2>
          <PricingTable plans={template.plans} />
        </div>
      </div>
      
      <footer>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
        <Link href={`/builder?template=${template.id}`}>
          <Button>Use This Template</Button>
        </Link>
      </footer>
    </div>
  );
}
```

---

## Week 35-36: Commerce Builder Wizard

### Wizard Container

```tsx
// web/src/app/builder/page.tsx

export default function BuilderPage() {
  const { templateId } = useSearchParams();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<BuilderConfig>({
    templateId,
    commerce: {},
    workers: [],
    trust: {},
    finance: {},
    billing: {}
  });
  
  const nextStep = () => setStep(s => Math.min(s + 1, 6));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));
  
  const updateConfig = (updates: Partial<BuilderConfig>) => {
    setConfig(c => ({ ...c, ...updates }));
  };
  
  return (
    <div className="builder">
      <BuilderProgress currentStep={step} />
      
      <main className="builder-content">
        {step === 1 && <Step1Template config={config} onUpdate={updateConfig} />}
        {step === 2 && <Step2Commerce config={config} onUpdate={updateConfig} />}
        {step === 3 && <Step3Workers config={config} onUpdate={updateConfig} />}
        {step === 4 && <Step4Trust config={config} onUpdate={updateConfig} />}
        {step === 5 && <Step5Finance config={config} onUpdate={updateConfig} />}
        {step === 6 && <Step6Review config={config} />}
      </main>
      
      <BuilderNavigation 
        step={step} 
        onNext={nextStep} 
        onPrev={prevStep} 
      />
    </div>
  );
}
```

### Step 1: Template Selection

```tsx
// web/src/app/builder/step-1/page.tsx

export default function Step1Template({ config, onUpdate }: Props) {
  const { data: templates } = useQuery(['templates'], () => api.getTemplates());
  
  return (
    <div className="step step-1">
      <h2>Select Template</h2>
      <p>Choose an industry template to start with</p>
      
      <div className="template-grid">
        {templates?.map(template => (
          <TemplateSelectionCard
            key={template.id}
            template={template}
            selected={config.templateId === template.id}
            onClick={() => onUpdate({ templateId: template.id })}
          />
        ))}
      </div>
    </div>
  );
}
```

### Step 2: Commerce Configuration

```tsx
// web/src/app/builder/step-2/page.tsx

export default function Step2Commerce({ config, onUpdate }: Props) {
  const commerceModules = [
    { id: 'catalog', name: 'Catalog', description: 'Product management' },
    { id: 'inventory', name: 'Inventory', description: 'Stock management' },
    { id: 'order', name: 'Order', description: 'Order processing' },
    { id: 'checkout', name: 'Checkout', description: 'Payment processing' },
    { id: 'pricing', name: 'Pricing', description: 'Dynamic pricing' },
    { id: 'promotion', name: 'Promotions', description: 'Discounts & offers' },
    { id: 'loyalty', name: 'Loyalty', description: 'Rewards & points' },
    { id: 'subscription', name: 'Subscription', description: 'Recurring billing' }
  ];
  
  const selectedModules = config.commerce?.modules || [];
  
  return (
    <div className="step step-2">
      <h2>Configure Commerce</h2>
      <p>Select the commerce modules you need</p>
      
      <div className="module-grid">
        {commerceModules.map(module => (
          <ModuleCard
            key={module.id}
            module={module}
            selected={selectedModules.includes(module.id)}
            onClick={() => {
              const modules = selectedModules.includes(module.id)
                ? selectedModules.filter(m => m !== module.id)
                : [...selectedModules, module.id];
              onUpdate({ commerce: { ...config.commerce, modules } });
            }}
          />
        ))}
      </div>
      
      {/* Pricing Configuration */}
      <div className="config-section">
        <h3>Pricing Strategy</h3>
        <Select
          value={config.commerce?.pricingStrategy}
          onValueChange={v => onUpdate({ 
            commerce: { ...config.commerce, pricingStrategy: v } 
          })}
        >
          <SelectItem value="fixed">Fixed Pricing</SelectItem>
          <SelectItem value="dynamic">Dynamic Pricing</SelectItem>
          <SelectItem value="competitive">Competitive Pricing</SelectItem>
        </Select>
      </div>
    </div>
  );
}
```

### Step 3: Workers Selection

```tsx
// web/src/app/builder/step-3/page.tsx

export default function Step3Workers({ config, onUpdate }: Props) {
  const { data: workers } = useQuery({
    queryKey: ['workers', config.templateId],
    queryFn: () => api.getWorkersForTemplate(config.templateId)
  });
  
  const selectedWorkers = config.workers || [];
  
  const totalCost = selectedWorkers.reduce((sum, w) => sum + w.price, 0);
  
  return (
    <div className="step step-3">
      <h2>Select AI Workers</h2>
      <p>Choose the AI workers to power your commerce</p>
      
      <div className="worker-grid">
        {workers?.map(worker => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            selected={selectedWorkers.some(w => w.id === worker.id)}
            onClick={() => {
              const updated = selectedWorkers.some(w => w.id === worker.id)
                ? selectedWorkers.filter(w => w.id !== worker.id)
                : [...selectedWorkers, worker];
              onUpdate({ workers: updated });
            }}
          />
        ))}
      </div>
      
      <div className="worker-summary">
        <span>Selected: {selectedWorkers.length} workers</span>
        <span>Monthly Cost: ₹{totalCost}</span>
      </div>
    </div>
  );
}
```

### Step 4: Trust Setup

```tsx
// web/src/app/builder/step-4/page.tsx

export default function Step4Trust({ config, onUpdate }: Props) {
  return (
    <div className="step step-4">
      <h2>Set Up Trust</h2>
      <p>Verify your business and enable trust features</p>
      
      <div className="trust-items">
        <TrustItem
          icon={<BusinessIcon />}
          title="Business Verification"
          description="Upload business documents"
          status={config.trust?.businessVerified ? 'complete' : 'pending'}
          onClick={() => {/* Upload flow */}}
        />
        
        <TrustItem
          icon={<PaymentIcon />}
          title="Payment Verification"
          description="Connect bank account"
          status={config.trust?.paymentVerified ? 'complete' : 'pending'}
          onClick={() => {/* Bank connection */}}
        />
        
        <TrustItem
          icon={<LicenseIcon />}
          title="Licenses & Certifications"
          description="Upload required documents"
          status={config.trust?.licensesVerified ? 'complete' : 'pending'}
          onClick={() => {/* License upload */}}
        />
      </div>
    </div>
  );
}
```

### Step 5: Finance Setup

```tsx
// web/src/app/builder/step-5/page.tsx

export default function Step5Finance({ config, onUpdate }: Props) {
  return (
    <div className="step step-5">
      <h2>Set Up Finance</h2>
      <p>Configure payment and settlement settings</p>
      
      <div className="finance-config">
        <FormField label="Payment Methods">
          <CheckboxGroup
            options={[
              { value: 'upi', label: 'UPI' },
              { value: 'cards', label: 'Cards' },
              { value: 'wallets', label: 'Wallets' },
              { value: 'netbanking', label: 'Net Banking' }
            ]}
            value={config.finance?.paymentMethods || []}
            onChange={v => onUpdate({ finance: { ...config.finance, paymentMethods: v } })}
          />
        </FormField>
        
        <FormField label="Settlement Terms">
          <Select
            value={config.finance?.settlementTerms}
            onValueChange={v => onUpdate({ finance: { ...config.finance, settlementTerms: v } })}
          >
            <SelectItem value="instant">Instant Settlement</SelectItem>
            <SelectItem value="daily">Daily Settlement</SelectItem>
            <SelectItem value="weekly">Weekly Settlement</SelectItem>
          </Select>
        </FormField>
        
        <FormField label="Enable Trade Finance">
          <Checkbox
            checked={config.finance?.enableTradeFinance}
            onCheckedChange={v => onUpdate({ finance: { ...config.finance, enableTradeFinance: v } })}
          />
          <span>Enable BNPL and working capital for your business</span>
        </FormField>
      </div>
    </div>
  );
}
```

### Step 6: Review & Deploy

```tsx
// web/src/app/builder/step-6/page.tsx

export default function Step6Review({ config }: Props) {
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  
  const deploy = async () => {
    setDeploying(true);
    try {
      const result = await api.deploy(config);
      setDeployed(true);
    } catch (error) {
      // Handle error
    } finally {
      setDeploying(false);
    }
  };
  
  if (deployed) {
    return (
      <div className="step step-6 success">
        <SuccessIcon />
        <h2>Your Commerce Nexha is Ready!</h2>
        <p>Your business has been deployed to Global Nexha.</p>
        <Button href="/dashboard">Go to Dashboard</Button>
      </div>
    );
  }
  
  return (
    <div className="step step-6">
      <h2>Review & Deploy</h2>
      <p>Review your configuration and deploy your commerce Nexha</p>
      
      <div className="review-summary">
        <SummarySection title="Template">
          <span>{config.templateId}</span>
        </SummarySection>
        
        <SummarySection title="Commerce Modules">
          <span>{config.commerce?.modules?.join(', ')}</span>
        </SummarySection>
        
        <SummarySection title="AI Workers">
          <span>{config.workers?.length} workers selected</span>
        </SummarySection>
        
        <SummarySection title="Monthly Cost">
          <span>₹{calculateMonthlyCost(config)}</span>
        </SummarySection>
      </div>
      
      <Button 
        size="lg" 
        onClick={deploy}
        disabled={deploying}
      >
        {deploying ? 'Deploying...' : 'Deploy Now'}
      </Button>
    </div>
  );
}
```

---

## Week 37-38: Dashboard + Deployment

### Dashboard

```tsx
// web/src/app/dashboard/page.tsx

export default function Dashboard() {
  const { data: stats } = useQuery(['dashboard-stats'], () => api.getStats());
  
  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        <Button>View Settings</Button>
      </header>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard
          title="Orders"
          value={stats.orders}
          change={stats.ordersChange}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats.revenue)}
          change={stats.revenueChange}
        />
        <StatCard
          title="Customers"
          value={stats.customers}
          change={stats.customersChange}
        />
        <StatCard
          title="Workers Active"
          value={stats.activeWorkers}
        />
      </div>
      
      {/* Charts */}
      <div className="charts-grid">
        <RevenueChart data={stats.revenueChart} />
        <OrdersChart data={stats.ordersChart} />
        <TopProducts data={stats.topProducts} />
      </div>
      
      {/* Recent Orders */}
      <RecentOrders orders={stats.recentOrders} />
    </div>
  );
}
```

### Deployment Pipeline

```javascript
// studio-gateway/src/services/deployment-service.js

class DeploymentService {
  async deploy(config) {
    // Step 1: Create company
    const company = await companyFactory.create({
      name: config.businessName,
      template: config.templateId
    });
    
    // Step 2: Deploy CommerceOS
    await this.deployCommerceOS({
      companyId: company.id,
      modules: config.commerce.modules
    });
    
    // Step 3: Deploy Workers
    await this.deployWorkers({
      companyId: company.id,
      workers: config.workers
    });
    
    // Step 4: Deploy SUTAR Departments
    await this.deploySutars({
      companyId: company.id,
      departments: config.template.departments
    });
    
    // Step 5: Configure Trust
    await this.configureTrust({
      companyId: company.id,
      trust: config.trust
    });
    
    // Step 6: Configure Finance
    await this.configureFinance({
      companyId: company.id,
      finance: config.finance
    });
    
    // Step 7: Register with DiscoveryOS
    await this.registerWithNexha({
      companyId: company.id,
      capabilities: config.commerce.modules
    });
    
    return {
      companyId: company.id,
      status: 'deployed',
      dashboardUrl: `/dashboard/${company.id}`
    };
  }
}
```

---

## API Reference

### Template Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/studio/templates` | GET | List templates |
| `GET /api/studio/templates/:id` | GET | Get template details |
| `GET /api/studio/templates/:id/workers` | GET | Get available workers |

### Builder Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/studio/builder/validate` | POST | Validate config |
| `POST /api/studio/builder/preview` | POST | Preview pricing |

### Deployment Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/studio/deploy` | POST | Deploy commerce Nexha |
| `GET /api/studio/deploy/:id/status` | GET | Check deployment status |

---

## Testing

```bash
# List templates
curl http://localhost:3001/api/studio/templates

# Get template
curl http://localhost:3001/api/studio/templates/restaurant

# Get workers for template
curl http://localhost:3001/api/studio/templates/restaurant/workers

# Validate config
curl -X POST http://localhost:3001/api/studio/builder/validate \
  -d '{"templateId": "restaurant", "commerce": {"modules": ["catalog", "order"]}}'

# Deploy
curl -X POST http://localhost:3001/api/studio/deploy \
  -d '{"businessName": "Spice Garden", "templateId": "restaurant"}'
```

---

## Deliverables

| Deliverable | Week | Status |
|------------|------|--------|
| Landing Page | 34 | ⏳ |
| Template Marketplace | 34 | ⏳ |
| Commerce Builder Wizard | 36 | ⏳ |
| Dashboard | 36 | ⏳ |
| Deployment Pipeline | 38 | ⏳ |

---

*Phase 4 Status: Ready to start after Phase 1, 2, 3*
*Estimated Completion: Week 38*
