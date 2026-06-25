/**
 * The 12 questions the AI Architect asks founders.
 * Each question has: id, text, field (maps to blueprint), type, options (for dropdowns)
 */

export const QUESTIONS = [
  {
    id: 1,
    text: "What's your brand or company name?",
    field: 'name',
    type: 'text',
    required: true,
    placeholder: "e.g. Maya Collective, TradeFlow, StayOwn",
    help: "This will be your company name and the basis for your brand identity."
  },
  {
    id: 2,
    text: "What type of business are you building?",
    field: 'type',
    type: 'dropdown',
    required: true,
    options: [
      { value: 'marketplace', label: 'Marketplace', description: 'Buyers and sellers connect (B2C or B2B)' },
      { value: 'b2b', label: 'B2B Platform', description: 'Wholesale, supplier portal, or trade network' },
      { value: 'company', label: 'Company OS', description: 'Full department OS with AI workforce' },
      { value: 'hotel', label: 'Hotel / Hospitality', description: 'Property management, booking, guest services' },
      { value: 'restaurant', label: 'Restaurant / Food', description: 'Menu, orders, kitchen, delivery' },
      { value: 'logistics', label: 'Logistics / Delivery', description: 'Fleet, dispatch, tracking, last-mile' },
      { value: 'crm', label: 'CRM / Sales', description: 'Customer relationships, pipeline, deals' },
      { value: 'erp', label: 'ERP / Operations', description: 'Inventory, procurement, finance, HR' },
      { value: 'pos', label: 'Point of Sale', description: 'Till, receipts, inventory tracking' }
    ],
    help: "Choose the template that best fits your business model."
  },
  {
    id: 3,
    text: "Which industries does your business serve?",
    field: 'industries',
    type: 'multi-select',
    required: true,
    options: [
      { value: 'retail', label: 'Retail' },
      { value: 'fashion', label: 'Fashion & Apparel' },
      { value: 'hospitality', label: 'Hotels & Travel' },
      { value: 'food', label: 'Food & Beverage' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'construction', label: 'Construction' },
      { value: 'education', label: 'Education' },
      { value: 'technology', label: 'Technology' },
      { value: 'finance', label: 'Finance & Banking' },
      { value: 'logistics', label: 'Logistics & Supply Chain' },
      { value: 'real-estate', label: 'Real Estate' }
    ],
    help: "Select all industries your business operates in."
  },
  {
    id: 4,
    text: "Which regions will you operate in?",
    field: 'regions',
    type: 'multi-select',
    required: true,
    options: [
      { value: 'us-east', label: 'US East (New York, Miami)', region: 'North America' },
      { value: 'us-west', label: 'US West (LA, SF, Seattle)', region: 'North America' },
      { value: 'eu-west', label: 'Europe West (London, Paris, Berlin)', region: 'Europe' },
      { value: 'ap-south', label: 'South Asia (India, Bangladesh)', region: 'Asia' },
      { value: 'ap-south-east', label: 'Southeast Asia (Singapore, Indonesia)', region: 'Asia' },
      { value: 'me', label: 'Middle East (Dubai, UAE, Saudi)', region: 'Middle East' }
    ],
    help: "Select all regions you plan to serve. This affects currency, language, and compliance defaults."
  },
  {
    id: 5,
    text: "What languages do you need to support?",
    field: 'languages',
    type: 'multi-select',
    required: true,
    options: [
      { value: 'en', label: 'English', flag: '🇺🇸' },
      { value: 'hi', label: 'Hindi', flag: '🇮🇳' },
      { value: 'ar', label: 'Arabic', flag: '🇸🇦' },
      { value: 'es', label: 'Spanish', flag: '🇪🇸' },
      { value: 'fr', label: 'French', flag: '🇫🇷' },
      { value: 'de', label: 'German', flag: '🇩🇪' },
      { value: 'pt', label: 'Portuguese', flag: '🇧🇷' },
      { value: 'ja', label: 'Japanese', flag: '🇯🇵' },
      { value: 'zh', label: 'Chinese', flag: '🇨🇳' }
    ],
    defaultSelection: ['en'],
    help: "Select all languages your customers and team will use."
  },
  {
    id: 6,
    text: "What currency should your business use?",
    field: 'currency',
    type: 'dropdown',
    required: true,
    options: [
      { value: 'USD', label: 'USD ($) — US Dollar', regions: ['us-east', 'us-west'] },
      { value: 'EUR', label: 'EUR (€) — Euro', regions: ['eu-west'] },
      { value: 'GBP', label: 'GBP (£) — British Pound', regions: ['eu-west'] },
      { value: 'INR', label: 'INR (₹) — Indian Rupee', regions: ['ap-south'] },
      { value: 'AED', label: 'AED (د.إ) — UAE Dirham', regions: ['me'] },
      { value: 'SAR', label: 'SAR (ر.س) — Saudi Riyal', regions: ['me'] },
      { value: 'SGD', label: 'SGD ($) — Singapore Dollar', regions: ['ap-south-east'] },
      { value: 'JPY', label: 'JPY (¥) — Japanese Yen', regions: ['ja'] }
    ],
    help: "This will be your primary currency for pricing and payments."
  },
  {
    id: 7,
    text: "How large is your target market?",
    field: 'marketSize',
    type: 'dropdown',
    required: true,
    options: [
      { value: 'local', label: 'Local / City-level', description: '1K-10K customers, single city' },
      { value: 'regional', label: 'Regional / Country-level', description: '10K-100K customers, one country' },
      { value: 'national', label: 'National / Multi-country', description: '100K-1M customers, 2-5 countries' },
      { value: 'global', label: 'Global', description: '1M+ customers, worldwide' }
    ],
    help: "This helps us configure scaling and infrastructure appropriately."
  },
  {
    id: 8,
    text: "What AI workforce do you want?",
    field: 'workforce',
    type: 'multi-select',
    required: true,
    options: [
      { value: 'ceo', label: 'CEO Agent', description: 'Orchestrates strategy, KPIs, decisions' },
      { value: 'sales', label: 'Sales Agent', description: 'Lead qualification, quotations, follow-up' },
      { value: 'marketing', label: 'Marketing Agent', description: 'Campaigns, content, audience targeting' },
      { value: 'procurement', label: 'Procurement Agent', description: 'Supplier sourcing, negotiations, POs' },
      { value: 'finance', label: 'Finance Agent', description: 'Invoicing, payments, bookkeeping' },
      { value: 'support', label: 'Customer Support Agent', description: 'Tickets, chat, WhatsApp support' },
      { value: 'logistics', label: 'Logistics Agent', description: 'Shipping, tracking, delivery coordination' },
      { value: 'hr', label: 'HR Agent', description: 'Recruitment, onboarding, performance reviews' },
      { value: 'operations', label: 'Operations Agent', description: 'Process automation, scheduling' }
    ],
    help: "Select the AI employees you want on your team. Each works 24/7."
  },
  {
    id: 9,
    text: "What compliance requirements do you need?",
    field: 'compliance',
    type: 'multi-select',
    required: false,
    options: [
      { value: 'gdpr', label: 'GDPR', description: 'EU data privacy' },
      { value: 'pci', label: 'PCI DSS', description: 'Payment card security' },
      { value: 'soc2', label: 'SOC 2', description: 'Security compliance' },
      { value: 'hipaa', label: 'HIPAA', description: 'Healthcare data (US)' },
      { value: 'india-dpdp', label: 'India DPDP', description: 'India data protection' },
      { value: 'uae-data', label: 'UAE Data Law', description: 'UAE data localization' },
      { value: 'kyc', label: 'KYC / AML', description: 'Identity verification' },
      { value: 'ofac', label: 'OFAC Sanctions', description: 'US sanctions screening' }
    ],
    help: "Select compliance frameworks your business must follow. Skip if unsure."
  },
  {
    id: 10,
    text: "Do you need e-commerce with payments?",
    field: 'commerce',
    type: 'dropdown',
    required: true,
    options: [
      { value: 'yes-full', label: 'Yes — Full commerce', description: 'Cart, checkout, payments, escrow, BNPL' },
      { value: 'yes-rfq', label: 'Yes — RFQ only', description: 'Request for quotes, no cart/checkout' },
      { value: 'no', label: 'No commerce', description: 'Lead gen, info pages, no transactions' }
    ],
    help: "This configures your payment and transaction flow."
  },
  {
    id: 11,
    text: "What platforms do you need?",
    field: 'platforms',
    type: 'multi-select',
    required: true,
    options: [
      { value: 'web', label: 'Web App', description: 'Browser-based application' },
      { value: 'mobile-ios', label: 'iOS App', description: 'Apple iPhone/iPad' },
      { value: 'mobile-android', label: 'Android App', description: 'Google Play store' },
      { value: 'whatsapp', label: 'WhatsApp', description: 'Conversational commerce via WhatsApp' }
    ],
    defaultSelection: ['web'],
    help: "Select the platforms you want your business accessible on."
  },
  {
    id: 12,
    text: "Do you want to join Global Nexha (the AI commerce network)?",
    field: 'federation',
    type: 'dropdown',
    required: true,
    options: [
      { value: 'yes', label: 'Yes — Join Global Nexha', description: 'Get discovered by 100K+ businesses, automatic supplier matching, trade finance' },
      { value: 'no', label: 'No — Standalone', description: 'Keep your business private, no network effects' }
    ],
    defaultValue: 'yes',
    help: "Global Nexha is the AI commerce network where businesses discover and transact with each other."
  }
];

