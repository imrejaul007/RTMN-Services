/**
 * Seed Script - Realistic Test Data for NeXha
 *
 * Run with: npx tsx scripts/seed.ts
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Data Generators
// ============================================================================

const cities = [
  { city: 'Mumbai', state: 'Maharashtra', region: 'West' },
  { city: 'Delhi', state: 'Delhi', region: 'North' },
  { city: 'Bangalore', state: 'Karnataka', region: 'South' },
  { city: 'Chennai', state: 'Tamil Nadu', region: 'South' },
  { city: 'Hyderabad', state: 'Telangana', region: 'South' },
  { city: 'Pune', state: 'Maharashtra', region: 'West' },
  { city: 'Ahmedabad', state: 'Gujarat', region: 'West' },
  { city: 'Kolkata', state: 'West Bengal', region: 'East' },
  { city: 'Surat', state: 'Gujarat', region: 'West' },
  { city: 'Lucknow', state: 'Uttar Pradesh', region: 'North' },
];

const brands = [
  'Nestle', 'Hindustan Unilever', 'ITC', 'Tata Consumer', 'Britannia',
  'Parle', 'Godrej', 'Dabur', 'Emami', 'Colgate-Palmolive',
  'PepsiCo', 'Coca-Cola', 'Cadbury', 'Lakme', 'Nivea',
];

const categories = ['FMCG', 'Food & Beverages', 'Pharmaceutical', 'Electronics', 'Cosmetics', 'Packaging'];

// ============================================================================
// Generate Distributors
// ============================================================================

function generateDistributors(count: number) {
  const distributors = [];

  for (let i = 0; i < count; i++) {
    const location = cities[Math.floor(Math.random() * cities.length)];
    const brandCount = Math.floor(Math.random() * 5) + 2;
    const selectedBrands = brands.slice(0, brandCount).sort(() => Math.random() - 0.5);

    distributors.push({
      id: randomUUID(),
      distributorNumber: `DIST-${(Date.now() + i).toString(36).toUpperCase()}`,
      businessName: `${location.city} ${['Metro', 'Prime', 'United', 'Global', 'National'][Math.floor(Math.random() * 5)]} ${categories[Math.floor(Math.random() * categories.length)].split(' ')[0]} Distributors`,
      ownerName: ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Gupta', 'Vikram Singh'][Math.floor(Math.random() * 5)],
      email: `contact@${location.city.toLowerCase()}${i}dist.com`,
      phone: `+91${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      type: ['distributor', 'wholesaler', 'stockist'][Math.floor(Math.random() * 3)],
      status: Math.random() > 0.1 ? 'active' : 'pending_onboarding',
      territory: {
        regions: [location.region],
        cities: [location.city],
        zones: ['Zone A', 'Zone B', 'Zone C'].slice(0, Math.floor(Math.random() * 3) + 1),
      },
      brands: selectedBrands.map(brand => ({
        brandId: randomUUID(),
        brandName: brand,
        status: 'active',
        since: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 2),
        target: {
          monthlyTarget: Math.floor(Math.random() * 5000000) + 1000000,
          achieved: Math.floor(Math.random() * 5000000),
          percentage: Math.random() * 100,
        },
      })),
      retailers: Array.from({ length: Math.floor(Math.random() * 400) + 50 }, (_, j) => ({
        retailerId: randomUUID(),
        retailerName: `${location.city} Retailer ${j + 1}`,
        status: Math.random() > 0.2 ? 'active' : 'inactive',
        since: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastOrderAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        monthlyOrders: Math.floor(Math.random() * 50) + 5,
      })),
      score: {
        sales: Math.floor(Math.random() * 20) + 80,
        collections: Math.floor(Math.random() * 15) + 80,
        logistics: Math.floor(Math.random() * 20) + 75,
        compliance: Math.floor(Math.random() * 10) + 90,
        overall: Math.floor(Math.random() * 15) + 82,
      },
      creditLimit: Math.floor(Math.random() * 10000000) + 1000000,
      outstandingBalance: Math.floor(Math.random() * 500000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return distributors;
}

// ============================================================================
// Generate Franchises
// ============================================================================

function generateFranchises(count: number) {
  const franchiseBrands = [
    { name: 'BurgerBox', type: 'restaurant', category: 'QSR', investment: [15, 25], roi: '18-24 months', fee: 5 },
    { name: 'GlowSalon', type: 'salon', category: 'Beauty', investment: [8, 15], roi: '12-18 months', fee: 2 },
    { name: 'FitZone Pro', type: 'fitness', category: 'Gym', investment: [25, 40], roi: '24-30 months', fee: 8 },
    { name: 'FreshMart', type: 'retail', category: 'Grocery', investment: [5, 10], roi: '8-12 months', fee: 1 },
    { name: 'PizzaHub Express', type: 'restaurant', category: 'Pizza', investment: [10, 18], roi: '14-20 months', fee: 3 },
    { name: 'CafeBrew', type: 'cafe', category: 'Coffee', investment: [6, 12], roi: '12-16 months', fee: 2 },
    { name: 'SalonElite', type: 'salon', category: 'Premium Beauty', investment: [12, 20], roi: '14-18 months', fee: 4 },
    { name: 'HealthyBites', type: 'restaurant', category: 'Health Food', investment: [8, 14], roi: '10-14 months', fee: 2 },
  ];

  const franchises = [];

  for (let i = 0; i < count; i++) {
    const brand = franchiseBrands[Math.floor(Math.random() * franchiseBrands.length)];
    const location = cities[Math.floor(Math.random() * cities.length)];
    const investment = brand.investment[0] + Math.floor(Math.random() * (brand.investment[1] - brand.investment[0]));

    franchises.push({
      id: randomUUID(),
      franchiseNumber: `FR-${(Date.now() + i).toString(36).toUpperCase()}`,
      brandId: randomUUID(),
      brandName: brand.name,
      locationId: randomUUID(),
      locationName: `${location.city} - ${['Central', 'West', 'East', 'North', 'South'][Math.floor(Math.random() * 5)]} Branch`,
      franchiseeName: ['Amit Mehta', 'Priya Nair', 'Suresh Iyer', 'Kavita Reddy', 'Rakesh Joshi'][Math.floor(Math.random() * 5)],
      franchiseePhone: `+91${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      franchiseeEmail: `amit${i}@email.com`,
      type: 'franchise' as const,
      status: Math.random() > 0.15 ? 'active' : 'suspended',
      address: {
        city: location.city,
        state: location.state,
      },
      performance: {
        period: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
        revenue: Math.floor(Math.random() * 500000) + 100000,
        revenueTarget: Math.floor(Math.random() * 600000) + 150000,
        orders: Math.floor(Math.random() * 500) + 100,
        ordersTarget: Math.floor(Math.random() * 600) + 200,
        customers: Math.floor(Math.random() * 1000) + 200,
        averageOrderValue: Math.floor(Math.random() * 500) + 200,
        growthRate: (Math.random() * 30 - 5),
        score: Math.floor(Math.random() * 20) + 75,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return franchises;
}

// ============================================================================
// Generate Manufacturers
// ============================================================================

function generateManufacturers(count: number) {
  const manufacturerTypes = [
    { name: 'Food Manufacturing', certs: ['FSSAI', 'ISO 22000', 'HACCP'] },
    { name: 'Pharmaceutical', certs: ['WHO-GMP', 'ISO 9001', 'COPP'] },
    { name: 'Cosmetics', certs: ['GMP', 'ISO 22716', 'BIS'] },
    { name: 'Packaging', certs: ['ISO 9001', 'BIS'] },
    { name: 'Electronics', certs: ['ISO 9001', 'CE', 'BIS'] },
  ];

  const manufacturers = [];

  for (let i = 0; i < count; i++) {
    const type = manufacturerTypes[Math.floor(Math.random() * manufacturerTypes.length)];
    const location = cities[Math.floor(Math.random() * cities.length)];

    manufacturers.push({
      id: randomUUID(),
      name: `${location.city} ${type.name.split(' ')[0]} Industries Pvt Ltd`,
      type: type.name.toLowerCase().replace(' ', '_'),
      location: `${location.city}, ${location.state}`,
      certifications: type.certs,
      minOrderQty: `${(Math.floor(Math.random() * 9) + 1) * 1000} units`,
      leadTime: `${Math.floor(Math.random() * 20) + 10}-${Math.floor(Math.random() * 15) + 20} days`,
      categories: [type.name.split(' ')[0], type.name.split(' ')[0] + ' Products'].slice(0, Math.floor(Math.random() * 2) + 1),
      capacity: `${(Math.floor(Math.random() * 90) + 10) * 1000} units/day`,
      verified: Math.random() > 0.2,
      rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
    });
  }

  return manufacturers;
}

// ============================================================================
// Main
// ============================================================================

async function seed() {
  console.log('🌱 Seeding NeXha database...\n');

  const distributorCount = 20;
  const franchiseCount = 30;
  const manufacturerCount = 15;

  logger.info(📦 Generating ${distributorCount} distributors...`);
  const distributors = generateDistributors(distributorCount);
  logger.info(   ✓ Created ${distributors.length} distributors`);

  logger.info(🏪 Generating ${franchiseCount} franchises...`);
  const franchises = generateFranchises(franchiseCount);
  logger.info(   ✓ Created ${franchises.length} franchises`);

  logger.info(🏭 Generating ${manufacturerCount} manufacturers...`);
  const manufacturers = generateManufacturers(manufacturerCount);
  logger.info(   ✓ Created ${manufacturers.length} manufacturers\n`);

  // Summary
  console.log('═══════════════════════════════════════════');
  console.log('📊 SEED SUMMARY');
  console.log('═══════════════════════════════════════════');
  logger.info(   Distributors: ${distributors.length}`);
  logger.info(   Franchises: ${franchises.length}`);
  logger.info(   Manufacturers: ${manufacturers.length}`);
  logger.info(   TOTAL: ${distributors.length + franchises.length + manufacturers.length} records`);
  console.log('═══════════════════════════════════════════\n');

  console.log('✅ Seed completed successfully!');
  console.log('\n💡 To use this data:');
  console.log('   1. Import these objects into your database');
  console.log('   2. Or use the API to POST to each service');
  console.log('   3. Run: npx tsx scripts/seed.ts --import\n');
}

// Run
seed().catch(console.error);
