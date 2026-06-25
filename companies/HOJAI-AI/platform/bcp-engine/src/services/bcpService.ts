import { v4 as uuidv4 } from 'uuid';

interface BCPEmployee { id: string; name: string; role: string; description: string; capabilities: string[]; kpis: string[]; port: number; }
interface BCPSkill { id: string; name: string; description: string; category: string; version: string; required: boolean; }
interface BCPWorkflow { id: string; name: string; description: string; steps: string[]; trigger: string; frequency?: string; }
interface BCPIntegration { id: string; name: string; category: string; configSchema: Record<string, unknown>; required: boolean; docsUrl?: string; }
interface BCPSetupStep { id: string; title: string; description: string; order: number; status: string; required: boolean; configFields?: Array<{ key: string; label: string; type: string; placeholder?: string; options?: string[]; required: boolean; }>; }
interface BCPack { id: string; name: string; tagline: string; description: string; category: string; status: string; version: string; publisher: string; publisherId: string; tags: string[]; priceModel: string; priceAmount?: number; priceCurrency: string; employees: BCPEmployee[]; skills: BCPSkill[]; workflows: BCPWorkflow[]; integrations: BCPIntegration[]; setupSteps: BCPSetupStep[]; estimatedSetupMinutes: number; installCount: number; rating: number; reviewCount: number; createdAt: string; updatedAt: string; }
interface BCPInstallation { id: string; bcpId: string; companyId: string; status: string; config: Record<string, unknown>; installedEmployees: string[]; installedSkills: string[]; installedWorkflows: string[]; installedIntegrations: string[]; stepStatus: Record<string, string>; installedAt: string; updatedAt: string; }
interface BCPBrowseResponse { packs: BCPack[]; total: number; page: number; pageSize: number; categories: Record<string, number>; }
interface BCPSearchQuery { q?: string; category?: string; tags?: string[]; minPrice?: number; maxPrice?: number; sort?: string; page?: number; pageSize?: number; }

function makePack(id: string, name: string, tagline: string, desc: string, cat: string, pub: string, emps: BCPEmployee[], skills: BCPSkill[], flows: BCPWorkflow[], ints: BCPIntegration[], steps: BCPSetupStep[]): BCPack {
  const now = new Date().toISOString();
  return { id, name, tagline, description: desc, category: cat, status: 'published', version: '1.0.0', publisher: pub, publisherId: `pub-${pub.toLowerCase().replace(/\s+/g, '-')}`, tags: [cat], priceModel: 'free', priceCurrency: 'INR', employees: emps, skills, workflows: flows, integrations: ints, setupSteps: steps, estimatedSetupMinutes: steps.length * 3, installCount: Math.floor(Math.random() * 500) + 50, rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10, reviewCount: Math.floor(Math.random() * 200) + 10, createdAt: now, updatedAt: now };
}

const SALES = makePack('bcp-sales-ai', 'Sales AI Pack', 'AI-powered sales team in a box',
  'Turn every lead into a deal. AI Sales Agent, lead scoring, proposal generation, CRM sync, negotiation. 30-40% higher close rate.',
  'sales', 'HOJAI AI',
  [{ id: 'emp-sales', name: 'AI Sales Agent', role: 'sales-agent', description: 'Full sales cycle: lead gen, qualification, nurture, proposal, negotiation',
    capabilities: ['lead-generation', 'email-outreach', 'proposal-generation', 'negotiation', 'crm-sync'], kpis: ['conversion-rate', 'deals-closed', 'avg-deal-size'], port: 4401 }],
  [{ id: 'skill-proposal', name: 'Proposal Generator', description: 'AI-generated proposals from deal context', category: 'sales', version: '1.0', required: true },
   { id: 'skill-outreach', name: 'Email Outreach', description: 'Personalized cold email sequences', category: 'sales', version: '1.0', required: false }],
  [{ id: 'wf-nurture', name: 'Lead Nurture Sequence', description: 'Auto-follow-up for cold leads', steps: ['trigger', 'email', 'score'], trigger: 'event' },
   { id: 'wf-report', name: 'Weekly Sales Report', description: 'AI-generated pipeline report', steps: ['aggregate', 'report'], trigger: 'scheduled', frequency: 'weekly' }],
  [{ id: 'int-crm', name: 'CRM', category: 'crm', configSchema: { webhookUrl: { type: 'string' } }, required: false }],
  [{ id: 'step-crm', title: 'Connect CRM', description: 'Enter your CRM webhook URL', order: 1, status: 'pending', required: false,
     configFields: [{ key: 'webhookUrl', label: 'CRM Webhook URL', type: 'text', required: false }] },
   { id: 'step-email', title: 'Configure Email', description: 'Set up email for outbound sequences', order: 2, status: 'pending', required: true,
     configFields: [{ key: 'apiKey', label: 'Email API Key', type: 'api-key', required: true }] }]
);

