/**
 * Template Compiler v2.0
 * AI-powered template compilation with intelligent agent generation
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '../../starters');

// ── AI-Powered Template Generation ─────────────────────────────────────────────

/**
 * Generate agents based on industry type (AI-powered)
 */
function generateAgentsFromDescription(companyName, description, industry) {
  const agentTemplates = {
    'food-delivery': [
      { role: 'RestaurantOnboarder', salary: 1500, model: 'gpt-4', skills: ['kyc', 'contract', 'training'], memory: ['restaurant_history'] },
      { role: 'OrderProcessor', salary: 1200, model: 'gpt-4', skills: ['order_routing', 'priority', 'refunds'], memory: ['order_history'] },
      { role: 'DeliveryCoordinator', salary: 1400, model: 'gpt-4', skills: ['driver_assignment', 'route_optimization', 'etd'], memory: ['delivery_metrics'] },
      { role: 'CustomerExperience', salary: 1100, model: 'gpt-4', skills: ['complaints', 'refunds', 'feedback'], memory: ['customer_history'] },
      { role: 'MarketingAgent', salary: 1300, model: 'gpt-4', skills: ['promotions', 'retention', 'winback'], memory: ['campaign_history'] }
    ],
    'ecommerce': [
      { role: 'CatalogManager', salary: 1400, model: 'gpt-4', skills: ['listings', 'seo', 'pricing'], memory: ['product_data'] },
      { role: 'OrderFulfillment', salary: 1200, model: 'gpt-4', skills: ['inventory', 'shipping', 'returns'], memory: ['order_history'] },
      { role: 'CustomerSupport', salary: 1100, model: 'gpt-4', skills: ['chat', 'refunds', 'tracking'], memory: ['ticket_history'] },
      { role: 'GrowthAgent', salary: 1500, model: 'gpt-4', skills: ['acquisition', 'retention', 'ltv'], memory: ['campaign_data'] },
      { role: 'FraudDetector', salary: 1300, model: 'gpt-4', skills: ['risk_scoring', 'patterns', 'alerts'], memory: ['fraud_history'] }
    ],
    'mobility': [
      { role: 'RideMatcher', salary: 1400, model: 'gpt-4', skills: ['matching', 'surge', 'allocation'], memory: ['ride_history'] },
      { role: 'DriverManager', salary: 1200, model: 'gpt-4', skills: ['onboarding', 'compliance', 'incentives'], memory: ['driver_data'] },
      { role: 'SafetyOfficer', salary: 1300, model: 'gpt-4', skills: ['incident_response', 'verification', 'alerts'], memory: ['safety_incidents'] },
      { role: 'PricingStrategist', salary: 1500, model: 'gpt-4', skills: ['dynamic_pricing', 'forecasting', 'competition'], memory: ['pricing_history'] },
      { role: 'OperationsAgent', salary: 1100, model: 'gpt-4', skills: ['dispatch', 'coverage', 'reporting'], memory: ['ops_metrics'] }
    ],
    'healthcare': [
      { role: 'AppointmentScheduler', salary: 1300, model: 'gpt-4', skills: ['booking', 'reminders', 'rescheduling'], memory: ['appointment_history'] },
      { role: 'PrescriptionManager', salary: 1400, model: 'gpt-4', skills: ['verification', 'interactions', 'refills'], memory: ['prescription_data'] },
      { role: 'PatientNavigator', salary: 1200, model: 'gpt-4', skills: ['intake', 'followup', 'satisfaction'], memory: ['patient_records'] },
      { role: 'InsuranceVerifier', salary: 1300, model: 'gpt-4', skills: ['eligibility', 'claims', 'coding'], memory: ['insurance_data'] },
      { role: 'HealthAdvisor', salary: 1600, model: 'gpt-4', skills: ['triage', 'education', 'prevention'], memory: ['health_tips'] }
    ]
  };

  return agentTemplates[industry] || agentTemplates['ecommerce'];
}

/**
 * Generate flows based on company type
 */
