/**
 * Real Estate Vertical Template
 * Industry: Real Estate, Property Sales, Rentals
 */
module.exports = {
  name: 'realestate',
  displayName: 'Real Estate',
  icon: '🏠',
  description: 'For real estate agencies, property developers, and rental platforms',
  intents: [
    { id: 'property_search', patterns: ['find property', 'search', 'looking for', 'property'], action: 'searchProperties' },
    { id: 'budget_match', patterns: ['budget', 'price range', 'affordable', 'under'], action: 'matchByBudget' },
    { id: 'location_search', patterns: ['location', 'area', 'neighborhood', 'nearby'], action: 'searchByLocation' },
    { id: 'site_visit', patterns: ['visit', 'schedule visit', 'see property', 'tour'], action: 'scheduleVisit' },
    { id: 'loan_check', patterns: ['loan', 'EMI', 'finance', 'mortgage', 'eligibility'], action: 'checkLoanEligibility' },
    { id: 'price_negotiate', patterns: ['negotiate', 'discount', 'price', 'offer'], action: 'handleNegotiation' },
    { id: 'property_compare', patterns: ['compare', 'comparison', 'which is better'], action: 'compareProperties' },
    { id: 'virtual_tour', patterns: ['virtual tour', '3D view', 'video', 'walkthrough'], action: 'startVirtualTour' },
    { id: 'investment', patterns: ['investment', 'ROI', 'returns', 'appreciation'], action: 'investmentAnalysis' },
    { id: 'document_check', patterns: ['documents', 'legal', 'papers', 'title'], action: 'verifyDocuments' }
  ],
  richContentTypes: [
    { type: 'property_card', description: 'Property with image, price, key details' },
    { type: 'location_map', description: 'Map with property location' },
    { type: 'visit_scheduler', description: 'Date/time picker for site visits' },
    { type: 'loan_calculator', description: 'EMI and affordability calculator' },
    { type: 'comparison_table', description: 'Side-by-side property comparison' },
    { type: 'investment_report', description: 'ROI and investment analysis' }
  ],
  industryMetrics: [
    'inquiry_to_visit_rate', 'visit_to_close_rate', 'avg_deal_size',
    'days_on_market', 'price_per_sqft', 'lead_conversion',
    'marketing_roi', 'customer_satisfaction'
  ],
  connectedServices: [
    { name: 'Real Estate OS', port: 5230, purpose: 'Properties, leads, transactions' },
    { name: 'REZ CRM Hub', port: 4056, purpose: 'Lead management' },
    { name: 'Customer Twin', port: 4895, purpose: 'Buyer preferences' }
  ],
  agentPrompt: `You are an expert real estate assistant. Help customers find properties, schedule visits, check loan eligibility, and provide investment insights. Be knowledgeable about the local market and always verify property documents.`,
  actionMappings: {
    searchProperties: { service: 'Real Estate OS', endpoint: '/api/properties/search' },
    scheduleVisit: { service: 'Real Estate OS', endpoint: '/api/visits' },
    checkLoanEligibility: { service: 'Real Estate OS', endpoint: '/api/loans/eligibility' }
  }
};