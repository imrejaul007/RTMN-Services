/**
 * Agent Template Generator — 510 Companies
 * Port: 4520
 * Generates agent configs for any company type
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4520;

// ── Company Configurations ──────────────────────────────────────────────

const TEMPLATES = {
  // E-COMMERCE / MARKETPLACE
  amazon: { name: 'Amazon', sector: 'ecommerce', icon: '🛒', agents: [
    { role: 'CatalogAgent', salary: 350, skills: ['listings', 'seo', 'images'] },
    { role: 'FulfillmentAgent', salary: 400, skills: ['inventory', 'shipping', 'warehousing'] },
    { role: 'DiscoveryAgent', salary: 450, skills: ['search', 'recommendations', 'ads'] },
    { role: 'SellerAgent', salary: 350, skills: ['onboarding', 'growth', 'payments'] },
    { role: 'FraudAgent', salary: 400, skills: ['fake-reviews', 'returns-abuse', 'payments'] },
    { role: 'MarketingAgent', salary: 400, skills: ['ppc', 'deals', 'prime'] }
  ]},

  flipkart: { name: 'Flipkart', sector: 'ecommerce', icon: '🛒', agents: [
    { role: 'SmartCartAgent', salary: 300, skills: ['deals', 'coupons', 'smart-cart'] },
    { role: 'DeliveryAgent', salary: 350, skills: ['ekart', 'tracking', 'pincode'] },
    { role: 'SellerAgent', salary: 300, skills: ['onboarding', 'cataloging', 'growth'] },
    { role: 'OffersAgent', salary: 250, skills: ['big-billion-days', 'flash-sales'] }
  ]},

  shopify: { name: 'Shopify', sector: 'ecommerce-saas', icon: '🏪', agents: [
    { role: 'StoreBuilderAgent', salary: 400, skills: ['themes', 'customization', 'plugins'] },
    { role: 'GrowthAgent', salary: 350, skills: ['seo', 'ads', 'email-marketing'] },
    { role: 'SupportAgent', salary: 250, skills: ['merchant-support', 'troubleshooting'] },
    { role: 'AnalyticsAgent', salary: 300, skills: ['sales-data', 'cohort-analysis'] }
  ]},

  // FOOD DELIVERY
  swiggy: { name: 'Swiggy', sector: 'food-delivery', icon: '🍔', agents: [
    { role: 'RestaurantOnboardingAgent', salary: 300, skills: ['kyc', 'menu-curation', 'quality'] },
    { role: 'DeliveryMatchingAgent', salary: 350, skills: ['distance-optimization', 'capacity', 'eta'] },
    { role: 'DeliveryPartnerAgent', salary: 250, skills: ['onboarding', 'earnings', 'safety'] },
    { role: 'GenieAgent', salary: 200, skills: ['instant-delivery', 'kirana-stores'] },
    { role: 'WaveAgent', salary: 350, skills: ['dark-stores', '10-min-delivery'] },
    { role: 'RetentionAgent', salary: 350, skills: ['personalization', 'offers', 'loyalty'] }
  ]},

  zomato: { name: 'Zomato', sector: 'food-delivery', icon: '🍕', agents: [
    { role: 'RestaurantPartnerAgent', salary: 300, skills: ['onboarding', 'menu-optimization'] },
    { role: 'DeliveryPartnerAgent', salary: 250, skills: ['fleet-management', 'safety'] },
    { role: 'DiningAgent', salary: 350, skills: ['table-bookings', 'reviews', 'zomato-pro'] },
    { role: 'NutritionAgent', salary: 250, skills: ['calories', 'health-goals'] },
    { role: 'HyperpureAgent', salary: 300, skills: ['hygiene-ratings', 'fssai-compliance'] }
  ]},

  ubereats: { name: 'Uber Eats', sector: 'food-delivery', icon: '🍕', agents: [
    { role: 'RestaurantMatchingAgent', salary: 300, skills: ['restaurant-discovery', 'menu-curation'] },
    { role: 'DeliveryDispatchAgent', salary: 350, skills: ['matching', 'routing', 'surge'] },
    { role: 'GrowthAgent', salary: 350, skills: ['acquisition', 'loyalty', 'corporate'] }
  ]},

  // MOBILITY / RIDE-HAILING
  uber: { name: 'Uber', sector: 'mobility', icon: '🚗', agents: [
    { role: 'DispatchAgent', salary: 400, skills: ['matching', 'surge-pricing', 'dispatch'] },
    { role: 'SafetyAgent', salary: 350, skills: ['background-checks', 'ride-monitoring', 'emergency'] },
    { role: 'DriverGrowthAgent', salary: 350, skills: ['acquisition', 'retention', 'incentives'] },
    { role: 'RiderGrowthAgent', salary: 350, skills: ['acquisition', 'referrals', 'engagement'] },
    { role: 'FreightAgent', salary: 400, skills: ['uber-freight', 'cargo-matching', 'tracking'] },
    { role: 'EatsAgent', salary: 300, skills: ['restaurant-matching', 'delivery-optimization'] }
  ]},

  ola: { name: 'Ola', sector: 'mobility', icon: '🚕', agents: [
    { role: 'AutoMatchAgent', salary: 300, skills: ['auto-matching', 'route-optimization'] },
    { role: 'DriverPartnerAgent', salary: 300, skills: ['onboarding', 'kyc', 'loans'] },
    { role: 'OlaElectricAgent', salary: 350, skills: ['ev-charging', 'battery-management', 'green-routes'] }
  ]},

  rapido: { name: 'Rapido', sector: 'mobility', icon: '🏍️', agents: [
    { role: 'BikeMatchAgent', salary: 250, skills: ['bike-matching', 'auto', 'delivery'] },
    { role: 'CaptainAgent', salary: 250, skills: ['captain-onboarding', 'earnings', 'safety'] }
  ]},

  // HEALTHCARE
  practo: { name: 'Practo', sector: 'healthcare', icon: '🏥', agents: [
    { role: 'SymptomAgent', salary: 400, skills: ['triage', 'symptom-check', 'urgency'] },
    { role: 'DoctorMatchAgent', salary: 350, skills: ['specialty-matching', 'availability', 'ratings'] },
    { role: 'AppointmentAgent', salary: 250, skills: ['scheduling', 'reminders', 'rescheduling'] },
    { role: 'PrescriptionAgent', salary: 300, skills: ['e-prescriptions', 'pharmacy-matching', 'refills'] },
    { role: 'InsuranceAgent', salary: 350, skills: ['claim-processing', 'coverage-verification'] },
    { role: 'HealthRecordAgent', salary: 300, skills: ['emr', 'lab-results', 'analytics'] }
  ]},

  '1mg': { name: '1mg', sector: 'healthcare', icon: '💊', agents: [
    { role: 'MedicineAgent', salary: 250, skills: ['generic-substitutes', 'interactions', 'dosage'] },
    { role: 'LabBookingAgent', salary: 300, skills: ['test-booking', 'home-collection', 'reports'] },
    { role: 'PharmacyAgent', salary: 300, skills: ['availability', 'discounts', 'quick-delivery'] }
  ]},

  // FINTECH / PAYMENTS
  phonepe: { name: 'PhonePe', sector: 'payments', icon: '💳', agents: [
    { role: 'PaymentAgent', salary: 300, skills: ['upi', 'wallets', 'recharges'] },
    { role: 'MerchantAgent', salary: 350, skills: ['qr-onboarding', 'settlement', 'loans'] },
    { role: 'InsuranceAgent', salary: 300, skills: ['smart-claims', 'recommendations'] },
    { role: 'GoldAgent', salary: 250, skills: ['digital-gold', 'investments'] }
  ]},

  razorpay: { name: 'Razorpay', sector: 'payments', icon: '💰', agents: [
    { role: 'PaymentLinksAgent', salary: 250, skills: ['payment-links', 'qr-codes', 'subscriptions'] },
    { role: 'PayrollAgent', salary: 300, skills: ['vendor-payments', 'bulk-transfers', 'salaries'] },
    { role: 'CapitalAgent', salary: 400, skills: ['business-loans', 'underwriting', 'disbursements'] }
  ]},

  cred: { name: 'CRED', sector: 'wealth', icon: '💎', agents: [
    { role: 'CreditScoreAgent', salary: 350, skills: ['score-analysis', 'improvement-tips'] },
    { role: 'RewardsAgent', salary: 300, skills: ['cashback', 'offers', 'streaks'] },
    { role: 'WealthAgent', salary: 400, skills: ['mutual-funds', 'stocks', 'portfolio'] }
  ]},

  groww: { name: 'Groww', sector: 'investments', icon: '📈', agents: [
    { role: 'PortfolioAgent', salary: 400, skills: ['mutual-funds', 'stocks', 'gold'] },
    { role: 'ResearchAgent', salary: 450, skills: ['fundamental-analysis', 'news-sentiment'] },
    { role: 'SIPAgent', salary: 250, skills: ['sip-automation', 'goal-planning', 'rebalancing'] }
  ]},

  // EDUCATION
  byjus: { name: 'BYJU\\'s', sector: 'edtech', icon: '📚', agents: [
    { role: 'TutorAgent', salary: 400, skills: ['adaptive-learning', 'visual-explanations'] },
    { role: 'MentorAgent', salary: 350, skills: ['career-guidance', 'progress-tracking'] },
    { role: 'TestPrepAgent', salary: 350, skills: ['iit-jee', 'neet', 'cbse'] },
    { role: 'EngagementAgent', salary: 250, skills: ['streaks', 'badges', 'gamification'] }
  ]},

  unacademy: { name: 'Unacademy', sector: 'edtech', icon: '🎓', agents: [
    { role: 'EducatorAgent', salary: 400, skills: ['live-classes', 'doubt-solving'] },
    { role: 'IITSelectionAgent', salary: 350, skills: ['iit-jee', 'neet', 'foundation'] },
    { role: 'CatAgent', salary: 350, skills: ['iim-mba', 'gd-pi', 'mock-tests'] }
  ]},

  physicswallah: { name: 'PhysicsWallah', sector: 'edtech', icon: '⚡', agents: [
    { role: 'BudgetTutorAgent', salary: 300, skills: ['physics', 'chemistry', 'maths-free'] },
    { role: 'vernacularAgent', salary: 250, skills: ['hindi-medium', 'regional-languages'] },
    { role: 'AlakhSirAgent', salary: 400, skills: ['concept-videos', 'shorts'] }
  ]},

  // HOTELS / TRAVEL
  oyo: { name: 'OYO', sector: 'hotels', icon: '🏨', agents: [
    { role: 'BookingAgent', salary: 250, skills: ['inventory-management', 'dynamic-pricing'] },
    { role: 'PartnerOnboardingAgent', salary: 300, skills: ['property-listing', 'standards-compliance'] },
    { role: 'GuestExperienceAgent', salary: 300, skills: ['checkinout', 'requests', 'reviews'] },
    { role: 'RevenueAgent', salary: 350, skills: ['demand-forecasting', 'coupon-optimization'] }
  ]},

  makemytrip: { name: 'MakeMyTrip', sector: 'travel', icon: '✈️', agents: [
    { role: 'TripPlannerAgent', salary: 400, skills: ['itinerary-optimization', 'multi-city'] },
    { role: 'FlightAgent', salary: 300, skills: ['fare-comparison', 'seat-selection'] },
    { role: 'HotelBookingAgent', salary: 300, skills: ['hotel-matches', 'reviews-analysis'] },
    { role: 'CorporateAgent', salary: 300, skills: ['business-travel', 'mice'] }
  ]},

  // INSURANCE
  policybazaar: { name: 'PolicyBazaar', sector: 'insurance', icon: '🛡️', agents: [
    { role: 'PlanCompareAgent', salary: 350, skills: ['term-life', 'health-insurance', 'car-insurance'] },
    { role: 'ClaimAssistAgent', salary: 300, skills: ['claim-filing', 'document-check'] },
    { role: 'NeedAnalysisAgent', salary: 400, skills: ['risk-assessment', 'coverage-gaps'] }
  ]},

  acko: { name: 'Acko', sector: 'insurance', icon: '🔒', agents: [
    { role: 'InstantClaimAgent', salary: 350, skills: ['paperless-claims', 'damage-assessment'] },
    { role: 'DriveSafeAgent', salary: 250, skills: ['driving-scores', 'discounts'] }
  ]},

  // LOGISTICS
  delhivery: { name: 'Delhivery', sector: 'logistics', icon: '📦', agents: [
    { role: 'RoutingAgent', salary: 350, skills: ['route-optimization', 'first-mile', 'last-mile'] },
    { role: 'WarehouseAgent', salary: 300, skills: ['inventory-placement', 'fulfillment-centers'] },
    { role: 'SMBAgent', salary: 250, skills: ['easy-onboarding', 'api-integrations'] }
  ]},

  blackbuck: { name: 'BlackBuck', sector: 'trucking', icon: '🚛', agents: [
    { role: 'TruckMatchAgent', salary: 350, skills: ['load-matching', 'route-optimization'] },
    { role: 'FleetAgent', salary: 300, skills: ['owner-driver-loans', 'fuel-cards'] },
    { role: 'TelemetryAgent', salary: 300, skills: ['gps-tracking', 'driver-behavior'] }
  ]},

  // IMPORT/EXPORT (NEW)
  'import-export': { name: 'Import/Export Platform', sector: 'b2b-trade', icon: '🌍', agents: [
    { role: 'TradeComplianceAgent', salary: 450, skills: ['customs', 'incoterms', 'documentation'] },
    { role: 'SourcingAgent', salary: 400, skills: ['supplier-discovery', 'rfq', 'negotiation'] },
    { role: 'LogisticsAgent', salary: 350, skills: ['freight', 'customs-clearance', 'tracking'] },
    { role: 'PaymentAgent', salary: 400, skills: ['letters-of-credit', 'escrow', 'forex'] },
    { role: 'QualityAgent', salary: 300, skills: ['inspection', 'certification', 'sampling'] },
    { role: 'DocumentAgent', salary: 250, skills: ['bill-of-lading', 'certificate-of-origin'] },
    { role: 'RiskAgent', salary: 350, skills: ['country-risk', 'supplier-risk', 'currency-risk'] }
  ]},

  // FOOD DELIVERY (NEW)
  'food-delivery': { name: 'Agentic Food Delivery', sector: 'food-delivery', icon: '🍔', agents: [
    { role: 'RestaurantOnboardingAgent', salary: 350, skills: ['kyc', 'menu-curation', 'commission-setup'] },
    { role: 'MenuOptimizationAgent', salary: 300, skills: ['pricing', 'recommendations', 'categories'] },
    { role: 'DeliveryMatchingAgent', salary: 350, skills: ['distance-optimization', 'capacity', 'eta'] },
    { role: 'DeliveryPartnerAgent', salary: 250, skills: ['onboarding', 'incentives', 'earnings'] },
    { role: 'OrderIntelligenceAgent', salary: 300, skills: ['order-tracking', 'kitchen-display'] },
    { role: 'CustomerRetentionAgent', salary: 350, skills: ['personalization', 'offers', 'loyalty'] },
    { role: 'FraudDetectionAgent', salary: 350, skills: ['fake-orders', 'gaming', 'refund-abuse'] },
    { role: 'SupportAgent', salary: 200, skills: ['ticket-resolution', 'refunds'] }
  ]},

  // AGENTIC E-COMMERCE (NEW)
  'agentic-ecommerce': { name: 'Agentic E-Commerce', sector: 'ecommerce', icon: '🛍️', agents: [
    { role: 'CatalogAgent', salary: 350, skills: ['listings', 'seo', 'descriptions'] },
    { role: 'SearchDiscoveryAgent', salary: 400, skills: ['semantic-search', 'recommendations'] },
    { role: 'PricingAgent', salary: 400, skills: ['dynamic-pricing', 'competitor-analysis'] },
    { role: 'InventoryAgent', salary: 300, skills: ['stock-management', 'forecasting'] },
    { role: 'FulfillmentAgent', salary: 350, skills: ['order-routing', 'shipping', 'tracking'] },
    { role: 'ReturnsAgent', salary: 250, skills: ['return-requests', 'refunds'] },
    { role: 'SellerAgent', salary: 350, skills: ['onboarding', 'growth-tips'] },
    { role: 'FraudAgent', salary: 350, skills: ['fake-reviews', 'payment-fraud'] },
    { role: 'MarketingAgent', salary: 400, skills: ['ads', 'email', 'social', 'influencers'] }
  ]},

  // DEFAULT (for any company)
  default: { name: 'AI Agent Network', sector: 'general', icon: '🤖', agents: [
    { role: 'CEO Strategist', salary: 500, skills: ['vision', 'strategy', 'okrs'] },
    { role: 'COO Operations', salary: 400, skills: ['management', 'optimization'] },
    { role: 'Growth Agent', salary: 400, skills: ['acquisition', 'retention', 'engagement'] },
    { role: 'Support Agent', salary: 200, skills: ['customer-success', 'tickets'] },
    { role: 'Finance Agent', salary: 300, skills: ['reporting', 'compliance', 'forecasting'] }
  ]}
};

function getConfig(companyName) {
  const lower = (companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, config] of Object.entries(TEMPLATES)) {
    if (lower.includes(key) || key === 'default') return config;
  }
  return TEMPLATES.default;
}

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'agent-generator' }));

app.get('/api/v1/templates', (_, res) => {
  const list = Object.entries(TEMPLATES)
    .filter(([k]) => k !== 'default')
    .map(([k, v]) => ({ id: k, name: v.name, sector: v.sector, icon: v.icon, agents: v.agents.length }));
  res.json({ success: true, count: list.length, templates: list });
});

app.post('/api/v1/generate', (req, res) => {
  const { company, sector, customAgents } = req.body;
  const config = getConfig(company || sector);

  const template = {
    id: uuidv4(),
    company: company || config.name,
    sector: sector || config.sector,
    icon: config.icon,
    agents: customAgents || config.agents,
    totalSalary: (customAgents || config.agents).reduce((s, a) => s + a.salary, 0),
    twins: ['customer-twin', 'transaction-twin', 'product-twin'],
    flows: ['customer-journey', 'order-fulfillment', 'support-flow'],
    generatedAt: new Date().toISOString()
  };

  res.status(201).json({ success: true, template });
});

app.listen(PORT, () => console.log(`\n🎯 Agent Generator — PORT ${PORT} (${Object.keys(TEMPLATES).length - 1} companies)\n`));
export default app;
