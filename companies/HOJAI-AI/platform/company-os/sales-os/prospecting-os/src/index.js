/**
 * ProspectingOS - SalesOS
 *
 * B2B Company & Contact Intelligence Engine
 * Inspired by: Apollo, ZoomInfo, LinkedIn Sales Navigator
 *
 * Port: 5070
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5070;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================================
// STORAGE
// ============================================================

const companies = new Map();
const contacts = new Map();
const enrichmentJobs = new Map();

// Sample companies
const sampleCompanies = [
  {
    id: uuidv4(),
    name: 'TechCorp India',
    domain: 'techcorp.in',
    industry: 'Technology',
    size: 'enterprise',
    revenue: '$50M-$100M',
    employees: 500,
    locations: ['Bangalore', 'Hyderabad', 'Mumbai'],
    technologies: ['AWS', 'React', 'Node.js', 'PostgreSQL'],
    funding: 'Series B',
    growthSignals: ['Hiring engineers', 'New office in Pune'],
    linkedin: 'https://linkedin.com/company/techcorp-india',
    website: 'https://techcorp.in',
    enriched: true,
    lastEnriched: new Date(),
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    name: 'Global Retail Solutions',
    domain: 'globalretail.com',
    industry: 'Retail',
    size: 'enterprise',
    revenue: '$100M-$500M',
    employees: 1200,
    locations: ['Delhi', 'Pune'],
    technologies: ['SAP', 'Salesforce', 'Oracle'],
    funding: 'Series C',
    growthSignals: ['Acquired startup', 'Expanding to South'],
    linkedin: 'https://linkedin.com/company/globalretail',
    enriched: true,
    lastEnriched: new Date(),
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    name: 'HealthFirst Hospitals',
    domain: 'healthfirst.in',
    industry: 'Healthcare',
    size: 'enterprise',
    revenue: '$20M-$50M',
    employees: 200,
    locations: ['Chennai', 'Bangalore'],
    technologies: ['MedTech', 'HL7', 'FHIR'],
    funding: 'Series A',
    growthSignals: ['Opening new facility', 'Hiring medical staff'],
    enriched: true,
    lastEnriched: new Date(),
    createdAt: new Date(),
  },
];

sampleCompanies.forEach(c => companies.set(c.id, c));

// Sample contacts
const sampleContacts = [
  {
    id: uuidv4(),
    companyId: sampleCompanies[0].id,
    firstName: 'Rahul',
    lastName: 'Sharma',
    name: 'Rahul Sharma',
    email: 'rahul@techcorp.in',
    phone: '+91-9876543210',
    title: 'VP of Engineering',
    department: 'Engineering',
    seniority: 'vp',
    linkedin: 'https://linkedin.com/in/rahulsharma',
    influence: 85,
    buyingAuthority: 'high',
    enriched: true,
    lastEnriched: new Date(),
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    companyId: sampleCompanies[0].id,
    firstName: 'Priya',
    lastName: 'Patel',
    name: 'Priya Patel',
    email: 'priya@techcorp.in',
    phone: '+91-9876543211',
    title: 'CFO',
    department: 'Finance',
    seniority: 'cxo',
    linkedin: 'https://linkedin.com/in/priyapatel',
    influence: 90,
    buyingAuthority: 'economic',
    enriched: true,
    lastEnriched: new Date(),
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    companyId: sampleCompanies[1].id,
    firstName: 'Amit',
    lastName: 'Kumar',
    name: 'Amit Kumar',
    email: 'amit@globalretail.com',
    phone: '+91-9876543212',
    title: 'CTO',
    department: 'Technology',
    seniority: 'cxo',
    linkedin: 'https://linkedin.com/in/amitkumar',
    influence: 80,
    buyingAuthority: 'high',
    enriched: true,
    lastEnriched: new Date(),
    createdAt: new Date(),
  },
];

sampleContacts.forEach(c => contacts.set(c.id, c));

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ProspectingOS',
    version: '1.0.0',
    port: PORT,
    companiesCount: companies.size,
    contactsCount: contacts.size,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// COMPANY ENDPOINTS
// ============================================================

app.get('/companies', (req, res) => {
  const { industry, size, minEmployees, maxEmployees, enriched } = req.query;
  let results = Array.from(companies.values());

  if (industry) results = results.filter(c => c.industry.toLowerCase().includes(industry.toLowerCase()));
  if (size) results = results.filter(c => c.size === size);
  if (minEmployees) results = results.filter(c => c.employees >= Number(minEmployees));
  if (maxEmployees) results = results.filter(c => c.employees <= Number(maxEmployees));
  if (enriched) results = results.filter(c => c.enriched === (enriched === 'true'));

  res.json({ success: true, count: results.length, companies: results });
});

app.get('/companies/:id', (req, res) => {
  const company = companies.get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json({ success: true, company });
});

app.post('/companies', (req, res) => {
  const company = {
    id: uuidv4(),
    name: req.body.name,
    domain: req.body.domain,
    industry: req.body.industry,
    size: req.body.size,
    revenue: req.body.revenue,
    employees: req.body.employees,
    locations: req.body.locations || [],
    technologies: req.body.technologies || [],
    funding: req.body.funding,
    growthSignals: req.body.growthSignals || [],
    linkedin: req.body.linkedin,
    website: req.body.website,
    enriched: false,
    lastEnriched: null,
    createdAt: new Date(),
  };
  companies.set(company.id, company);
  res.status(201).json({ success: true, company });
});

// Search companies
app.get('/companies/search/query', (req, res) => {
  const { q, industry, size } = req.query;
  if (!q) return res.json({ success: true, results: [] });

  const query = q.toLowerCase();
  let results = Array.from(companies.values()).filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.industry.toLowerCase().includes(query) ||
    c.technologies.some(t => t.toLowerCase().includes(query))
  );

  if (industry) results = results.filter(c => c.industry === industry);
  if (size) results = results.filter(c => c.size === size);

  res.json({ success: true, query: q, count: results.length, results });
});

// Find similar companies
app.post('/companies/:id/similar', (req, res) => {
  const company = companies.get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const similar = Array.from(companies.values())
    .filter(c => c.id !== company.id)
    .filter(c => c.industry === company.industry || c.size === company.size)
    .slice(0, req.body.limit || 5)
    .map(c => ({
      ...c,
      similarity: calculateSimilarity(company, c),
    }))
    .sort((a, b) => b.similarity - a.similarity);

  res.json({ success: true, company: company.name, similar });
});

function calculateSimilarity(a, b) {
  let score = 0;
  if (a.industry === b.industry) score += 30;
  if (a.size === b.size) score += 25;
  if (a.technologies.some(t => b.technologies.includes(t))) score += 20;
  if (Math.abs((a.employees || 0) - (b.employees || 0)) < 100) score += 15;
  if (a.funding === b.funding) score += 10;
  return Math.min(100, score);
}

// ============================================================
// CONTACT ENDPOINTS
// ============================================================

app.get('/contacts', (req, res) => {
  const { companyId, department, seniority, enriched } = req.query;
  let results = Array.from(contacts.values());

  if (companyId) results = results.filter(c => c.companyId === companyId);
  if (department) results = results.filter(c => c.department.toLowerCase().includes(department.toLowerCase()));
  if (seniority) results = results.filter(c => c.seniority === seniority);
  if (enriched) results = results.filter(c => c.enriched === (enriched === 'true'));

  res.json({ success: true, count: results.length, contacts: results });
});

app.get('/contacts/:id', (req, res) => {
  const contact = contacts.get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json({ success: true, contact });
});

app.post('/contacts', (req, res) => {
  const contact = {
    id: uuidv4(),
    companyId: req.body.companyId,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    name: `${req.body.firstName} ${req.body.lastName}`,
    email: req.body.email,
    phone: req.body.phone,
    title: req.body.title,
    department: req.body.department,
    seniority: req.body.seniority || 'individual',
    linkedin: req.body.linkedin,
    influence: req.body.influence || 50,
    buyingAuthority: req.body.buyingAuthority || 'unknown',
    enriched: false,
    lastEnriched: null,
    createdAt: new Date(),
  };
  contacts.set(contact.id, contact);
  res.status(201).json({ success: true, contact });
});

// Search contacts
app.get('/contacts/search/query', (req, res) => {
  const { q, companyId, seniority } = req.query;
  if (!q) return res.json({ success: true, results: [] });

  const query = q.toLowerCase();
  let results = Array.from(contacts.values()).filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.email.toLowerCase().includes(query) ||
    c.title.toLowerCase().includes(query) ||
    c.department.toLowerCase().includes(query)
  );

  if (companyId) results = results.filter(c => c.companyId === companyId);
  if (seniority) results = results.filter(c => c.seniority === seniority);

  res.json({ success: true, query: q, count: results.length, results });
});

// ============================================================
// ENRICHMENT ENGINE
// ============================================================

app.post('/enrich/company', async (req, res) => {
  const { companyId, domain } = req.body;
  const targetCompany = companyId ? companies.get(companyId) : Array.from(companies.values()).find(c => c.domain === domain);

  if (!targetCompany) return res.status(404).json({ error: 'Company not found' });

  // Simulate enrichment
  const enriched = {
    ...targetCompany,
    enriched: true,
    lastEnriched: new Date(),
    enrichment: {
      funding: targetCompany.funding || '$10M Series A',
      hqCity: targetCompany.locations?.[0] || 'Unknown',
      employeeCountRange: `${targetCompany.employees}-${targetCompany.employees + 100}`,
      latestFunding: targetCompany.funding || 'Seed',
      fundingDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      socialUrls: { linkedin: targetCompany.linkedin },
      founded: 2018,
      companyType: 'Private',
    },
  };

  companies.set(targetCompany.id, enriched);

  res.json({ success: true, company: enriched });
});

app.post('/enrich/contact', async (req, res) => {
  const { contactId, email } = req.body;
  const targetContact = contactId ? contacts.get(contactId) : Array.from(contacts.values()).find(c => c.email === email);

  if (!targetContact) return res.status(404).json({ error: 'Contact not found' });

  const enriched = {
    ...targetContact,
    enriched: true,
    lastEnriched: new Date(),
    enrichment: {
      twitter: `https://twitter.com/${targetContact.firstName?.toLowerCase()}`,
      personalEmail: null,
      mobilePhone: targetContact.phone,
      pastCompanies: ['Previous Company A', 'Previous Company B'],
      education: 'IIT Delhi',
      skills: ['SaaS', 'Enterprise Sales', 'Product Management'],
      location: 'Bangalore, India',
    },
  };

  contacts.set(targetContact.id, enriched);

  res.json({ success: true, contact: enriched });
});

app.post('/enrich/batch', async (req, res) => {
  const { companyIds, contactIds } = req.body;
  const results = { companies: [], contacts: [] };

  for (const id of (companyIds || [])) {
    const company = companies.get(id);
    if (company) {
      company.enriched = true;
      company.lastEnriched = new Date();
      companies.set(id, company);
      results.companies.push(company);
    }
  }

  for (const id of (contactIds || [])) {
    const contact = contacts.get(id);
    if (contact) {
      contact.enriched = true;
      contact.lastEnriched = new Date();
      contacts.set(id, contact);
      results.contacts.push(contact);
    }
  }

  res.json({ success: true, results });
});

// ============================================================
// ICP BUILDER
// ============================================================

app.post('/icp/build', (req, res) => {
  const { customerIds } = req.body;

  const customers = customerIds.map(id => companies.get(id)).filter(Boolean);
  if (customers.length === 0) return res.status(400).json({ error: 'No valid customers provided' });

  // Analyze patterns
  const industries = customers.map(c => c.industry);
  const sizes = customers.map(c => c.size);
  const avgEmployees = customers.reduce((sum, c) => sum + (c.employees || 0), 0) / customers.length;

  const icp = {
    id: uuidv4(),
    industries: [...new Set(industries)],
    companySizes: [...new Set(sizes)],
    employeeRange: { min: Math.floor(avgEmployees * 0.5), max: Math.floor(avgEmployees * 1.5) },
    commonTechnologies: findCommonItems(customers, 'technologies'),
    commonLocations: findCommonItems(customers, 'locations'),
    revenueRange: customers[0].revenue,
    createdAt: new Date(),
  };

  res.json({ success: true, icp });
});

function findCommonItems(array, key) {
  const counts = {};
  array.forEach(item => {
    (item[key] || []).forEach(i => {
      counts[i] = (counts[i] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .filter(([_, count]) => count >= array.length / 2)
    .map(([item]) => item);
}

// ============================================================
// BUYING COMMITTEE
// ============================================================

app.post('/buying-committee', (req, res) => {
  const { companyId } = req.body;
  const companyContacts = Array.from(contacts.values()).filter(c => c.companyId === companyId);

  const committee = {
    companyId,
    economicBuyer: companyContacts.find(c => c.seniority === 'cxo' && c.buyingAuthority === 'economic'),
    technicalBuyer: companyContacts.find(c => c.seniority === 'vp' || c.department === 'Engineering'),
    champion: companyContacts.find(c => c.influence >= 80),
    blockers: companyContacts.filter(c => c.influence < 50),
    influencers: companyContacts.filter(c => c.influence >= 60 && c.influence < 80),
    missingRoles: identifyMissingRoles(companyContacts),
    createdAt: new Date(),
  };

  res.json({ success: true, committee });
});

function identifyMissingRoles(contacts) {
  const roles = [];
  if (!contacts.some(c => c.seniority === 'cxo')) roles.push('Executive Sponsor');
  if (!contacts.some(c => c.department === 'Engineering' || c.department === 'Technology')) roles.push('Technical Buyer');
  if (!contacts.some(c => c.department === 'Finance')) roles.push('Finance/Procurement');
  return roles;
}

// ============================================================
// ANALYTICS
// ============================================================

app.get('/analytics/overview', (req, res) => {
  const allCompanies = Array.from(companies.values());
  const allContacts = Array.from(contacts.values());

  const byIndustry = {};
  allCompanies.forEach(c => {
    byIndustry[c.industry] = (byIndustry[c.industry] || 0) + 1;
  });

  const bySize = {};
  allCompanies.forEach(c => {
    bySize[c.size] = (bySize[c.size] || 0) + 1;
  });

  const bySeniority = {};
  allContacts.forEach(c => {
    bySeniority[c.seniority] = (bySeniority[c.seniority] || 0) + 1;
  });

  res.json({
    success: true,
    overview: {
      companies: { total: allCompanies.length, enriched: allCompanies.filter(c => c.enriched).length },
      contacts: { total: allContacts.length, enriched: allContacts.filter(c => c.enriched).length },
      byIndustry,
      bySize,
      bySeniority,
    },
  });
});

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════╗`);
  console.log(`║      ProspectingOS - SalesOS v1.0             ║`);
  console.log(`╠═══════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                      ║`);
  console.log(`║  Companies: ${companies.size}                               ║`);
  console.log(`║  Contacts: ${contacts.size}                                ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
});

module.exports = app;
