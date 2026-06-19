// Seed script for Customer Intelligence (CDP) - creates sample customers, identities, and risk events
// Run: node services/customer-intelligence/seed.js

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-cdp';

// Inline the schemas (avoid TS compilation)
const CustomerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true, index: true },
  masterId: { type: String, index: true },
  firstName: String,
  lastName: String,
  email: { type: String, lowercase: true, index: true },
  phone: { type: String, index: true },
  status: { type: String, enum: ['active', 'inactive', 'churned', 'blocked'], default: 'active' },
  type: { type: String, enum: ['individual', 'business'], default: 'individual' },
  tier: { type: String, enum: ['standard', 'premium', 'enterprise', 'vip'], default: 'standard' },
  tags: [String],
  identities: [{
    type: { type: String, enum: ['email', 'phone', 'device_id', 'cookie_id', 'account_id', 'external_id'] },
    value: String,
    verified: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now }
  }],
  addresses: [{
    street: String, city: String, state: String, postalCode: String, country: String,
    type: { type: String, enum: ['billing', 'shipping', 'home', 'work'] }
  }],
  preferences: [{
    key: String, value: mongoose.Schema.Types.Mixed, source: String,
    updatedAt: { type: Date, default: Date.now }
  }],
  metrics: {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lastOrderDate: Date,
    lifetimeValue: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 }
  },
  riskScore: {
    overall: { type: Number, default: 0 },
    fraudRisk: { type: Number, default: 0 },
    churnRisk: { type: Number, default: 0 },
    creditRisk: { type: Number, default: 0 },
    level: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' }
  },
  segments: [{ id: String, name: String }],
  source: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'customers' });

const RiskEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  eventType: { type: String, enum: ['fraud_attempt', 'chargeback', 'dispute', 'refund', 'suspicious_activity', 'high_value_order', 'policy_violation'], required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  details: mongoose.Schema.Types.Mixed,
  source: String,
  resolved: { type: Boolean, default: false },
  resolvedAt: Date,
  resolvedBy: String,
  resolution: String,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'risk_events' });

const Customer = mongoose.model('Customer', CustomerSchema);
const RiskEvent = mongoose.model('RiskEvent', RiskEventSchema);