function generateFlowsFromType(industry) {
  const flowTemplates = {
    'food-delivery': [
      { id: 'order_placement', name: 'Order Placement Flow', trigger: 'user_action', steps: ['validate_cart', 'calculate_totals', 'apply_offers', 'confirm_order'] },
      { id: 'restaurant_onboarding', name: 'Restaurant Onboarding', trigger: 'manual', steps: ['collect_kyc', 'sign_contract', 'setup_menu', 'go_live'] },
      { id: 'delivery_dispatch', name: 'Delivery Dispatch', trigger: 'order_created', steps: ['assign_driver', 'notify_driver', 'track_pickup', 'track_delivery'] },
      { id: 'refund_processing', name: 'Refund Processing', trigger: 'complaint', steps: ['validate_complaint', 'approve_refund', 'process_payment', 'notify_customer'] },
      { id: 'marketing_campaign', name: 'Marketing Campaign', trigger: 'schedule', steps: ['select_audience', 'create_offer', 'send_campaign', 'track_roi'] }
    ],
    'ecommerce': [
      { id: 'product_listing', name: 'Product Listing', trigger: 'manual', steps: ['create_product', 'add_images', 'set_pricing', 'publish'] },
      { id: 'order_processing', name: 'Order Processing', trigger: 'order_created', steps: ['verify_payment', 'check_inventory', 'assign_warehouse', 'ship_order'] },
      { id: 'return_flow', name: 'Return Processing', trigger: 'return_request', steps: ['validate_return', 'schedule_pickup', 'inspect_item', 'process_refund'] },
      { id: 'customer_onboarding', name: 'Customer Onboarding', trigger: 'signup', steps: ['verify_email', 'welcome_offer', 'profile_setup', 'first_order'] },
      { id: 'fraud_detection', name: 'Fraud Detection', trigger: 'order_created', steps: ['score_order', 'verify_identity', 'block_suspicious', 'approve_normal'] }
    ],
    'mobility': [
      { id: 'ride_booking', name: 'Ride Booking', trigger: 'user_action', steps: ['validate_pickup', 'estimate_fare', 'match_driver', 'start_ride'] },
      { id: 'driver_onboarding', name: 'Driver Onboarding', trigger: 'manual', steps: ['collect_docs', 'verify_identity', 'vehicle_inspection', 'activate_account'] },
      { id: 'incident_response', name: 'Incident Response', trigger: 'safety_alert', steps: ['assess_situation', 'contact_parties', 'dispatch_help', 'file_report'] },
      { id: 'surge_pricing', name: 'Surge Pricing', trigger: 'demand_high', steps: ['analyze_demand', 'calculate_multiplier', 'notify_users', 'monitor_recovery'] },
      { id: 'driver_incentive', name: 'Driver Incentives', trigger: 'schedule', steps: ['analyze_performance', 'calculate_bonus', 'notify_driver', 'track_engagement'] }
    ],
    'healthcare': [
      { id: 'appointment_booking', name: 'Appointment Booking', trigger: 'user_action', steps: ['select_specialty', 'choose_doctor', 'pick_slot', 'send_reminder'] },
      { id: 'telemedicine', name: 'Telemedicine Flow', trigger: 'consultation', steps: ['verify_patient', 'connect_doctor', 'conduct_session', 'generate_prescription'] },
      { id: 'insurance_claim', name: 'Insurance Claim', trigger: 'treatment_complete', steps: ['collect_documents', 'submit_claim', 'track_status', 'process_payment'] },
      { id: 'patient_followup', name: 'Patient Followup', trigger: 'treatment_complete', steps: ['check_recovery', 'schedule_followup', 'send_reminders', 'collect_feedback'] },
      { id: 'prescription_refill', name: 'Prescription Refill', trigger: 'refill_request', steps: ['verify_prescription', 'check_refills', 'prepare_medicine', 'schedule_delivery'] }
    ]
  };

  return flowTemplates[industry] || flowTemplates['ecommerce'];
}

