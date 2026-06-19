/**
 * Consultant Routes - Main consulting interface
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Domain keywords for routing
const DOMAIN_KEYWORDS = {
  restaurant: ['restaurant', 'cafe', 'food', 'kitchen', 'menu', 'chef', 'dining', 'restaurant owner', 'hotel restaurant'],
  hotel: ['hotel', 'hospitality', 'guest', 'room', 'booking', 'hospitality', 'resort', 'inn', 'lodge'],
  startup: ['startup', 'founder', 'funding', 'investor', 'pitch', 'MVP', 'scale', 'bootstrapped', 'venture'],
  healthcare: ['health', 'medical', 'doctor', 'hospital', 'patient', 'clinic', 'wellness', 'healthcare'],
  legal: ['legal', 'contract', 'lawyer', 'compliance', 'agreement', 'terms', 'intellectual property', 'trademark'],
  hr: ['hiring', 'employee', 'recruitment', 'HR', 'team', 'performance', 'management', 'workforce'],
  marketing: ['marketing', 'campaign', 'brand', 'advertising', 'SEO', 'social media', 'content', 'growth'],
  finance: ['finance', 'investment', 'budget', 'cash flow', 'revenue', 'profit', 'accounting', 'financial'],
  realestate: ['real estate', 'property', 'home', 'apartment', 'lease', 'rent', 'buy', 'sell property'],
  career: ['career', 'job', 'resume', 'interview', 'promotion', 'salary', 'profession', 'skills'],
  retail: ['retail', 'store', 'shop', 'inventory', 'POS', 'customer service', 'ecommerce'],
  beauty: ['beauty', 'salon', 'spa', 'hair', 'makeup', 'esthetics', 'wellness center'],
  fitness: ['fitness', 'gym', 'workout', 'personal trainer', 'health club', 'yoga'],
  travel: ['travel', 'trip', 'vacation', 'tourism', 'destination', 'itinerary'],
  education: ['education', 'school', 'course', 'training', 'learning', 'student', 'teaching'],
  manufacturing: ['manufacturing', 'production', 'factory', 'supply chain', 'inventory'],
  construction: ['construction', 'building', 'contractor', 'project', 'architecture', 'renovation'],
  agriculture: ['agriculture', 'farming', 'crop', 'harvest', 'livestock', 'agribusiness'],
  sports: ['sports', 'team', 'league', 'athlete', 'coaching', 'sports management'],
  entertainment: ['entertainment', 'event', 'media', 'film', 'music', 'content creation']
};

/**
 * POST /consult
 * Main consulting endpoint - routes to appropriate domain
 */
router.post('/consult', async (req, res) => {
  const { userId, query, domain, context } = req.body;
  const storage = req.app.locals.storage;

  if (!query) {
    return res.status(400).json({ success: false, error: 'Query is required' });
  }

  // Detect domain if not specified
  const detectedDomain = domain || detectDomain(query);

  // Generate response based on domain
  const response = generateConsultantResponse(query, detectedDomain, context);

  // Save consultation
  const consultation = {
    id: uuidv4(),
    userId,
    query,
    domain: detectedDomain,
    response,
    timestamp: new Date().toISOString()
  };

  if (userId) {
    if (!storage.consultations.has(userId)) {
      storage.consultations.set(userId, []);
    }
    storage.consultations.get(userId).push(consultation);
  }

  res.json({
    success: true,
    consultation,
    domain: detectedDomain,
    confidence: calculateConfidence(query, detectedDomain)
  });
});

/**
 * GET /consult/domain/:domain
 * Get domain overview and capabilities
 */
router.get('/consult/domain/:domain', async (req, res) => {
  const { domain } = req.params;

  const domainInfo = getDomainInfo(domain);

  if (!domainInfo) {
    return res.status(404).json({ success: false, error: 'Domain not found' });
  }

  res.json({
    success: true,
    domain,
    ...domainInfo
  });
});

/**
 * GET /consult/domains
 * List all available domains
 */
router.get('/consult/domains', async (req, res) => {
  const domains = Object.keys(DOMAIN_KEYWORDS).map(key => ({
    key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    topics: getDomainTopics(key)
  }));

  res.json({
    success: true,
    domains,
    count: domains.length
  });
});