/**
 * Get question by ID
 */
export function getQuestion(id) {
  return QUESTIONS.find(q => q.id === id) || null;
}

/**
 * Get question count
 */
export function getQuestionCount() {
  return QUESTIONS.length;
}

/**
 * Get first question
 */
export function getFirstQuestion() {
  return QUESTIONS[0];
}

/**
 * Get next question after current question ID
 */
export function getNextQuestion(currentId) {
  const currentIndex = QUESTIONS.findIndex(q => q.id === currentId);
  if (currentIndex === -1 || currentIndex === QUESTIONS.length - 1) {
    return null;
  }
  return QUESTIONS[currentIndex + 1];
}

/**
 * Get previous question before current question ID
 */
export function getPreviousQuestion(currentId) {
  const currentIndex = QUESTIONS.findIndex(q => q.id === currentId);
  if (currentIndex <= 0) {
    return null;
  }
  return QUESTIONS[currentIndex - 1];
}

/**
 * Generate context-aware follow-up question based on business type and idea
 */
export function generateFollowUp(idea, businessType, answers) {
  const ideaLower = idea.toLowerCase();

  // Detect if the idea suggests certain industries
  if (ideaLower.includes('fashion') || ideaLower.includes('clothing') || ideaLower.includes('apparel')) {
    return "I see you're building a fashion brand — would you like AI-powered fashion trend analysis and inventory prediction?";
  }
  if (ideaLower.includes('restaurant') || ideaLower.includes('food') || ideaLower.includes('delivery')) {
    return "For food businesses, I recommend the Kitchen Agent and Delivery Agent. Should I add these to your workforce?";
  }
  if (ideaLower.includes('hotel') || ideaLower.includes('hostel') || ideaLower.includes('property')) {
    return "For hospitality, the Housekeeping Agent and Revenue Agent are great additions. Want me to include them?";
  }
  if (ideaLower.includes('b2b') || ideaLower.includes('wholesale') || ideaLower.includes('supplier')) {
    return "For B2B, the Procurement Agent and Finance Agent are essential. Adding them to your team?";
  }
  if (ideaLower.includes('d2c') || ideaLower.includes('consumer')) {
    return "For D2C brands, the Marketing Agent and Customer Support Agent are key. Should I add them?";
  }

  // Generic follow-up based on business type
  if (businessType === 'marketplace') {
    return "For marketplaces, I recommend adding a Logistics Agent to handle shipping coordination. Include it?";
  }
  if (businessType === 'crm' || businessType === 'company') {
    return "For CRM and company operations, the HR Agent helps with recruitment and team management. Add it?";
  }

  return null;
}
