import { v4 as uuidv4 } from 'uuid';
import { Agent } from '../models';

interface AgentTemplate {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  longDescription: string;
  industry: string;
  category: string;
  tags: string[];
  capabilities: any[];
  integrations: any[];
  pricing: any[];
  icon: string;
  featured?: boolean;
  trending?: boolean;
  new?: boolean;
}

const agentTemplates: AgentTemplate[] = [
  // ============ BANKING AGENTS ============
  {
    name: 'Banking Support Agent',
    slug: 'banking-support-agent',
    tagline: '24/7 AI banking assistant for customer inquiries',
    description: 'AI-powered banking support agent that handles account inquiries, transaction disputes, card management, and loan applications with human handoff for complex issues.',
    longDescription: `
## Overview
The Banking Support Agent is an enterprise-grade AI assistant designed for financial institutions. It provides comprehensive customer support across all banking channels.

## Capabilities
- **Account Management**: Balance inquiries, statement requests, account updates
- **Card Services**: Block/unblock cards, limit changes, PIN management
- **Transaction Support**: Dispute resolution, transaction history, stop payments
- **Loan Inquiries**: Application status, EMI calculations, document submission
- **Compliance**: GDPR, PCI-DSS compliant with audit logging

## Integration Points
- Core Banking System (CBS)
- CRM Integration
- Payment Gateway
- Fraud Detection System
- Document Management

## Compliance
- PCI-DSS Level 1
- GDPR Compliant
- SOC 2 Type II
- ISO 27001
    `,
    industry: 'banking',
    category: 'customer_support',
    tags: ['banking', 'finance', 'customer-service', 'support', 'enterprise'],
    capabilities: [
      {
        id: 'account_inquiry',
        name: 'Account Inquiry',
        description: 'Handle account balance, statement, and status inquiries',
        parameters: [
          { name: 'account_number', type: 'string', required: true, description: 'Customer account number' },
          { name: 'inquiry_type', type: 'string', required: true, description: 'Type of inquiry' }
        ],
        output: { type: 'object', description: 'Account information response' }
      },
      {
        id: 'card_management',
        name: 'Card Management',
        description: 'Handle card-related operations',
        parameters: [
          { name: 'card_number', type: 'string', required: true },
          { name: 'action', type: 'string', required: true, description: 'block, unblock, limit_change' }
        ]
      },
      {
        id: 'transaction_dispute',
        name: 'Transaction Dispute',
        description: 'File and track transaction disputes',
        parameters: [
          { name: 'transaction_id', type: 'string', required: true },
          { name: 'reason', type: 'string', required: true }
        ]
      }
    ],
    integrations: [
      { type: 'api', name: 'Core Banking API', description: 'Connect to CBS', required: true },
      { type: 'api', name: 'Fraud Detection', description: 'Real-time fraud checks', required: false },
      { type: 'webhook', name: 'CRM Update', description: 'Update customer records', required: false }
    ],
    pricing: [
      { tier: 'starter', price: 999, currency: 'INR', period: 'monthly', includedConversations: 1000 },
      { tier: 'professional', price: 4999, currency: 'INR', period: 'monthly', includedConversations: 10000 },
      { tier: 'enterprise', price: 19999, currency: 'INR', period: 'monthly', includedConversations: 100000 }
    ],
    icon: '🏦',
    featured: true
  },

  // ============ HEALTHCARE AGENTS ============
  {
    name: 'Healthcare Appointment Agent',
    slug: 'healthcare-appointment-agent',
    tagline: 'Intelligent healthcare scheduling and patient support',
    description: 'AI agent for healthcare providers that handles appointment scheduling, patient intake, prescription refills, and health information with full HIPAA compliance.',
    longDescription: `
## Overview
Streamline healthcare operations with our AI-powered appointment agent. Perfect for hospitals, clinics, and telemedicine platforms.

## Features
- **Smart Scheduling**: AI-powered slot recommendations based on provider availability and patient preferences
- **Patient Intake**: Automated collection of symptoms, medical history, and insurance information
- **Appointment Reminders**: Multi-channel reminders via SMS, WhatsApp, Email
- **Waitlist Management**: Automated waitlist notifications when slots open up
- **Prescription Refills**: Quick refill requests with pharmacy coordination

## Compliance
- HIPAA Compliant
- HL7 FHIR Compatible
- SOC 2 Type II
    `,
    industry: 'healthcare',
    category: 'operations',
    tags: ['healthcare', 'appointments', 'scheduling', 'hipaa', 'telemedicine'],
    capabilities: [
      {
        id: 'schedule_appointment',
        name: 'Schedule Appointment',
        description: 'Book appointments with available providers',
        parameters: [
          { name: 'patient_id', type: 'string', required: true },
          { name: 'department', type: 'string', required: true },
          { name: 'preferred_date', type: 'string', required: false },
          { name: 'reason', type: 'string', required: true }
        ],
        output: { type: 'object', description: 'Appointment confirmation' }
      },
      {
        id: 'check_symptoms',
        name: 'Symptom Checker',
        description: 'Initial symptom assessment for routing',
        parameters: [
          { name: 'symptoms', type: 'array', required: true },
          { name: 'severity', type: 'string', required: false }
        ]
      },
      {
        id: 'prescription_refill',
        name: 'Prescription Refill',
        description: 'Process prescription refill requests',
        parameters: [
          { name: 'prescription_id', type: 'string', required: true },
          { name: 'pharmacy_id', type: 'string', required: true }
        ]
      }
    ],
    integrations: [
      { type: 'api', name: 'EHR System', description: 'Epic, Cerner integration', required: true },
      { type: 'api', name: 'Scheduling System', description: 'Appointment booking', required: true },
      { type: 'webhook', name: 'Pharmacy API', description: 'Refill coordination', required: false }
    ],
    pricing: [
      { tier: 'starter', price: 1499, currency: 'INR', period: 'monthly', includedConversations: 500 },
      { tier: 'professional', price: 7999, currency: 'INR', period: 'monthly', includedConversations: 5000 },
      { tier: 'enterprise', price: 24999, currency: 'INR', period: 'monthly', includedConversations: 50000 }
    ],
    icon: '🏥',
    featured: true,
    new: true
  },

  // ============ RESTAURANT AGENTS ============
  {
    name: 'Restaurant Ordering Agent',
    slug: 'restaurant-ordering-agent',
    tagline: 'AI-powered food ordering and reservation agent',
    description: 'Complete restaurant AI agent for handling orders, reservations, delivery tracking, and customer feedback. Integrates with POS and delivery platforms.',
    longDescription: `
## Overview
Transform your restaurant operations with our AI ordering agent. Handle orders, reservations, and customer service all in one.

## Features
- **Menu Ordering**: Natural language ordering with modifications and special requests
- **Reservation Management**: Table booking with smart suggestions
- **Order Tracking**: Real-time order status and delivery updates
- **Upselling**: AI-powered menu recommendations
- **Feedback Collection**: Post-meal surveys and review management

## Integrations
- POS Systems: Toast, Square, Clover
- Delivery Platforms: Swiggy, Zomato, DoorDash
- Payment Gateways: Razorpay, Stripe
    `,
    industry: 'restaurant',
    category: 'sales',
    tags: ['restaurant', 'food-ordering', 'pos', 'delivery', 'reservations'],
    capabilities: [
      {
        id: 'place_order',
        name: 'Place Order',
        description: 'Create food order with customizations',
        parameters: [
          { name: 'items', type: 'array', required: true },
          { name: 'special_instructions', type: 'string', required: false },
          { name: 'delivery', type: 'boolean', required: true }
        ],
        output: { type: 'object', description: 'Order confirmation with total' }
      },
      {
        id: 'make_reservation',
        name: 'Make Reservation',
        description: 'Book table reservations',
        parameters: [
          { name: 'date', type: 'string', required: true },
          { name: 'time', type: 'string', required: true },
          { name: 'party_size', type: 'number', required: true },
          { name: 'name', type: 'string', required: true }
        ]
      },
      {
        id: 'track_order',
        name: 'Track Order',
        description: 'Get real-time order status',
        parameters: [
          { name: 'order_id', type: 'string', required: true }
        ],
        output: { type: 'object', description: 'Order status and ETA' }
      }
    ],
    integrations: [
      { type: 'api', name: 'POS Integration', description: 'Toast, Square, Clover', required: true },
      { type: 'api', name: 'Delivery Platform', description: 'Swiggy, Zomato sync', required: false },
      { type: 'webhook', name: 'Kitchen Display', description: 'KDS integration', required: false }
    ],
    pricing: [
      { tier: 'starter', price: 499, currency: 'INR', period: 'monthly', includedConversations: 1000 },
      { tier: 'professional', price: 1999, currency: 'INR', period: 'monthly', includedConversations: 5000 },
      { tier: 'enterprise', price: 7999, currency: 'INR', period: 'monthly', includedConversations: 50000 }
    ],
    icon: '🍽️',
    trending: true
  },

  // ============ RETAIL AGENTS ============
  {
    name: 'Retail Shopping Assistant',
    slug: 'retail-shopping-assistant',
    tagline: 'Personal shopping concierge for retail brands',
    description: 'AI shopping assistant that helps customers discover products, provides personalized recommendations, handles orders, and manages returns.',
    longDescription: `
## Overview
Create a premium shopping experience with our AI shopping assistant. Perfect for e-commerce, fashion, electronics, and lifestyle brands.

## Features
- **Product Discovery**: Natural language product search and filtering
- **Personalized Recommendations**: AI-powered style and product suggestions
- **Size & Fit Guide**: Virtual sizing assistance
- **Order Management**: Status tracking, modifications, cancellations
- **Returns Processing**: Easy return initiation and tracking
- **Wishlist Management**: Save and share wishlists
    `,
    industry: 'retail',
    category: 'sales',
    tags: ['retail', 'ecommerce', 'shopping', 'fashion', 'product-discovery'],
    capabilities: [
      {
        id: 'product_search',
        name: 'Product Search',
        description: 'Search products with natural language',
        parameters: [
          { name: 'query', type: 'string', required: true },
          { name: 'filters', type: 'object', required: false }
        ],
        output: { type: 'array', description: 'Product recommendations' }
      },
      {
        id: 'size_guide',
        name: 'Size Guide',
        description: 'Help customers find their size',
        parameters: [
          { name: 'product_id', type: 'string', required: true },
          { name: 'measurements', type: 'object', required: false }
        ]
      },
      {
        id: 'create_order',
        name: 'Create Order',
        description: 'Place order from cart',
        parameters: [
          { name: 'cart_items', type: 'array', required: true },
          { name: 'shipping_address', type: 'object', required: true },
          { name: 'payment_method', type: 'string', required: true }
        ]
      }
    ],
    integrations: [
      { type: 'api', name: 'E-commerce Platform', description: 'Shopify, WooCommerce', required: true },
      { type: 'api', name: 'Inventory System', description: 'Real-time stock', required: true },
      { type: 'webhook', name: 'Payment Gateway', description: 'Order payment', required: false }
    ],
    pricing: [
      { tier: 'starter', price: 799, currency: 'INR', period: 'monthly', includedConversations: 2000 },
      { tier: 'professional', price: 3999, currency: 'INR', period: 'monthly', includedConversations: 20000 },
      { tier: 'enterprise', price: 14999, currency: 'INR', period: 'monthly', includedConversations: 200000 }
    ],
    icon: '🛍️',
    featured: true
  },

  // ============ TRAVEL AGENTS ============
  {
    name: 'Travel Booking Agent',
    slug: 'travel-booking-agent',
    tagline: 'AI travel consultant for bookings and support',
    description: 'Comprehensive travel agent for booking flights, hotels, and experiences. Handles itinerary changes, cancellations, and 24/7 travel support.',
    longDescription: `
## Overview
Provide premium travel experiences with our AI travel agent. Supports airlines, hotels, OTAs, and travel agencies.

## Features
- **Flight Search & Booking**: Multi-airline search with price comparison
- **Hotel Reservations**: Property search with reviews and availability
- **Itinerary Management**: Create, modify, and share travel plans
- **Change & Cancellation**: Handle booking modifications
- **Travel Support**: Visa info, packing tips, destination guides

## Integrations
- GDS: Amadeus, Sabre, Travelport
- Hotel Aggregators: Booking.com, Agoda
- Flights: Skyscanner, Google Flights
    `,
    industry: 'travel',
    category: 'sales',
    tags: ['travel', 'booking', 'flights', 'hotels', 'ota'],
    capabilities: [
      {
        id: 'search_flights',
        name: 'Search Flights',
        description: 'Find and compare flights',
        parameters: [
          { name: 'origin', type: 'string', required: true },
          { name: 'destination', type: 'string', required: true },
          { name: 'departure_date', type: 'string', required: true },
          { name: 'return_date', type: 'string', required: false },
          { name: 'passengers', type: 'number', required: true }
        ],
        output: { type: 'array', description: 'Flight options with prices' }
      },
      {
        id: 'book_hotel',
        name: 'Book Hotel',
        description: 'Reserve hotel rooms',
        parameters: [
          { name: 'property_id', type: 'string', required: true },
          { name: 'check_in', type: 'string', required: true },
          { name: 'check_out', type: 'string', required: true },
          { name: 'guests', type: 'number', required: true },
          { name: 'room_type', type: 'string', required: false }
        ]
      },
      {
        id: 'modify_booking',
        name: 'Modify Booking',
        description: 'Change or update reservations',
        parameters: [
          { name: 'booking_id', type: 'string', required: true },
          { name: 'modifications', type: 'object', required: true }
        ]
      }
    ],
    integrations: [
      { type: 'api', name: 'GDS Connection', description: 'Amadeus, Sabre', required: true },
      { type: 'api', name: 'Hotel Aggregator', description: 'Booking.com API', required: false },
      { type: 'webhook', name: 'Payment System', description: 'Booking payment', required: true }
    ],
    pricing: [
      { tier: 'starter', price: 1999, currency: 'INR', period: 'monthly', includedConversations: 1000 },
      { tier: 'professional', price: 9999, currency: 'INR', period: 'monthly', includedConversations: 10000 },
      { tier: 'enterprise', price: 29999, currency: 'INR', period: 'monthly', includedConversations: 100000 }
    ],
    icon: '✈️',
    featured: true,
    trending: true
  },

  // ============ HR AGENTS ============
  {
    name: 'HR Helpdesk Agent',
    slug: 'hr-helpdesk-agent',
    tagline: 'AI-powered HR support for employees',
    description: 'Handle employee inquiries about policies, benefits, leave, payroll, and HR processes. Reduce HR team workload by 80%.',
    longDescription: `
## Overview
Empower your HR team with AI-powered support. Available 24/7 for all employee questions.

## Features
- **Policy Answers**: Instant answers to company policy questions
- **Leave Management**: Leave balance, requests, approvals
- **Benefits Info**: Insurance, PF, gratuity details
- **Payroll Queries**: Payslip explanations, deduction details
- **IT Helpdesk**: Password reset, software access
- **Onboarding Support**: New hire information and training

## Compliance
- Data encryption at rest
- Audit logging
- Role-based access
    `,
    industry: 'hr',
    category: 'hr',
    tags: ['hr', 'employee-support', 'helpdesk', 'onboarding', 'policies'],
    capabilities: [
      {
        id: 'leave_inquiry',
        name: 'Leave Inquiry',
        description: 'Check leave balance and status',
        parameters: [
          { name: 'employee_id', type: 'string', required: true },
          { name: 'leave_type', type: 'string', required: false }
        ],
        output: { type: 'object', description: 'Leave balance and recent requests' }
      },
      {
        id: 'policy_answer',
        name: 'Policy Question',
        description: 'Answer HR policy questions',
        parameters: [
          { name: 'question', type: 'string', required: true },
          { name: 'category', type: 'string', required: false }
        ],
        output: { type: 'string', description: 'Policy explanation' }
      },
      {
        id: 'payslip_query',
        name: 'Payslip Query',
        description: 'Explain payslip components',
        parameters: [
          { name: 'employee_id', type: 'string', required: true },
          { name: 'month', type: 'string', required: true }
        ]
      }
    ],
    integrations: [
      { type: 'api', name: 'HRIS System', description: 'BambooHR, Workday', required: true },
      { type: 'api', name: 'Leave System', description: 'Leave management', required: true },
      { type: 'webhook', name: 'Payroll API', description: 'Salary data', required: false }
    ],
    pricing: [
      { tier: 'starter', price: 999, currency: 'INR', period: 'monthly', includedConversations: 2000 },
      { tier: 'professional', price: 4999, currency: 'INR', period: 'monthly', includedConversations: 20000 },
      { tier: 'enterprise', price: 14999, currency: 'INR', period: 'monthly', includedConversations: 200000 }
    ],
    icon: '👥',
    trending: true
  },

  // ============ ECOMMERCE AGENTS ============
  {
    name: 'E-commerce Support Agent',
    slug: 'ecommerce-support-agent',
    tagline: 'Complete e-commerce customer support solution',
    description: 'Handle order inquiries, returns, refunds, and product questions. Integrate with Shopify, WooCommerce, and custom stores.',
    longDescription: `
## Overview
Best-in-class customer support for online stores. Handle everything from pre-sale questions to post-delivery support.

## Features
- **Order Tracking**: Real-time shipping and delivery updates
- **Return Processing**: Easy returns with instant approvals
- **Refund Status**: Track refund processing
- **Product Questions**: Specs, availability, comparisons
- **Size/Color Help**: Virtual try-on suggestions
- **Upselling**: Related products and bundles

## Integrations
- Shopify, WooCommerce, BigCommerce
- Shipping: Delhivery, BlueDart, FedEx
- Returns: Return Prime, QwikCilver
    `,
    industry: 'ecommerce',
    category: 'customer_support',
    tags: ['ecommerce', 'support', 'returns', 'orders', 'shopify'],
    capabilities: [
      {
        id: 'track_order',
        name: 'Track Order',
        description: 'Get order shipping status',
        parameters: [
          { name: 'order_id', type: 'string', required: true }
        ],
        output: { type: 'object', description: 'Order status and tracking info' }
      },
      {
        id: 'initiate_return',
        name: 'Initiate Return',
        description: 'Start return process',
        parameters: [
          { name: 'order_id', type: 'string', required: true },
          { name: 'items', type: 'array', required: true },
          { name: 'reason', type: 'string', required: true }
        ]
      },
      {
        id: 'check_refund',
        name: 'Check Refund Status',
        description: 'Track refund processing',
        parameters: [
          { name: 'refund_id', type: 'string', required: true }
        ],
        output: { type: 'object', description: 'Refund status and ETA' }
      }
    ],
    integrations: [
      { type: 'api', name: 'E-commerce Platform', description: 'Shopify, WooCommerce', required: true },
      { type: 'api', name: 'Shipping API', description: 'Track shipment', required: true },
      { type: 'webhook', name: 'Returns System', description: 'Process returns', required: false }
    ],
    pricing: [
      { tier: 'starter', price: 599, currency: 'INR', period: 'monthly', includedConversations: 1000 },
      { tier: 'professional', price: 2999, currency: 'INR', period: 'monthly', includedConversations: 10000 },
      { tier: 'enterprise', price: 9999, currency: 'INR', period: 'monthly', includedConversations: 100000 }
    ],
    icon: '📦',
    featured: true
  },

  // ============ SALES AGENTS ============
  {
    name: 'Sales Lead Agent',
    slug: 'sales-lead-agent',
    tagline: 'AI sales assistant for lead qualification and follow-up',
    description: 'Qualify leads, answer product questions, schedule demos, and nurture prospects. Increase sales team productivity by 3x.',
    longDescription: `
## Overview
Supercharge your sales team with AI-powered lead handling. Available 24/7 to engage, qualify, and convert leads.

## Features
- **Lead Qualification**: Score and qualify leads automatically
- **Product Demos**: Schedule and conduct product demonstrations
- **Proposal Generation**: Create customized proposals
- **Follow-up Automation**: Never miss a follow-up
- **FAQ Handling**: Instant answers to product questions
- **Meeting Booking**: Calendar integration for demos

## CRM Integrations
- HubSpot, Salesforce, Pipedrive
- Zoho, Freshsales
    `,
    industry: 'general',
    category: 'sales',
    tags: ['sales', 'leads', 'crm', 'automation', 'demos'],
    capabilities: [
      {
        id: 'qualify_lead',
        name: 'Qualify Lead',
        description: 'Score and qualify sales leads',
        parameters: [
          { name: 'lead_data', type: 'object', required: true },
          { name: 'company_info', type: 'object', required: false }
        ],
        output: { type: 'object', description: 'Lead score and qualification status' }
      },
      {
        id: 'schedule_demo',
        name: 'Schedule Demo',
        description: 'Book product demonstrations',
        parameters: [
          { name: 'lead_id', type: 'string', required: true },
          { name: 'preferred_times', type: 'array', required: true },
          { name: 'product', type: 'string', required: false }
        ]
      },
      {
        id: 'generate_proposal',
        name: 'Generate Proposal',
        description: 'Create customized sales proposals',
        parameters: [
          { name: 'lead_id', type: 'string', required: true },
          { name: 'requirements', type: 'object', required: true }
        ]
      }
    ],
    integrations: [
      { type: 'api', name: 'CRM Integration', description: 'HubSpot, Salesforce', required: true },
      { type: 'api', name: 'Calendar', description: 'Google Calendar, Outlook', required: true },
      { type: 'webhook', name: 'Sales Pipeline', description: 'Update deal stage', required: false }
    ],
    pricing: [
      { tier: 'starter', price: 1999, currency: 'INR', period: 'monthly', includedConversations: 1000 },
      { tier: 'professional', price: 7999, currency: 'INR', period: 'monthly', includedConversations: 5000 },
      { tier: 'enterprise', price: 24999, currency: 'INR', period: 'monthly', includedConversations: 50000 }
    ],
    icon: '💼',
    trending: true
  }
];

export class AgentTemplateService {
  /**
   * Seed all agent templates
   */
  async seedTemplates(vendorId: string = 'hojai', vendorName: string = 'Hojai AI'): Promise<void> {
    const existing = await Agent.countDocuments({ vendorId });
    if (existing > 0) {
      console.log('Agent templates already seeded');
      return;
    }

    for (const template of agentTemplates) {
      const agent = new Agent({
        agentId: uuidv4(),
        ...template,
        vendorId,
        vendorName,
        status: 'published',
        publishedAt: new Date(),
        metrics: {
          totalInstalls: 0,
          activeInstances: 0,
          totalConversations: 0,
          avgResponseTime: 0,
          successRate: 0,
          rating: 0,
          reviewCount: 0
        }
      });

      await agent.save();
    }

    console.log(`Seeded ${agentTemplates.length} agent templates`);
  }
}

export const agentTemplateService = new AgentTemplateService();