// Default policies
const DEFAULT_POLICIES = [
  { id: 'commission_policy', name: 'Commission Policy', type: 'financial', rules: { max_commission: 20, min_order_value: 100 } },
  { id: 'delivery_policy', name: 'Delivery Policy', type: 'operational', rules: { max_delivery_time: 60, free_delivery_threshold: 500 } },
  { id: 'kyc_policy', name: 'KYC Policy', type: 'compliance', rules: { required_documents: ['id_proof', 'address_proof', 'photo'] } }
];

// ── Code Generators ──────────────────────────────────────────────

function generatePassengerApp(template) {
  return `
// Passenger App - Generated by HOJAI Studio
// Template: ${template.id || template.industry}

import React from 'react';
import { View, Text, Button, TextInput, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

export default function PassengerApp({ navigation }) {
  const [destination, setDestination] = React.useState('');
  const [pickup, setPickup] = React.useState('${template.config?.home || 'Current Location'}');
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const categories = [
    { id: 'all', name: 'All', icon: '🔥' },
    { id: 'restaurants', name: 'Restaurants', icon: '🍔' },
    { id: 'grocery', name: 'Grocery', icon: '🛒' },
    { id: 'pharmacy', name: 'Pharmacy', icon: '💊' },
  ];

  const [items, setItems] = React.useState([
    { id: '1', name: 'Demo Restaurant', rating: 4.5, delivery: '30 min', cuisine: 'Indian' },
    { id: '2', name: 'Quick Bites', rating: 4.2, delivery: '25 min', cuisine: 'Chinese' },
    { id: '3', name: 'Food Court', rating: 4.7, delivery: '35 min', cuisine: 'Multi' },
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello! 👋</Text>
        <Text style={styles.title}>${template.name || 'Your App'}</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search for restaurants, dishes..."
          value={destination}
          onChangeText={setDestination}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.categories}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.categoryChip, selectedCategory === item.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(item.id)}
            >
              <Text style={styles.categoryIcon}>{item.icon}</Text>
              <Text style={[styles.categoryName, selectedCategory === item.id && styles.categoryNameActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.restaurantName}>{item.name}</Text>
              <View style={styles.rating}><Text>⭐ {item.rating}</Text></View>
            </View>
            <Text style={styles.cuisine}>{item.cuisine} • {item.delivery}</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.cartButton}>
        <Text style={styles.cartButtonText}>🛒 View Cart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#FF5722' },
  greeting: { fontSize: 14, color: '#FFF', opacity: 0.8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginTop: 4 },
  searchContainer: { padding: 16, backgroundColor: '#FFF', marginTop: -20 },
  searchInput: { backgroundColor: '#F5F5F5', padding: 14, borderRadius: 12, fontSize: 16 },
  categories: { paddingVertical: 12, backgroundColor: '#FFF' },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, marginLeft: 12, backgroundColor: '#F5F5F5', borderRadius: 20 },
  categoryChipActive: { backgroundColor: '#FF5722' },
  categoryIcon: { fontSize: 16, marginRight: 6 },
  categoryName: { fontSize: 14, color: '#666' },
  categoryNameActive: { color: '#FFF', fontWeight: '600' },
  list: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restaurantName: { fontSize: 16, fontWeight: '600', color: '#000' },
  rating: { flexDirection: 'row', alignItems: 'center' },
  cuisine: { fontSize: 14, color: '#666', marginTop: 4 },
  cartButton: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#FF5722', padding: 16, borderRadius: 12, alignItems: 'center' },
  cartButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});
`;
}

