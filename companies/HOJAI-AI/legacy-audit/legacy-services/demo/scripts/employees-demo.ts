#!/usr/bin/env tsx

/**
 * HOJAI AI - AI Employees Demo
 *
 * This script demonstrates the AI Employees system:
 * 1. Lists all available AI employees
 * 2. Health checks selected employees
 * 3. Tests API calls for each employee type
 *
 * Run: npx tsx demo/scripts/employees-demo.ts
 */

import axios from 'axios';

// ============================================================================
// CONFIGURATION
// ============================================================================

const EMPLOYEES = {
  'appointment-setter': { port: 4771, category: 'Sales', name: 'Appointment Setter' },
  'sdr-agent': { port: 4757, category: 'Sales', name: 'Sales Development Rep' },
  'ai-support-agent': { port: 4760, category: 'Support', name: 'AI Support Agent' },
  'marketing-agent': { port: 4761, category: 'Marketing', name: 'Marketing Agent' },
  'hr-recruiter-agent': { port: 4762, category: 'HR', name: 'HR Recruiter' },
  'followup-agent': { port: 4773, category: 'Sales', name: 'Follow-up Agent' },
  'content-agent': { port: 4766, category: 'Marketing', name: 'Content Agent' },
};

// ============================================================================
// COLORS FOR TERMINAL OUTPUT
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
  const color = type === 'success' ? colors.green : type === 'error' ? colors.red : type === 'warning' ? colors.yellow : colors.cyan;
  console.log(`${colors.bright}${color}[${title}]${colors.reset} ${message}`);
}

function logSection(title: string): void {
  console.log(`\n${colors.bright}${colors.magenta}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}${'='.repeat(70)}${colors.reset}\n`);
}

// ============================================================================
// EMPLOYEE CLIENT
// ============================================================================

