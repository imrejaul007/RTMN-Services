import { IndustryType } from '../models/IndustryProfile';
import { KnowledgeCategory } from '../models/DomainKnowledge';

// Domain-specific intelligence for each industry
interface DomainIntelligenceConfig {
  industryType: IndustryType;
  insights: {
    category: string;
    insight: string;
    recommendation: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }[];
  commonPatterns: {
    pattern: string;
    description: string;
    solutions: string[];
  }[];
  optimizationTips: {
    area: string;
    tip: string;
    expectedImpact: string;
  }[];
  technologyStack: {
    category: string;
    essential: string[];
    recommended: string[];
    optional: string[];
  };
  metrics: {
    primary: string[];
    secondary: string[];
    leading: string[];
  };
}

// Industry-specific intelligence configurations
const industryIntelligence: Record<IndustryType, DomainIntelligenceConfig> = {
  restaurant: {
    industryType: 'restaurant',
    insights: [
      {
        category: 'Operations',
        insight: 'Food costs typically range between 28-35% of revenue',
        recommendation: 'Implement inventory tracking and supplier management to optimize food costs',
        priority: 'high'
      },
      {
        category: 'Customer Service',
        insight: 'Customer reviews directly impact 30% of new customer acquisition',
        recommendation: 'Monitor and respond to reviews on major platforms within 24 hours',
        priority: 'high'
      },
      {
        category: 'Operations',
        insight: 'Table turnover rate is critical for revenue optimization',
        recommendation: 'Train staff on efficient service pacing and clearing protocols',
        priority: 'medium'
      },
      {
        category: 'Finance',
        insight: 'Labor costs should remain between 25-35% of revenue',
        recommendation: 'Use scheduling software to match staffing with predicted demand',
        priority: 'high'
      }
    ],
    commonPatterns: [
      {
        pattern: 'Rush Hour Chaos',
        description: 'Kitchen and front-of-house overwhelmed during peak hours',
        solutions: ['Pre-shift briefings', 'Expedited stations', 'Digital menu boards', 'Online ordering']
      },
      {
        pattern: 'Inventory Shrinkage',
        description: 'Unexpected losses in food inventory',
        solutions: ['Regular inventory audits', 'Portion control training', 'Security cameras', 'Receiving protocols']
      },
      {
        pattern: 'Staff Turnover',
        description: 'High employee turnover in hospitality industry',
        solutions: ['Competitive wages', 'Flexible scheduling', 'Career path programs', 'Employee perks']
      }
    ],
    optimizationTips: [
      {
        area: 'Menu Engineering',
        tip: 'Analyze menu item profitability and popularity to optimize offerings',
        expectedImpact: '15-25% increase in profitability'
      },
      {
        area: 'Reservation Management',
        tip: 'Implement waitlist management and SMS notifications',
        expectedImpact: '20% improvement in table utilization'
      },
      {
        area: 'Kitchen Efficiency',
        tip: 'Use kitchen display systems to streamline order flow',
        expectedImpact: '10-15% reduction in ticket times'
      }
    ],
    technologyStack: {
      category: 'Restaurant Technology',
      essential: ['POS System', 'Online Ordering Platform', 'Reservation System', 'Inventory Management'],
      recommended: ['Kitchen Display System', 'CRM', 'Loyalty Program', 'Employee Scheduling'],
      optional: ['AI-powered Forecasting', 'Robotic Kitchen Equipment', 'Digital Menu Boards']
    },
    metrics: {
      primary: ['Revenue Per Available Seat Hour', 'Food Cost Percentage', 'Table Turnover Rate'],
      secondary: ['Customer Satisfaction Score', 'Average Check Value', 'Labor Cost Percentage'],
      leading: ['Reservation Bookings', 'Online Order Volume', 'Review Scores']
    }
  },
  hotel: {
    industryType: 'hotel',
    insights: [
      {
        category: 'Revenue',
        insight: 'Dynamic pricing can increase ADR by 15-30%',
        recommendation: 'Implement revenue management system with competitive intelligence',
        priority: 'high'
      },
      {
        category: 'Operations',
        insight: 'Housekeeping efficiency directly impacts guest satisfaction',
        recommendation: 'Use task management systems with real-time status tracking',
        priority: 'medium'
      },
      {
        category: 'Customer Service',
        insight: 'Loyalty program members spend 2x more than non-members',
        recommendation: 'Focus on loyalty program enrollment and personalization',
        priority: 'high'
      },
      {
        category: 'Revenue',
        insight: 'Upselling can increase revenue per guest by 20-40%',
        recommendation: 'Train front desk staff on upselling techniques and packages',
        priority: 'medium'
      }
    ],
    commonPatterns: [
      {
        pattern: 'Overbooking',
        description: 'Managing walk-ins when rooms are oversold',
        solutions: ['STR monitoring', 'Dynamic pricing', 'Partner hotel agreements', 'Compensation protocols']
      },
      {
        pattern: 'Early Departures',
        description: 'Guests leaving before scheduled checkout',
        solutions: ['Day-of departure reminders', 'Flexible checkout options', 'Loyalty incentives']
      },
      {
        pattern: 'Seasonal Fluctuations',
        description: 'Revenue drops during off-peak seasons',
        solutions: ['Special packages', 'Local partnerships', 'Corporate contracts', 'Events hosting']
      }
    ],
    optimizationTips: [
      {
        area: 'Revenue Management',
        tip: 'Adjust rates based on demand forecasting and competitor pricing',
        expectedImpact: '20-30% increase in RevPAR'
      },
      {
        area: 'Guest Experience',
        tip: 'Personalize guest preferences using CRM data',
        expectedImpact: '25% increase in repeat bookings'
      },
      {
        area: 'Staff Scheduling',
        tip: 'Match staffing levels with occupancy forecasting',
        expectedImpact: '10-15% reduction in labor costs'
      }
    ],
    technologyStack: {
      category: 'Hotel Technology',
      essential: ['PMS', 'Channel Manager', 'Booking Engine', 'POS (F&B)'],
      recommended: ['Revenue Management System', 'Housekeeping Management', 'Guest Messaging', 'CRM'],
      optional: ['AI Concierge', 'Smart Room Technology', 'Robotics', 'Contactless Solutions']
    },
    metrics: {
      primary: ['Occupancy Rate', 'ADR', 'RevPAR', 'GOPPAR'],
      secondary: ['Guest Satisfaction Score', 'RevPAR', 'Average Length of Stay', 'Cancellation Rate'],
      leading: ['Booking Pace', 'Search Rankings', 'Review Scores', 'Loyalty Enrollment']
    }
  },
  healthcare: {
    industryType: 'healthcare',
    insights: [
      {
        category: 'Compliance',
        insight: 'HIPAA violations can result in fines up to $1.5M per violation',
        recommendation: 'Implement comprehensive security and training programs',
        priority: 'critical'
      },
      {
        category: 'Operations',
        insight: 'Reducing patient wait times by 15 minutes increases satisfaction by 25%',
        recommendation: 'Implement appointment scheduling optimization',
        priority: 'high'
      },
      {
        category: 'Finance',
        insight: 'Claim denials cost practices an average of $262 per claim',
        recommendation: 'Implement billing verification and denial management systems',
        priority: 'high'
      },
      {
        category: 'Patient Care',
        insight: 'Patient engagement programs reduce readmission rates by 15-20%',
        recommendation: 'Implement follow-up communication and monitoring systems',
        priority: 'medium'
      }
    ],
    commonPatterns: [
      {
        pattern: 'No-Show Patients',
        description: 'Patients missing scheduled appointments',
        solutions: ['Appointment reminders', 'Cancellation policies', 'Telemedicine options', 'Incentives']
      },
      {
        pattern: 'Insurance Verification Delays',
        description: 'Time spent verifying patient insurance coverage',
        solutions: ['Real-time eligibility checks', 'Patient portal', 'Clear financial policies']
      },
      {
        pattern: 'Provider Burnout',
        description: 'High stress and turnover among healthcare providers',
        solutions: ['Workload management', 'Mental health support', 'Administrative assistance', 'Flexible scheduling']
      }
    ],
    optimizationTips: [
      {
        area: 'Appointment Scheduling',
        tip: 'Implement advanced scheduling with buffer times and block scheduling',
        expectedImpact: '30% reduction in wait times'
      },
      {
        area: 'Revenue Cycle',
        tip: 'Automate eligibility checks and prior authorizations',
        expectedImpact: '25% reduction in claim denials'
      },
      {
        area: 'Patient Engagement',
        tip: 'Use automated communication for follow-ups and reminders',
        expectedImpact: '20% reduction in readmissions'
      }
    ],
    technologyStack: {
      category: 'Healthcare Technology',
      essential: ['EHR/EMR', 'Practice Management', 'Medical Billing', 'Patient Portal'],
      recommended: ['Telehealth Platform', 'Lab Integration', 'E-Prescribing', 'Patient Messaging'],
      optional: ['AI Diagnostics', 'Remote Monitoring', 'Health Analytics', 'Blockchain Records']
    },
    metrics: {
      primary: ['Patient Satisfaction', 'Wait Times', 'No-Show Rate', 'Claim Denial Rate'],
      secondary: ['Bed Occupancy', 'Staff Productivity', 'Revenue Per Visit', 'Readmission Rate'],
      leading: ['New Patient Inquiries', 'Referral Volume', 'Online Reviews', 'Appointment Requests']
    }
  },
  retail: {
    industryType: 'retail',
    insights: [
      {
        category: 'Operations',
        insight: 'Optimized inventory can reduce carrying costs by 20-30%',
        recommendation: 'Implement demand forecasting and automated replenishment',
        priority: 'high'
      },
      {
        category: 'Customer Service',
        insight: 'Omnichannel customers spend 15-25% more than single-channel',
        recommendation: 'Integrate online and in-store experiences',
        priority: 'high'
      },
      {
        category: 'Marketing',
        insight: 'Personalized emails deliver 6x higher transaction rates',
        recommendation: 'Implement customer segmentation and targeted campaigns',
        priority: 'high'
      },
      {
        category: 'Finance',
        insight: 'Customer acquisition costs are 5x higher than retention costs',
        recommendation: 'Focus on loyalty programs and retention strategies',
        priority: 'medium'
      }
    ],
    commonPatterns: [
      {
        pattern: 'Stockouts',
        description: 'Products unavailable when customers want them',
        solutions: ['Demand forecasting', 'Safety stock optimization', 'Supplier management', 'Real-time inventory']
      },
      {
        pattern: 'Cart Abandonment',
        description: 'Online shoppers leaving without completing purchase',
        solutions: ['Exit-intent offers', 'Guest checkout', 'Multiple payment options', 'Abandoned cart emails']
      },
      {
        pattern: 'Seasonal Overstock',
        description: 'Excess inventory after seasonal demand ends',
        solutions: ['Clearance strategies', 'Dynamic pricing', 'Inventory planning', 'Multi-channel selling']
      }
    ],
    optimizationTips: [
      {
        area: 'Inventory Management',
        tip: 'Use AI-powered demand forecasting to optimize stock levels',
        expectedImpact: '25% reduction in stockouts and overstock'
      },
      {
        area: 'Customer Experience',
        tip: 'Implement buy online, pick up in store capabilities',
        expectedImpact: '30% increase in customer satisfaction'
      },
      {
        area: 'Pricing Strategy',
        tip: 'Use competitive intelligence for dynamic pricing',
        expectedImpact: '10-15% improvement in margins'
      }
    ],
    technologyStack: {
      category: 'Retail Technology',
      essential: ['POS', 'Inventory Management', 'E-commerce Platform', 'CRM'],
      recommended: ['Omnichannel Integration', 'Loyalty Program', 'Analytics Platform', 'POS Integration'],
      optional: ['AI-powered Recommendations', 'Smart Shelves', 'Contactless Checkout', 'AR/VR Shopping']
    },
    metrics: {
      primary: ['Sales Per Square Foot', 'Conversion Rate', 'Average Order Value', 'Inventory Turnover'],
      secondary: ['Customer Retention Rate', 'Gross Margin', 'Sell-Through Rate', 'Foot Traffic'],
      leading: ['Website Traffic', 'Email Engagement', 'Social Media Mentions', 'Search Rankings']
    }
  },
  manufacturing: {
    industryType: 'manufacturing',
    insights: [
      {
        category: 'Operations',
        insight: 'OEE above 85% indicates world-class manufacturing',
        recommendation: 'Implement real-time equipment monitoring and maintenance programs',
        priority: 'high'
      },
      {
        category: 'Quality',
        insight: 'Quality costs typically represent 15-20% of total revenue',
        recommendation: 'Invest in quality management systems and process improvement',
        priority: 'high'
      },
      {
        category: 'Supply Chain',
        insight: 'Supply chain disruptions can cost 10-30% of annual profit',
        recommendation: 'Diversify suppliers and implement risk management',
        priority: 'critical'
      },
      {
        category: 'Operations',
        insight: 'Predictive maintenance can reduce downtime by 30-50%',
        recommendation: 'Deploy IoT sensors and predictive analytics',
        priority: 'medium'
      }
    ],
    commonPatterns: [
      {
        pattern: 'Equipment Downtime',
        description: 'Unplanned equipment failures causing production delays',
        solutions: ['Preventive maintenance', 'IoT monitoring', 'Spare parts inventory', 'Root cause analysis']
      },
      {
        pattern: 'Quality Defects',
        description: 'Products failing to meet quality specifications',
        solutions: ['Statistical process control', 'Six Sigma', 'Employee training', 'Supplier quality']
      },
      {
        pattern: 'Production Delays',
        description: 'Missed production schedules and delivery dates',
        solutions: ['Production planning', 'Bottleneck analysis', 'Capacity optimization', 'Lean manufacturing']
      }
    ],
    optimizationTips: [
      {
        area: 'Equipment Effectiveness',
        tip: 'Implement OEE monitoring with real-time dashboards',
        expectedImpact: '15-25% improvement in OEE scores'
      },
      {
        area: 'Energy Efficiency',
        tip: 'Monitor and optimize energy consumption per unit produced',
        expectedImpact: '10-20% reduction in energy costs'
      },
      {
        area: 'Supply Chain',
        tip: 'Diversify supplier base and implement dual-sourcing strategies',
        expectedImpact: '30% reduction in supply chain risk'
      }
    ],
    technologyStack: {
      category: 'Manufacturing Technology',
      essential: ['MES', 'ERP', 'Quality Management', 'SCADA'],
      recommended: ['IoT Platform', 'Predictive Maintenance', 'CAD/CAM', 'Barcode/RFID'],
      optional: ['Digital Twin', 'AI Quality Control', 'Robotic Automation', 'Additive Manufacturing']
    },
    metrics: {
      primary: ['OEE', 'Production Yield', 'On-Time Delivery', 'Defect Rate'],
      secondary: ['Cycle Time', 'First Pass Yield', 'Inventory Turns', 'Overall Costs'],
      leading: ['Order Backlog', 'Equipment Utilization', 'Employee Productivity', 'Customer Complaints']
    }
  },
  fintech: {
    industryType: 'fintech',
    insights: [
      {
        category: 'Security',
        insight: 'Financial fraud costs businesses an average of 3.4% of annual revenue',
        recommendation: 'Implement multi-layer fraud detection and prevention systems',
        priority: 'critical'
      },
      {
        category: 'Compliance',
        insight: 'Regulatory fines have exceeded $10B globally in recent years',
        recommendation: 'Maintain robust compliance and audit programs',
        priority: 'critical'
      },
      {
        category: 'Customer Experience',
        insight: 'Digital-first customers expect sub-second transaction processing',
        recommendation: 'Invest in infrastructure and API optimization',
        priority: 'high'
      },
      {
        category: 'Growth',
        insight: 'Mobile-first fintechs grow 2x faster than traditional financial services',
        recommendation: 'Prioritize mobile experience and digital onboarding',
        priority: 'high'
      }
    ],
    commonPatterns: [
      {
        pattern: 'KYC Delays',
        description: 'Customer onboarding taking too long due to verification',
        solutions: ['Digital KYC', 'Biometric verification', 'Third-party data sources', 'Progressive verification']
      },
      {
        pattern: 'Transaction Failures',
        description: 'Payments failing or processing slowly',
        solutions: ['Redundant systems', 'Real-time monitoring', 'Fallback routing', 'Performance optimization']
      },
      {
        pattern: 'Compliance Burden',
        description: 'Complex and time-consuming regulatory compliance',
        solutions: ['RegTech solutions', 'Automated reporting', 'Compliance management system', 'Training programs']
      }
    ],
    optimizationTips: [
      {
        area: 'Transaction Processing',
        tip: 'Implement multi-region infrastructure for resilience',
        expectedImpact: '99.99% uptime and sub-second processing'
      },
      {
        area: 'Fraud Detection',
        tip: 'Use machine learning for real-time fraud scoring',
        expectedImpact: '60% reduction in fraud losses'
      },
      {
        area: 'Customer Onboarding',
        tip: 'Digitize KYC with automated document verification',
        expectedImpact: '70% reduction in onboarding time'
      }
    ],
    technologyStack: {
      category: 'Fintech Technology',
      essential: ['Core Banking/Billing', 'Payment Gateway', 'Security/Fraud', 'KYC/AML'],
      recommended: ['Data Analytics', 'API Gateway', 'Cloud Infrastructure', 'Customer Portal'],
      optional: ['AI/ML Models', 'Blockchain', 'Open Banking', 'Voice/Chatbot']
    },
    metrics: {
      primary: ['Transaction Success Rate', 'Fraud Rate', 'Customer Churn', 'Compliance Score'],
      secondary: ['CAC', 'LTV', 'Response Time', 'API Latency'],
      leading: ['New Sign-ups', 'App Downloads', ' NPS Score', 'Support Tickets']
    }
  }
};