// Sample data: 20 customers across tiers and risk levels
const SAMPLE_CUSTOMERS = [
  { firstName: 'Aarav', lastName: 'Sharma', email: 'aarav.sharma@example.com', phone: '+919876543210', tier: 'vip', status: 'active', tags: ['vip', 'early-adopter'], source: 'web' },
  { firstName: 'Priya', lastName: 'Patel', email: 'priya.patel@example.com', phone: '+919876543211', tier: 'premium', status: 'active', tags: ['loyal'], source: 'mobile' },
  { firstName: 'Rohan', lastName: 'Kumar', email: 'rohan.kumar@example.com', phone: '+919876543212', tier: 'premium', status: 'active', tags: ['tech'], source: 'web' },
  { firstName: 'Ananya', lastName: 'Singh', email: 'ananya.singh@example.com', phone: '+919876543213', tier: 'enterprise', status: 'active', tags: [], source: 'referral' },
  { firstName: 'Vihaan', lastName: 'Gupta', email: 'vihaan.gupta@example.com', phone: '+919876543214', tier: 'enterprise', status: 'active', tags: [], source: 'web' },
  { firstName: 'Ishaan', lastName: 'Reddy', email: 'ishaan.reddy@example.com', phone: '+919876543215', tier: 'standard', status: 'inactive', tags: ['churned'], source: 'web' },
  { firstName: 'Diya', lastName: 'Iyer', email: 'diya.iyer@example.com', phone: '+919876543216', tier: 'vip', status: 'active', tags: ['vip', 'b2b'], source: 'sales' },
  { firstName: 'Arjun', lastName: 'Nair', email: 'arjun.nair@example.com', phone: '+919876543217', tier: 'premium', status: 'active', tags: ['mobile-first'], source: 'mobile' },
  { firstName: 'Saanvi', lastName: 'Khan', email: 'saanvi.khan@example.com', phone: '+919876543218', tier: 'enterprise', status: 'active', tags: [], source: 'web' },
  { firstName: 'Reyansh', lastName: 'Joshi', email: 'reyansh.joshi@example.com', phone: '+919876543219', tier: 'standard', status: 'active', tags: ['new'], source: 'web' },
  { firstName: 'Aadhya', lastName: 'Rao', email: 'aadhya.rao@example.com', phone: '+919876543220', tier: 'premium', status: 'active', tags: ['b2b'], source: 'sales' },
  { firstName: 'Krishna', lastName: 'Mehta', email: 'krishna.mehta@example.com', phone: '+919876543221', tier: 'enterprise', status: 'active', tags: [], source: 'mobile' },
  { firstName: 'Anika', lastName: 'Shah', email: 'anika.shah@example.com', phone: '+919876543222', tier: 'standard', status: 'blocked', tags: ['fraud-flag'], source: 'web' },
  { firstName: 'Isha', lastName: 'Verma', email: 'isha.verma@example.com', phone: '+919876543223', tier: 'vip', status: 'active', tags: ['vip'], source: 'referral' },
  { firstName: 'Aryan', lastName: 'Bhatia', email: 'aryan.bhatia@example.com', phone: '+919876543224', tier: 'premium', status: 'active', tags: [], source: 'web' },
  { firstName: 'Mira', lastName: 'Chopra', email: 'mira.chopra@example.com', phone: '+919876543225', tier: 'enterprise', status: 'active', tags: ['mobile-first'], source: 'mobile' },
  { firstName: 'Vivaan', lastName: 'Saxena', email: 'vivaan.saxena@example.com', phone: '+919876543226', tier: 'standard', status: 'inactive', tags: ['churned'], source: 'web' },
  { firstName: 'Pari', lastName: 'Tandon', email: 'pari.tandon@example.com', phone: '+919876543227', tier: 'premium', status: 'active', tags: ['b2b'], source: 'sales' },
  { firstName: 'Ayaan', lastName: 'Mishra', email: 'ayaan.mishra@example.com', phone: '+919876543228', tier: 'vip', status: 'active', tags: ['vip', 'early-adopter'], source: 'web' },
  { firstName: 'Riya', lastName: 'Bajaj', email: 'riya.bajaj@example.com', phone: '+919876543229', tier: 'enterprise', status: 'active', tags: [], source: 'web' }
];

const RISK_EVENTS = [
  { customerId: 'cust_013', eventType: 'fraud_attempt', severity: 'high', source: 'fraud-engine', resolved: false, details: { attemptedAmount: 50000, location: 'unknown', ipAddress: '203.0.113.42' } },
  { customerId: 'cust_013', eventType: 'suspicious_activity', severity: 'medium', source: 'fraud-engine', resolved: false, details: { loginAttempts: 12, timeWindow: '5min' } },
  { customerId: 'cust_006', eventType: 'dispute', severity: 'medium', source: 'support', resolved: true, resolvedBy: 'support-agent-001', resolution: 'refund issued', details: { amount: 2500, orderId: 'ord_789' } },
  { customerId: 'cust_017', eventType: 'refund', severity: 'low', source: 'support', resolved: true, resolvedBy: 'support-agent-002', resolution: 'partial refund', details: { amount: 1500, reason: 'sizing issue' } },
  { customerId: 'cust_001', eventType: 'high_value_order', severity: 'low', source: 'order-engine', resolved: true, details: { amount: 125000, orderId: 'ord_9001' } },
  { customerId: 'cust_002', eventType: 'chargeback', severity: 'high', source: 'payment-gateway', resolved: false, details: { amount: 8500, reasonCode: '4853' } },
  { customerId: 'cust_007', eventType: 'policy_violation', severity: 'medium', source: 'moderation', resolved: true, resolvedBy: 'admin-001', resolution: 'warning issued', details: { violationType: 'spam' } }
];

function genId(prefix, n) {
  return `${prefix}_${String(n).padStart(3, '0')}`;
}

