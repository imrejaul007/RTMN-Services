/**
 * SDR Agent - Research Tool
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Company and prospect research capabilities
 */

import { z } from 'zod';
import type { Tool, ToolResult } from '../../core/src/BaseAgent.js';

// ============================================================================
// Research Data Store (In-Memory)
// ============================================================================

interface ResearchReport {
  id: string;
  tenantId: string;
  targetType: 'company' | 'person';
  targetName: string;
  summary: string;
  findings: {
    category: string;
    data: Record<string, unknown>;
  }[];
  sources: string[];
  intentSignals: string[];
  recommendations: string[];
  score: number;
  createdAt: Date;
}

interface ProspectProfile {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  company: string;
  title: string;
  linkedIn?: string;
  companyDomain: string;
  companySize?: string;
  industry?: string;
  location?: string;
  funding?: string;
  recentNews?: string[];
  technologies?: string[];
  intentSignals: {
    type: string;
    source: string;
    date: Date;
    description: string;
  }[];
  outreachHistory: {
    channel: string;
    sentAt: Date;
    status: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced';
  }[];
  score: number;
  lastUpdated: Date;
}

class ResearchStore {
  private reports: Map<string, ResearchReport> = new Map();
  private profiles: Map<string, ProspectProfile> = new Map();

  createReport(report: Omit<ResearchReport, 'id' | 'createdAt'>): ResearchReport {
    const id = `report_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newReport: ResearchReport = { ...report, id, createdAt: new Date() };
    this.reports.set(id, newReport);
    return newReport;
  }

  getReport(id: string): ResearchReport | undefined {
    return this.reports.get(id);
  }

  getReportsByTarget(tenantId: string, targetName: string): ResearchReport[] {
    return Array.from(this.reports.values()).filter(
      r => r.tenantId === tenantId && r.targetName.toLowerCase().includes(targetName.toLowerCase())
    );
  }

  createProfile(profile: Omit<ProspectProfile, 'id' | 'lastUpdated'>): ProspectProfile {
    const id = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newProfile: ProspectProfile = { ...profile, id, lastUpdated: new Date() };
    this.profiles.set(id, newProfile);
    return newProfile;
  }

  getProfile(id: string): ProspectProfile | undefined {
    return this.profiles.get(id);
  }

  getProfileByEmail(email: string): ProspectProfile | undefined {
    return Array.from(this.profiles.values()).find(p => p.email === email);
  }

  getProfilesByCompany(tenantId: string, company: string): ProspectProfile[] {
    return Array.from(this.profiles.values()).filter(
      p => p.tenantId === tenantId && p.company.toLowerCase().includes(company.toLowerCase())
    );
  }

  updateProfile(id: string, updates: Partial<ProspectProfile>): ProspectProfile | undefined {
    const profile = this.profiles.get(id);
    if (!profile) return undefined;
    const updated: ProspectProfile = { ...profile, ...updates, id, lastUpdated: new Date() };
    this.profiles.set(id, updated);
    return updated;
  }

  addIntentSignal(profileId: string, signal: ProspectProfile['intentSignals'][0]): void {
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.intentSignals.push(signal);
      profile.lastUpdated = new Date();
      this.profiles.set(profileId, profile);
    }
  }

  addOutreachHistory(profileId: string, outreach: ProspectProfile['outreachHistory'][0]): void {
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.outreachHistory.push(outreach);
      profile.lastUpdated = new Date();
      this.profiles.set(profileId, profile);
    }
  }
}

const researchStore = new ResearchStore();

// ============================================================================
// Intent Signal Detection
// ============================================================================

interface IntentSignalRule {
  type: string;
  keywords: string[];
  industries?: string[];
  minCompanySize?: number;
  weight: number;
}

const INTENT_SIGNAL_RULES: IntentSignalRule[] = [
  { type: 'job_posting', keywords: ['hiring', 'job opening', 'join our team', 'we are looking for', 'now hiring'], weight: 2 },
  { type: 'funding', keywords: ['raised', 'series', 'funding', 'investment', 'venture capital'], weight: 3 },
  { type: 'technology_change', keywords: ['migrating', 'switching to', 'moving from', 'new tech stack', 'adopting'], weight: 2 },
  { type: 'expansion', keywords: ['expanding', 'new office', 'new market', 'growing team', 'scaling'], weight: 2 },
  { type: 'leadership_change', keywords: ['new ceo', 'new cto', 'new vp', 'appointed', 'promoted'], weight: 2 },
  { type: 'product_launch', keywords: ['launching', 'announcing', 'new product', 'release', 'introducing'], weight: 1 },
  { type: 'partnership', keywords: ['partnered with', 'collaboration', 'strategic alliance', 'integration'], weight: 2 },
  { type: 'award', keywords: ['award', 'recognized', 'ranked', 'top', 'leader'], weight: 1 },
  { type: 'event', keywords: ['attending', 'speaking at', 'hosting', 'attending', 'conference'], weight: 1 },
  { type: 'hiring_spree', keywords: ['hiring 10', 'hiring 20', 'rapid growth', 'aggressive hiring'], minCompanySize: 50, weight: 3 },
];

function detectIntentSignals(companyName: string, news: string[], companySize?: string): string[] {
  const signals: string[] = [];
  const newsText = news.join(' ').toLowerCase();

  for (const rule of INTENT_SIGNAL_RULES) {
    for (const keyword of rule.keywords) {
      if (newsText.includes(keyword)) {
        signals.push(rule.type);
        break;
      }
    }
  }

  return [...new Set(signals)];
}

// ============================================================================
// Parameter Schemas
// ============================================================================

const ResearchCompanySchema = z.object({
  tenantId: z.string().describe('Tenant ID'),
  companyName: z.string().describe('Company name to research'),
  includeNews: z.boolean().optional().describe('Include recent news'),
});

const ResearchPersonSchema = z.object({
  tenantId: z.string().describe('Tenant ID'),
  name: z.string().describe('Person name'),
  company: z.string().describe('Company name'),
  title: z.string().optional().describe('Job title'),
});

const CreateProspectProfileSchema = z.object({
  tenantId: z.string().describe('Tenant ID'),
  name: z.string().describe('Prospect name'),
  email: z.string().email().describe('Prospect email'),
  company: z.string().describe('Company name'),
  title: z.string().describe('Job title'),
  linkedIn: z.string().optional(),
  companyDomain: z.string().describe('Company domain'),
  companySize: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
});

const GetProspectProfileSchema = z.object({
  profileId: z.string().describe('Profile ID'),
});

const EnrichProspectSchema = z.object({
  profileId: z.string().describe('Profile ID to enrich'),
  addIntentSignals: z.boolean().optional().describe('Detect intent signals'),
  addTechAnalysis: z.boolean().optional().describe('Analyze technologies'),
});

const GetProspectsByCompanySchema = z.object({
  tenantId: z.string().describe('Tenant ID'),
  company: z.string().describe('Company name'),
});

const ScoreProspectSchema = z.object({
  profileId: z.string().describe('Profile ID'),
  companyScore: z.number().min(0).max(100).optional().describe('Company fit score'),
  intentScore: z.number().min(0).max(100).optional().describe('Intent score'),
  engagementScore: z.number().min(0).max(100).optional().describe('Engagement score'),
});

const GetResearchReportSchema = z.object({
  reportId: z.string().describe('Report ID'),
});

const FindProspectSchema = z.object({
  tenantId: z.string().describe('Tenant ID'),
  email: z.string().email().describe('Prospect email'),
});

// ============================================================================
// Tool Implementations
// ============================================================================

async function researchCompanyHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = ResearchCompanySchema.parse(params);

    // Simulate company research (in production, call external APIs)
    const report = researchStore.createReport({
      tenantId: args.tenantId,
      targetType: 'company',
      targetName: args.companyName,
      summary: `Research report for ${args.companyName}. This includes company overview, recent activity, and potential signals.`,
      findings: [
        {
          category: 'Company Overview',
          data: {
            name: args.companyName,
            founded: '2015',
            employees: '50-200',
            industry: 'Technology',
            headquarters: 'San Francisco, CA',
          },
        },
        {
          category: 'Recent News',
          data: {
            items: args.includeNews ? [
              'Announced new product launch',
              'Hiring for multiple positions',
              'Partnership with major vendor',
            ] : [],
          },
        },
      ],
      sources: ['LinkedIn', 'Company Website', 'News Sources'],
      intentSignals: args.includeNews ? detectIntentSignals(args.companyName, ['hiring', 'new product']) : [],
      recommendations: [
        'Focus on their recent growth initiatives',
        'Reference their hiring expansion in outreach',
        'Highlight case studies in their industry',
      ],
      score: 75,
    });

    return { success: true, data: { reportId: report.id, report } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to research company' };
  }
}

async function researchPersonHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = ResearchPersonSchema.parse(params);

    const report = researchStore.createReport({
      tenantId: args.tenantId,
      targetType: 'person',
      targetName: args.name,
      summary: `Research report for ${args.name} at ${args.company}.`,
      findings: [
        {
          category: 'Professional Background',
          data: {
            name: args.name,
            title: args.title || 'Professional',
            company: args.company,
            seniority: 'Director',
            department: 'Engineering',
          },
        },
        {
          category: 'Background',
          data: {
            experience: '10+ years in the industry',
            previousCompanies: ['Tech Corp', 'Startup Inc'],
            education: 'MBA from Stanford',
          },
        },
      ],
      sources: ['LinkedIn', 'Company Website'],
      intentSignals: [],
      recommendations: [
        `Target ${args.name} with executive-level messaging`,
        'Reference their professional background',
        'Connect through industry topics',
      ],
      score: 70,
    });

    return { success: true, data: { reportId: report.id, report } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to research person' };
  }
}

async function createProspectProfileHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = CreateProspectProfileSchema.parse(params);

    const profile = researchStore.createProfile({
      tenantId: args.tenantId,
      name: args.name,
      email: args.email,
      company: args.company,
      title: args.title,
      linkedIn: args.linkedIn,
      companyDomain: args.companyDomain,
      companySize: args.companySize,
      industry: args.industry,
      location: args.location,
      intentSignals: [],
      outreachHistory: [],
      score: 50,
    });

    return { success: true, data: { profileId: profile.id, profile } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create profile' };
  }
}

async function getProspectProfileHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetProspectProfileSchema.parse(params);
    const profile = researchStore.getProfile(args.profileId);
    if (!profile) return { success: false, error: `Profile not found: ${args.profileId}` };
    return { success: true, data: { profile } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get profile' };
  }
}

async function enrichProspectHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = EnrichProspectSchema.parse(params);
    const profile = researchStore.getProfile(args.profileId);
    if (!profile) return { success: false, error: `Profile not found: ${args.profileId}` };

    const updates: Partial<ProspectProfile> = {};

    if (args.addIntentSignals) {
      const signals = detectIntentSignals(profile.company, [
        'recent news about company growth',
        'new hiring initiatives',
      ]);
      for (const signal of signals) {
        researchStore.addIntentSignal(args.profileId, {
          type: signal,
          source: 'automated',
          date: new Date(),
          description: `Detected ${signal} signal`,
        });
      }
    }

    if (args.addTechAnalysis) {
      updates.technologies = ['React', 'Node.js', 'AWS', 'PostgreSQL'];
    }

    const updated = researchStore.updateProfile(args.profileId, updates);

    return {
      success: true,
      data: {
        profileId: args.profileId,
        enriched: true,
        intentSignalsCount: profile.intentSignals.length,
        message: 'Prospect enriched successfully',
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to enrich prospect' };
  }
}

async function getProspectsByCompanyHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetProspectsByCompanySchema.parse(params);
    const profiles = researchStore.getProfilesByCompany(args.tenantId, args.company);
    return { success: true, data: { profiles, count: profiles.length } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get prospects' };
  }
}

async function scoreProspectHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = ScoreProspectSchema.parse(params);
    const profile = researchStore.getProfile(args.profileId);
    if (!profile) return { success: false, error: `Profile not found: ${args.profileId}` };

    // Calculate weighted score
    const companyScore = args.companyScore ?? 50;
    const intentScore = args.intentScore ?? 30;
    const engagementScore = args.engagementScore ?? 20;

    const totalScore = Math.round(
      (companyScore * 0.4) + (intentScore * 0.4) + (engagementScore * 0.2)
    );

    const updated = researchStore.updateProfile(args.profileId, { score: totalScore });

    return {
      success: true,
      data: {
        profileId: args.profileId,
        score: totalScore,
        breakdown: {
          companyFit: companyScore,
          intent: intentScore,
          engagement: engagementScore,
        },
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to score prospect' };
  }
}

async function getResearchReportHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetResearchReportSchema.parse(params);
    const report = researchStore.getReport(args.reportId);
    if (!report) return { success: false, error: `Report not found: ${args.reportId}` };
    return { success: true, data: { report } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get report' };
  }
}

async function findProspectHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = FindProspectSchema.parse(params);
    const profile = researchStore.getProfileByEmail(args.email);
    if (!profile) return { success: false, error: `No prospect found with email: ${args.email}` };
    return { success: true, data: { profileId: profile.id, profile } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to find prospect' };
  }
}

// ============================================================================
// Research Tools Export
// ============================================================================

export const researchTools: Tool[] = [
  {
    name: 'research_company',
    description: 'Research a company for sales intelligence',
    parameters: [
      { name: 'tenantId', description: 'Tenant ID', schema: z.string() },
      { name: 'companyName', description: 'Company name', schema: z.string() },
      { name: 'includeNews', description: 'Include recent news (optional)', schema: z.boolean().optional() },
    ],
    execute: researchCompanyHandler,
  },
  {
    name: 'research_person',
    description: 'Research a person for sales intelligence',
    parameters: [
      { name: 'tenantId', description: 'Tenant ID', schema: z.string() },
      { name: 'name', description: 'Person name', schema: z.string() },
      { name: 'company', description: 'Company name', schema: z.string() },
      { name: 'title', description: 'Job title (optional)', schema: z.string().optional() },
    ],
    execute: researchPersonHandler,
  },
  {
    name: 'create_prospect_profile',
    description: 'Create a prospect profile for tracking',
    parameters: [
      { name: 'tenantId', description: 'Tenant ID', schema: z.string() },
      { name: 'name', description: 'Prospect name', schema: z.string() },
      { name: 'email', description: 'Prospect email', schema: z.string().email() },
      { name: 'company', description: 'Company name', schema: z.string() },
      { name: 'title', description: 'Job title', schema: z.string() },
      { name: 'linkedIn', description: 'LinkedIn URL (optional)', schema: z.string().optional() },
      { name: 'companyDomain', description: 'Company domain', schema: z.string() },
      { name: 'companySize', description: 'Company size (optional)', schema: z.string().optional() },
      { name: 'industry', description: 'Industry (optional)', schema: z.string().optional() },
      { name: 'location', description: 'Location (optional)', schema: z.string().optional() },
    ],
    execute: createProspectProfileHandler,
  },
  {
    name: 'get_prospect_profile',
    description: 'Get a prospect profile by ID',
    parameters: [{ name: 'profileId', description: 'Profile ID', schema: z.string() }],
    execute: getProspectProfileHandler,
  },
  {
    name: 'enrich_prospect',
    description: 'Enrich a prospect with additional data',
    parameters: [
      { name: 'profileId', description: 'Profile ID', schema: z.string() },
      { name: 'addIntentSignals', description: 'Detect intent signals (optional)', schema: z.boolean().optional() },
      { name: 'addTechAnalysis', description: 'Analyze technologies (optional)', schema: z.boolean().optional() },
    ],
    execute: enrichProspectHandler,
  },
  {
    name: 'get_prospects_by_company',
    description: 'Get all prospects at a company',
    parameters: [
      { name: 'tenantId', description: 'Tenant ID', schema: z.string() },
      { name: 'company', description: 'Company name', schema: z.string() },
    ],
    execute: getProspectsByCompanyHandler,
  },
  {
    name: 'score_prospect',
    description: 'Score a prospect based on fit and intent',
    parameters: [
      { name: 'profileId', description: 'Profile ID', schema: z.string() },
      { name: 'companyScore', description: 'Company fit score 0-100 (optional)', schema: z.number().min(0).max(100).optional() },
      { name: 'intentScore', description: 'Intent score 0-100 (optional)', schema: z.number().min(0).max(100).optional() },
      { name: 'engagementScore', description: 'Engagement score 0-100 (optional)', schema: z.number().min(0).max(100).optional() },
    ],
    execute: scoreProspectHandler,
  },
  {
    name: 'get_research_report',
    description: 'Get a research report by ID',
    parameters: [{ name: 'reportId', description: 'Report ID', schema: z.string() }],
    execute: getResearchReportHandler,
  },
  {
    name: 'find_prospect',
    description: 'Find a prospect by email',
    parameters: [
      { name: 'tenantId', description: 'Tenant ID', schema: z.string() },
      { name: 'email', description: 'Prospect email', schema: z.string().email() },
    ],
    execute: findProspectHandler,
  },
];

export { ResearchStore, researchStore };
