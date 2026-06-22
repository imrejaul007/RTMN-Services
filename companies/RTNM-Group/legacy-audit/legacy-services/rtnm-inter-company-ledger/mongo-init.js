// MongoDB Initialization Script for RTNM Inter-Company Ledger
// This script runs on first startup to initialize the database

db = db.getSiblingDB('rtnm_inter_company_ledger');

// Create collections with validators
db.createCollection('ledgerentries', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['entryId', 'fromCorpId', 'toCorpId', 'type', 'amount', 'currency', 'description', 'status'],
      properties: {
        entryId: { bsonType: 'string' },
        fromCorpId: { bsonType: 'string' },
        toCorpId: { bsonType: 'string' },
        type: {
          bsonType: 'string',
          enum: [
            'SERVICE_FEE',
            'REVENUE_SHARE',
            'API_USAGE',
            'DATA_SHARING',
            'MARKETING_FEE',
            'INFRASTRUCTURE_COST',
            'SUPPORT_FEE',
            'REFERRAL_COMMISSION',
            'LOYALTY_REWARD',
            'SETTLEMENT',
          ],
        },
        amount: { bsonType: 'number', minimum: 0 },
        currency: { bsonType: 'string', enum: ['INR', 'USD', 'EUR'] },
        description: { bsonType: 'string' },
        metadata: { bsonType: 'object' },
        status: { bsonType: 'string', enum: ['PENDING', 'COMPLETED', 'CANCELLED'] },
        reconciledAt: { bsonType: 'date' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

db.createCollection('companybalances');

// Create indexes for ledgerentries
db.ledgerentries.createIndex({ entryId: 1 }, { unique: true });
db.ledgerentries.createIndex({ fromCorpId: 1, createdAt: -1 });
db.ledgerentries.createIndex({ toCorpId: 1, createdAt: -1 });
db.ledgerentries.createIndex({ fromCorpId: 1, toCorpId: 1, createdAt: -1 });
db.ledgerentries.createIndex({ status: 1, type: 1 });
db.ledgerentries.createIndex({ createdAt: -1 });

// Create indexes for companybalances
db.companybalances.createIndex({ corpId: 1 }, { unique: true });

// Initialize company balance records for all 22 companies
const companies = [
  'HOJAI-AI',
  'RABTUL-Technologies',
  'REZ-Intelligence',
  'REZ-Consumer',
  'KHAIRMOVE',
  'AXOM',
  'AdBazaar',
  'REZ-Merchant',
  'REZ-Move',
  'RIDZA',
  'LawGens',
  'AssetMind',
  'RisaCare',
  'CorpPerks',
  'StayOwn-Hospitality',
  'RTNM-Group',
  'RisnaEstate',
  'REZ-Workspace',
  'Hotel OTA',
  'RABTUL-SaaS',
  'RTNM-Digital',
  'Nexha',
];

companies.forEach((corpId) => {
  db.companybalances.updateOne(
    { corpId: corpId },
    {
      $setOnInsert: {
        corpId: corpId,
        revenue: 0,
        cost: 0,
        net: 0,
        pendingRevenue: 0,
        pendingCost: 0,
        lastSettledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
});

print('RTNM Inter-Company Ledger database initialized successfully');
print('Created collections: ledgerentries, companybalances');
print('Initialized balances for ' + companies.length + ' companies');