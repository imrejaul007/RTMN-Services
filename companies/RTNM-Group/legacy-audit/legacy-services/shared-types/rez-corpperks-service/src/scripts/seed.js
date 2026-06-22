/**
 * CorpPerks Database Seed Script
 * Run with: npm run seed
 */

require('dotenv').config();
const { connectDB, mongoose } = require('../config/database');
const {
  Company,
  Employee,
  Benefit,
  BenefitUsage,
  Booking,
  Invoice,
  Campaign,
  Wallet,
  Card,
  RewardTransaction
} = require('../models/schemas');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Seeding database...');

    // Clear existing data
    await Promise.all([
      Company.deleteMany({}),
      Employee.deleteMany({}),
      Benefit.deleteMany({}),
      BenefitUsage.deleteMany({}),
      Booking.deleteMany({}),
      Invoice.deleteMany({}),
      Campaign.deleteMany({}),
      Wallet.deleteMany({}),
      Card.deleteMany({}),
      RewardTransaction.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create Company
    const company = await Company.create({
      companyId: 'C001',
      name: 'TechCorp India',
      gstIn: '27AABCU9603R1ZM',
      address: {
        billing: '123 Tech Park, Andheri West, Mumbai 400058',
        shipping: '123 Tech Park, Andheri West, Mumbai 400058',
      },
      plan: 'enterprise',
      status: 'active',
    });
    console.log('Created company:', company.name);

    // Create Benefits
    const benefits = await Benefit.insertMany([
      { companyId: 'C001', name: 'Meal Allowance', type: 'meal', amount: 2000, frequency: 'monthly', status: 'active' },
      { companyId: 'C001', name: 'Travel Allowance', type: 'travel', amount: 10000, frequency: 'monthly', status: 'active' },
      { companyId: 'C001', name: 'Wellness Budget', type: 'wellness', amount: 3000, frequency: 'monthly', status: 'active' },
      { companyId: 'C001', name: 'Learning Fund', type: 'learning', amount: 5000, frequency: 'yearly', status: 'active' },
      { companyId: 'C001', name: 'Gift Budget', type: 'gift', amount: 2500, frequency: 'yearly', status: 'active' },
    ]);
    console.log('Created', benefits.length, 'benefits');

    // Create Employees
    const employees = await Employee.insertMany([
      { employeeId: 'E001', companyId: 'C001', name: 'John Doe', email: 'john@techcorp.com', phone: '+919876543210', department: 'Engineering', level: 'L3', designation: 'Senior Developer', status: 'enrolled', walletBalance: 5000, karmaScore: 850, enrolledAt: new Date() },
      { employeeId: 'E002', companyId: 'C001', name: 'Jane Smith', email: 'jane@techcorp.com', phone: '+919876543211', department: 'Marketing', level: 'L4', designation: 'Marketing Manager', status: 'enrolled', walletBalance: 7500, karmaScore: 920, enrolledAt: new Date() },
      { employeeId: 'E003', companyId: 'C001', name: 'Bob Wilson', email: 'bob@techcorp.com', phone: '+919876543212', department: 'Sales', level: 'L2', designation: 'Sales Executive', status: 'enrolled', walletBalance: 3000, karmaScore: 780, enrolledAt: new Date() },
      { employeeId: 'E004', companyId: 'C001', name: 'Alice Brown', email: 'alice@techcorp.com', phone: '+919876543213', department: 'HR', level: 'L3', designation: 'HR Manager', status: 'enrolled', walletBalance: 4000, karmaScore: 950, enrolledAt: new Date() },
      { employeeId: 'E005', companyId: 'C001', name: 'Charlie Davis', email: 'charlie@techcorp.com', phone: '+919876543214', department: 'Engineering', level: 'L2', designation: 'Developer', status: 'pending', walletBalance: 0, karmaScore: 0 },
    ]);
    console.log('Created', employees.length, 'employees');

    // Create Wallet
    const wallet = await Wallet.create({
      walletId: 'W001',
      companyId: 'C001',
      balance: 500000,
      availableLimit: 500000,
      usedAmount: 0,
      currency: 'INR',
      status: 'active',
      type: 'corporate',
    });
    console.log('Created wallet:', wallet.walletId);

    // Create Cards
    const cards = await Card.insertMany([
      { cardId: 'CARD001', walletId: 'W001', companyId: 'C001', employeeId: 'E001', cardNumber: '4000 1234 5678 9012', cardNumberLast4: '9012', cardType: 'virtual', cardholderName: 'John Doe', expiryMonth: '12', expiryYear: '2028', status: 'active', limit: 100000, usedAmount: 25000, dailyLimit: 25000, monthlyLimit: 100000 },
      { cardId: 'CARD002', walletId: 'W001', companyId: 'C001', employeeId: 'E002', cardNumber: '4000 1234 5678 9034', cardNumberLast4: '9034', cardType: 'physical', cardholderName: 'Jane Smith', expiryMonth: '12', expiryYear: '2027', status: 'active', limit: 50000, usedAmount: 12000, dailyLimit: 15000, monthlyLimit: 50000 },
    ]);
    console.log('Created', cards.length, 'cards');

    // Create Campaigns
    const campaigns = await Campaign.insertMany([
      {
        campaignId: 'CAMP001',
        companyId: 'C001',
        name: 'Diwali Gifting 2026',
        type: 'gift',
        description: 'Festival gift for all employees',
        status: 'active',
        budget: 500000,
        spent: 125000,
        startDate: new Date('2026-10-15'),
        endDate: new Date('2026-11-15'),
        eligibleEmployees: ['E001', 'E002', 'E003', 'E004', 'E005'],
        participants: [
          { employeeId: 'E001', enrolledAt: new Date(), status: 'completed' },
          { employeeId: 'E002', enrolledAt: new Date(), status: 'completed' },
          { employeeId: 'E003', enrolledAt: new Date(), status: 'pending' },
        ],
      },
      {
        campaignId: 'CAMP002',
        companyId: 'C001',
        name: 'Plant 1000 Trees',
        type: 'karma',
        description: 'Environmental impact challenge',
        status: 'active',
        budget: 100000,
        spent: 45000,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-06-30'),
        eligibleEmployees: ['E001', 'E002', 'E003', 'E004'],
        participants: [
          { employeeId: 'E001', enrolledAt: new Date(), participatedAt: new Date(), status: 'completed' },
          { employeeId: 'E002', enrolledAt: new Date(), participatedAt: new Date(), status: 'completed' },
        ],
        target: 1000,
        current: 420,
        impactType: 'trees',
      },
      {
        campaignId: 'CAMP003',
        companyId: 'C001',
        name: 'Q2 Performance Rewards',
        type: 'reward',
        description: 'Reward for top performers',
        status: 'draft',
        budget: 200000,
        spent: 0,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-06-30'),
        eligibleEmployees: ['E001', 'E002', 'E003', 'E004'],
        rewards: [{ type: 'coins', amount: 5000, description: '5000 ReZ Coins' }],
      },
    ]);
    console.log('Created', campaigns.length, 'campaigns');

    // Create Reward Transactions
    const transactions = await RewardTransaction.insertMany([
      { transactionId: 'TX001', employeeId: 'E001', companyId: 'C001', type: 'earn', amount: 500, source: 'Referral Bonus', description: 'Referred Jane', balanceAfter: 5500 },
      { transactionId: 'TX002', employeeId: 'E002', companyId: 'C001', type: 'earn', amount: 1000, source: 'Campaign Reward', description: 'Karma points', balanceAfter: 8500 },
      { transactionId: 'TX003', employeeId: 'E001', companyId: 'C001', type: 'redeem', amount: 1000, source: 'Reward Redemption', description: '₹100 Gift Card', balanceAfter: 4500 },
      { transactionId: 'TX004', employeeId: 'E003', companyId: 'C001', type: 'earn', amount: 200, source: 'Karma Points', description: 'Volunteer event', balanceAfter: 3200 },
    ]);
    console.log('Created', transactions.length, 'reward transactions');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nDemo credentials:');
    console.log('Company: TechCorp India (C001)');
    console.log('Employees: E001 (John), E002 (Jane), E003 (Bob), E004 (Alice), E005 (Charlie)');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