function generateDriverApp(template) {
  return `
// Driver App - Generated by HOJAI Studio
// Template: ${template.id || template.industry}

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

export default function DriverApp({ navigation }) {
  const [online, setOnline] = React.useState(false);
  const [earnings] = React.useState({ today: 2450, week: 12500, pending: 350 });
  const [orders] = React.useState([
    { id: '1', pickup: 'Pizza Palace', dropoff: '123 Main St', amount: 120, distance: '2.5 km' },
    { id: '2', pickup: 'Burger King', dropoff: '456 Oak Ave', amount: 85, distance: '1.8 km' },
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, Driver! 🚗</Text>
        <TouchableOpacity style={styles.profileButton}><Text>👤</Text></TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Go Online to start receiving orders</Text>
          <TouchableOpacity
            style={[styles.statusButton, online ? styles.statusButtonOnline : styles.statusButtonOffline]}
            onPress={() => setOnline(!online)}
          >
            <Text style={styles.statusButtonText}>{online ? 'ONLINE' : 'OFFLINE'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.earningsCard}>
        <Text style={styles.sectionTitle}>Today's Earnings</Text>
        <Text style={styles.earningsAmount}>₹{earnings.today.toLocaleString()}</Text>
        <View style={styles.earningsRow}>
          <View style={styles.earningsItem}>
            <Text style={styles.earningsLabel}>This Week</Text>
            <Text style={styles.earningsValue}>₹{earnings.week.toLocaleString()}</Text>
          </View>
          <View style={styles.earningsItem}>
            <Text style={styles.earningsLabel}>Pending</Text>
            <Text style={styles.earningsValue}>₹{earnings.pending}</Text>
          </View>
        </View>
      </View>

      {online && (
        <View style={styles.ordersSection}>
          <Text style={styles.sectionTitle}>Available Orders</Text>
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>#{item.id}</Text>
                  <Text style={styles.orderAmount}>₹{item.amount}</Text>
                </View>
                <Text style={styles.orderLocation}>📍 {item.pickup}</Text>
                <Text style={styles.orderLocation}>🎯 {item.dropoff}</Text>
                <Text style={styles.orderDistance}>Distance: {item.distance}</Text>
                <TouchableOpacity style={styles.acceptButton}>
                  <Text style={styles.acceptButtonText}>Accept Order</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#FF5722' },
  greeting: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  statusCard: { backgroundColor: '#FFF', margin: 16, padding: 16, borderRadius: 12, elevation: 2 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 14, color: '#666', flex: 1 },
  statusButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  statusButtonOnline: { backgroundColor: '#22C55E' },
  statusButtonOffline: { backgroundColor: '#EF4444' },
  statusButtonText: { color: '#FFF', fontWeight: '600' },
  earningsCard: { backgroundColor: '#1E293B', margin: 16, padding: 20, borderRadius: 16 },
  sectionTitle: { fontSize: 14, color: '#94A3B8', marginBottom: 8 },
  earningsAmount: { fontSize: 36, fontWeight: 'bold', color: '#FFF' },
  earningsRow: { flexDirection: 'row', marginTop: 16 },
  earningsItem: { flex: 1 },
  earningsLabel: { fontSize: 12, color: '#94A3B8' },
  earningsValue: { fontSize: 18, fontWeight: '600', color: '#FFF', marginTop: 4 },
  ordersSection: { flex: 1, padding: 16 },
  orderCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  orderId: { fontSize: 14, color: '#666' },
  orderAmount: { fontSize: 18, fontWeight: 'bold', color: '#22C55E' },
  orderLocation: { fontSize: 14, color: '#333', marginBottom: 4 },
  orderDistance: { fontSize: 12, color: '#666', marginBottom: 12 },
  acceptButton: { backgroundColor: '#FF5722', padding: 12, borderRadius: 8, alignItems: 'center' },
  acceptButtonText: { color: '#FFF', fontWeight: '600' }
});
`;
}

function generateAdminDashboard(template) {
  return `
// Admin Dashboard - Generated by HOJAI Studio
// Template: ${template.id || template.industry}

import React, { useState } from 'react';

export default function AdminDashboard() {
  const [stats] = useState({
    revenue: { today: 125000, week: 850000, growth: 12.5 },
    orders: { today: 450, week: 3200, growth: 8.3 },
    users: { total: 15000, new: 350, growth: 15.2 },
    drivers: { active: 120, online: 85, growth: 5.1 }
  });

  const StatCard = ({ title, value, growth, icon }) => (
    <div style={{ background: '#FFF', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, color: '#666' }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', marginTop: 4 }}>{value}</div>
          <div style={{ fontSize: 14, color: growth >= 0 ? '#22C55E' : '#EF4444', marginTop: 4 }}>
            {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}% vs last week
          </div>
        </div>
        <div style={{ fontSize: 32 }}>{icon}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, background: '#F5F5F5', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
        <StatCard title="Today's Revenue" value={'₹' + stats.revenue.today.toLocaleString()} growth={stats.revenue.growth} icon="💰" />
        <StatCard title="Orders Today" value={stats.orders.today} growth={stats.orders.growth} icon="📦" />
        <StatCard title="Active Users" value={stats.users.total.toLocaleString()} growth={stats.users.growth} icon="👥" />
        <StatCard title="Online Drivers" value={stats.drivers.online} growth={stats.drivers.growth} icon="🚗" />
      </div>

      <div style={{ background: '#FFF', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>Recent Activity</h2>
        <div style={{ fontSize: 14, color: '#666' }}>Dashboard loaded successfully</div>
      </div>
    </div>
  );
}
`;
}

