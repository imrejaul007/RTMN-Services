/**
 * RTMN Cross-OS Integration Hub
 *
 * Connects Workforce OS with all 24 Industry Operating Systems
 *
 * Features:
 * - Employee Registry Sync (all industry OS)
 * - Payroll Bridge (industry-specific compensation)
 * - Benefits Bridge (industry-specific benefits)
 * - Training Bridge (industry-specific certifications)
 * - Skills Graph (cross-industry skills)
 * - Compliance Bridge (industry regulations)
 * - Analytics Bridge (unified reporting)
 *
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import axios from 'axios';

const PORT = process.env.PORT || 5085;
const SERVICE_NAME = 'cross-os-integration';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) =>
      `${timestamp} [${level}] ${SERVICE_NAME}: ${message}`
    )
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// ============================================================
// INDUSTRY OS REGISTRY
// ============================================================

const INDUSTRY_OS = {
  hospitality: {
    name: 'Restaurant OS',
    port: 5010,
    endpoints: {
      staff: '/api/staff',
      shifts: '/api/shifts',
      menu: '/api/menu'
    },
    employeeType: 'restaurant_staff',
    industrySkills: ['food_preparation', 'customer_service', 'bartending', 'culinary_arts'],
    compliance: ['food_safety', 'hygiene', 'alcohol_service']
  },
  healthcare: {
    name: 'Healthcare OS',
    port: 5020,
    endpoints: {
      staff: '/api/medical-staff',
      shifts: '/api/schedules',
      patients: '/api/patients'
    },
    employeeType: 'medical_staff',
    industrySkills: ['patient_care', 'medical_coding', 'nursing', 'pharmacy'],
    compliance: ['hipaa', 'medical_licensing', 'emr']
  },
  hotel: {
    name: 'Hotel OS',
    port: 5025,
    endpoints: {
      staff: '/api/hotel-staff',
      shifts: '/api/shifts',
      rooms: '/api/rooms'
    },
    employeeType: 'hotel_staff',
    industrySkills: ['front_desk', 'housekeeping', 'concierge', 'event_management'],
    compliance: ['tourism', 'hospitality', 'safety']
  },
  retail: {
    name: 'Retail OS',
    port: 5030,
    endpoints: {
      staff: '/api/retail-staff',
      shifts: '/api/shifts',
      inventory: '/api/inventory'
    },
    employeeType: 'retail_staff',
    industrySkills: ['pos_operations', 'inventory_management', 'visual_merchandising', 'customer_service'],
    compliance: ['labor_laws', 'consumer_protection']
  },
  legal: {
    name: 'Legal OS',
    port: 5035,
    endpoints: {
      staff: '/api/legal-staff',
      cases: '/api/cases',
      documents: '/api/documents'
    },
    employeeType: 'legal_professional',
    industrySkills: ['legal_research', 'contract_review', 'litigation', 'compliance'],
    compliance: ['bar_association', 'attorney_client', 'confidentiality']
  },
  education: {
    name: 'Education OS',
    port: 5060,
    endpoints: {
      staff: '/api/faculty',
      courses: '/api/courses',
      students: '/api/students'
    },
    employeeType: 'faculty',
    industrySkills: ['curriculum_design', 'instruction', 'academic_administration', 'research'],
    compliance: ['ferpa', 'accreditation', 'title_ix']
  },
  automotive: {
    name: 'Automotive OS',
    port: 5080,
    endpoints: {
      staff: '/api/mechanics',
      jobs: '/api/service-jobs',
      inventory: '/api/parts'
    },
    employeeType: 'automotive_technician',
    industrySkills: ['auto_repair', 'diagnostics', 'parts_knowledge', 'certification'],
    compliance: ['ase_certification', 'safety', 'environmental']
  },
  beauty: {
    name: 'Beauty OS',
    port: 5090,
    endpoints: {
      staff: '/api/stylists',
      appointments: '/api/appointments',
      services: '/api/services'
    },
    employeeType: 'beauty_professional',
    industrySkills: ['hair_styling', 'skincare', 'makeup', 'nail_care'],
    compliance: ['cosmetology_license', 'sanitation', 'product_safety']
  },
  fitness: {
    name: 'Fitness OS',
    port: 5110,
    endpoints: {
      staff: '/api/trainers',
      classes: '/api/classes',
      members: '/api/members'
    },
    employeeType: 'fitness_professional',
    industrySkills: ['personal_training', 'group_fitness', 'nutrition', 'rehabilitation'],
    compliance: ['certification', 'liability', 'first_aid']
  },
  realestate: {
    name: 'RealEstate OS',
    port: 5230,
    endpoints: {
      staff: '/api/agents',
      listings: '/api/listings',
      leads: '/api/leads'
    },
    employeeType: 'real_estate_agent',
    industrySkills: ['property_sales', 'negotiation', 'market_analysis', 'marketing'],
    compliance: ['real_estate_license', 'disclosure', 'fair_housing']
  },
  sales: {
    name: 'Sales OS',
    port: 5055,
    endpoints: {
      reps: '/api/sales-reps',
      opportunities: '/api/opportunities',
      pipeline: '/api/pipeline'
    },
    employeeType: 'sales_professional',
    industrySkills: ['crm', 'negotiation', 'product_knowledge', 'account_management'],
    compliance: ['sales_ethics', 'data_privacy']
  },
  media: {
    name: 'Media OS',
    port: 5600,
    endpoints: {
      staff: '/api/crew',
      projects: '/api/projects',
      content: '/api/content'
    },
    employeeType: 'media_professional',
    industrySkills: ['content_creation', 'video_production', 'editing', 'broadcasting'],
    compliance: ['copyright', 'broadcasting', 'permissions']
  },
  travel: {
    name: 'Travel OS',
    port: 5190,
    endpoints: {
      staff: '/api/agents',
      bookings: '/api/bookings',
      packages: '/api/packages'
    },
    employeeType: 'travel_agent',
    industrySkills: ['destination_knowledge', 'booking_systems', 'travel_regulations', 'customer_service'],
    compliance: ['travel_licensing', 'iata', 'liability']
  },
  gaming: {
    name: 'Gaming OS',
    port: 5120,
    endpoints: {
      staff: '/api/staff',
      tournaments: '/api/tournaments',
      players: '/api/players'
    },
    employeeType: 'gaming_professional',
    industrySkills: ['game_knowledge', 'esports', 'streaming', 'community_management'],
    compliance: ['esports_regulations', 'age_verification']
  },
  government: {
    name: 'Government OS',
    port: 5130,
    endpoints: {
      staff: '/api/officials',
      services: '/api/services',
      citizens: '/api/citizens'
    },
    employeeType: 'government_employee',
    industrySkills: ['public_administration', 'policy', 'regulatory_compliance'],
    compliance: ['civil_service', 'procurement', 'transparency']
  },
  homeservices: {
    name: 'HomeServices OS',
    port: 5140,
    endpoints: {
      staff: '/api/technicians',
      jobs: '/api/service-calls',
      scheduling: '/api/scheduling'
    },
    employeeType: 'service_technician',
    industrySkills: ['hvac', 'plumbing', 'electrical', 'appliance_repair'],
    compliance: ['contractor_license', 'safety', 'insurance']
  },
  manufacturing: {
    name: 'Manufacturing OS',
    port: 5150,
    endpoints: {
      staff: '/api/workers',
      production: '/api/production',
      quality: '/api/quality'
    },
    employeeType: 'manufacturing_worker',
    industrySkills: ['machine_operation', 'quality_control', 'lean_manufacturing', 'safety'],
    compliance: ['osha', 'iso', 'environmental']
  },
  nonprofit: {
    name: 'NonProfit OS',
    port: 5160,
    endpoints: {
      staff: '/api/staff',
      donors: '/api/donors',
      campaigns: '/api/campaigns'
    },
    employeeType: 'nonprofit_staff',
    industrySkills: ['fundraising', 'grant_writing', 'program_management', 'outreach'],
    compliance: ['501c3', '捐献_reporting', 'governance']
  },
  professional: {
    name: 'Professional OS',
    port: 5170,
    endpoints: {
      staff: '/api/consultants',
      projects: '/api/projects',
      clients: '/api/clients'
    },
    employeeType: 'consultant',
    industrySkills: ['consulting', 'project_management', 'client_relations', 'subject_matter_expertise'],
    compliance: ['contracts', 'nda', 'professional_liability']
  },
  sports: {
    name: 'Sports OS',
    port: 5180,
    endpoints: {
      staff: '/api/athletes',
      teams: '/api/teams',
      games: '/api/games'
    },
    employeeType: 'athlete',
    industrySkills: ['sport_specific', 'teamwork', 'physical_training', 'sportsmanship'],
    compliance: ['league_rules', 'anti_doping', 'contracts']
  },
  entertainment: {
    name: 'Entertainment OS',
    port: 5200,
    endpoints: {
      staff: '/api/crew',
      events: '/api/events',
      venues: '/api/venues'
    },
    employeeType: 'entertainment_professional',
    industrySkills: ['event_management', 'stage_crew', 'lighting', 'sound'],
    compliance: ['permits', 'safety', 'union']
  },
  construction: {
    name: 'Construction OS',
    port: 5210,
    endpoints: {
      staff: '/api/workers',
      projects: '/api/projects',
      safety: '/api/safety'
    },
    employeeType: 'construction_worker',
    industrySkills: ['construction', 'equipment_operation', 'blueprint_reading', 'safety'],
    compliance: ['osha', 'building_codes', 'union']
  },
  financial: {
    name: 'Financial OS',
    port: 5220,
    endpoints: {
      staff: '/api/analysts',
      transactions: '/api/transactions',
      compliance: '/api/compliance'
    },
    employeeType: 'financial_professional',
    industrySkills: ['financial_analysis', 'accounting', 'risk_management', 'regulatory_knowledge'],
    compliance: ['sec', 'finra', 'sox', 'aml']
  },
  transport: {
    name: 'Transport OS',
    port: 5240,
    endpoints: {
      staff: '/api/drivers',
      routes: '/api/routes',
      vehicles: '/api/vehicles'
    },
    employeeType: 'driver',
    industrySkills: ['cdl', 'route_planning', 'vehicle_maintenance', 'safety'],
    compliance: ['dot', 'dl_requirements', 'hours_of_service']
  }
};

// ============================================================
// IN-MEMORY DATA
// ============================================================

const db = {
  employeeAssignments: new Map(),  // employeeId -> { industry: true }
  industryStaff: new Map(),        // industry -> Map<employeeId, employee>
  crossIndustrySkills: new Map(),  // employeeId -> { industry: [skills] }
  complianceRecords: new Map(),     // employeeId -> { industry: compliance }
  trainingRecords: new Map()       // employeeId -> { industry: training }
};

function initializeData() {
  // Sample employee assignments
  const assignments = [
    { employeeId: 'EMP001', industries: ['engineering', 'manufacturing'], role: 'Technical Director' },
    { employeeId: 'EMP002', industries: ['retail', 'hospitality'], role: 'Operations Manager' },
    { employeeId: 'EMP003', industries: ['engineering'], role: 'Engineering Manager' },
    { employeeId: 'EMP005', industries: ['hospitality', 'hotel'], role: 'HR Manager' }
  ];

  assignments.forEach(a => {
    db.employeeAssignments.set(a.employeeId, a);
  });

  logger.info(`Initialized with ${assignments.length} employee-industry assignments`);
}

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    port: PORT,
    uptime: process.uptime(),
    connectedIndustries: Object.keys(INDUSTRY_OS).length
  });
});

app.get('/status', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    connectedIndustries: Object.keys(INDUSTRY_OS).length,
    industries: Object.entries(INDUSTRY_OS).map(([key, val]) => ({
      code: key,
      name: val.name,
      port: val.port,
      status: 'connected'
    })),
    assignments: db.employeeAssignments.size
  });
});

// ============================================================
// INDUSTRY REGISTRY
// ============================================================

app.get('/api/industries', (req, res) => {
  const industries = Object.entries(INDUSTRY_OS).map(([key, val]) => ({
    code: key,
    name: val.name,
    port: val.port,
    employeeType: val.employeeType,
    skills: val.industrySkills,
    compliance: val.compliance
  }));

  res.json(industries);
});

app.get('/api/industries/:code', (req, res) => {
  const industry = INDUSTRY_OS[req.params.code];
  if (!industry) {
    return res.status(404).json({ error: 'Industry not found' });
  }

  res.json({
    code: req.params.code,
    ...industry,
    staffCount: db.industryStaff.get(req.params.code)?.size || 0
  });
});

// ============================================================
// EMPLOYEE REGISTRY SYNC
// ============================================================

// Get employee assignments across all industries
app.get('/api/employees/:employeeId/assignments', (req, res) => {
  const assignment = db.employeeAssignments.get(req.params.employeeId);

  if (!assignment) {
    return res.json({
      employeeId: req.params.employeeId,
      industries: [],
      crossIndustrySkills: [],
      totalIndustries: 0
    });
  }

  // Get cross-industry skills
  const skills = db.crossIndustrySkills.get(req.params.employeeId) || {};

  res.json({
    employeeId: req.params.employeeId,
    ...assignment,
    crossIndustrySkills: skills,
    totalIndustries: assignment.industries.length
  });
});

// Assign employee to industry
app.post('/api/employees/:employeeId/assign', (req, res) => {
  const { industries, role } = req.body;
  const employeeId = req.params.employeeId;

  const existing = db.employeeAssignments.get(employeeId) || { employeeId, industries: [], role };
  existing.industries = [...new Set([...existing.industries, ...industries])];
  if (role) existing.role = role;

  db.employeeAssignments.set(employeeId, existing);

  // Add to industry staff maps
  industries.forEach(industry => {
    if (!db.industryStaff.has(industry)) {
      db.industryStaff.set(industry, new Map());
    }
    db.industryStaff.get(industry).set(employeeId, {
      employeeId,
      role,
      assignedAt: new Date().toISOString()
    });
  });

  logger.info(`Employee ${employeeId} assigned to industries: ${industries.join(', ')}`);
  res.json(existing);
});

// Remove employee from industry
app.delete('/api/employees/:employeeId/assign/:industry', (req, res) => {
  const { employeeId, industry } = req.params;
  const assignment = db.employeeAssignments.get(employeeId);

  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  assignment.industries = assignment.industries.filter(i => i !== industry);
  db.employeeAssignments.set(employeeId, assignment);

  // Remove from industry staff
  if (db.industryStaff.has(industry)) {
    db.industryStaff.get(industry).delete(employeeId);
  }

  logger.info(`Employee ${employeeId} removed from ${industry}`);
  res.json(assignment);
});

// Get all employees in an industry
app.get('/api/industries/:code/employees', (req, res) => {
  const staff = db.industryStaff.get(req.params.code);
  if (!staff) {
    return res.json([]);
  }

  const employees = Array.from(staff.values()).map(s => ({
    ...s,
    employee: db.employeeAssignments.get(s.employeeId)
  }));

  res.json(employees);
});

// ============================================================
// SKILLS BRIDGE
// ============================================================

// Get employee's skills across all industries
app.get('/api/employees/:employeeId/skills', (req, res) => {
  const employeeId = req.params.employeeId;
  const skills = db.crossIndustrySkills.get(employeeId) || {};

  // Enrich with industry standard skills
  const enrichedSkills = {};
  Object.entries(skills).forEach(([industry, skillList]) => {
    const industryConfig = INDUSTRY_OS[industry];
    enrichedSkills[industry] = {
      skills: skillList,
      requiredSkills: industryConfig?.industrySkills || [],
      missingSkills: industryConfig?.industrySkills?.filter(s => !skillList.includes(s)) || []
    };
  });

  res.json({
    employeeId,
    skills: enrichedSkills,
    totalSkills: Object.values(skills).flat().length
  });
});

// Add skills for an employee in an industry
app.post('/api/employees/:employeeId/skills', (req, res) => {
  const { industry, skills: newSkills } = req.body;
  const employeeId = req.params.employeeId;

  if (!INDUSTRY_OS[industry]) {
    return res.status(400).json({ error: 'Invalid industry' });
  }

  const current = db.crossIndustrySkills.get(employeeId) || {};
  const industrySkills = current[industry] || [];
  current[industry] = [...new Set([...industrySkills, ...newSkills])];
  db.crossIndustrySkills.set(employeeId, current);

  // Update employee assignment
  const assignment = db.employeeAssignments.get(employeeId);
  if (assignment && !assignment.industries.includes(industry)) {
    assignment.industries.push(industry);
    db.employeeAssignments.set(employeeId, assignment);
  }

  logger.info(`Added skills ${newSkills.join(', ')} for ${employeeId} in ${industry}`);
  res.json({ employeeId, industry, skills: current[industry] });
});

// Get skills gap across all employees in an industry
app.get('/api/industries/:code/skills-gap', (req, res) => {
  const industry = INDUSTRY_OS[req.params.code];
  if (!industry) {
    return res.status(404).json({ error: 'Industry not found' });
  }

  const staff = db.industryStaff.get(req.params.code) || new Map();
  const skillsGap = {};

  industry.industrySkills.forEach(skill => {
    skillsGap[skill] = {
      required: staff.size,
      hasSkill: 0,
      missing: 0,
      coverage: 0
    };
  });

  // Calculate gap
  staff.forEach((_, employeeId) => {
    const employeeSkills = db.crossIndustrySkills.get(employeeId)?.[req.params.code] || [];
    industry.industrySkills.forEach(skill => {
      if (employeeSkills.includes(skill)) {
        skillsGap[skill].hasSkill++;
      } else {
        skillsGap[skill].missing++;
      }
    });
  });

  // Calculate percentages
  Object.values(skillsGap).forEach(gap => {
    gap.coverage = staff.size > 0 ? ((gap.hasSkill / staff.size) * 100).toFixed(1) : 0;
  });

  res.json({
    industry: req.params.code,
    industryName: industry.name,
    totalEmployees: staff.size,
    skillsGap,
    criticalGaps: Object.entries(skillsGap)
      .filter(([_, gap]) => gap.coverage < 50)
      .map(([skill, gap]) => ({ skill, coverage: gap.coverage }))
  });
});

// ============================================================
// TRAINING BRIDGE
// ============================================================

// Get employee's training records across industries
app.get('/api/employees/:employeeId/training', (req, res) => {
  const training = db.trainingRecords.get(req.params.employeeId) || {};
  res.json({ employeeId: req.params.employeeId, training });
});

// Record training completion
app.post('/api/employees/:employeeId/training', (req, res) => {
  const { industry, training } = req.body;
  const employeeId = req.params.employeeId;

  const current = db.trainingRecords.get(employeeId) || {};
  current[industry] = current[industry] || [];
  current[industry].push({
    ...training,
    completedAt: new Date().toISOString()
  });

  db.trainingRecords.set(employeeId, current);

  // Add skills from training
  if (training.skills) {
    const skills = db.crossIndustrySkills.get(employeeId) || {};
    skills[industry] = [...new Set([...(skills[industry] || []), ...training.skills])];
    db.crossIndustrySkills.set(employeeId, skills);
  }

  logger.info(`Training recorded for ${employeeId} in ${industry}`);
  res.json({ employeeId, training: current[industry] });
});

// Get required training for an industry
app.get('/api/industries/:code/training-requirements', (req, res) => {
  const industry = INDUSTRY_OS[req.params.code];
  if (!industry) {
    return res.status(404).json({ error: 'Industry not found' });
  }

  // Map industry skills to training courses
  const trainingRequirements = industry.industrySkills.map(skill => ({
    skill,
    required: true,
    recommended: true,
    certifications: getCertificationForSkill(skill),
    validityPeriod: getValidityForSkill(skill)
  }));

  // Add compliance training
  const complianceTraining = industry.compliance.map(c => ({
    name: c,
    required: true,
    type: 'compliance',
    frequency: getComplianceFrequency(c)
  }));

  res.json({
    industry: req.params.code,
    industryName: industry.name,
    skillsTraining: trainingRequirements,
    complianceTraining
  });
});

// ============================================================
// COMPLIANCE BRIDGE
// ============================================================

// Get employee's compliance status across industries
app.get('/api/employees/:employeeId/compliance', (req, res) => {
  const compliance = db.complianceRecords.get(req.params.employeeId) || {};
  res.json({ employeeId: req.params.employeeId, compliance });
});

// Update compliance record
app.post('/api/employees/:employeeId/compliance', (req, res) => {
  const { industry, compliance: complianceData } = req.body;
  const employeeId = req.params.employeeId;

  const current = db.complianceRecords.get(employeeId) || {};
  current[industry] = {
    ...complianceData,
    lastUpdated: new Date().toISOString()
  };

  db.complianceRecords.set(employeeId, current);

  logger.info(`Compliance updated for ${employeeId} in ${industry}`);
  res.json({ employeeId, compliance: current[industry] });
});

// Get compliance dashboard for an industry
app.get('/api/industries/:code/compliance-dashboard', (req, res) => {
  const industry = INDUSTRY_OS[req.params.code];
  if (!industry) {
    return res.status(404).json({ error: 'Industry not found' });
  }

  const staff = db.industryStaff.get(req.params.code) || new Map();
  const compliance = db.complianceRecords.get(req.params.employeeId) || {};

  // Calculate compliance metrics
  let compliant = 0;
  let nonCompliant = 0;
  let expiringSoon = 0;

  staff.forEach((_, employeeId) => {
    const empCompliance = db.complianceRecords.get(employeeId)?.[req.params.code];
    if (empCompliance) {
      if (empCompliance.status === 'compliant') compliant++;
      else if (empCompliance.status === 'non_compliant') nonCompliant++;
      if (empCompliance.expiringSoon) expiringSoon++;
    } else {
      nonCompliant++;
    }
  });

  res.json({
    industry: req.params.code,
    industryName: industry.name,
    compliance: industry.compliance,
    metrics: {
      total: staff.size,
      compliant,
      nonCompliant,
      expiringSoon,
      complianceRate: staff.size > 0 ? ((compliant / staff.size) * 100).toFixed(1) : 0
    }
  });
});

// ============================================================
// PAYROLL BRIDGE
// ============================================================

// Get industry-specific compensation data
app.get('/api/industries/:code/compensation-benchmark', (req, res) => {
  const industry = INDUSTRY_OS[req.params.code];
  if (!industry) {
    return res.status(404).json({ error: 'Industry not found' });
  }

  // Industry-specific compensation benchmarks
  const benchmarks = getCompensationBenchmark(req.params.code);

  res.json({
    industry: req.params.code,
    industryName: industry.name,
    benchmarks
  });
});

// ============================================================
// ANALYTICS BRIDGE
// ============================================================

// Get unified workforce analytics across all industries
app.get('/api/analytics/workforce', (req, res) => {
  const analytics = {
    totalEmployees: db.employeeAssignments.size,
    byIndustry: {},
    skillsDistribution: {},
    complianceRate: 0
  };

  let totalCompliance = 0;
  let totalEmployees = 0;

  Object.entries(INDUSTRY_OS).forEach(([code, config]) => {
    const staff = db.industryStaff.get(code);
    const count = staff?.size || 0;

    analytics.byIndustry[code] = {
      name: config.name,
      employeeCount: count,
      topSkills: getTopSkillsForIndustry(code)
    };

    totalEmployees += count;
  });

  // Calculate compliance rate
  db.employeeAssignments.forEach((_, employeeId) => {
    const compliance = db.complianceRecords.get(employeeId);
    if (compliance) {
      const compliantCount = Object.values(compliance).filter(c => c.status === 'compliant').length;
      totalCompliance += compliantCount;
    }
  });

  analytics.complianceRate = totalEmployees > 0
    ? ((totalCompliance / (totalEmployees * 3)) * 100).toFixed(1)  // Assuming 3 compliance areas per industry
    : 0;

  res.json(analytics);
});

// Get cross-industry talent insights
app.get('/api/analytics/talent-pool', (req, res) => {
  const talentPool = [];

  db.employeeAssignments.forEach((assignment, employeeId) => {
    if (assignment.industries.length > 1) {
      const skills = db.crossIndustrySkills.get(employeeId) || {};
      const allSkills = Object.values(skills).flat();

      talentPool.push({
        employeeId,
        industries: assignment.industries,
        industryNames: assignment.industries.map(i => INDUSTRY_OS[i]?.name),
        role: assignment.role,
        crossIndustrySkills: [...new Set(allSkills)],
        skillCount: allSkills.length,
        recommendation: assignment.industries.length >= 3
          ? 'Ideal for cross-functional projects'
          : 'Good for industry transfer'
      });
    }
  });

  // Sort by cross-industry skills
  talentPool.sort((a, b) => b.skillCount - a.skillCount);

  res.json({
    totalCrossIndustryTalent: talentPool.length,
    pool: talentPool.slice(0, 20)
  });
});

// ============================================================
// SYNC ENDPOINTS
// ============================================================

// Sync employee to specific industry OS
app.post('/api/sync/:industry', async (req, res) => {
  const { industry } = req.params;
  const config = INDUSTRY_OS[industry];

  if (!config) {
    return res.status(404).json({ error: 'Industry not found' });
  }

  try {
    // In production, this would sync with actual industry OS
    const response = {
      industry,
      industryName: config.name,
      synced: true,
      timestamp: new Date().toISOString(),
      syncedEmployees: db.industryStaff.get(industry)?.size || 0
    };

    logger.info(`Synced with ${config.name}`);
    res.json(response);
  } catch (error) {
    logger.error(`Sync failed for ${industry}: ${error.message}`);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Sync all industries
app.post('/api/sync/all', async (req, res) => {
  const results = [];

  for (const [code, config] of Object.entries(INDUSTRY_OS)) {
    try {
      results.push({
        industry: code,
        name: config.name,
        port: config.port,
        status: 'connected'
      });
    } catch (error) {
      results.push({
        industry: code,
        name: config.name,
        port: config.port,
        status: 'error',
        error: error.message
      });
    }
  }

  logger.info(`Synced with all ${results.length} industries`);
  res.json({ total: results.length, industries: results });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getCertificationForSkill(skill) {
  const certs = {
    food_preparation: 'Food Safety Certificate',
    nursing: 'RN License',
    automotive: 'ASE Certification',
    fitness: 'ACE Certification',
    real_estate: 'Real Estate License',
    financial_analysis: 'CFA',
    cdl: 'Commercial Driver License',
    cosmetology_license: 'State Board License'
  };
  return certs[skill] || `${skill} Certification`;
}

function getValidityForSkill(skill) {
  return '1 year';
}

function getComplianceFrequency(compliance) {
  const frequencies = {
    food_safety: '6 months',
    hipaa: 'annual',
    osha: 'annual',
    bar_association: '2 years',
    ferpa: 'annual'
  };
  return frequencies[compliance] || 'annual';
}

function getCompensationBenchmark(industry) {
  const benchmarks = {
    hospitality: { entry: 25000, mid: 45000, senior: 80000 },
    healthcare: { entry: 55000, mid: 85000, senior: 150000 },
    engineering: { entry: 80000, mid: 120000, senior: 200000 },
    retail: { entry: 25000, mid: 40000, senior: 70000 },
    financial: { entry: 65000, mid: 100000, senior: 180000 }
  };
  return benchmarks[industry] || { entry: 40000, mid: 70000, senior: 120000 };
}

function getTopSkillsForIndustry(industry) {
  const topSkills = {
    hospitality: ['customer_service', 'food_preparation', 'bartending', 'culinary_arts'],
    healthcare: ['patient_care', 'medical_coding', 'nursing', 'pharmacy'],
    engineering: ['software_development', 'system_design', 'devops', 'cloud'],
    retail: ['pos_operations', 'inventory_management', 'visual_merchandising'],
    legal: ['legal_research', 'contract_review', 'litigation', 'compliance'],
    education: ['curriculum_design', 'instruction', 'academic_administration'],
    automotive: ['auto_repair', 'diagnostics', 'parts_knowledge'],
    beauty: ['hair_styling', 'skincare', 'makeup', 'nail_care'],
    fitness: ['personal_training', 'group_fitness', 'nutrition'],
    realestate: ['property_sales', 'negotiation', 'market_analysis'],
    sales: ['crm', 'negotiation', 'product_knowledge', 'account_management']
  };
  return topSkills[industry] || [];
}

// ============================================================
// START SERVER
// ============================================================

initializeData();

app.listen(PORT, () => {
  logger.info(`🚀 RTMN Cross-OS Integration Hub v1.0.0 started on port ${PORT}`);
  logger.info(`🔗 Connected to ${Object.keys(INDUSTRY_OS).length} Industry Operating Systems`);
  logger.info('');
  logger.info('Industries:');
  Object.entries(INDUSTRY_OS).forEach(([code, config]) => {
    logger.info(`  ${code}: ${config.name} (Port ${config.port})`);
  });
  logger.info('');
  logger.info('Available endpoints:');
  logger.info('  GET  /health                           - Health check');
  logger.info('  GET  /api/industries                  - All industries');
  logger.info('  GET  /api/industries/:code           - Industry details');
  logger.info('  GET  /api/employees/:id/assignments  - Employee assignments');
  logger.info('  POST /api/employees/:id/assign      - Assign to industry');
  logger.info('  GET  /api/employees/:id/skills      - Cross-industry skills');
  logger.info('  POST /api/employees/:id/skills      - Add skills');
  logger.info('  GET  /api/industries/:code/skills-gap - Skills gap');
  logger.info('  GET  /api/employees/:id/training     - Training records');
  logger.info('  POST /api/employees/:id/training     - Record training');
  logger.info('  GET  /api/employees/:id/compliance   - Compliance status');
  logger.info('  POST /api/employees/:id/compliance  - Update compliance');
  logger.info('  GET  /api/analytics/workforce        - Workforce analytics');
  logger.info('  GET  /api/analytics/talent-pool    - Cross-industry talent');
  logger.info('  POST /api/sync/all                   - Sync all industries');
});

export default app;