interface HealthResponse {
  status: string;
  service: string;
  version?: string;
  port?: number;
  timestamp?: string;
  uptime?: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class EmployeeClient {
  private baseUrl: string;

  constructor(port: number) {
    this.baseUrl = `http://localhost:${port}`;
  }

  async healthCheck(): Promise<HealthResponse | null> {
    try {
      const response = await axios.get<HealthResponse>(`${this.baseUrl}/health`, { timeout: 3000 });
      return response.data;
    } catch {
      return null;
    }
  }

  async getInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/info`, { timeout: 3000 });
      return response.data;
    } catch {
      return null;
    }
  }
}

// ============================================================================
// DEMO FUNCTIONS
// ============================================================================

async function listAllEmployees(): Promise<void> {
  logSection('ALL AI EMPLOYEES (176 Total)');

  const categories: Record<string, Array<{name: string, port: number}>> = {
    'Sales': [
      { name: 'appointment-setter', port: 4771 },
      { name: 'sdr-agent', port: 4757 },
      { name: 'followup-agent', port: 4773 },
      { name: 'proposal-agent', port: 4772 },
      { name: 'renewal-agent', port: 4774 },
      { name: 'sales-development-rep', port: 4757 },
      { name: 'sales-coach', port: 4750 },
    ],
    'Support': [
      { name: 'ai-support-agent', port: 4760 },
      { name: 'it-support-agent', port: 4815 },
      { name: 'customer-success-agent', port: 4808 },
      { name: 'warranty-agent', port: 4824 },
    ],
    'Marketing': [
      { name: 'marketing-agent', port: 4761 },
      { name: 'content-agent', port: 4766 },
      { name: 'seo-agent', port: 4775 },
      { name: 'ads-agent', port: 4776 },
      { name: 'social-agent', port: 4777 },
      { name: 'social-media-manager', port: 4820 },
    ],
    'HR': [
      { name: 'hr-recruiter-agent', port: 4762 },
      { name: 'interview-agent', port: 4778 },
      { name: 'onboarding-agent', port: 4779 },
      { name: 'training-coach', port: 4806 },
    ],
    'Finance': [
      { name: 'accountant-ai', port: 4781 },
      { name: 'collections-agent', port: 4782 },
      { name: 'budget-analyst', port: 4813 },
      { name: 'merchant-cfo', port: 4765 },
    ],
    'Hospitality': [
      { name: 'receptionist-ai', port: 4783 },
      { name: 'concierge-ai', port: 4791 },
      { name: 'hotel-revenue-manager', port: 4764 },
      { name: 'host-ai', port: 4818 },
    ],
    'Healthcare': [
      { name: 'care-manager', port: 4784 },
      { name: 'doctor-assistant', port: 4845 },
      { name: 'nurse-assistant', port: 4846 },
      { name: 'clinic-growth-consultant', port: 4767 },
    ],
    'Operations': [
      { name: 'ops-manager', port: 4785 },
      { name: 'procurement-agent', port: 4786 },
      { name: 'scheduling-agent', port: 4822 },
      { name: 'warehouse-manager', port: 4807 },
    ],
  };

  for (const [category, employees] of Object.entries(categories)) {
    console.log(`${colors.bright}${colors.cyan}${category}:${colors.reset}`);
    employees.forEach(emp => {
      console.log(`  ${colors.green}•${colors.reset} ${emp.name} (Port ${emp.port})`);
    });
    console.log('');
  }

  console.log(`${colors.dim}... and 100+ more industry-specific employees${colors.reset}\n`);
}

async function healthCheckEmployees(): Promise<void> {
  logSection('HEALTH CHECK - Selected AI Employees');

  const results: Array<{name: string, port: number, status: 'healthy' | 'unhealthy' | 'simulated'}> = [];

  for (const [key, config] of Object.entries(EMPLOYEES)) {
    const client = new EmployeeClient(config.port);
    const health = await client.healthCheck();

    if (health) {
      results.push({ name: config.name, port: config.port, status: 'healthy' });
      log('HEALTH', `${config.name} (${config.port}) - ${colors.green}RUNNING${colors.reset}`, 'success');
      console.log(`    Service: ${health.service} | Version: ${health.version || 'N/A'} | Uptime: ${health.uptime ? Math.round(health.uptime) + 's' : 'N/A'}`);
    } else {
      results.push({ name: config.name, port: config.port, status: 'unhealthy' });
      log('HEALTH', `${config.name} (${config.port}) - ${colors.yellow}NOT RUNNING${colors.reset}`, 'warning');
    }
  }

  return Promise.resolve();
}

async function demoAppointmentSetter(): Promise<void> {
  logSection('DEMO: Appointment Setter (Port 4771)');

  const port = 4771;
  const client = new EmployeeClient(port);

  // Check if running, if not simulate
  const health = await client.healthCheck();

  if (health) {
    console.log(`${colors.green}✓ Employee is running!${colors.reset}\n`);

    // Demo: Find available slots
    console.log(`${colors.cyan}Test 1: Find Available Slots${colors.reset}`);
    try {
      const slots = await axios.post(`http://localhost:${port}/api/appointments/slots`, {
        service: 'consultation',
        date: '2026-06-01',
        duration: 30
      });
      console.log(`  ${colors.green}Available Slots:${colors.reset}`);
      slots.data.availableSlots?.forEach((slot: any) => {
        console.log(`    • ${slot.time} with ${slot.provider}`);
      });
    } catch {
      log('DEMO', 'Slots endpoint test', 'warning');
    }

    // Demo: Book appointment
    console.log(`\n${colors.cyan}Test 2: Book Appointment${colors.reset}`);
    try {
      const booking = await axios.post(`http://localhost:${port}/api/appointments/book`, {
        customerId: 'cust_001',
        service: 'consultation',
        slot: '10:00 AM',
        date: '2026-06-01'
      });
      console.log(`  ${colors.green}Booking Confirmed!${colors.reset}`);
      console.log(`    Appointment ID: ${booking.data.appointmentId}`);
      console.log(`    Status: ${booking.data.status}`);
      console.log(`    Reminder: ${booking.data.reminder}`);
    } catch {
      log('DEMO', 'Booking endpoint test', 'warning');
    }
  } else {
    simulateAppointmentSetter();
  }
}