function generateAgentsIndex(agents) {
  return `
// AI Agents Index - Generated by HOJAI Studio
// Total agents: ${agents.length}

${agents.map(a => `
/**
 * ${a.role} Agent
 * Monthly Cost: ₹${a.salary.toLocaleString()}
 * Model: ${a.model}
 */
export const ${a.role.replace(/\s+/g, '')}Agent = {
  id: '${a.id || uuidv4()}',
  role: '${a.role}',
  salary: ${a.salary},
  currency: 'INR',
  model: '${a.model}',
  capabilities: ${JSON.stringify(a.skills || [])},
  memory: ${JSON.stringify(a.memory || [])},
  status: 'active',
  tools: ['chat', 'api', 'webhook'],
  permissions: ['read', 'write', 'notify']
};`).join('\n')}

// Total monthly AI workforce cost
export const TOTAL_MONTHLY_COST = ${agents.reduce((s, a) => s + a.salary, 0)};
export const TOTAL_AGENTS = ${agents.length};
`;
}

function generateFlows(flows) {
  return `
// Flows Index - Generated by HOJAI Studio
// Total flows: ${flows.length}

export const FLOWS = ${JSON.stringify(flows, null, 2)};

// Flow execution engine
export async function executeFlow(flowId, context) {
  const flow = FLOWS.find(f => f.id === flowId);
  if (!flow) throw new Error(\`Flow \${flowId} not found\`);

  const results = [];
  for (const step of flow.steps) {
    const result = await executeStep(step, context);
    results.push({ step, result, timestamp: new Date() });
  }

  return { flowId, results, completedAt: new Date() };
}

async function executeStep(step, context) {
  return { success: true, step };
}
`;
}

function generatePolicies(policies) {
  return `
// Policies - Generated by HOJAI Studio

export const POLICIES = ${JSON.stringify(policies, null, 2)};

export function evaluatePolicy(policy, context) {
  const { rule, action, notification } = policy;
  return { action, notification, passed: true };
}
`;
}

function generatePackage(name, deps = {}) {
  return JSON.stringify({
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    dependencies: { 'express': '^4.18.2', 'cors': '^2.8.5', 'uuid': '^9.0.0', ...deps },
    scripts: { start: 'node src/index.js', dev: 'nodemon src/index.js' }
  }, null, 2);
}

function generateIndex(companyName, agents, flows) {
  return `
// ${companyName} - Generated by HOJAI Studio
// Powered by HOJAI Cloud + Nexha + DO

const PORT = process.env.PORT || 3000;
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors(), express.json());

app.get('/health', (_, res) => res.json({
  status: 'ok',
  company: '${companyName}',
  template: '${flows[0]?.template || 'custom'}',
  agents: ${agents.length},
  flows: ${flows.length},
  version: '2.0'
}));

app.get('/api/agents', (_, res) => res.json({
  agents: ${JSON.stringify(agents.map(a => ({ role: a.role, salary: a.salary })))},
  total: ${agents.reduce((s, a) => s + a.salary, 0)}/month
}));

app.get('/api/flows', (_, res) => res.json({
  flows: ${JSON.stringify(flows.map(f => ({ id: f.id, name: f.name })))}
}));

app.post('/api/${flows[0]?.id || 'execute'}', (req, res) => {
  res.json({ success: true, flow: '${flows[0]?.name}', status: 'running' });
});

app.listen(PORT, () => console.log(\`
╔══════════════════════════════════╗
║ ${companyName.padEnd(32)} ║
║ AI-powered by HOJAI Studio          ║
║ Agents: ${agents.length} | Flows: ${flows.length}        ║
╚══════════════════════════════════╝
\`));
`;
}

