import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { Knowledge } from './models/Knowledge';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/knowledge-marketplace';

const sampleKnowledge = [
  // Hospitality SOPs
  {
    knowledgeId: 'KNOW-HOSP-SOP-001',
    title: 'Restaurant Food Safety SOP',
    description: 'Complete food safety procedures for restaurant kitchens including temperature control, cross-contamination prevention, and hygiene standards.',
    industry: 'hospitality',
    type: 'sop',
    content: {
      summary: 'Comprehensive food safety standard operating procedures for restaurant environments.',
      sections: [
        {
          title: 'Temperature Control',
          content: 'All hot foods must be maintained at 135°F (57°C) or above. All cold foods must be kept at 41°F (5°C) or below. Temperature checks must be performed every 2 hours and documented.',
          order: 1
        },
        {
          title: 'Cross-Contamination Prevention',
          content: 'Use separate cutting boards for raw meat, poultry, and seafood. Store raw proteins below ready-to-eat foods. Sanitize surfaces between uses.',
          order: 2
        },
        {
          title: 'Personal Hygiene',
          content: 'Wash hands for 20 seconds with soap before handling food. Wear clean uniforms and hair restraints. Do not work if experiencing illness symptoms.',
          order: 3
        },
        {
          title: 'Cleaning and Sanitizing',
          content: 'Use three-compartment sink method. Sanitizer concentration must be 50-100 ppm chlorine. Test strips must be available and used hourly.',
          order: 4
        }
      ]
    },
    citations: [
      { source: 'FDA Food Code', url: 'https://www.fda.gov/food/fda-food-code', description: 'Federal food safety regulations for retail food establishments', date: '2024-01-01' },
      { source: 'ServSafe', url: 'https://www.servsafe.com', description: 'Food safety training and certification program', date: '2024-01-01' }
    ],
    reviews: [
      { userName: 'Hotel Manager', rating: 5, comment: 'This SOP helped us pass our health inspection with flying colors!', createdAt: new Date() }
    ],
    installs: 156,
    rating: 4.8,
    tags: ['food-safety', 'restaurant', 'health-inspection', 'hygiene', 'temperature'],
    author: 'RTMN Food Safety Team',
    version: '2.1.0',
    isPublished: true,
    isPremium: false
  },
  {
    knowledgeId: 'KNOW-HOSP-SOP-002',
    title: 'Hotel Housekeeping Deep Cleaning SOP',
    description: 'Detailed procedures for deep cleaning hotel rooms including bathroom sanitation, bedding standards, and inspection checklists.',
    industry: 'hospitality',
    type: 'sop',
    content: {
      summary: 'Standard operating procedures for hotel housekeeping deep cleaning protocols.',
      sections: [
        {
          title: 'Room Preparation',
          content: 'Knock three times and announce "Housekeeping". Check for lost items. Test all electronics. Note any damages or maintenance issues.',
          order: 1
        },
        {
          title: 'Bathroom Cleaning Protocol',
          content: 'Clean toilet last. Use fresh gloves for bathroom. Disinfect all surfaces with EPA-approved cleaner. Restock amenities.',
          order: 2
        },
        {
          title: 'Bedding Standards',
          content: 'Remove all bedding including decorative pillows. Check mattress for stains. Replace with fresh linens. Make bed with hospital corners.',
          order: 3
        },
        {
          title: 'Final Inspection',
          content: 'Vacuum under beds and furniture. Check for streaks on mirrors and glass. Ensure all amenities are stocked. Final walk-through inspection.',
          order: 4
        }
      ]
    },
    citations: [
      { source: 'American Hotel & Lodging Association', url: 'https://www.ahla.com', description: 'Industry standards for hotel cleanliness', date: '2024-01-01' }
    ],
    reviews: [],
    installs: 98,
    rating: 4.5,
    tags: ['housekeeping', 'hotel', 'cleaning', 'inspection', 'bedding'],
    author: 'RTMN Hospitality Team',
    version: '1.5.0',
    isPublished: true,
    isPremium: false
  },

  // Healthcare Compliance
  {
    knowledgeId: 'KNOW-HEAL-COMP-001',
    title: 'HIPAA Compliance Training Course',
    description: 'Comprehensive training on HIPAA regulations including patient privacy, data security, and breach notification requirements.',
    industry: 'healthcare',
    type: 'compliance',
    content: {
      summary: 'Complete HIPAA compliance training covering all aspects of patient health information protection.',
      sections: [
        {
          title: 'Introduction to HIPAA',
          content: 'HIPAA (Health Insurance Portability and Accountability Act) was enacted in 1996. It establishes national standards for protecting sensitive patient health information.',
          order: 1
        },
        {
          title: 'Protected Health Information (PHI)',
          content: 'PHI includes any individually identifiable health information. This includes demographic data, medical history, test results, insurance information, and any other data that can be used to identify a patient.',
          order: 2
        },
        {
          title: 'Privacy Rule Requirements',
          content: 'The Privacy Rule requires appropriate safeguards to protect privacy. Patients have rights over their health information including the right to access, amend, and receive an accounting of disclosures.',
          order: 3
        },
        {
          title: 'Security Rule Safeguards',
          content: 'Implement administrative, physical, and technical safeguards. Conduct regular risk assessments. Ensure workforce training on security awareness.',
          order: 4
        },
        {
          title: 'Breach Notification',
          content: 'Notify affected individuals within 60 days. Report to HHS for breaches affecting 500+ individuals within 60 days. Include media notification for large breaches.',
          order: 5
        }
      ]
    },
    citations: [
      { source: 'HHS.gov', url: 'https://www.hhs.gov/hipaa/index.html', description: 'Official HIPAA information from the Department of Health and Human Services', date: '2024-01-01' },
      { source: 'HIPAA Journal', url: 'https://www.hipaajournal.com', description: 'Healthcare compliance news and resources', date: '2024-01-01' }
    ],
    reviews: [
      { userName: 'Dr. Smith', rating: 5, comment: 'Excellent course! Covered all the essential HIPAA topics.', createdAt: new Date() },
      { userName: 'Practice Manager', rating: 4, comment: 'Very comprehensive. Would recommend for all healthcare staff.', createdAt: new Date() }
    ],
    installs: 312,
    rating: 4.7,
    tags: ['hipaa', 'compliance', 'healthcare', 'privacy', 'phi', 'training'],
    author: 'RTMN Healthcare Compliance Team',
    version: '3.0.0',
    isPublished: true,
    isPremium: false
  },

  // Retail Training
  {
    knowledgeId: 'KNOW-RETA-TRAIN-001',
    title: 'Customer Service Excellence Training',
    description: 'Training course on delivering exceptional customer service in retail environments including communication skills, conflict resolution, and upselling techniques.',
    industry: 'retail',
    type: 'training',
    content: {
      summary: 'Complete customer service training for retail associates.',
      sections: [
        {
          title: 'Greeting Customers',
          content: 'Make eye contact and smile within 10 seconds of customer entry. Use warm, friendly language. Ask open-ended questions to understand needs.',
          order: 1
        },
        {
          title: 'Active Listening',
          content: 'Listen without interrupting. Paraphrase to confirm understanding. Note customer preferences and purchase history.',
          order: 2
        },
        {
          title: 'Handling Complaints',
          content: 'Acknowledge the issue sincerely. Apologize for the experience. Offer solutions within your authority. Follow up to ensure satisfaction.',
          order: 3
        },
        {
          title: 'Upselling and Cross-selling',
          content: 'Suggest complementary products naturally. Highlight benefits, not features. Respect customer budget constraints.',
          order: 4
        }
      ]
    },
    citations: [
      { source: 'Retail Customer Experience', url: 'https://www.retailcustomerexperience.com', description: 'Retail industry best practices', date: '2024-01-01' }
    ],
    reviews: [],
    installs: 245,
    rating: 4.6,
    tags: ['customer-service', 'retail', 'training', 'sales', 'communication'],
    author: 'RTMN Retail Team',
    version: '2.0.0',
    isPublished: true,
    isPremium: false
  },

  // Hotel Compliance Guide
  {
    knowledgeId: 'KNOW-HOTE-GUIDE-001',
    title: 'Emergency Response Procedures Guide',
    description: 'Comprehensive guide for hotel emergency response including fire evacuation, medical emergencies, security threats, and natural disasters.',
    industry: 'hotel',
    type: 'guide',
    content: {
      summary: 'Hotel emergency response procedures for all staff levels.',
      sections: [
        {
          title: 'Fire Emergency Protocol',
          content: 'Sound the alarm immediately upon discovery. Call 911. Evacuate guests using stairwells, not elevators. Account for all guests and staff. Do not re-enter until cleared by fire department.',
          order: 1
        },
        {
          title: 'Medical Emergency',
          content: 'Assess scene safety. Call emergency services. Administer first aid if trained. Locate nearest AED. Clear area for emergency responders.',
          order: 2
        },
        {
          title: 'Security Threats',
          content: 'Report suspicious activity immediately. Follow lockdown procedures if directed. Evacuate if necessary. Maintain communication with law enforcement.',
          order: 3
        },
        {
          title: 'Natural Disaster Response',
          content: 'Monitor weather alerts. Follow evacuation orders promptly. Account for all guests. Coordinate with emergency management.',
          order: 4
        }
      ]
    },
    citations: [
      { source: 'NFPA', url: 'https://www.nfpa.org', description: 'National Fire Protection Association safety standards', date: '2024-01-01' },
      { source: 'FEMA', url: 'https://www.fema.gov', description: 'Federal Emergency Management Agency guidelines', date: '2024-01-01' }
    ],
    reviews: [
      { userName: 'Safety Director', rating: 5, comment: 'Essential guide for any hotel. Very thorough.', createdAt: new Date() }
    ],
    installs: 187,
    rating: 4.9,
    tags: ['emergency', 'safety', 'hotel', 'evacuation', 'fire', 'security'],
    author: 'RTMN Safety Team',
    version: '4.0.0',
    isPublished: true,
    isPremium: false
  },

  // Manufacturing SOP
  {
    knowledgeId: 'KNOW-MANU-SOP-001',
    title: 'Quality Control Inspection SOP',
    description: 'Standard operating procedures for quality control inspection in manufacturing including sampling methods, defect classification, and documentation requirements.',
    industry: 'manufacturing',
    type: 'sop',
    content: {
      summary: 'Quality control inspection procedures for manufacturing operations.',
      sections: [
        {
          title: 'Inspection Planning',
          content: 'Define inspection criteria based on product specifications. Determine sample size using AQL tables. Schedule inspections at critical checkpoints.',
          order: 1
        },
        {
          title: 'Visual Inspection Process',
          content: 'Use proper lighting (1000 lux minimum). Follow standard viewing distance. Check all surfaces including hidden areas. Document all findings.',
          order: 2
        },
        {
          title: 'Defect Classification',
          content: 'Critical: Safety hazard or regulatory non-compliance. Major: Affects function or appearance. Minor: Cosmetic issues only.',
          order: 3
        },
        {
          title: 'Documentation',
          content: 'Record inspection results in real-time. Use standardized defect codes. Include photographs for complex defects. Maintain traceability records.',
          order: 4
        }
      ]
    },
    citations: [
      { source: 'ISO 2859', url: 'https://www.iso.org', description: 'Sampling procedures for inspection by attributes', date: '2024-01-01' },
      { source: 'ASQ', url: 'https://www.asq.org', description: 'American Society for Quality standards', date: '2024-01-01' }
    ],
    reviews: [],
    installs: 89,
    rating: 4.4,
    tags: ['quality', 'qc', 'inspection', 'manufacturing', 'standards'],
    author: 'RTMN Manufacturing Team',
    version: '2.0.0',
    isPublished: true,
    isPremium: false
  },

  // Legal Compliance
  {
    knowledgeId: 'KNOW-LEGL-COMP-001',
    title: 'Anti-Money Laundering Compliance Guide',
    description: 'Comprehensive compliance guide covering AML regulations, customer due diligence, suspicious activity reporting, and record-keeping requirements.',
    industry: 'legal',
    type: 'compliance',
    content: {
      summary: 'AML compliance procedures for financial institutions and related businesses.',
      sections: [
        {
          title: 'Understanding AML Regulations',
          content: 'Bank Secrecy Act (BSA), USA PATRIOT Act, and FinCEN regulations require financial institutions to implement AML programs.',
          order: 1
        },
        {
          title: 'Customer Due Diligence (CDD)',
          content: 'Verify customer identity. Understand the nature and purpose of customer relationships. Conduct ongoing monitoring. Update customer information regularly.',
          order: 2
        },
        {
          title: 'Enhanced Due Diligence (EDD)',
          content: 'Required for high-risk customers including PEPs, foreign officials, and high-net-worth individuals. Additional documentation and approval required.',
          order: 3
        },
        {
          title: 'Suspicious Activity Reporting',
          content: 'File SAR for transactions involving $5,000+ with knowledge of suspect activity. File within 30 days of initial detection. Maintain confidentiality.',
          order: 4
        }
      ]
    },
    citations: [
      { source: 'FinCEN', url: 'https://www.fincen.gov', description: 'Financial Crimes Enforcement Network regulations', date: '2024-01-01' },
      { source: 'FinCEN SAR Filing', url: 'https://www.fincen.gov/resources/statutes-and-regulations', description: 'SAR filing requirements and guidance', date: '2024-01-01' }
    ],
    reviews: [
      { userName: 'Compliance Officer', rating: 5, comment: 'Very comprehensive and up-to-date. Essential reading.', createdAt: new Date() }
    ],
    installs: 178,
    rating: 4.8,
    tags: ['aml', 'compliance', 'financial', 'kyc', 'sar', 'banking'],
    author: 'RTMN Legal Compliance Team',
    version: '3.5.0',
    isPublished: true,
    isPremium: true
  },

  // Education Training
  {
    knowledgeId: 'KNOW-EDUC-TRAIN-001',
    title: 'New Teacher Orientation Course',
    description: 'Comprehensive training course for new educators covering classroom management, curriculum standards, student assessment, and professional development.',
    industry: 'education',
    type: 'training',
    content: {
      summary: 'Onboarding training for new teachers entering the education profession.',
      sections: [
        {
          title: 'Classroom Management',
          content: 'Establish clear expectations on day one. Use positive reinforcement. Implement consistent routines. Address disruptions calmly and professionally.',
          order: 1
        },
        {
          title: 'Curriculum Standards',
          content: 'Review state and district standards. Align lesson plans to standards. Use backward design for unit planning. Incorporate multiple learning modalities.',
          order: 2
        },
        {
          title: 'Student Assessment',
          content: 'Use formative assessments for ongoing feedback. Create valid and reliable summative assessments. Provide timely, actionable feedback to students.',
          order: 3
        },
        {
          title: 'Professional Development',
          content: 'Set annual professional goals. Seek mentorship from experienced teachers. Stay current with educational research. Participate in PLCs.',
          order: 4
        }
      ]
    },
    citations: [
      { source: 'Edutopia', url: 'https://www.edutopia.org', description: 'Evidence-based learning strategies', date: '2024-01-01' },
      { source: 'ASCD', url: 'https://www.ascd.org', description: 'Association for Supervision and Curriculum Development', date: '2024-01-01' }
    ],
    reviews: [],
    installs: 134,
    rating: 4.6,
    tags: ['education', 'teacher', 'training', 'classroom', 'curriculum'],
    author: 'RTMN Education Team',
    version: '2.0.0',
    isPublished: true,
    isPremium: false
  },

  // Vendor Manual
  {
    knowledgeId: 'KNOW-HOTE-MANU-001',
    title: 'HVAC System Maintenance Manual',
    description: 'Vendor technical manual for HVAC system maintenance including preventive maintenance schedules, troubleshooting guides, and safety procedures.',
    industry: 'hotel',
    type: 'manual',
    content: {
      summary: 'Technical maintenance manual for commercial HVAC systems.',
      sections: [
        {
          title: 'System Overview',
          content: 'This manual covers split systems, RTUs, and VAV systems up to 25 tons. All work must be performed by certified technicians.',
          order: 1
        },
        {
          title: 'Preventive Maintenance Schedule',
          content: 'Monthly: Filter checks, thermostat calibration. Quarterly: Coil cleaning, refrigerant checks. Annually: Full system inspection, ductwork evaluation.',
          order: 2
        },
        {
          title: 'Troubleshooting Guide',
          content: 'No cooling: Check thermostat, filters, refrigerant levels, compressor. No heating: Check gas supply, ignitor, heat exchanger. Strange noises: Check fan motor, belts, bearings.',
          order: 3
        },
        {
          title: 'Safety Procedures',
          content: 'Lockout/tagout before any maintenance. Wear appropriate PPE. Never work on energized systems. Follow EPA refrigerant handling regulations.',
          order: 4
        }
      ]
    },
    citations: [
      { source: 'ASHRAE', url: 'https://www.ashrae.org', description: 'Heating, Refrigerating and Air-Conditioning Engineers standards', date: '2024-01-01' }
    ],
    reviews: [
      { userName: 'Maintenance Manager', rating: 5, comment: 'Excellent troubleshooting guide. Saved us service calls.', createdAt: new Date() }
    ],
    installs: 67,
    rating: 4.7,
    tags: ['hvac', 'maintenance', 'manual', 'hotel', 'technical'],
    author: 'HVAC Pro Services',
    version: '1.0.0',
    isPublished: true,
    isPremium: false
  }
];

async function seed(): Promise<void> {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing knowledge...');
    await Knowledge.deleteMany({});

    // Insert sample data
    console.log('Inserting sample knowledge...');
    const result = await Knowledge.insertMany(sampleKnowledge);

    console.log(`Successfully seeded ${result.length} knowledge items`);

    // Display summary
    console.log('\nKnowledge Summary:');
    console.log('=================');
    for (const item of result) {
      console.log(`  ${item.knowledgeId}: ${item.title} (${item.type})`);
    }

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
