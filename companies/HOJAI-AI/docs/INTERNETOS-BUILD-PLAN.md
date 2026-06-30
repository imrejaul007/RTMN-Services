# InternetOS Build Plan — Missing Components

**Status:** 🔴 85% Missing
**Built:** 15% (7 actors, basic watcher runtime, actor framework)
**Target:** 100% over 12 months

---

## PHASE 0: Fix Current Gaps (Week 1-4)

Before building new things, make existing things production-ready.

### P0.1: InternetOS API Server

**Path:** `platform/internet-os/api-server/`
**Port:** 4595
**Purpose:** HTTP endpoints for all actor/watcher operations

```typescript
// Endpoints needed
GET    /api/actors                    // List all actors
GET    /api/actors/:id                // Get actor details
POST   /api/actors/:id/run            // Execute actor
POST   /api/actors/batch              // Batch execution
GET    /api/watchers                  // List all watchers
POST   /api/watchers                  // Create watcher
GET    /api/watchers/:id/changes      // Get changes
DELETE /api/watchers/:id              // Delete watcher
POST   /api/watchers/:id/pause        // Pause watcher
POST   /api/watchers/:id/resume       // Resume watcher
GET    /api/history/:entity           // Historical data
POST   /api/webhooks                  // Register webhook
```

### P0.2: MongoDB Storage Layer

**Path:** `platform/internet-os/storage/`
**Purpose:** Persist actor runs, watcher changes, historical data

```typescript
// Collections needed
actors: {
  id: string,
  name: string,
  version: string,
  config: object,
  created_at: Date,
  updated_at: Date
}

actor_runs: {
  id: string,
  actor_id: string,
  input: object,
  output: object,
  status: 'success' | 'failed' | 'running',
  duration_ms: number,
  created_at: Date
}

watchers: {
  id: string,
  type: 'price' | 'review' | 'competitor' | 'job' | 'news' | 'custom',
  config: object,
  last_run: Date,
  status: 'active' | 'paused',
  created_at: Date
}

watcher_changes: {
  id: string,
  watcher_id: string,
  change_type: 'added' | 'removed' | 'modified',
  old_value: object,
  new_value: object,
  detected_at: Date
}

historical_data: {
  entity_id: string,
  entity_type: string,
  snapshot: object,
  timestamp: Date
}
```

### P0.3: Webhook Notifications

**Path:** `platform/internet-os/webhooks/`
**Purpose:** Real-time alerts when watchers detect changes

```typescript
// Webhook event types
'watcher.change'      // Any change detected
'watcher.added'       // New item found
'watcher.removed'     // Item removed
'watcher.modified'    // Item changed
'actor.completed'     // Actor run finished
'actor.failed'        // Actor run failed

// Webhook payload
{
  event: string,
  timestamp: Date,
  data: {
    watcher_id: string,
    change?: WatcherChange,
    actor_run?: ActorRun
  }
}
```

### P0.4: Actor Tests

**Add vitest tests for:**
- [ ] `actors/google-maps-actor/__tests__/`
- [ ] `actors/zomato-actor/__tests__/`
- [ ] `actors/airbnb-actor/__tests__/`
- [ ] `actors/linkedin-actor/__tests__/`
- [ ] `actors/news-actor/__tests__/`
- [ ] `actors/company-intel-actor/__tests__/`
- [ ] `actors/justdial-actor/__tests__/`

---

## PHASE 1: Actor Expansion (Week 5-12)

### 1.1 Priority Actors (10)

| Actor | Priority | Category | Purpose |
|-------|----------|----------|---------|
| **Shopify** | P0 | Commerce | Store products, orders, customers |
| **Amazon** | P0 | Commerce | Product listings, pricing, reviews |
| **Twitter/X** | P0 | Social | Social monitoring, sentiment |
| **Reddit** | P0 | Social | Community trends, discussions |
| **Glassdoor** | P0 | Intelligence | Company reviews, salaries |
| **Instagram** | P1 | Social | Influencers, engagement, trends |
| **YouTube** | P1 | Media | Videos, comments, channels |
| **Crunchbase** | P1 | Intelligence | Funding, acquisitions, startups |
| **GitHub** | P1 | Intelligence | Open source activity, developers |
| **Google Trends** | P1 | Intelligence | Search trends, topics |