/**
 * GET /consult/history/:userId
 * Get consultation history
 */
router.get('/consult/history/:userId', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const history = storage.consultations.get(userId) || [];

  res.json({
    success: true,
    history,
    count: history.length
  });
});

// Helper functions
function detectDomain(query) {
  const lower = query.toLowerCase();

  let bestMatch = { domain: 'general', score: 0 };

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        score += 1;
      }
    }
    if (score > bestMatch.score) {
      bestMatch = { domain, score };
    }
  }

  return bestMatch.domain;
}

function calculateConfidence(query, domain) {
  const lower = query.toLowerCase();
  const keywords = DOMAIN_KEYWORDS[domain] || [];
  const matches = keywords.filter(k => lower.includes(k)).length;
  return Math.min(1, matches / 2);
}

function generateConsultantResponse(query, domain, context) {
  // Generate domain-specific response
  const responses = {
    restaurant: generateRestaurantAdvice(query),
    hotel: generateHotelAdvice(query),
    startup: generateStartupAdvice(query),
    healthcare: generateHealthcareAdvice(query),
    legal: generateLegalAdvice(query),
    hr: generateHRAdvice(query),
    marketing: generateMarketingAdvice(query),
    finance: generateFinanceAdvice(query),
    realestate: generateRealEstateAdvice(query),
    career: generateCareerAdvice(query),
    general: generateGeneralAdvice(query)
  };

  return responses[domain] || responses.general;
}

function getDomainInfo(domain) {
  const info = {
    restaurant: {
      name: 'Restaurant & Food Service',
      description: 'Expert guidance for restaurants, cafes, and food service businesses',
      topics: ['Menu optimization', 'Kitchen management', 'Customer experience', 'Staff training', 'Marketing', 'Finance']
    },
    hotel: {
      name: 'Hotel & Hospitality',
      description: 'Advice for hotels, resorts, and hospitality businesses',
      topics: ['Guest experience', 'Revenue management', 'Operations', 'Staffing', 'Marketing']
    },
    startup: {
      name: 'Startup & Entrepreneurship',
      description: 'Guidance for founders and startup ventures',
      topics: ['Business planning', 'Fundraising', 'MVP', 'Growth', 'Team building']
    },
    healthcare: {
      name: 'Healthcare',
      description: 'Healthcare business and operations guidance',
      topics: ['Practice management', 'Patient experience', 'Compliance', 'Marketing']
    },
    legal: {
      name: 'Legal & Compliance',
      description: 'Legal guidance and compliance information',
      topics: ['Contracts', 'Compliance', 'Intellectual property', 'Business law']
    },
    hr: {
      name: 'Human Resources',
      description: 'HR and workforce management guidance',
      topics: ['Hiring', 'Training', 'Performance', 'Policies', 'Compliance']
    },
    marketing: {
      name: 'Marketing',
      description: 'Marketing and growth strategies',
      topics: ['Digital marketing', 'Branding', 'Content', 'SEO', 'Social media', 'Advertising']
    },
    finance: {
      name: 'Finance',
      description: 'Financial planning and analysis',
      topics: ['Budgeting', 'Cash flow', 'Investment', 'Tax', 'Financial planning']
    },
    realestate: {
      name: 'Real Estate',
      description: 'Real estate and property guidance',
      topics: ['Buying', 'Selling', 'Investing', 'Property management', 'Market analysis']
    },
    career: {
      name: 'Career Development',
      description: 'Career growth and professional development',
      topics: ['Resume', 'Interview', 'Skills', 'Networking', 'Promotion']
    }
  };

  return info[domain];
}

function getDomainTopics(domain) {
  return DOMAIN_KEYWORDS[domain] || [];
}

// Domain-specific advice generators
function generateRestaurantAdvice(query) {
  const lower = query.toLowerCase();

  if (lower.includes('menu')) {
    return {
      type: 'menu',
      advice: [
        'Focus on 15-20 core items to maintain quality',
        'Use seasonal ingredients for freshness',
        'Price items with 65-70% food cost margin',
        'Include at least 2-3 vegetarian options',
        'Track popular items and remove underperformers'
      ]
    };
  }

  if (lower.includes('marketing')) {
    return {
      type: 'marketing',
      advice: [
        'Instagram and Google Maps are essential',
        'Encourage reviews with every check',
        'Run targeted Facebook/Instagram ads',
        'Partner with food delivery platforms',
        'Create a loyalty program'
      ]
    };
  }

  return {
    type: 'general',
    advice: [
      'Focus on consistency and quality',
      'Train staff on customer service',
      'Monitor food costs weekly',
      'Build relationships with suppliers',
      'Collect and act on customer feedback'
    ]
  };
}

