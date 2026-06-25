/**
 * seed.ts — CLI seed script for nexha-federation-os
 *
 * Seeds realistic Nexhas across 26 industry categories.
 *
 * Usage:
 *   npx tsx src/scripts/seed.ts                          # seed 100 Nexhas (default)
 *   npx tsx src/scripts/seed.ts --count=50               # seed 50 Nexhas
 *   npx tsx src/scripts/seed.ts --tiers=founding:5,strategic:15,standard:20,associate:8,observer:2
 */

import { parseArgs } from 'node:util';
import federationService from '../services/federationService.js';

// ── Industry categories with realistic metadata templates ──────────────────────

const INDUSTRIES = [
  // Manufacturing
  { category: 'manufacturing.steel',           tier: 'strategic', name: ['Shakti Steel Works', 'Apex Iron & Steel', 'Bengal Steel Mills', 'Rohini Metal Industries', 'Vikram Alloys'], city: ['Mumbai', 'Kolkata', 'Ludhiana', 'Ahmedabad', 'Chennai'] },
  { category: 'manufacturing.textile',         tier: 'standard',  name: ['Bhiwandi Textile Hub', 'Silk Route Exports', 'Kalamkari Fabrics', 'Cotton County India', 'Prakash Spinners'], city: ['Bhiwandi', 'Surat', 'Erode', 'Indore', 'Jaipur'] },
  { category: 'manufacturing.food',             tier: 'standard',  name: ['Fresh Fields Foods', 'Spice Garden Industries', 'Mithaiwala Sweets', 'Grain Bowl Foods', 'Coastal Catch Seafood'], city: ['Nashik', 'Madhya Pradesh', 'Kolkata', 'Bangalore', 'Kochi'] },
  { category: 'manufacturing.pharma',           tier: 'founding',  name: ['MedLife Formulations', 'SunPrime Pharmaceuticals', 'Curewell Drugs', 'BioSynth Labs', 'Arogya Pharma'], city: ['Hyderabad', 'Mumbai', 'Ahmedabad', 'Baddi', 'Bangalore'] },
  { category: 'manufacturing.auto',             tier: 'strategic', name: ['Precision Auto Parts', 'DriveTech Components', 'MotorEdge India', 'GearWorks', 'ChassisCraft'], city: ['Pune', 'Gurgaon', 'Chennai', 'Aurangabad', 'Bangalore'] },
  { category: 'manufacturing.chemical',         tier: 'standard',  name: ['ChemTech Solutions', 'Solvent India', 'PolyBlend Chemicals', 'Reactive Labs', 'Acid Works India'], city: ['Mumbai', 'Ankleshwar', 'Dahej', 'Kochi', 'Chennai'] },
  { category: 'manufacturing.electronics',     tier: 'standard',  name: ['ChipLogic India', 'VoltEdge Systems', 'PCBCraft India', 'SemiCon Labs', 'WireTech Components'], city: ['Bangalore', 'Hyderabad', 'Noida', 'Pune', 'Chennai'] },

  // Logistics
  { category: 'logistics.delivery',           tier: 'strategic', name: ['FastTrack Logistics', 'OnDot Couriers', 'CitySprint India', 'ParcelPro', 'SwiftMove Express'], city: ['Delhi', 'Mumbai', 'Bangalore', 'Pune', 'Hyderabad'] },
  { category: 'logistics.warehouse',           tier: 'standard',  name: ['StoreVault Warehousing', 'SpaceMax Logistics', 'WareHub India', 'GridStore Facilities', 'FreightNest Storage'], city: ['Nashik', 'Bhiwandi', 'Gurgaon', 'Chennai', 'Bangalore'] },
  { category: 'logistics.cold_chain',          tier: 'standard',  name: ['ChillChain India', 'IceBridge Cold Storage', 'FreezeFlow Logistics', 'CoolFreight India', 'TempGuard Cold Chain'], city: ['Nashik', 'Kolkata', 'Bangalore', 'Mumbai', 'Lucknow'] },
  { category: 'logistics.freight',             tier: 'standard',  name: ['CargoLink India', 'FreightBridge', 'GlobalCargo Connect', 'TradeHaul', 'LoadMax Freight'], city: ['Mumbai', 'Chennai', 'Kolkata', 'Delhi', 'Nhava Sheva'] },

  // Distribution
  { category: 'distribution.wholesale',        tier: 'standard',  name: ['Bharat Wholesale Hub', 'Metro Distributors', 'WholeTrade India', 'BulkMart Wholesale', 'TradeDepot India'], city: ['Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Ahmedabad'] },
  { category: 'distribution.retail',            tier: 'standard',  name: ['RetailEdge India', 'ShopFirst Distributors', 'RetailBridge', 'BrandReach India', 'StoreNet Distribution'], city: ['All India', 'Tier 1 Cities', 'Metro Markets'] },

  // Franchise
  { category: 'franchise.food',               tier: 'founding',  name: ['FoodFranchise India', 'TasteBuds Chain', 'CafeConnect India', 'BiteBox Franchise', 'QuickBite India'], city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'] },
  { category: 'franchise.retail',              tier: 'strategic', name: ['RetailMart Franchise', 'ShopSpot India', 'BrandBox Franchise', 'FranchiseFirst', 'OutletConnect'], city: ['Delhi NCR', 'Mumbai', 'Bangalore', 'Pune', 'Chennai'] },
  { category: 'franchise.hospitality',          tier: 'strategic', name: ['Staysmart Hotels', 'LodgeLink India', 'TravelNest Franchises', 'ComfortStay India', 'Homebase Hospitality'], city: ['Jaipur', 'Goa', 'Mumbai', 'Delhi', 'Bangalore'] },

  // Finance
  { category: 'finance.accounting',            tier: 'standard',  name: ['LedgerLogic India', 'BooksPro Services', 'TaxShield Advisors', 'AuditEdge India', 'BalanceWorks'], city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'] },
  { category: 'finance.insurance',             tier: 'strategic', name: ['SecureLife Broking', 'InsureBridge India', 'RiskShield Advisors', 'CoverHub India', 'PolicyMart'], city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'] },
  { category: 'finance.lending',               tier: 'strategic', name: ['BizLoans India', 'CapitalEdge Lending', 'GrowthFund India', 'TradeCredit Connect', 'InstaLoan Hub'], city: ['Mumbai', 'Bangalore', 'Delhi', 'Chennai', 'Pune'] },

  // Healthcare
  { category: 'healthcare.clinic',             tier: 'standard',  name: ['HealthFirst Clinics', 'CarePoint India', 'WellnessHub', 'MediServe Clinics', 'HealFast India'], city: ['Bangalore', 'Mumbai', 'Hyderabad', 'Chennai', 'Pune'] },
  { category: 'healthcare.pharma_dist',         tier: 'strategic', name: ['PharmaBridge India', 'MedDist Network', 'DrugFlow Logistics', 'RxConnect India', 'MediTrade Hub'], city: ['Mumbai', 'Hyderabad', 'Ahmedabad', 'Kolkata', 'Delhi'] },

  // IT & Services
  { category: 'it.software',                  tier: 'founding',  name: ['CodeCraft India', 'BuildStack Solutions', 'DevNexus', 'CloudBridge India', 'ByteForge Technologies'], city: ['Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Gurgaon'] },
  { category: 'it.consulting',               tier: 'standard',  name: ['StratEdge Consulting', 'GrowthPivot India', 'AdviseIQ', 'ConsultBridge', 'InsightFlow Advisors'], city: ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Gurgaon'] },

  // Media
  { category: 'media.content',                 tier: 'standard',  name: ['StoryStack Studios', 'ContentCraft India', 'MediaBridge Productions', 'CreatorHub India', 'PixelTale Studios'], city: ['Mumbai', 'Bangalore', 'Delhi', 'Chennai', 'Hyderabad'] },
  { category: 'media.advertising',            tier: 'standard',  name: ['AdVentive India', 'BrandCraft Media', 'ReachMatrix', 'AdPulse India', 'CampaignEdge'], city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'] },

  // Real Estate
  { category: 'realestate.property',           tier: 'standard',  name: ['PropNex Realty', 'SpaceFind India', 'EstateEdge', 'HomeValley Realty', 'PropertyHub India'], city: ['Mumbai', 'Bangalore', 'Delhi', 'Pune', 'Hyderabad'] },

  // Education
  { category: 'education.edtech',              tier: 'strategic', name: ['LearnStack India', 'EduBridge Academy', 'SkillUp India', 'TechTeach Platform', 'GrowSkills Education'], city: ['Bangalore', 'Delhi', 'Mumbai', 'Hyderabad', 'Chennai'] },

  // Agriculture
  { category: 'agriculture.commodity',          tier: 'standard',  name: ['AgriConnect India', 'HarvestTrade Hub', 'FarmGate Commodities', 'CropLink India', 'Mandisync'], city: ['Nagpur', 'Indore', 'Lucknow', 'Patna', 'Bhopal'] },

  // Hospitality
  { category: 'hospitality.hotel',             tier: 'strategic', name: ['StayEase Hotels', 'CloudNine Stays', 'Vista Hotels India', 'HeritageInn Group', 'UrbanRest Hotels'], city: ['Jaipur', 'Goa', 'Kerala', 'Mumbai', 'Delhi'] },
  { category: 'hospitality.restaurant',        tier: 'standard',  name: ['TasteTrek India', 'FlavorHub Restaurants', 'CraveConnect', 'DineCircle India', 'EatStreet Ventures'], city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'] },
];

const REGIONS = ['IN', 'SG', 'ID', 'MY', 'TH', 'VN', 'BD', 'PK', 'NP', 'LK'];

const OS_VERSIONS = ['nexha-os-1.4.0', 'nexha-os-1.4.1', 'nexha-os-1.5.0-beta'];

// ── Utilities ────────────────────────────────────────────────────────────────

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isoDate(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);
  return d.toISOString();
}

function generateEmail(name: string, domain: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  return `hello@${slug}-${domain}.in`;
}

function generatePublicKey(): string {
  return `fp:${uuid().replace(/-/g, '').slice(0, 24)}`;
}

// ── Seed logic ──────────────────────────────────────────────────────────────

function parseTiersArg(tiersArg: string): Record<string, number> {
  const result: Record<string, number> = { founding: 0, strategic: 0, standard: 0, associate: 0, observer: 0 };
  const parts = tiersArg.split(',');
  for (const part of parts) {
    const [tier, count] = part.trim().split(':');
    if (tier in result && count !== undefined) {
      result[tier] = parseInt(count, 10);
    }
  }
  return result;
}

export async function seed(count: number, tiers: Record<string, number>) {
  console.log(`\n🧬 Seeding FederationOS...\n`);

  // Reset existing data
  federationService.reset();
  console.log('  ✓ Cleared existing data');

  const totalTiers = Object.values(tiers).reduce((a, b) => a + b, 0);
  if (totalTiers !== count) {
    // Distribute remaining slots proportionally
    const scale = count / totalTiers;
    for (const tier of Object.keys(tiers)) {
      tiers[tier] = Math.round(tiers[tier] * scale);
    }
    // Fix rounding: add/subtract from largest bucket
    const actual = Object.values(tiers).reduce((a, b) => a + b, 0);
    tiers.standard += (count - actual);
  }

  const createdNexhas: { id: string; tier: string; region: string; categories: string[] }[] = [];

  // ── Create Nexhas per industry ──────────────────────────────────────────

  for (const industry of INDUSTRIES) {
    // How many Nexhas for this industry?
    const industryCount = industry.tier === 'founding' ? 2 : industry.tier === 'strategic' ? 3 : 4;

    for (let i = 0; i < industryCount; i++) {
      const name = `${randomChoice(industry.name)} ${i > 0 ? `#${i + 1}` : ''}`.trim();
      const region = industry.city[0].startsWith('Goa') || industry.city[0].startsWith('Kerala') ? 'IN' : 'IN';
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      const status = Math.random() < 0.1 ? 'pending' : Math.random() < 0.05 ? 'suspended' : 'active';

      const metadata: Record<string, unknown> = {};
      if (industry.category.startsWith('manufacturing')) {
        metadata.capacity_tons_per_month = randomInt(100, 5000);
        metadata.certifications = ['ISO 9001', 'ISO 14001'];
        metadata.employee_count = randomInt(50, 2000);
      } else if (industry.category.startsWith('logistics')) {
        metadata.fleet_size = randomInt(10, 500);
        metadata.daily_parcels = randomInt(500, 25000);
        metadata.cities_covered = randomInt(3, 50);
      } else if (industry.category.startsWith('healthcare')) {
        metadata.beds = randomInt(20, 500);
        metadata.certifications = ['NABH', 'JCI'];
        metadata.emergency_available = Math.random() > 0.3;
      } else if (industry.category.startsWith('franchise')) {
        metadata.outlets = randomInt(3, 200);
        metadata.employee_count = randomInt(20, 5000);
      } else if (industry.category.startsWith('it.')) {
        metadata.engineers = randomInt(10, 500);
        metadata.projects_delivered = randomInt(5, 200);
        metadata.employee_count = randomInt(15, 600);
      } else {
        metadata.employee_count = randomInt(10, 500);
      }

      const id = `nexha-${slug}-${uuid().slice(0, 6)}`;
      const now = isoDate(0);
      const registered = federationService.register({
        name,
        description: `A ${industry.category.replace('.', ' ')} business network node. Serving ${randomInt(10, 500)} partners across ${region}.`,
        region,
        contactEmail: generateEmail(name, slug),
        publicKey: generatePublicKey(),
        categories: [industry.category],
        osVersion: randomChoice(OS_VERSIONS),
      });
      // register() creates its own ID, so use that instead of our constructed one
      // industry.tier maps to membership tier; 'standard' → 'standard', 'strategic' → 'strategic'
      federationService.update(registered.id, { status, metadata, tier: industry.tier as any });

      createdNexhas.push({ id: registered.id, tier: registered.tier, region: registered.region, categories: [industry.category] });
    }
  }

  // ── Create additional Nexhas to reach count ───────────────────────────────
  // (already covered by the loop above for realistic count)

  // ── Create bilateral handshakes ──────────────────────────────────────────

  const activeNexhas = createdNexhas.filter(n => n.tier === 'founding' || n.tier === 'strategic');
  let handshakesCreated = 0;

  for (const nexha of activeNexhas) {
    const peerCount = nexha.tier === 'founding' ? randomInt(3, 6) : randomInt(1, 4);
    const candidates = activeNexhas.filter(n => n.id !== nexha.id && n.categories.some(c => nexha.categories.includes(c)));

    for (let p = 0; p < Math.min(peerCount, candidates.length); p++) {
      const peer = candidates[p];
      if (!peer) continue;

      try {
        federationService.initiateHandshake(nexha.id, peer.id, {
          mutualCapabilities: [...new Set([...nexha.categories, ...peer.categories])],
          dataSharing: randomChoice(['public', 'aggregated', 'full']),
          paymentTerms: randomChoice(['standard', 'preferred']),
          liabilityCap: randomInt(50000, 500000),
        });
        handshakesCreated++;
      } catch {
        // Duplicate or invalid — skip
      }
    }
  }

  // ── Create governance policies ─────────────────────────────────────────

  const existingPolicies = federationService.listPolicies();
  if (existingPolicies.length === 0) {
    federationService.createPolicy({
      title: 'Data Privacy Baseline',
      description: 'Minimum data handling standards for all federation members',
      category: 'data-privacy',
      enforcement: 'mandatory',
      rules: [
        { when: 'handling personal data', then: 'encrypt at rest and in transit; obtain explicit consent', appliesTo: ['all'] },
        { when: 'cross-Nexha data sharing', then: 'strip PII before sharing; log all transfers' },
      ],
    });
    federationService.createPolicy({
      title: 'Payment Settlement T+2',
      description: 'Standard settlement timeline across federation',
      category: 'payment',
      enforcement: 'mandatory',
      rules: [
        { when: 'settlement initiated', then: 'funds available within 2 business days', appliesTo: ['all'] },
        { when: 'cross-border payment', then: 'use REZ multi-currency rail with FX lock at T+0' },
      ],
    });
    federationService.createPolicy({
      title: 'Anti-Fraud Conduct',
      description: 'Zero-tolerance for fraud, identity theft, money laundering',
      category: 'conduct',
      enforcement: 'mandatory',
      rules: [
        { when: 'fraud detected', then: 'suspend member within 24 hours; refer to SADA audit', appliesTo: ['all'] },
      ],
    });
  }

  // ── Print summary ─────────────────────────────────────────────────────────

  const stats = federationService.getStats();

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║           FEDERATION SEED SUMMARY                       ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  Nexhas:          ${String(stats.totalNexhas).padEnd(41)}║`);
  console.log(`║  Handshakes:      ${String(handshakesCreated).padEnd(41)}║`);
  console.log(`║  Policies:        ${String(stats.totalPolicies).padEnd(41)}║`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log('║  By Tier:                                                  ║');
  for (const [tier, count] of Object.entries(stats.byTier)) {
    if (count > 0) console.log(`║    ${tier.padEnd(16)} ${String(count).padEnd(39)}║`);
  }
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log('║  By Region:                                                ║');
  const regionGroups: Record<string, number> = {};
  for (const r of stats.regions) regionGroups[r] = (regionGroups[r] || 0) + 1;
  for (const [region, count] of Object.entries(regionGroups).sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    console.log(`║    ${region.padEnd(16)} ${String(count).padEnd(39)}║`);
  }
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('\n✅ Seed complete.\n');
}

// ── CLI entry point ─────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    count: { type: 'string', default: '100' },
    tiers: { type: 'string', default: 'founding:10,strategic:30,standard:40,associate:15,observer:5' },
    reset: { type: 'boolean', default: false },
  },
});

const count = parseInt(values.count ?? '100', 10);
const tiers = parseTiersArg(values.tiers ?? '');

seed(count, tiers).catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