### 1.2 Actor Template Structure

```typescript
// Standard actor template
interface Actor<TInput, TOutput> {
  id: string;
  name: string;
  version: string;
  
  // Schema
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  
  // Configuration
  rateLimit: number;        // requests per minute
  timeout: number;         // ms
  retries: number;
  
  // Methods
  validate(input: TInput): ValidationResult;
  scrape(input: TInput): Promise<TOutput>;
  
  // Lifecycle
  onInit?(): Promise<void>;
  onDestroy?(): Promise<void>;
}

// Example: Shopify Actor
class ShopifyActor extends Actor<ShopifyInput, ShopifyOutput> {
  id = 'shopify';
  name = 'Shopify Store Actor';
  rateLimit = 30;
  timeout = 30000;
  
  async scrape(input: ShopifyInput): Promise<ShopifyOutput> {
    const { domain, resource, query } = input;
    
    switch (resource) {
      case 'products':
        return this.getProducts(domain, query);
      case 'orders':
        return this.getOrders(domain, query);
      case 'customers':
        return this.getCustomers(domain, query);
    }
  }
}
```

### 1.3 Actor Lifecycle Management

**Path:** `platform/internet-os/lifecycle-manager/`

```typescript
interface ActorVersion {
  actor_id: string;
  version: string;          // semver
  channel: 'stable' | 'beta' | 'experimental';
  schema: JSONSchema;
  code_hash: string;
  created_at: Date;
  created_by: string;
}

interface ActorMigration {
  from_version: string;
  to_version: string;
  breaking_changes: boolean;
  migration_rules: MigrationRule[];
  auto_migrate: boolean;
}

// Migration rule example
interface MigrationRule {
  field: string;
  from: any;
  to: any;
  transform?: (value: any) => any;
}
```

---

## PHASE 2: ConnectorOS (Week 13-20)

### 2.1 Connector Architecture

```typescript
// Connector = shared infrastructure for API communication
interface Connector {
  id: string;
  name: string;
  provider: string;         // 'shopify' | 'stripe' | 'slack'
  
  // Authentication
  auth: AuthConfig;
  
  // Rate limiting
  rateLimit: RateLimitConfig;
  
  // Transformations
  requestTransform?: TransformFn;
  responseTransform?: TransformFn;
  
  // Methods
  authenticate(): Promise<void>;
  request(config: RequestConfig): Promise<Response>;
}

// Example: Shopify Connector
class ShopifyConnector extends Connector {
  id = 'shopify';
  provider = 'shopify';
  
  rateLimit = {
    requests: 40,
    window_ms: 10000  // 40 requests per 10 seconds
  };
  
  async authenticate(): Promise<void> {
    // OAuth or API key flow
  }
  
  async request(config: RequestConfig): Promise<Response> {
    // Add auth headers, handle rate limiting, retry
  }
}
```

### 2.2 Connector Categories

| Category | Connectors |
|----------|------------|
| **Commerce** | Shopify, WooCommerce, Magento, Stripe, Razorpay, Square |
| **Communication** | WhatsApp, Slack, Gmail, SendGrid, Twilio, Discord |
| **Enterprise** | Salesforce, HubSpot, Zoho, Pipedrive, Freshsales |
| **Finance** | QuickBooks, Xero, Stripe, Plaid, Brex |
| **Social** | Instagram, Twitter, LinkedIn, Facebook, TikTok |
| **Productivity** | Notion, Airtable, Google Calendar, Zoom |
| **Logistics** | ShipRocket, Delhivery, FedEx, DHL |