export class DomainIntelligenceService {
  /**
   * Get complete domain intelligence for an industry
   */
  static getIntelligence(industryType: IndustryType): DomainIntelligenceConfig | null {
    return industryIntelligence[industryType] || null;
  }

  /**
   * Get insights for an industry
   */
  static getInsights(industryType: IndustryType): DomainIntelligenceConfig['insights'] {
    const intelligence = industryIntelligence[industryType];
    return intelligence?.insights || [];
  }

  /**
   * Get critical insights (priority: critical or high)
   */
  static getCriticalInsights(industryType: IndustryType): DomainIntelligenceConfig['insights'] {
    const insights = this.getInsights(industryType);
    return insights.filter(i => i.priority === 'critical' || i.priority === 'high');
  }

  /**
   * Get common patterns and solutions for an industry
   */
  static getCommonPatterns(industryType: IndustryType): DomainIntelligenceConfig['commonPatterns'] {
    const intelligence = industryIntelligence[industryType];
    return intelligence?.commonPatterns || [];
  }

  /**
   * Get optimization tips for an industry
   */
  static getOptimizationTips(industryType: IndustryType): DomainIntelligenceConfig['optimizationTips'] {
    const intelligence = industryIntelligence[industryType];
    return intelligence?.optimizationTips || [];
  }