function generateHotelAdvice(query) {
  const lower = query.toLowerCase();

  if (lower.includes('revenue') || lower.includes('pricing')) {
    return {
      type: 'revenue',
      advice: [
        'Use dynamic pricing based on demand',
        'Implement yield management strategies',
        'Monitor competitor pricing weekly',
        'Offer packages with add-ons',
        'Track ADR and occupancy rates daily'
      ]
    };
  }

  return {
    type: 'general',
    advice: [
      'Focus on guest experience at every touchpoint',
      'Train staff on personalized service',
      'Respond to reviews promptly',
      'Create memorable moments for guests',
      'Build a strong loyalty program'
    ]
  };
}

function generateStartupAdvice(query) {
  const lower = query.toLowerCase();

  if (lower.includes('funding') || lower.includes('investor')) {
    return {
      type: 'funding',
      advice: [
        'Build traction before seeking funding',
        'Perfect your pitch deck',
        'Target investors who have invested in your space',
        'Practice your pitch 50+ times',
        'Have clear metrics and milestones'
      ]
    };
  }

  if (lower.includes('MVP') || lower.includes('product')) {
    return {
      type: 'product',
      advice: [
        'Start with the minimum feature set',
        'Focus on the core problem',
        'Launch quickly and iterate',
        'Talk to users every week',
        'Measure what matters'
      ]
    };
  }

  return {
    type: 'general',
    advice: [
      'Focus on product-market fit first',
      'Build a moat early',
      'Hire slowly, fire quickly',
      'Track your metrics obsessively',
      'Stay close to customers'
    ]
  };
}

function generateHealthcareAdvice(query) {
  return {
    type: 'general',
    advice: [
      'Focus on patient experience',
      'Maintain strict compliance',
      'Build strong referral networks',
      'Invest in staff training',
      'Leverage technology for efficiency'
    ]
  };
}

function generateLegalAdvice(query) {
  return {
    type: 'general',
    advice: [
      'Consult with a qualified attorney',
      'Document everything in writing',
      'Review contracts carefully',
      'Protect intellectual property early',
      'Stay updated on regulatory changes'
    ]
  };
}

function generateHRAdvice(query) {
  return {
    type: 'general',
    advice: [
      'Hire for culture add, not just fit',
      'Create clear job descriptions',
      'Implement regular feedback cycles',
      'Invest in employee development',
      'Build strong onboarding processes'
    ]
  };
}

function generateMarketingAdvice(query) {
  return {
    type: 'general',
    advice: [
      'Know your target audience deeply',
      'Focus on one channel first',
      'Create valuable content consistently',
      'Build an email list early',
      'Track ROI on all campaigns'
    ]
  };
}

function generateFinanceAdvice(query) {
  return {
    type: 'general',
    advice: [
      'Understand your cash flow cycle',
      'Maintain 3-6 months runway',
      'Track key financial metrics monthly',
      'Separate personal and business finances',
      'Plan for taxes quarterly'
    ]
  };
}

function generateRealEstateAdvice(query) {
  return {
    type: 'general',
    advice: [
      'Location is the most important factor',
      'Understand market cycles',
      'Factor in all costs, not just purchase price',
      'Build a network of agents and investors',
      'Start with research and due diligence'
    ]
  };
}

function generateCareerAdvice(query) {
  return {
    type: 'general',
    advice: [
      'Build skills that are in demand',
      'Network consistently',
      'Document your achievements',
      'Practice interview skills regularly',
      'Seek mentors in your field'
    ]
  };
}

function generateGeneralAdvice(query) {
  return {
    type: 'general',
    advice: [
      'Define clear goals before taking action',
      'Break down big challenges into smaller steps',
      'Seek advice from those who have done it',
      'Test ideas before full commitment',
      'Stay adaptable and learn from failures'
    ]
  };
}

export default router;