---

## PHASE 3: Skills Framework (Week 21-28)

### 3.1 Skill Definition

```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  
  // Composition
  actors: {
    actor_id: string;
    inputs: Record<string, any>;
    order: number;           // execution order
    depends_on?: string[];   // dependencies
  }[];
  
  // Flow control
  flow: 'sequential' | 'parallel' | 'conditional';
  
  // Output
  output_mapping: Record<string, string>;  // actor_output_path -> skill_output
  
  // Configuration
  timeout: number;
  retries: number;
  
  // Metadata
  category: string;
  tags: string[];
  examples: Example[];
  
  // Performance
  avg_duration_ms: number;
  success_rate: number;
}
```

### 3.2 Core Skills to Build

| Skill | Actors Used | Purpose |
|-------|-------------|---------|
| **Lead Generation** | Google Maps → LinkedIn → Email Finder → CRM | Find and enrich leads |
| **Competitor Analysis** | Google Maps → Reviews → News → Social | Complete competitor intel |
| **Restaurant Expansion** | Google Maps → Zomato → Reviews → Suppliers | Location + market analysis |
| **Talent Discovery** | LinkedIn → Glassdoor → GitHub → Jobs | Find qualified candidates |
| **Market Research** | News → Reddit → Twitter → Trends | Industry trend analysis |
| **Supplier Discovery** | Google Maps → LinkedIn → Reviews → Government | Find and vet suppliers |
| **Content Research** | Twitter → Reddit → YouTube → News | Content ideation |
| **Pricing Intelligence** | Amazon → Zomato → Google Maps | Monitor competitor pricing |

### 3.3 Skill Marketplace Structure

```typescript
// Skill listing
interface SkillListing {
  id: string;
  skill_id: string;
  
  // Pricing
  pricing: {
    model: 'free' | 'subscription' | 'per_run';
    price?: number;
    currency?: string;
    limits?: {
      runs_per_month?: number;
      concurrent?: number;
    };
  };
  
  // Reviews
  rating: number;
  reviews: Review[];
  
  // Usage
  total_runs: number;
  active_users: number;
  
  // Certification
  certified: boolean;
  badge?: 'verified' | 'enterprise' | 'featured';
}
```

---

## PHASE 4: Digital Twins from Web (Week 29-36)

### 4.1 Twin Types

```typescript
// Company Twin (web-powered)
interface CompanyTwin {
  id: string;
  
  // Identity
  name: string;
  domain: string;
  logo?: string;
  
  // Web data sources
  sources: {
    website?: WebSource;
    google_maps?: BusinessData;
    linkedin?: LinkedInData;
    crunchbase?: CrunchbaseData;
    glassdoor?: GlassdoorData;
    news?: NewsData[];
    reviews?: ReviewData[];
    social?: SocialData;
  };
  
  // Derived intelligence
  industry?: string;
  size?: 'startup' | 'smb' | 'mid' | 'enterprise';
  funding?: FundingInfo;
  tech_stack?: string[];
  competitors?: string[];
  
  // Relationships
  suppliers?: string[];
  customers?: string[];
  partners?: string[];
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  last_scraped: Date;
}

// Market Twin (e.g., "Dubai Beauty Market")
interface MarketTwin {
  id: string;
  name: string;           // "Dubai Beauty Market"
  location: Location;
  
  // Entities
  companies: CompanyTwin[];
  products: Product[];
  trends: Trend[];
  
  // Metrics
  market_size?: number;
  growth_rate?: number;
  top_players?: string[];
  
  // Temporal
  snapshots: MarketSnapshot[];  // historical data
  updated_at: Date;
}

// Supplier Twin
interface SupplierTwin {
  id: string;
  company: CompanyTwin;
  
  // Supplier-specific
  categories: string[];
  certifications: string[];
  capacity: CapacityInfo;
  delivery_regions: string[];
  
  // Performance
  on_time_rate?: number;
  quality_score?: number;
  avg_response_time?: number;
  
  // Pricing
  price_range?: PriceRange;
  min_order?: number;
  
  // Reputation
  reviews: Review[];
  complaints?: Complaint[];
}
```