const FINANCE = makePack('bcp-finance-ai', 'Finance AI Pack', 'AI-powered finance team in a box',
  'Automate invoicing, reconciliation, expense tracking, financial reporting. Reduces finance ops time by 60%.',
  'finance', 'HOJAI AI',
  [{ id: 'emp-finance', name: 'AI Finance Agent', role: 'finance-agent', description: 'Handles invoicing, reconciliation, expense approval, financial reporting',
    capabilities: ['invoice-generation', 'expense-approval', 'reconciliation', 'financial-reporting', 'compliance-check'], kpis: ['invoice-cycle-time', 'expense-processing-cost', 'reconciliation-accuracy'], port: 4402 }],
  [{ id: 'skill-invoice', name: 'Invoice Generator', description: 'Auto-generate invoices from orders', category: 'finance', version: '1.0', required: true }],
  [{ id: 'wf-close', name: 'Monthly Close Report', description: 'Auto-reconcile and report monthly', steps: ['collect', 'reconcile', 'report'], trigger: 'scheduled', frequency: 'monthly' }],
  [{ id: 'int-accounting', name: 'Accounting Software', category: 'accounting', configSchema: { apiKey: { type: 'api-key' } }, required: true }],
  [{ id: 'step-accounting', title: 'Connect Accounting', description: 'Enter your accounting API key', order: 1, status: 'pending', required: true,
     configFields: [{ key: 'apiKey', label: 'API Key', type: 'api-key', required: true }] }]
);

const PROCUREMENT = makePack('bcp-procurement-ai', 'Procurement AI Pack', 'AI-powered procurement team in a box',
  'Source suppliers, run RFQs, negotiate contracts, track deliveries automatically. Average savings: 15-20%.',
  'procurement', 'HOJAI AI',
  [{ id: 'emp-procurement', name: 'AI Procurement Agent', role: 'procurement-agent', description: 'Supplier discovery, RFQ creation, negotiation, contract management',
    capabilities: ['supplier-discovery', 'rfq-creation', 'negotiation', 'contract-management', 'delivery-tracking'], kpis: ['cost-savings', 'supplier-count', 'rfq-cycle-time'], port: 4403 }],
  [{ id: 'skill-discovery', name: 'Supplier Discovery', description: 'Auto-find suppliers via DiscoveryOS', category: 'procurement', version: '1.0', required: true }],
  [{ id: 'wf-rfq', name: 'RFQ Workflow', description: 'Create RFQ, collect quotes, compare, award', steps: ['create', 'discover', 'quotes', 'compare'], trigger: 'manual' }],
  [{ id: 'int-discovery', name: 'DiscoveryOS', category: 'discovery', configSchema: { apiKey: { type: 'api-key' } }, required: true, docsUrl: '/docs/discovery' }],
  [{ id: 'step-discovery', title: 'Connect DiscoveryOS', description: 'Link DiscoveryOS for supplier search', order: 1, status: 'pending', required: true,
     configFields: [{ key: 'apiKey', label: 'DiscoveryOS API Key', type: 'api-key', required: true }] }]
);