function simulateAppointmentSetter(): void {
  console.log(`${colors.yellow}⚠ Employee not running - Simulating responses${colors.reset}\n`);

  console.log(`${colors.cyan}Test 1: Find Available Slots${colors.reset}`);
  console.log(`  ${colors.green}Available Slots:${colors.reset}`);
  console.log(`    • 10:00 AM with Dr. Smith`);
  console.log(`    • 11:30 AM with Dr. Jones`);
  console.log(`    • 2:00 PM with Dr. Smith`);
  console.log(`    • 4:30 PM with Dr. Patel`);

  console.log(`\n${colors.cyan}Test 2: Book Appointment${colors.reset}`);
  console.log(`  ${colors.green}Booking Confirmed!${colors.reset}`);
  console.log(`    Appointment ID: apt_${Date.now()}`);
  console.log(`    Status: confirmed`);
  console.log(`    Reminder: Sent 24h before`);
}

async function demoSDRAgent(): Promise<void> {
  logSection('DEMO: SDR Agent (Port 4757)');

  const port = 4757;
  const client = new EmployeeClient(port);
  const health = await client.healthCheck();

  if (health) {
    console.log(`${colors.green}✓ Employee is running!${colors.reset}\n`);
    console.log(`${colors.cyan}SDR Agent Capabilities:${colors.reset}`);
    console.log(`  • Find prospects from database or external sources`);
    console.log(`  • Qualify leads using BANT/MARC criteria`);
    console.log(`  • Send personalized outreach (Email, LinkedIn, SMS)`);
    console.log(`  • Schedule and track follow-ups`);
    console.log(`  • Update lead stages in CRM`);
  } else {
    simulateSDRAgent();
  }
}

function simulateSDRAgent(): void {
  console.log(`${colors.yellow}⚠ Employee not running - Simulating responses${colors.reset}\n`);

  console.log(`${colors.cyan}SDR Agent Capabilities:${colors.reset}`);
  console.log(`  • Find prospects from database or external sources`);
  console.log(`  • Qualify leads using BANT/MARC criteria`);
  console.log(`  • Send personalized outreach (Email, LinkedIn, SMS)`);
  console.log(`  • Schedule and track follow-ups`);
  console.log(`  • Update lead stages in CRM`);

  console.log(`\n${colors.cyan}Example: Qualify Lead${colors.reset}`);
  console.log(`  ${colors.green}Lead Qualified!${colors.reset}`);
  console.log(`    Score: 85/100`);
  console.log(`    Stage: MQL (Marketing Qualified Lead)`);
  console.log(`    Budget: Confirmed`);
  console.log(`    Authority: Decision Maker`);
  console.log(`    Timeline: 30 days`);
  console.log(`    Recommendation: Send to sales`);
}

async function demoSupportAgent(): Promise<void> {
  logSection('DEMO: AI Support Agent (Port 4760)');

  const port = 4760;
  const client = new EmployeeClient(port);
  const health = await client.healthCheck();

  if (health) {
    console.log(`${colors.green}✓ Employee is running!${colors.reset}\n`);
    console.log(`${colors.cyan}Support Agent Capabilities:${colors.reset}`);
    console.log(`  • 24x7 ticket resolution`);
    console.log(`  • FAQ automation`);
    console.log(`  • Escalation routing`);
    console.log(`  • Warranty verification`);
    console.log(`  • Refund processing`);
  } else {
    simulateSupportAgent();
  }
}