async function seed() {
  console.log('🌱 Seeding Customer Intelligence (CDP) database...');
  console.log(`   MongoDB URI: ${MONGODB_URI}`);
  console.log('');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  // Clear existing
  await Customer.deleteMany({});
  await RiskEvent.deleteMany({});
  console.log('🗑️  Cleared existing customers and risk events');

  // Insert customers
  const customers = SAMPLE_CUSTOMERS.map((c, i) => {
    const id = genId('cust', i + 1);
    const totalOrders = Math.floor(Math.random() * 50);
    const totalSpent = totalOrders * (Math.floor(Math.random() * 5000) + 500);

    // Assign risk level based on tier (platinum = low risk, bronze = higher risk)
    let riskLevel = 'low';
    let riskOverall = Math.floor(Math.random() * 20);
    if (c.tier === 'bronze' && c.status !== 'active') {
      riskLevel = c.status === 'suspended' ? 'critical' : 'high';
      riskOverall = 60 + Math.floor(Math.random() * 35);
    } else if (c.tier === 'silver') {
      riskLevel = Math.random() > 0.7 ? 'medium' : 'low';
      riskOverall = riskLevel === 'medium' ? 30 + Math.floor(Math.random() * 25) : Math.floor(Math.random() * 20);
    } else if (c.tier === 'gold' || c.tier === 'platinum') {
      riskLevel = 'low';
      riskOverall = Math.floor(Math.random() * 15);
    }

    return {
      customerId: id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone.replace(/\D/g, ''),
      status: c.status,
      type: c.type || 'individual',
      tier: c.tier,
      tags: c.tags,
      source: c.source,
      identities: [
        { type: 'email', value: c.email.toLowerCase(), verified: true, addedAt: new Date(Date.now() - 90 * 86400000) },
        { type: 'phone', value: c.phone.replace(/\D/g, ''), verified: Math.random() > 0.3, addedAt: new Date(Date.now() - 60 * 86400000) }
      ],
      metrics: {
        totalOrders,
        totalSpent,
        averageOrderValue: totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0,
        lastOrderDate: c.status === 'active' ? new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000) : new Date(Date.now() - 180 * 86400000),
        lifetimeValue: totalSpent * 1.3,
        engagementScore: Math.floor(Math.random() * 100)
      },
      riskScore: {
        overall: riskOverall,
        fraudRisk: c.status === 'suspended' ? 80 : Math.floor(Math.random() * 25),
        churnRisk: c.status === 'inactive' ? 70 : Math.floor(Math.random() * 30),
        creditRisk: Math.floor(Math.random() * 25),
        level: riskLevel
      },
      segments: (c.tier === 'vip' ? [{ id: 'seg-vip', name: 'vip' }, { id: 'seg-high-value', name: 'high-value' }] :
                 c.tier === 'premium' ? [{ id: 'seg-loyal', name: 'loyal' }, { id: 'seg-engaged', name: 'engaged' }] :
                 [{ id: 'seg-standard', name: 'standard' }]),
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 365) * 86400000),
      updatedAt: new Date()
    };
  });

  const insertedCustomers = await Customer.insertMany(customers);
  console.log(`✅ Inserted ${insertedCustomers.length} customers`);

  // Insert risk events
  const events = RISK_EVENTS.map((e, i) => ({
    eventId: genId('evt', i + 1),
    customerId: e.customerId,
    eventType: e.eventType,
    severity: e.severity,
    source: e.source,
    resolved: e.resolved,
    resolvedAt: e.resolved ? new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000) : undefined,
    resolvedBy: e.resolvedBy,
    resolution: e.resolution,
    details: e.details,
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000)
  }));

  const insertedEvents = await RiskEvent.insertMany(events);
  console.log(`✅ Inserted ${insertedEvents.length} risk events`);

  // Summary
  const byTier = await Customer.aggregate([{ $group: { _id: '$tier', count: { $sum: 1 } } }]);
  const byStatus = await Customer.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

  console.log('');
  console.log('📊 Summary:');
  console.log('   By tier:', byTier.map(b => `${b._id}=${b.count}`).join(', '));
  console.log('   By status:', byStatus.map(b => `${b._id}=${b.count}`).join(', '));
  console.log('');
  console.log('✅ Seed complete. Try:');
  console.log('   curl http://localhost:4885/api/customers');
  console.log('   curl http://localhost:4885/health');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
