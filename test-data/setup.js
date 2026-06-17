/**
 * Customer Operations OS - Test Data Setup
 * Loads sample data into MongoDB
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/customer-ops';
const DATA_DIR = __dirname;

// Schemas
const customerSchema = new mongoose.Schema({
  customerId: String,
  name: String,
  email: String,
  phone: String,
  city: String,
  state: String,
  pincode: String,
  segment: String,
  lifetimeValue: Number,
  orderCount: Number,
  lastOrderDate: Date,
  preferredPayment: String,
  createdAt: Date
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  orderId: String,
  customerId: String,
  items: [{
    product: String,
    quantity: Number,
    price: Number
  }],
  total: Number,
  discount: Number,
  status: String,
  city: String,
  createdAt: Date
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
  ticketId: String,
  customerId: String,
  subject: String,
  category: String,
  priority: String,
  status: String,
  assignedTo: String,
  createdAt: Date
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  paymentId: String,
  customerId: String,
  orderId: String,
  amount: Number,
  method: String,
  status: String,
  transactionId: String,
  createdAt: Date
}, { timestamps: true });

const leadSchema = new mongoose.Schema({
  leadId: String,
  name: String,
  email: String,
  phone: String,
  city: String,
  source: String,
  interest: String,
  budget: Number,
  status: String,
  assignedTo: String,
  notes: String,
  createdAt: Date
}, { timestamps: true });

// Models
const Customer = mongoose.model('Customer', customerSchema);
const Order = mongoose.model('Order', orderSchema);
const Ticket = mongoose.model('Ticket', ticketSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Lead = mongoose.model('Lead', leadSchema);

// Load JSON file
function loadJson(filename) {
  const filepath = path.join(DATA_DIR, filename);
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data);
}

// Clear collection
async function clearCollection(Model) {
  await Model.deleteMany({});
  console.log(`Cleared ${Model.modelName}`);
}

// Insert data
async function insertData(Model, filename, label) {
  const data = loadJson(filename);
  await Model.insertMany(data);
  console.log(`Inserted ${data.length} ${label}`);
}

// Main setup
async function setup() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    console.log('Setting up test data...\n');

    // Clear and insert customers
    await clearCollection(Customer);
    await insertData(Customer, 'customers.json', 'customers');

    // Clear and insert orders
    await clearCollection(Order);
    await insertData(Order, 'orders.json', 'orders');

    // Clear and insert tickets
    await clearCollection(Ticket);
    await insertData(Ticket, 'tickets.json', 'tickets');

    // Clear and insert payments
    await clearCollection(Payment);
    await insertData(Payment, 'payments.json', 'payments');

    // Clear and insert leads
    await clearCollection(Lead);
    await insertData(Lead, 'leads.json', 'leads');

    console.log('\n========================================');
    console.log('Test data setup complete!');
    console.log('========================================');
    console.log('\nCollections created:');
    console.log('  - customers (10)');
    console.log('  - orders (50)');
    console.log('  - tickets (30)');
    console.log('  - payments (40)');
    console.log('  - leads (20)');
    console.log('\nDatabase:', MONGO_URI);

  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run setup
setup();