// ── Compiler ────────────────────────────────────────────────────────

export function compileTemplate({ name, template, outputDir, options = {} }) {
  const companyName = name || 'My Company';
  const out = outputDir || \`./output/\${companyName.toLowerCase().replace(/\\s+/g, '-')}\`;
  const industry = template.industry || template.id || 'ecommerce';

  // Generate agents and flows based on industry
  const agents = generateAgentsFromDescription(companyName, template.description, industry);
  const flows = generateFlowsFromType(industry);

  // Create directory structure
  mkdirSync(out, { recursive: true });
  mkdirSync(\`\${out}/apps/passenger-app\` , { recursive: true });
  mkdirSync(\`\${out}/apps/driver-app\` , { recursive: true });
  mkdirSync(\`\${out}/apps/admin-dashboard\`, { recursive: true });
  mkdirSync(\`\${out}/agents\`, { recursive: true });
  mkdirSync(\`\${out}/flows\`, { recursive: true });
  mkdirSync(\`\${out}/policies\`, { recursive: true });
  mkdirSync(\`\${out}/backend/src\`, { recursive: true });

  // Generate apps
  writeFileSync(\`\${out}/apps/passenger-app/App.tsx\`, generatePassengerApp({ ...template, name: companyName }));
  writeFileSync(\`\${out}/apps/driver-app/App.tsx\`, generateDriverApp({ ...template, name: companyName }));
  writeFileSync(\`\${out}/apps/admin-dashboard/App.tsx\`, generateAdminDashboard({ ...template, name: companyName }));

  // Generate agents index
  writeFileSync(\`\${out}/agents/index.js\`, generateAgentsIndex(agents));
  writeFileSync(\`\${out}/agents/package.json\`, generatePackage('agents'));

  // Generate flows
  writeFileSync(\`\${out}/flows/index.js\`, generateFlows(flows));

  // Generate policies
  writeFileSync(\`\${out}/policies/index.js\`, generatePolicies(DEFAULT_POLICIES));

  // Generate backend
  writeFileSync(\`\${out}/backend/src/index.js\`, generateIndex(companyName, agents, flows));
  writeFileSync(\`\${out}/backend/package.json\`, generatePackage(companyName));

  // Generate mobile package.json
  writeFileSync(\`\${out}/apps/passenger-app/package.json\`, JSON.stringify({
    name: \`\${companyName.toLowerCase()}-passenger\`,
    version: '1.0.0',
    dependencies: { 'expo': '^50.0.0', 'react-native': '0.73.2' }
  }, null, 2));

  writeFileSync(\`\${out}/apps/driver-app/package.json\`, JSON.stringify({
    name: \`\${companyName.toLowerCase()}-driver\`,
    version: '1.0.0',
    dependencies: { 'expo': '^50.0.0', 'react-native': '0.73.2' }
  }, null, 2));

  // Generate startup script
  writeFileSync(\`\${out}/start.sh\`, \`#!/bin/bash
# ${companyName} - Generated by HOJAI Studio

echo "🚀 Starting ${companyName}..."

# Start backend
cd backend && npm install && npm start &
BACKEND_PID=$!

echo "📱 Starting mobile apps..."
echo "Passenger App: cd apps/passenger-app && npx expo start"
echo "Driver App: cd apps/driver-app && npx expo start"
echo "Admin Dashboard: cd apps/admin-dashboard && npm start"

wait $BACKEND_PID
\`);

  return {
    company: companyName,
    output: out,
    agents: agents.length,
    flows: flows.length,
    policies: DEFAULT_POLICIES.length,
    monthlyCost: agents.reduce((s, a) => s + a.salary, 0)
  };
}
