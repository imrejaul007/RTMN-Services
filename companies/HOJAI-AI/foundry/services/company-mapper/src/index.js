/**
 * 510 Company Mapper
 * Maps every company to:
 * - Template (e-commerce, food-delivery, ota, etc.)
 * - Flows (specific to business model)
 * - Nexha integrations (payment, logistics, etc.)
 * - AI agents (domain-specific)
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
const PORT = 4560;

// ── Company Database ──────────────────────────────────────────────────────────────

const COMPANIES = {
  // ══════════════════════════════════════════════════════════════════════════════
  // COMMERCE / E-COMMERCE (Sectors 1-10)
  // ══════════════════════════════════════════════════════════════════════════════
  amazon: {
    name: 'Amazon', sector: 'commerce', template: 'ecommerce', flows: ['buyer_journey', 'order_fulfillment', 'returns_flow', 'seller_onboarding', 'pricing_optimization', 'fraud_detection'],
    nexha: ['payment-network', 'logistics-network', 'catalog-os', 'discovery-os'],
    agents: ['CatalogAgent', 'FulfillmentAgent', 'DiscoveryAgent', 'PricingAgent', 'FraudAgent', 'MarketingAgent'],
    color: '#FF9900'
  },
  flipkart: {
    name: 'Flipkart', sector: 'commerce', template: 'ecommerce', flows: ['buyer_journey', 'smartcart_flow', 'order_fulfillment', 'returns_flow', 'seller_onboarding'],
    nexha: ['payment-network', 'logistics-network', 'phonepe-integration'],
    agents: ['CatalogAgent', 'FulfillmentAgent', 'DiscoveryAgent', 'OffersAgent', 'DeliveryAgent'],
    color: '#2874F0'
  },
  alibaba: {
    name: 'Alibaba', sector: 'commerce', template: 'b2b-commerce', flows: ['rfq_flow', 'trade_compliance', 'payment_lc_flow', 'quality_inspection', 'logistics_flow'],
    nexha: ['trade-finance-network', 'payment-network', 'compliance-network', 'logistics-network', 'supplier-network'],
    agents: ['SourcingAgent', 'ComplianceAgent', 'PaymentAgent', 'QualityAgent', 'LogisticsAgent', 'DocumentAgent'],
    color: '#FF6A00'
  },
  ebay: {
    name: 'eBay', sector: 'commerce', template: 'marketplace', flows: ['listing_flow', 'bidding_flow', 'order_fulfillment', 'returns_flow', 'seller_onboarding'],
    nexha: ['payment-network', 'logistics-network', 'catalog-os'],
    agents: ['CatalogAgent', 'DiscoveryAgent', 'AuctionAgent', 'FulfillmentAgent', 'ReturnsAgent'],
    color: '#E53238'
  },
  etsy: {
    name: 'Etsy', sector: 'commerce', template: 'marketplace', flows: ['listing_flow', 'discovery_flow', 'order_fulfillment', 'returns_flow', 'seller_marketing'],
    nexha: ['payment-network', 'logistics-network', 'discovery-os'],
    agents: ['CatalogAgent', 'DiscoveryAgent', 'MarketingAgent', 'SellerAgent'],
    color: '#F56400'
  },
  shopify: {
    name: 'Shopify', sector: 'commerce-saas', template: 'ecommerce-saas', flows: ['store_setup', 'order_management', 'inventory_flow', 'marketing_automation', 'analytics_flow'],
    nexha: ['payment-network', 'logistics-network', 'catalog-os', 'analytics-os'],
    agents: ['StoreBuilderAgent', 'CatalogAgent', 'MarketingAgent', 'AnalyticsAgent', 'SupportAgent'],
    color: '#96BF48'
  },
  meesho: {
    name: 'Meesho', sector: 'social-commerce', template: 'social-commerce', flows: ['reseller_onboarding', 'product_sourcing', 'order_fulfillment', 'payment_collection', 'commission_flow'],
    nexha: ['payment-network', 'logistics-network', 'social-network'],
    agents: ['ResellerAgent', 'SourcingAgent', 'FulfillmentAgent', 'PaymentAgent', 'GrowthAgent'],
    color: '#D83287'
  },
  udaan: {
    name: 'Udaan', sector: 'b2b-commerce', template: 'b2b-commerce', flows: ['distributor_onboarding', 'rfq_flow', 'order_fulfillment', 'credit_flow', 'logistics_flow'],
    nexha: ['trade-finance-network', 'payment-network', 'logistics-network', 'supplier-network'],
    agents: ['DistributorAgent', 'SourcingAgent', 'PaymentAgent', 'CreditAgent', 'LogisticsAgent'],
    color: '#5C2D91'
  },
  indiamart: {
    name: 'IndiaMART', sector: 'b2b-commerce', template: 'b2b-marketplace', flows: ['lead_generation', 'rfq_flow', 'supplier_verification', 'order_fulfillment'],
    nexha: ['discovery-os', 'payment-network', 'supplier-network', 'lead-os'],
    agents: ['DiscoveryAgent', 'LeadAgent', 'VerificationAgent', 'SourcingAgent'],
    color: '#FF6F00'
  },
  jumbotail: {
    name: 'Jumbotail', sector: 'b2b-grocery', template: 'b2b-grocery', flows: ['store_onboarding', 'inventory_flow', 'order_fulfillment', 'payment_collection'],
    nexha: ['payment-network', 'logistics-network', 'warehouse-network', 'grocery-os'],
    agents: ['StoreAgent', 'InventoryAgent', 'FulfillmentAgent', 'PaymentAgent'],
    color: '#00A651'
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // FOOD DELIVERY (Sectors 11-20)
  // ══════════════════════════════════════════════════════════════════════════════
  zomato: {
    name: 'Zomato', sector: 'food-delivery', template: 'food-delivery', flows: ['order_flow', 'restaurant_onboarding', 'support_flow', 'fraud_detection', 'marketing_flow', 'dineout_flow'],
    nexha: ['payment-network', 'logistics-network', 'restaurant-os', 'discovery-os'],
    agents: ['RestaurantOnboardingAgent', 'DeliveryMatchingAgent', 'MarketingAgent', 'DiningAgent', 'FraudDetectionAgent', 'SupportAgent'],
    color: '#E23744'
  },
  swiggy: {
    name: 'Swiggy', sector: 'food-delivery', template: 'food-delivery', flows: ['order_flow', 'restaurant_onboarding', 'delivery_matching', 'support_flow', 'fraud_detection', 'genie_flow'],
    nexha: ['payment-network', 'logistics-network', 'restaurant-os', 'discovery-os'],
    agents: ['RestaurantOnboardingAgent', 'DeliveryMatchingAgent', 'DeliveryPartnerAgent', 'GenieAgent', 'WaveAgent', 'FraudDetectionAgent'],
    color: '#FF5200'
  },
  doordash: {
    name: 'DoorDash', sector: 'food-delivery', template: 'food-delivery', flows: ['order_flow', 'merchant_onboarding', 'delivery_matching', 'support_flow'],
    nexha: ['payment-network', 'logistics-network', 'restaurant-os'],
    agents: ['MerchantAgent', 'DeliveryMatchingAgent', 'DeliveryPartnerAgent', 'SupportAgent'],
    color: '#FF3008'
  },
  ubereats: {
    name: 'Uber Eats', sector: 'food-delivery', template: 'food-delivery', flows: ['order_flow', 'restaurant_matching', 'delivery_matching', 'corporate_flow'],
    nexha: ['payment-network', 'logistics-network', 'restaurant-os'],
    agents: ['RestaurantMatchingAgent', 'DeliveryDispatchAgent', 'CorporateAgent'],
    color: '#06C167'
  },
  instacart: {
    name: 'Instacart', sector: 'grocery-delivery', template: 'grocery-delivery', flows: ['grocery_order_flow', 'store_integration', 'delivery_matching', 'substitution_flow'],
    nexha: ['payment-network', 'logistics-network', 'grocery-os'],
    agents: ['GroceryAgent', 'StoreIntegrationAgent', 'DeliveryAgent', 'SubstitutionAgent'],
    color: '#43B02A'
  },
  grubhub: {
    name: 'Grubhub', sector: 'food-delivery', template: 'food-delivery', flows: ['order_flow', 'restaurant_onboarding', 'delivery_matching', 'corporate_flow'],
    nexha: ['payment-network', 'logistics-network', 'restaurant-os'],
    agents: ['RestaurantAgent', 'DeliveryAgent', 'CorporateAgent'],
    color: '#F63440'
  },
  deliveryhero: {
    name: 'Delivery Hero', sector: 'food-delivery', template: 'food-delivery', flows: ['order_flow', 'restaurant_onboarding', 'delivery_matching', 'multi_country_flow'],
    nexha: ['payment-network', 'logistics-network', 'multi-country-os'],
    agents: ['RestaurantAgent', 'DeliveryAgent', 'CountryAgent'],
    color: '#00B800'
  },
  rapido: {
    name: 'Rapido', sector: 'rides', template: 'mobility', flows: ['ride_booking', 'driver_onboarding', 'safety_flow'],
    nexha: ['payment-network', 'mobility-os', 'insurance-network'],
    agents: ['RideMatchAgent', 'CaptainAgent', 'SafetyAgent'],
    color: '#FFD700'
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // MOBILITY / RIDE-HAILING (Sectors 21-30)
  // ══════════════════════════════════════════════════════════════════════════════
  uber: {
    name: 'Uber', sector: 'mobility', template: 'mobility', flows: ['ride_booking', 'driver_onboarding', 'surge_pricing', 'safety_incident', 'freight_flow', 'eats_flow'],
    nexha: ['payment-network', 'mobility-os', 'insurance-network', 'logistics-network'],
    agents: ['DispatchAgent', 'SafetyAgent', 'DriverGrowthAgent', 'RiderGrowthAgent', 'FleetAgent', 'FreightAgent', 'EatsAgent'],
    color: '#000000'
  },
  ola: {
    name: 'Ola', sector: 'mobility', template: 'mobility', flows: ['ride_booking', 'driver_partner_flow', 'electric_mobility', 'auto_matching'],
    nexha: ['payment-network', 'mobility-os', 'electric-network', 'insurance-network'],
    agents: ['DispatchAgent', 'DriverPartnerAgent', 'OlaElectricAgent', 'AutoMatchAgent'],
    color: '#00FF00'
  },
  lyft: {
    name: 'Lyft', sector: 'mobility', template: 'mobility', flows: ['ride_booking', 'driver_onboarding', 'surge_pricing', 'bike_flow', 'scooter_flow'],
    nexha: ['payment-network', 'mobility-os'],
    agents: ['DispatchAgent', 'DriverAgent', 'MicromobilityAgent'],
    color: '#FF00BF'
  },
  grab: {
    name: 'Grab', sector: 'super-app', template: 'super-app', flows: ['ride_booking', 'food_delivery', 'payments_flow', 'logistics_flow', 'financial_services_flow'],
    nexha: ['payment-network', 'mobility-os', 'logistics-network', 'fintech-os'],
    agents: ['RideAgent', 'FoodAgent', 'PaymentAgent', 'FinanceAgent', 'LogisticsAgent'],
    color: '#00A650'
  },
  gojek: {
    name: 'Gojek', sector: 'super-app', template: 'super-app', flows: ['ride_booking', 'food_delivery', 'payments_flow', 'logistics_flow', 'merchant_flow'],
    nexha: ['payment-network', 'mobility-os', 'logistics-network', 'merchant-os'],
    agents: ['RideAgent', 'FoodAgent', 'PaymentAgent', 'MerchantAgent'],
    color: '#00A650'
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // HEALTHCARE (Sectors 31-40)
  // ══════════════════════════════════════════════════════════════════════════════
  practo: {
    name: 'Practo', sector: 'healthcare', template: 'healthcare', flows: ['doctor_appointment', 'telemedicine', 'health_records', 'insurance_claims', 'pharmacy_flow'],
    nexha: ['healthcare-os', 'insurance-network', 'pharmacy-network', 'hospital-os'],
    agents: ['SymptomAgent', 'DoctorMatchAgent', 'AppointmentAgent', 'PrescriptionAgent', 'InsuranceAgent', 'HealthRecordAgent'],
    color: '#0066CC'
  },
  '1mg': {
    name: '1mg', sector: 'healthcare', template: 'healthcare', flows: ['medicine_search', 'lab_booking', 'doctor_consult', 'health_content_flow'],
    nexha: ['pharmacy-network', 'lab-network', 'healthcare-os'],
    agents: ['MedicineAgent', 'LabBookingAgent', 'DoctorMatchAgent', 'HealthContentAgent'],
    color: '#007832'
  },
  pharmeasy: {
    name: 'PharmEasy', sector: 'pharmacy', template: 'pharmacy', flows: ['medicine_order', 'prescription_flow', 'lab_booking', 'refill_flow'],
    nexha: ['pharmacy-network', 'lab-network', 'healthcare-os'],
    agents: ['MedicineAgent', 'PrescriptionAgent', 'LabBookingAgent', 'DeliveryAgent'],
    color: '#4CAF50'
  },
  mfine: {
    name: 'MFine', sector: 'healthcare', template: 'healthcare', flows: ['doctor_consult', 'telemedicine', 'health_records', 'lab_booking'],
    nexha: ['healthcare-os', 'hospital-os'],
    agents: ['SymptomAgent', 'DoctorMatchAgent', 'AppointmentAgent', 'HealthRecordAgent'],
    color: '#4B7BE5'
  },
  medibuddy: {
    name: 'MediBuddy', sector: 'healthcare', template: 'healthcare', flows: ['doctor_consult', 'lab_tests', 'medicine_delivery', 'corporate_health_flow'],
    nexha: ['healthcare-os', 'corporate-os', 'pharmacy-network'],
    agents: ['DoctorAgent', 'LabAgent', 'MedicineAgent', 'CorporateAgent'],
    color: '#00C9A7'
  },
  icici_prudential: {
    name: 'ICICI Prudential', sector: 'insurance', template: 'insurance', flows: ['policy_purchase', 'claim_flow', 'renewal_flow', 'customer_service_flow'],
    nexha: ['insurance-network', 'payment-network'],
    agents: ['PolicyAgent', 'ClaimAgent', 'RenewalAgent', 'SupportAgent'],
    color: '#ED1B24'
  },
  lic: {
    name: 'LIC', sector: 'insurance', template: 'insurance', flows: ['policy_purchase', 'premium_collection', 'claim_flow', 'agent_management_flow'],
    nexha: ['insurance-network', 'agent-network', 'payment-network'],
    agents: ['PolicyAgent', 'ClaimAgent', 'PremiumAgent', 'AgentAgent'],
    color: '#0066CC'
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // FINTECH (Sectors 41-50)
  // ══════════════════════════════════════════════════════════════════════════════
  phonepe: {
    name: 'PhonePe', sector: 'payments', template: 'payments', flows: ['upi_payment', 'merchant_onboarding', 'recharge_flow', 'insurance_flow', 'gold_flow'],
    nexha: ['payment-network', 'upi-network', 'insurance-network', 'investment-network'],
    agents: ['PaymentAgent', 'MerchantAgent', 'InsuranceAgent', 'GoldAgent', 'HealthAgent'],
    color: '#5D4196'
  },
  razorpay: {
    name: 'Razorpay', sector: 'payments', template: 'payments-b2b', flows: ['payment_links', 'checkout_flow', 'payroll_flow', 'banking_flow', 'capital_flow'],
    nexha: ['payment-network', 'banking-os', 'capital-network'],
    agents: ['PaymentLinksAgent', 'CheckoutAgent', 'PayrollAgent', 'CapitalAgent', 'BankingAgent'],
    color: '#0066FF'
  },
  cred: {
    name: 'CRED', sector: 'wealth', template: 'wealth', flows: ['credit_score_flow', 'rewards_flow', 'rent_payment_flow', 'wealth_management_flow', 'health_flow'],
    nexha: ['credit-os', 'rewards-network', 'wealth-os', 'healthcare-os'],
    agents: ['CreditScoreAgent', 'RewardsAgent', 'RentPaymentAgent', 'WealthAgent', 'HealthAgent'],
    color: '#1A1A1A'
  },
  groww: {
    name: 'Groww', sector: 'investments', template: 'investments', flows: ['mf_investment', 'stock_trading', 'sip_flow', 'tax_flow', 'alert_flow'],
    nexha: ['investment-network', 'nse-integration', 'bse-integration'],
    agents: ['PortfolioAgent', 'ResearchAgent', 'SIPAgent', 'TaxAgent', 'AlertAgent'],
    color: '#5367FF'
  },
  upstox: {
    name: 'Upstox', sector: 'stock-trading', template: 'stock-trading', flows: ['equity_trading', 'options_trading', 'derivative_flow', 'alert_flow'],
    nexha: ['nse-integration', 'bse-integration'],
    agents: ['TradeAgent', 'ChartingAgent', 'AlertAgent', 'OptionsDeskAgent'],
    color: '#FF6B35'
  },
  zerodha: {
    name: 'Zerodha', sector: 'stock-trading', template: 'stock-trading', flows: ['equity_trading', 'commodity_trading', 'ipo_flow', 'education_flow'],
    nexnexha: ['nse-integration', 'bse-integration', 'mcx-integration'],
    agents: ['TradeAgent', 'CommodityAgent', 'IPOAgent', 'EducationAgent'],
    color: '#30511B'
  },
  jar: {
    name: 'Jar', sector: 'savings', template: 'savings', flows: ['auto_save_flow', 'gold_investment_flow', 'learning_flow', 'goal_flow'],
    nexha: ['investment-network', 'gold-network'],
    agents: ['SaveAgent', 'LearnAgent', 'GoalAgent', 'SmartSpendAgent'],
    color: '#000000'
  },
  fi: {
    name: 'Fi', sector: 'neo-banking', template: 'neo-banking', flows: ['account_opening', 'spends_insights_flow', 'fi_flexi_flow', 'teen_flow', 'corporate_flow'],
    nexha: ['banking-os', 'payment-network'],
    agents: ['SpendsAgent', 'FiFlexiAgent', 'TeenAgent', 'CorpAgent', 'TaxAgent'],
    color: '#0066FF'
  },
  juspay: {
    name: 'Juspay', sector: 'payments', template: 'payments', flows: ['checkout_flow', 'offer_engine_flow', 'fraud_detection', 'reconciliation_flow'],
    nexha: ['payment-network', 'upi-network'],
    agents: ['CheckoutAgent', 'OfferEngineAgent', 'RiskAgent', 'ReconciliationAgent'],
    color: '#E91E63'
  },
  paytm: {
    name: 'Paytm', sector: 'super-app', template: 'super-app', flows: ['payment_flow', 'recharge_flow', 'banking_flow', 'insurance_flow', 'entertainment_flow', 'shopping_flow'],
    nexha: ['payment-network', 'banking-os', 'entertainment-os', 'shopping-os'],
    agents: ['PaymentAgent', 'RechargeAgent', 'BankingAgent', 'InsuranceAgent', 'EntertainmentAgent'],
    color: '#00B9F1'
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // EDUCATION (Sectors 51-60)
  // ══════════════════════════════════════════════════════════════════════════════
  byjus: {
    name: 'BYJU\'s', sector: 'edtech', template: 'edtech', flows: ['adaptive_learning_flow', 'test_prep_flow', 'parent_portal_flow', 'engagement_flow', 'live_class_flow'],
    nexha: ['education-os', 'learning-os'],
    agents: ['TutorAgent', 'MentorAgent', 'TestPrepAgent', 'ConceptsAgent', 'EngagementAgent'],
    color: '#1A73E8'
  },
  unacademy: {
    name: 'Unacademy', sector: 'edtech', template: 'edtech', flows: ['live_class_flow', 'test_prep_flow', 'educator_onboarding', 'scholarship_flow', 'language_flow'],
    nexha: ['education-os', 'educator-network'],
    agents: ['EducatorAgent', 'IITSelectionAgent', 'ScholarshipAgent', 'CatAgent', 'LanguageAgent'],
    color: '#FF6D00'
  },
  physicswallah: {
    name: 'PhysicsWallah', sector: 'edtech', template: 'edtech-budget', flows: ['free_education_flow', 'skills_network_flow', 'pathfinder_flow', 'vernacular_learning_flow'],
    nexha: ['education-os', 'skills-network'],
    agents: ['BudgetTutorAgent', 'IITJourneyAgent', 'VernacularAgent', 'AlakhSirAgent', 'PathfinderAgent'],
    color: '#FF0000'
  },
  vedantu: {
    name: 'Vedantu', sector: 'edtech', template: 'edtech', flows: ['live_teaching_flow', 'one_on_one_flow', 'test_prep_flow', 'parent_engagement_flow'],
    nexha: ['education-os', 'learning-os'],
    agents: ['TutorAgent', 'OneOnOneAgent', 'TestPrepAgent', 'ParentAgent'],
    color: '#7C4DFF'
  },
  toppr: {
    name: 'Toppr', sector: 'edtech', template: 'edtech', flows: ['adaptive_learning_flow', 'test_prep_flow', 'doubt_solving_flow'],
    nexha: ['education-os'],
    agents: ['AdaptiveAgent', 'TestPrepAgent', 'DoubtAgent'],
    color: '#00ACC1'
  },
  upgrad: {
    name: 'upGrad', sector: 'edtech', template: 'edtech-higher', flows: ['degree_flow', 'certification_flow', 'career_mentorship_flow', 'placement_flow'],
    nexha: ['education-os', 'career-os'],
    agents: ['DegreeAgent', 'CertificationAgent', 'MentorshipAgent', 'PlacementAgent'],
    color: '#6C5CE7'
  },
  simplilearn: {
    name: 'Simplilearn', sector: 'edtech', template: 'edtech-corporate', flows: ['certification_flow', 'corporate_training_flow', 'skill_assessment_flow'],
    nexha: ['education-os', 'corporate-os', 'skills-network'],
    agents: ['CertificationAgent', 'CorporateAgent', 'AssessmentAgent'],
    color: '#E74C3C'
  },
  coursera: {
    name: 'Coursera', sector: 'edtech', template: 'edtech-global', flows: ['course_flow', 'degree_flow', 'certificate_flow', 'enterprise_flow'],
    nexha: ['education-os', 'university-network'],
    agents: ['CourseAgent', 'DegreeAgent', 'CertificateAgent', 'EnterpriseAgent'],
    color: '#0056D2'
  },
  udemy: {
    name: 'Udemy', sector: 'edtech', template: 'edtech-marketplace', flows: ['course_publishing_flow', 'student_learning_flow', 'coupon_flow', 'instructor_payout_flow'],
    nexha: ['education-os', 'instructor-network'],
    agents: ['PublisherAgent', 'LearningAgent', 'CouponAgent', 'PayoutAgent'],
    color: '#A435F0'
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // HOSPITALITY / TRAVEL (Sectors 61-70)
  // ══════════════════════════════════════════════════════════════════════════════
  oyo: {
    name: 'OYO', sector: 'hotels', template: 'hotels', flows: ['property_onboarding', 'booking_flow', 'dynamic_pricing_flow', 'guest_experience_flow', 'safety_flow'],
    nexha: ['hotel-os', 'payment-network', 'insurance-network'],
    agents: ['PartnerOnboardingAgent', 'BookingAgent', 'RevenueAgent', 'GuestExperienceAgent', 'SafetyAgent'],
    color: '#FF0066'
  },
  makemytrip: {
    name: 'MakeMyTrip', sector: 'travel', template: 'ota', flows: ['hotel_search_flow', 'flight_search_flow', 'package_booking_flow', 'corporate_booking_flow', 'loyalty_flow'],
    nexha: ['hotel-os', 'flight-os', 'payment-network', 'insurance-network'],
    agents: ['TripPlannerAgent', 'HotelDiscoveryAgent', 'FlightAgent', 'PackageAgent', 'CorporateAgent', 'MarketingAgent'],
    color: '#F05A28'
  },
  goibibo: {
    name: 'Goibibo', sector: 'travel', template: 'ota', flows: ['hotel_search_flow', 'flight_search_flow', 'bus_booking_flow', 'train_booking_flow'],
    nexha: ['hotel-os', 'flight-os', 'payment-network'],
    agents: ['HotelAgent', 'FlightAgent', 'BusAgent', 'TrainAgent'],
    color: '#3498DB'
  },
  yatra: {
    name: 'Yatra', sector: 'travel', template: 'ota', flows: ['hotel_search_flow', 'flight_search_flow', 'corporate_flow', 'loyalty_flow'],
    nexha: ['hotel-os', 'flight-os', 'payment-network'],
    agents: ['HotelAgent', 'FlightAgent', 'CorporateAgent', 'LoyaltyAgent'],
    color: '#E74C3C'
  },
  booking_com: {
    name: 'Booking.com', sector: 'hotels', template: 'hotels', flows: ['property_listing_flow', 'booking_flow', 'review_flow', 'partner_management_flow'],
    nexha: ['hotel-os', 'payment-network', 'review-os'],
    agents: ['ListingAgent', 'BookingAgent', 'ReviewAgent', 'PartnerAgent'],
    color: '#003580'
  },
  agoda: {
    name: 'Agoda', sector: 'hotels', template: 'hotels', flows: ['property_onboarding', 'booking_flow', 'deals_flow', 'review_flow'],
    nexha: ['hotel-os', 'payment-network'],
    agents: ['PropertyAgent', 'BookingAgent', 'DealsAgent', 'ReviewAgent'],
    color: '#00AF87'
  },
  trivago: {
    name: 'Trivago', sector: 'hotel-search', template: 'hotel-search', flows: ['hotel_comparison_flow', 'booking_redirect_flow', 'advertiser_flow'],
    nexha: ['hotel-os', 'advertising-network'],
    agents: ['ComparisonAgent', 'RedirectAgent', 'AdvertiserAgent'],
    color: '#2D7DD2'
  },
  airbnb: {
    name: 'Airbnb', sector: 'vacation-rentals', template: 'vacation-rentals', flows: ['host_onboarding', 'listing_flow', 'booking_flow', 'experience_flow', 'review_flow'],
    nexha: ['hotel-os', 'payment-network', 'experience-os'],
    agents: ['HostAgent', 'ListingAgent', 'BookingAgent', 'ExperienceAgent', 'ReviewAgent'],
    color: '#FF5A5F'
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // LOGISTICS (Sectors 71-80)
  // ══════════════════════════════════════════════════════════════════════════════
  delhivery: {
    name: 'Delhivery', sector: 'logistics', template: 'logistics', flows: ['pickup_flow', 'routing_flow', 'delivery_flow', 'sme_onboarding', 'export_flow'],
    nexha: ['logistics-network', 'warehouse-network', 'customs-network'],
    agents: ['RoutingAgent', 'WarehouseAgent', 'DeliveryAgent', 'SMBAgent', 'ExportAgent'],
    color: '#00B800'
  },
  blacksbuck: {
    name: 'BlackBuck', sector: 'trucking', template: 'trucking', flows: ['truck_matching_flow', 'fleet_management_flow', 'compliance_flow', 'telemetry_flow'],
    nexha: ['logistics-network', 'telemetry-os', 'fastag-network'],
    agents: ['TruckMatchAgent', 'FleetAgent', 'ComplianceAgent', 'TelemetryAgent'],
    color: '#000000'
  },
  drod: {
    name: 'Drod', sector: 'logistics', template: 'logistics', flows: ['delivery_flow', 'pickup_flow', 'sme_flow'],
    nexha: ['logistics-network'],
    agents: ['DeliveryAgent', 'PickupAgent', 'SMBAgent'],
    color: '#FF6B35'
  },
  loconav: {
    name: 'Loconav', sector: 'fleet-management', template: 'fleet-management', flows: ['vehicle_tracking_flow', 'maintenance_flow', 'fuel_management_flow', 'driver_management_flow'],
    nexha: ['telemetry-os', 'maintenance-os', 'fuel-network'],
    agents: ['TrackingAgent', 'MaintenanceAgent', 'FuelAgent', 'DriverAgent'],
    color: '#00B800'
  },
  rivigo: {
    name: 'Rivigo', sector: 'logistics', template: 'logistics', flows: ['relay_trucking_flow', 'tracking_flow', 'compliance_flow'],
    nexha: ['logistics-network', 'telemetry-os'],
    agents: ['RelayAgent', 'TrackingAgent', 'ComplianceAgent'],
    color: '#FF6B35'
  },
  ecom_express: {
    name: 'Ecom Express', sector: 'logistics', template: 'logistics', flows: ['pickup_flow', 'delivery_flow', 'reverse_logistics_flow'],
    nexha: ['logistics-network'],
    agents: ['PickupAgent', 'DeliveryAgent', 'ReverseLogisticsAgent'],
    color: '#3498DB'
  },
  xpressbees: {
    name: 'Xpressbees', sector: 'logistics', template: 'logistics', flows: ['pickup_flow', 'delivery_flow', 'sme_onboarding'],
    nexnexha: ['logistics-network'],
    agents: ['PickupAgent', 'DeliveryAgent', 'SMBAgent'],
    color: '#9B59B6'
  },
  delhivery_ft: {
    name: 'Delhivery FTL', sector: 'ftl', template: 'ftl', flows: ['load_matching_flow', 'tracking_flow', 'payment_flow'],
    nexha: ['logistics-network', 'payment-network'],
    agents: ['LoadAgent', 'TrackingAgent', 'PaymentAgent'],
    color: '#00B800'
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // DEFAULT TEMPLATE (Fallback for any company not listed)
  // ══════════════════════════════════════════════════════════════════════════════
};

// Route handlers
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'company-mapper' }));

app.get('/api/v1/companies', (req, res) => {
  const { sector, template } = req.query;
  let results = Object.entries(COMPANIES).map(([id, data]) => ({ id, ...data }));

  if (sector) results = results.filter(c => c.sector === sector);
  if (template) results = results.filter(c => c.template === template);

  res.json({ success: true, count: results.length, companies: results });
});

app.get('/api/v1/company/:id', (req, res) => {
  const company = COMPANIES[req.params.id.toLowerCase()];
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json({ success: true, company: { id: req.params.id, ...company } });
});

app.post('/api/v1/generate/:id', (req, res) => {
  const company = COMPANIES[req.params.id.toLowerCase()];
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const project = {
    id: uuidv4(),
    companyId: req.params.id,
    companyName: company.name,
    template: company.template,
    flows: company.flows,
    nexhaIntegrations: company.nexha,
    agents: company.agents,
    generatedAt: new Date().toISOString()
  };

  res.status(201).json({ success: true, project });
});

app.get('/api/v1/sectors', (_, res) => {
  const sectors = [...new Set(Object.values(COMPANIES).map(c => c.sector))];
  res.json({ success: true, count: sectors.length, sectors });
});

app.get('/api/v1/templates', (_, res) => {
  const templates = [...new Set(Object.values(COMPANIES).map(c => c.template))];
  res.json({ success: true, count: templates.length, templates });
});

app.get('/api/v1/nexha', (_, res) => {
  const allNexha = new Set();
  Object.values(COMPANIES).forEach(c => c.nexha.forEach(n => allNexha.add(n)));
  res.json({ success: true, count: allNexha.size, networks: Array.from(allNexha) });
});

app.listen(PORT, () => console.log(`\n🎯 Company Mapper — PORT ${PORT} (${Object.keys(COMPANIES).length} companies)\n`));
export default app;