  /**
   * Get recommended technology stack for an industry
   */
  static getTechnologyStack(industryType: IndustryType): DomainIntelligenceConfig['technologyStack'] | null {
    const intelligence = industryIntelligence[industryType];
    return intelligence?.technologyStack || null;
  }

  /**
   * Get all recommended metrics for an industry
   */
  static getMetrics(industryType: IndustryType): DomainIntelligenceConfig['metrics'] | null {
    const intelligence = industryIntelligence[industryType];
    return intelligence?.metrics || null;
  }

  /**
   * Get insights by category
   */
  static getInsightsByCategory(
    industryType: IndustryType,
    category: string
  ): DomainIntelligenceConfig['insights'] {
    const insights = this.getInsights(industryType);
    return insights.filter(i => i.category.toLowerCase() === category.toLowerCase());
  }

  /**
   * Search across all intelligence for an industry
   */
  static search(industryType: IndustryType, query: string): {
    insights: DomainIntelligenceConfig['insights'];
    patterns: DomainIntelligenceConfig['commonPatterns'];
    tips: DomainIntelligenceConfig['optimizationTips'];
  } {
    const intelligence = industryIntelligence[industryType];
    if (!intelligence) {
      return { insights: [], patterns: [], tips: [] };
    }

    const lowerQuery = query.toLowerCase();

    const insights = intelligence.insights.filter(i =>
      i.category.toLowerCase().includes(lowerQuery) ||
      i.insight.toLowerCase().includes(lowerQuery) ||
      i.recommendation.toLowerCase().includes(lowerQuery)
    );

    const patterns = intelligence.commonPatterns.filter(p =>
      p.pattern.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery)
    );

    const tips = intelligence.optimizationTips.filter(t =>
      t.area.toLowerCase().includes(lowerQuery) ||
      t.tip.toLowerCase().includes(lowerQuery)
    );

    return { insights, patterns, tips };
  }

  /**
   * Get all supported industries
   */
  static getSupportedIndustries(): { type: IndustryType; name: string }[] {
    return [
      { type: 'restaurant', name: 'Restaurant' },
      { type: 'hotel', name: 'Hotel & Hospitality' },
      { type: 'healthcare', name: 'Healthcare' },
      { type: 'retail', name: 'Retail' },
      { type: 'manufacturing', name: 'Manufacturing' },
      { type: 'fintech', name: 'Financial Technology' }
    ];
  }
}

export default DomainIntelligenceService;