### 4.2 Twin Update Pipeline

```typescript
// How twins get updated from web data
async function updateCompanyTwin(twinId: string): Promise<void> {
  const twin = await TwinOS.get(twinId);
  
  // 1. Update from each source
  const updates = await Promise.all([
    scrapeWebsite(twin.domain),
    scrapeGoogleMaps(twin.name),
    scrapeLinkedIn(twin.linkedin_url),
    scrapeCrunchbase(twin.crunchbase_url),
    scrapeNews(twin.name),
    scrapeReviews(twin.name)
  ]);
  
  // 2. Merge and deduplicate
  const merged = mergeUpdates(updates);
  
  // 3. Detect changes
  const changes = detectChanges(twin, merged);
  
  // 4. Update twin
  await TwinOS.update(twinId, merged);
  
  // 5. Trigger alerts if significant changes
  if (changes.length > 0) {
    await emitChanges(twinId, changes);
  }
}
```

---

## PHASE 5: PlaybookOS (Week 37-44)

### 5.1 Playbook Definition

```typescript
interface Playbook {
  id: string;
  name: string;
  description: string;
  
  // Trigger
  trigger: {
    type: 'event' | 'schedule' | 'manual' | 'condition';
    config: TriggerConfig;
  };
  
  // Steps
  steps: PlaybookStep[];
  
  // Conditions
  conditions?: Condition[];
  
  // Outcomes
  expected_outcome?: string;
  
  // Learning
  success_count: number;
  failure_count: number;
  avg_duration_ms: number;
  
  // Version
  version: string;
  parent_version?: string;  // for iterations
}

interface PlaybookStep {
  id: string;
  type: 'actor' | 'skill' | 'human' | 'condition' | 'notification' | 'wait';
  
  // Configuration
  config: Record<string, any>;
  
  // Flow
  next_on_success?: string;
  next_on_failure?: string;
  
  // Retry
  retries?: number;
  timeout?: number;
}
```

### 5.2 Core Playbooks

| Playbook | Trigger | Steps | Purpose |
|----------|---------|-------|---------|
| **Restaurant Opening** | Manual | Market Research → Location → Supplier → Staff → Launch | New restaurant |
| **Competitor Alert** | News change | Detect change → Analyze → Alert → Recommend | Stay informed |
| **Lead Follow-up** | New lead | Enrich → Score → Assign → Follow-up | Sales pipeline |
| **Pricing Update** | Price change | Detect → Compare → Simulate → Update | Stay competitive |
| **Hiring Pipeline** | New job req | Source → Screen → Interview → Offer | HR process |
| **Onboarding** | New employee | Setup → Train → Assign → Monitor | Employee onboarding |
| **Incident Response** | Alert | Triage → Investigate → Resolve → Document | IT operations |
| **Compliance Check** | Schedule | Collect → Verify → Report → Alert | Regulatory compliance |

---

## PHASE 6: Research Employees (Week 45-52)

### 6.1 Research Agent Definition

```typescript
interface ResearchAgent {
  id: string;
  type: 'market' | 'competitor' | 'procurement' | 'policy' | 'technology';
  
  // Capabilities
  skills: string[];         // skill IDs
  actors: string[];         // actor IDs
  
  // Configuration
  schedule: CronSchedule;
  alert_threshold: AlertConfig;
  
  // Output
  report_template: string;
  delivery_channels: string[];
  
  // Memory
  memory_partition: string;  // MemoryOS partition
  
  // Learning
  accuracy_score: number;
  false_positive_rate: number;
}
```

### 6.2 Research Agent Types