function simulateSupportAgent(): void {
  console.log(`${colors.yellow}⚠ Employee not running - Simulating responses${colors.reset}\n`);

  console.log(`${colors.cyan}Support Agent Capabilities:${colors.reset}`);
  console.log(`  • 24x7 ticket resolution`);
  console.log(`  • FAQ automation`);
  console.log(`  • Escalation routing`);
  console.log(`  • Warranty verification`);
  console.log(`  • Refund processing`);

  console.log(`\n${colors.cyan}Example: Create Support Ticket${colors.reset}`);
  console.log(`  ${colors.green}Ticket Created!${colors.reset}`);
  console.log(`    Ticket #: TKT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`);
  console.log(`    Status: open`);
  console.log(`    Priority: high`);
  console.log(`    Category: shipping`);
  console.log(`    Assigned to: AI Agent`);
}

async function demoMarketingAgent(): Promise<void> {
  logSection('DEMO: Marketing Agent (Port 4761)');

  const port = 4761;
  const client = new EmployeeClient(port);
  const health = await client.healthCheck();

  if (health) {
    console.log(`${colors.green}✓ Employee is running!${colors.reset}\n`);
    console.log(`${colors.cyan}Marketing Agent Capabilities:${colors.reset}`);
    console.log(`  • Generate content (blog, social, ads)`);
    console.log(`  • Manage social media posts`);
    console.log(`  • Create and launch campaigns`);
    console.log(`  • SEO optimization`);
    console.log(`  • Email marketing campaigns`);
  } else {
    simulateMarketingAgent();
  }
}

function simulateMarketingAgent(): void {
  console.log(`${colors.yellow}⚠ Employee not running - Simulating responses${colors.reset}\n`);

  console.log(`${colors.cyan}Marketing Agent Capabilities:${colors.reset}`);
  console.log(`  • Generate content (blog, social, ads)`);
  console.log(`  • Manage social media posts`);
  console.log(`  • Create and launch campaigns`);
  console.log(`  • SEO optimization`);
  console.log(`  • Email marketing campaigns`);

  console.log(`\n${colors.cyan}Example: Generate Social Post${colors.reset}`);
  console.log(`  ${colors.green}Post Generated!${colors.reset}`);
  console.log(`    Platform: Instagram`);
  console.log(`    Content: "Excited to announce our summer sale! 🎉`);
  console.log(`    #SummerSale #NewArrivals #ShopNow"`);
  console.log(`    Hashtags: 5`);
  console.log(`    Estimated Reach: 5,000+`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log(`
${colors.cyan}${colors.bright}
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                    HOJAI AI - EMPLOYEES DEMO                                   ║
║                                                                               ║
║              176+ AI Employees Ready to Work for Your Business                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
${colors.reset}
  `);

  // 1. List all employees
  await listAllEmployees();

  // 2. Health check selected employees
  await healthCheckEmployees();

  // 3. Demo each employee type
  await demoAppointmentSetter();
  await demoSDRAgent();
  await demoSupportAgent();
  await demoMarketingAgent();

  // Summary
  logSection('DEMO COMPLETE');

  console.log(`
${colors.green}${colors.bright}
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                         SUMMARY                                               ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Total AI Employees:  176+                                                    ║
║  Categories:          50+                                                     ║
║  Industries:          20+                                                      ║
║  Port Range:          4755-4900                                               ║
║                                                                               ║
║  Key Employees Demoed:                                                        ║
║    ✓ Appointment Setter (4771) - Sales                                        ║
║    ✓ SDR Agent (4757) - Sales                                                ║
║    ✓ AI Support Agent (4760) - Support                                       ║
║    ✓ Marketing Agent (4761) - Marketing                                      ║
║                                                                               ║
║  To Start Employees Manually:                                                ║
║                                                                               ║
║    cd employees/appointment-setter && npm run dev                            ║
║    cd employees/sdr-agent && npm run dev                                     ║
║    cd employees/ai-support-agent && npm run dev                             ║
║    cd employees/marketing-agent && npm run dev                              ║
║                                                                               ║
║  Or use the deploy script:                                                    ║
║                                                                               ║
║    ./deploy/start-all.sh start                                               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
${colors.reset}
  `);
}

main().catch(console.error);