const SUPPORT = makePack('bcp-support-ai', 'Support AI Pack', 'AI-powered support team in a box',
  'Handle customer inquiries 24/7 with AI. Resolution rate: 80% without human handoff. Avg response time: <30 seconds.',
  'support', 'HOJAI AI',
  [{ id: 'emp-support', name: 'AI Support Agent', role: 'support-agent', description: 'Handles FAQs, ticket routing, escalation 24/7',
    capabilities: ['faq-answering', 'ticket-routing', 'sentiment-analysis', 'escalation', 'whatsapp', 'email'], kpis: ['resolution-rate', 'avg-response-time', 'csat-score'], port: 4404 }],
  [{ id: 'skill-whatsapp', name: 'WhatsApp Channel', description: 'WhatsApp Business API integration', category: 'support', version: '1.0', required: false },
   { id: 'skill-faq', name: 'FAQ Knowledge Base', description: 'Train on your FAQ and docs', category: 'support', version: '1.0', required: true }],
  [{ id: 'wf-ticket', name: 'Ticket Lifecycle', description: 'FAQ to ticket to resolve', steps: ['classify', 'faq', 'ticket', 'route', 'resolve'], trigger: 'event' }],
  [{ id: 'int-whatsapp', name: 'WhatsApp Business API', category: 'messaging', configSchema: { accessToken: { type: 'api-key' } }, required: false },
   { id: 'int-kb', name: 'Knowledge Base', category: 'kb', configSchema: { docsUrl: { type: 'string' } }, required: true }],
  [{ id: 'step-kb', title: 'Upload Knowledge Base', description: 'Add your FAQ or docs URL', order: 1, status: 'pending', required: true,
     configFields: [{ key: 'docsUrl', label: 'Docs/FAQ URL', type: 'text', required: true }] },
   { id: 'step-whatsapp', title: 'Connect WhatsApp', description: 'Optional: link WhatsApp Business', order: 2, status: 'pending', required: false,
     configFields: [{ key: 'accessToken', label: 'Access Token', type: 'api-key', required: false }] }]
);

const MARKETING = makePack('bcp-marketing-ai', 'Marketing AI Pack', 'AI-powered marketing team in a box',
  'Generate content, run campaigns, track ROI automatically. Average: 3x more content, 2x engagement.',
  'marketing', 'HOJAI AI',
  [{ id: 'emp-marketing', name: 'AI Marketing Agent', role: 'marketing-agent', description: 'Content creation, campaign management, performance analytics',
    capabilities: ['content-generation', 'social-posting', 'email-campaign', 'seo', 'analytics', 'ab-testing'], kpis: ['content-volume', 'engagement-rate', 'conversion-rate', 'roi'], port: 4405 }],
  [{ id: 'skill-social', name: 'Social Media Auto-Post', description: 'Auto-post to LinkedIn, Twitter, Instagram', category: 'marketing', version: '1.0', required: false },
   { id: 'skill-email-campaign', name: 'Email Campaign Manager', description: 'Design and run drip email campaigns', category: 'marketing', version: '1.0', required: false }],
  [{ id: 'wf-content', name: 'Weekly Content Calendar', description: 'Generate and schedule content', steps: ['generate', 'review', 'schedule'], trigger: 'scheduled', frequency: 'weekly' }],
  [{ id: 'int-social', name: 'Social Media Accounts', category: 'social', configSchema: {}, required: false },
   { id: 'int-analytics', name: 'Google Analytics', category: 'analytics', configSchema: { trackingId: { type: 'string' } }, required: false }],
  [{ id: 'step-social', title: 'Connect Social Accounts', description: 'Link LinkedIn, Twitter, Instagram', order: 1, status: 'pending', required: false },
   { id: 'step-brand', title: 'Upload Brand Guidelines', description: 'Ensure consistent brand voice', order: 2, status: 'pending', required: false,
     configFields: [{ key: 'brandGuide', label: 'Brand Guide URL', type: 'text', required: false }] }]
);

class BCPService {
  private packs = new Map<string, BCPack>();
  private installations = new Map<string, BCPInstallation[]>();

  constructor() {
    for (const bcp of [SALES, FINANCE, PROCUREMENT, SUPPORT, MARKETING]) {
      this.packs.set(bcp.id, bcp);
    }
  }

  getPack(id: string): BCPack | null { return this.packs.get(id) ?? null; }