| Agent | Schedule | Inputs | Output |
|-------|----------|--------|--------|
| **Market Researcher** | Daily 8am | News, Reddit, Twitter, Trends | Market Report |
| **Competitor Researcher** | Hourly | News, Reviews, Social, Website | Competitor Alerts |
| **Procurement Researcher** | Daily | Suppliers, Prices, Tenders | Supplier Shortlist |
| **Policy Researcher** | Daily 9am | Government sites, News | Policy Digest |
| **Technology Researcher** | Weekly | GitHub, HackerNews, Funding | Tech Radar |
| **Talent Researcher** | Daily | LinkedIn, Jobs, Salary | Talent Pipeline |

### 6.3 Research Department Template

```typescript
interface ResearchDepartment {
  id: string;
  name: 'Research Department';
  
  // Head
  head: ResearchAgent;       // Manager agent
  
  // Team
  researchers: ResearchAgent[];
  
  // Shared resources
  shared_skills: string[];
  shared_actors: string[];
  shared_memory: string;
  
  // Outputs
  reports: ReportTemplate[];
  
  // Schedule
  daily_brief: Time;
  weekly_review: DayOfWeek;
}
```

---

## PHASE 7: Ecosystem Infrastructure (Week 53-78)

### 7.1 TrustOS

```typescript
interface ActorReputation {
  actor_id: string;
  
  // Metrics
  total_runs: number;
  success_rate: number;
  avg_duration_ms: number;
  error_types: Record<string, number>;
  
  // User feedback
  user_ratings: number[];
  reviews: Review[];
  
  // Trust score (calculated)
  trust_score: number;       // 0-100
  
  // Badge
  badge?: 'bronze' | 'silver' | 'gold' | 'enterprise';
}

interface SkillReputation {
  skill_id: string;
  
  // Metrics
  total_runs: number;
  success_rate: number;
  conversion_rate?: number;
  
  // Reviews
  rating: number;
  reviews: Review[];
  
  // Trust
  trust_score: number;
}
```

### 7.2 BillingOS

```typescript
interface BillingPlan {
  id: string;
  name: string;
  
  // Pricing tiers
  tiers: {
    name: string;
    price: number;
    currency: string;
    period: 'monthly' | 'yearly';
    
    limits: {
      actor_runs?: number;
      skill_runs?: number;
      data_volume_mb?: number;
      api_calls?: number;
    };
    
    overage?: {
      actor_run: number;     // cost per run over limit
      gb: number;           // cost per GB over limit
    };
  }[];
  
  // Revenue share
  revenue_share: {
    actor: number;          // % to actor creators
    skill: number;          // % to skill creators
    platform: number;       // % to platform
  };
}
```

### 7.3 GovernanceOS

```typescript
interface GovernancePolicy {
  id: string;
  name: string;
  type: 'scraping' | 'data' | 'privacy' | 'security';
  
  // Rules
  rules: Rule[];
  
  // Enforcement
  enforcement: 'block' | 'warn' | 'log';
  
  // Audit
  audit_trail: boolean;
  
  // Compliance
  compliance: ('GDPR' | 'CCPA' | 'SOC2')[];
}

// Example policies
const policies: GovernancePolicy[] = [
  {
    id: 'no-personal-data',
    name: 'No Personal Data Scraping',
    type: 'privacy',
    rules: [
      { field: 'ssn', action: 'block' },
      { field: 'password', action: 'block' },
      { field: 'credit_card', action: 'block' }
    ],
    enforcement: 'block',
    compliance: ['GDPR', 'CCPA']
  },
  {
    id: 'rate-limits',
    name: 'Rate Limit Enforcement',
    type: 'scraping',
    rules: [
      { field: 'requests_per_minute', max: 60 }
    ],
    enforcement: 'block'
  }
];
```

---

## PHASE 8: Advanced Intelligence (Week 79-92)

### 8.1 SimulationOS

