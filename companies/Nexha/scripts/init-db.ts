import { logger } from '../../shared/logger';
/**
 * Database Initialization Script
 * Creates collections, indexes, and seed data
 *
 * Run: npx tsx scripts/init-db.ts
 */

import mongoose from 'mongoose';

// ============================================================================
// Configuration
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexha';

const SERVICE_DBS = {
  distribution: 'nexha_distribution',
  franchise: 'nexha_franchise',
  procurement: 'nexha_procurement',
  manufacturing: 'nexha_manufacturing',
  finance: 'nexha_finance',
};

// ============================================================================
// Schemas
// ============================================================================

// Distributor Schema
const distributorSchema = new mongoose.Schema({
  distributorNumber: { type: String, required: true, unique: true },
  businessName: { type: String, required: true, index: true },
  ownerName: { type: String, required: true },
  email: { type: String, required: true, index: true },
  phone: { type: String, required: true },
  type: { type: String, enum: ['distributor', 'wholesaler', 'stockist', 'dealer'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended', 'pending_onboarding'], default: 'pending_onboarding' },
  territory: {
    regions: [String],
    cities: [String],
    zones: [String],
  },
  brands: [{
    brandId: String,
    brandName: String,
    status: String,
    since: Date,
  }],
  retailers: [{
    retailerId: String,
    retailerName: String,
    status: String,
    since: Date,
  }],
  score: {
    sales: Number,
    collections: Number,
    logistics: Number,
    overall: Number,
  },
}, { timestamps: true });

// Franchise Schema
const franchiseSchema = new mongoose.Schema({
  franchiseNumber: { type: String, required: true, unique: true },
  brandId: { type: String, required: true, index: true },
  brandName: { type: String, required: true },
  locationName: { type: String, required: true },
  franchiseeName: { type: String, required: true },
  franchiseeEmail: { type: String, required: true },
  franchiseePhone: { type: String, required: true },
  type: { type: String, enum: ['owned', 'franchise', 'licensed'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'pending_onboarding' },
  address: {
    city: String,
    state: String,
    country: String,
  },
  performance: {
    revenue: Number,
    revenueTarget: Number,
    orders: Number,
    score: Number,
  },
}, { timestamps: true });

// Supplier Schema
const supplierSchema = new mongoose.Schema({
  supplierNumber: { type: String, required: true, unique: true },
  businessName: { type: String, required: true, index: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  categories: [String],
  certifications: [String],
  rating: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
}, { timestamps: true });

// RFQ Schema
const rfqSchema = new mongoose.Schema({
  rfqNumber: { type: String, required: true, unique: true },
  merchantId: { type: String, required: true, index: true },
  merchantName: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  items: [{
    productName: String,
    quantity: Number,
    unit: String,
  }],
  status: { type: String, enum: ['draft', 'open', 'quoted', 'awarded', 'closed'], default: 'draft' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  deadline: Date,
  invitedSuppliers: [String],
}, { timestamps: true });

// Credit Line Schema
const creditLineSchema = new mongoose.Schema({
  creditNumber: { type: String, required: true, unique: true },
  businessId: { type: String, required: true, index: true },
  businessName: { type: String, required: true },
  type: { type: String, enum: ['distributor', 'merchant', 'franchise', 'manufacturer'] },
  creditLimit: { type: Number, required: true },
  usedAmount: { type: Number, default: 0 },
  availableAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  interestRate: Number,
}, { timestamps: true });

// ============================================================================
// Initialization
// ============================================================================

async function initializeDatabase(dbName: string) {
  logger.info(`\n📦 Initializing ${dbName}...`);

  // Connect to the specific database
  await mongoose.connect(`${MONGODB_URI}/${dbName}`);
  logger.info(`   ✓ Connected to ${dbName}`);

  // Create collections and models based on database name
  switch (dbName) {
    case SERVICE_DBS.distribution:
      await mongoose.connection.createCollection('distributors');
      const Distributor = mongoose.model('Distributor', distributorSchema);
      await Distributor.createIndexes();
      logger.info(`   ✓ Created distributors collection with indexes`);
      break;

    case SERVICE_DBS.franchise:
      await mongoose.connection.createCollection('franchises');
      const Franchise = mongoose.model('Franchise', franchiseSchema);
      await Franchise.createIndexes();
      logger.info(`   ✓ Created franchises collection with indexes`);
      break;

    case SERVICE_DBS.procurement:
      await mongoose.connection.createCollection('suppliers');
      await mongoose.connection.createCollection('rfqs');
      await mongoose.connection.createCollection('orders');
      const Supplier = mongoose.model('Supplier', supplierSchema);
      const RFQ = mongoose.model('RFQ', rfqSchema);
      await Supplier.createIndexes();
      await RFQ.createIndexes();
      logger.info(`   ✓ Created suppliers, rfqs, orders collections`);
      break;

    case SERVICE_DBS.manufacturing:
      await mongoose.connection.createCollection('boms');
      await mongoose.connection.createCollection('production_orders');
      await mongoose.connection.createCollection('batches');
      logger.info(`   ✓ Created manufacturing collections`);
      break;

    case SERVICE_DBS.finance:
      await mongoose.connection.createCollection('credit_lines');
      await mongoose.connection.createCollection('bnpl_transactions');
      await mongoose.connection.createCollection('loans');
      await mongoose.connection.createCollection('invoices');
      const CreditLine = mongoose.model('CreditLine', creditLineSchema);
      await CreditLine.createIndexes();
      logger.info(`   ✓ Created finance collections`);
      break;
  }

  await mongoose.disconnect();
  logger.info(`   ✓ Disconnected from ${dbName}`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  logger.info('═══════════════════════════════════════════');
  logger.info('  NeXha Database Initialization');
  logger.info('═══════════════════════════════════════════\n');

  logger.info(`MongoDB URI: ${MONGODB_URI}\n`);

  try {
    // Initialize each database
    for (const dbName of Object.values(SERVICE_DBS)) {
      await initializeDatabase(dbName);
    }

    logger.info('\n═══════════════════════════════════════════');
    logger.info('  ✅ All databases initialized successfully!');
    logger.info('═══════════════════════════════════════════\n');

  } catch (error) {
    logger.error('\n❌ Initialization failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