  listPacks(query: BCPSearchQuery = {}): BCPBrowseResponse {
    let results = Array.from(this.packs.values());
    if (query.category) results = results.filter(p => p.category === query.category);
    if (query.tags?.length) results = results.filter(p => query.tags!.some(t => p.tags.includes(t)));
    if (query.q) {
      const q = query.q.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q)) ||
        p.employees.some(e => e.name.toLowerCase().includes(q) || e.capabilities.some(c => c.includes(q)))
      );
    }
    if (query.minPrice !== undefined) results = results.filter(p => (p.priceAmount ?? 0) >= query.minPrice!);
    if (query.maxPrice !== undefined) results = results.filter(p => (p.priceAmount ?? 0) <= query.maxPrice!);
    if (query.sort === 'rating') results.sort((a, b) => b.rating - a.rating);
    else if (query.sort === 'recent') results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (query.sort === 'name') results.sort((a, b) => a.name.localeCompare(b.name));
    else results.sort((a, b) => b.installCount - a.installCount); // popular
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const paginated = results.slice((page - 1) * pageSize, page * pageSize);
    const cats: Record<string, number> = {};
    for (const p of Array.from(this.packs.values())) cats[p.category] = (cats[p.category] ?? 0) + 1;
    return { packs: paginated, total: results.length, page, pageSize, categories: cats };
  }

  getCategories(): Array<{ name: string; count: number; packs: BCPack[] }> {
    const map = new Map<string, BCPack[]>();
    for (const p of this.packs.values()) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return Array.from(map.entries()).map(([name, packs]) => ({ name, count: packs.length, packs }));
  }

  install(bcpId: string, companyId: string): BCPInstallation {
    const bcp = this.packs.get(bcpId);
    if (!bcp) throw new Error(`BCP ${bcpId} not found`);
    const existing = this.installations.get(companyId) ?? [];
    if (existing.find(i => i.bcpId === bcpId)) throw new Error(`BCP ${bcpId} already installed for company ${companyId}`);
    const now = new Date().toISOString();
    const inst: BCPInstallation = {
      id: `inst-${uuidv4().slice(0, 8)}`, bcpId, companyId, status: 'active', config: {},
      installedEmployees: bcp.employees.map(e => e.id),
      installedSkills: bcp.skills.filter(s => s.required).map(s => s.id),
      installedWorkflows: bcp.workflows.map(w => w.id),
      installedIntegrations: bcp.integrations.filter(i => i.required).map(i => i.id),
      stepStatus: Object.fromEntries(bcp.setupSteps.map(s => [s.id, s.required ? 'pending' : 'skipped'])),
      installedAt: now, updatedAt: now
    };
    existing.push(inst);
    this.installations.set(companyId, existing);
    bcp.installCount++;
    return inst;
  }

  getInstallations(companyId: string): BCPInstallation[] { return this.installations.get(companyId) ?? []; }

  uninstall(bcpId: string, companyId: string): void {
    const existing = this.installations.get(companyId) ?? [];
    const filtered = existing.filter(i => i.bcpId !== bcpId);
    if (filtered.length === existing.length) throw new Error(`Installation not found`);
    this.installations.set(companyId, filtered);
    const bcp = this.packs.get(bcpId);
    if (bcp && bcp.installCount > 0) bcp.installCount--;
  }

  updateSetupStep(companyId: string, bcpId: string, stepId: string,
    status: 'pending' | 'in-progress' | 'done' | 'skipped',
    config?: Record<string, unknown>): BCPInstallation {
    const existing = this.installations.get(companyId) ?? [];
    const inst = existing.find(i => i.bcpId === bcpId);
    if (!inst) throw new Error(`Installation not found`);
    inst.stepStatus[stepId] = status;
    if (config) inst.config = { ...inst.config, ...config };
    inst.updatedAt = new Date().toISOString();
    return inst;
  }

  getStats() {
    const totalInstalls = Array.from(this.installations.values()).flat().length;
    const catSet = new Set<string>();
    for (const p of this.packs.values()) catSet.add(p.category);
    return { totalPacks: this.packs.size, totalInstallations: totalInstalls, categories: Array.from(catSet) };
  }
}

const bcpService = new BCPService();
export default bcpService;
export type { BCPack, BCPInstallation, BCPBrowseResponse, BCPSearchQuery, BCPEmployee, BCPSkill, BCPWorkflow, BCPIntegration, BCPSetupStep };