```typescript
interface Simulation {
  id: string;
  type: 'pricing' | 'expansion' | 'workforce' | 'market';
  
  // Input
  scenario: Scenario;
  
  // Model
  model: 'monte_carlo' | 'agent_based' | 'system_dynamics';
  
  // Parameters
  iterations: number;
  time_horizon: Duration;
  
  // Output
  results: SimulationResult;
  
  // Confidence
  confidence_interval: [number, number];
}

// Example: Pricing Simulation
const pricingSim: Simulation = {
  id: 'sim_001',
  type: 'pricing',
  
  scenario: {
    current_price: 299,
    test_prices: [249, 279, 329, 349],
    duration_days: 30,
    traffic_volume: 10000
  },
  
  model: 'monte_carlo',
  iterations: 10000,
  time_horizon: { days: 30 },
  
  // Results
  results: {
    '₹249': { revenue_change: -12, orders_change: +18 },
    '₹279': { revenue_change: -4, orders_change: +8 },
    '₹329': { revenue_change: +8, orders_change: -6 },
    '₹349': { revenue_change: +14, orders_change: -12 }
  }
};
```

### 8.2 NegotiatorOS

```typescript
interface NegotiationSession {
  id: string;
  type: 'procurement' | 'franchise' | 'advertising';
  
  // Parties
  buyer: AgentIdentity;
  seller: AgentIdentity;
  
  // Terms
  target_terms: Terms;
  current_terms: Terms;
  batna: Terms;            // Best alternative
  
  // Strategy
  strategy: 'competitive' | 'collaborative' | 'accommodating' | 'compromising';
  
  // History
  rounds: NegotiationRound[];
  
  // Status
  status: 'active' | 'agreed' | 'failed' | 'expired';
  
  // Outcome
  final_terms?: Terms;
  agreement_signed?: boolean;
}
```

### 8.3 MarketOS

```typescript
interface Market {
  id: string;
  type: 'supplier' | 'talent' | 'service' | 'data';
  
  // Participants
  demand: MarketParticipant[];   // Buyers
  supply: MarketParticipant[];   // Sellers
  
  // Matching
  match_algorithm: 'price' | 'quality' | 'hybrid' | 'ai';
  
  // Rules
  rules: MarketRule[];
  
  // Pricing
  pricing_model: 'auction' | 'fixed' | 'dynamic';
  
  // Analytics
  volume_24h: number;
  avg_price: number;
  match_rate: number;
}
```

---

## PHASE 9: Federation (Week 93-104)

### 9.1 FederationOS

```typescript
interface Federation {
  id: string;
  name: string;
  
  // Members
  members: FederationMember[];
  
  // Shared resources
  shared_skills: string[];
  shared_actors: string[];
  shared_intelligence: SharedIntelligence;
  shared_reputation: SharedReputation;
  
  // Governance
  governance: FederationGovernance;
  
  // Economics
  revenue_sharing: RevenueShareConfig;
}

interface SharedIntelligence {
  // What members share
  market_trends: boolean;
  supplier_intelligence: boolean;
  competitor_analysis: boolean;
  pricing_data: boolean;
  
  // Privacy
  exclude_competitors: string[];  // Don't share with these
  data_retention_days: number;
}
```

---

## QUICK REFERENCE: Build Order

```
Week 1-4:   Phase 0 - Fix current gaps
Week 5-12:  Phase 1 - 10 more actors
Week 13-20: Phase 2 - ConnectorOS
Week 21-28: Phase 3 - Skills framework
Week 29-36: Phase 4 - Digital twins from web
Week 37-44: Phase 5 - PlaybookOS
Week 45-52: Phase 6 - Research employees
Week 53-65: Phase 7 - Ecosystem infra
Week 66-78: Phase 7 - Trust, Billing, Governance
Week 79-92: Phase 8 - Simulation, Negotiator, Market
Week 93-104: Phase 9 - Federation
```

---

*Last Updated: June 30, 2026*
*InternetOS Build Plan — HOJAI AI*
