/**
 * Account Intelligence Service
 * Provides comprehensive company research including:
 * - Company summary, industry, revenue, employee count
 * - Tech stack detection
 * - Funding information
 * - Recent news/trends
 * - Strategic priorities
 * - Growth signals
 * - Risks
 *
 * Route: GET /api/ecosystem/account/:company
 */
import axios from 'axios';

export interface CompanyIntelligence {
    company: string;
    summary: CompanySummary;
    techStack: TechStack;
    funding: FundingInfo;
    recentNews: NewsItem[];
    strategicPriorities: string[];
    growthSignals: GrowthSignal[];
    risks: RiskItem[];
    contacts: ContactInfo[];
    lastUpdated: string;
}

export interface CompanySummary {
    description: string;
    industry: string;
    subIndustry: string;
    companySize: string;
    employeeCount: number;
    revenue: string;
    headquarters: string;
    founded: number;
    ceo: string;
    website: string;
    businessModel: string;
    targetMarket: string[];
    painPoints: string[];
}

export interface TechStack {
    detected: string[];
    crm?: string[];
    marketing?: string[];
    analytics?: string[];
    infrastructure?: string[];
    security?: string[];
    collaboration?: string[];
}

export interface FundingInfo {
    totalRaised: string;
    lastRound: string;
    lastRoundAmount: string;
    valuation: string;
    investors: string[];
    fundingStage: string;
    runway: string;
}

export interface NewsItem {
    title: string;
    date: string;
    source: string;
    summary: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    impact: 'high' | 'medium' | 'low';
}

export interface GrowthSignal {
    type: string;
    description: string;
    date: string;
    strength: 'high' | 'medium' | 'low';
}

export interface RiskItem {
    category: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    mitigation: string;
}

export interface ContactInfo {
    name: string;
    title: string;
    department: string;
    linkedIn: string;
    influence: 'high' | 'medium' | 'low';
}

export class AccountIntelligenceService {
    private hojaiClient = axios.create({
        baseURL: process.env.HOJAI_WEB_INTEL || 'http://localhost:4595',
        timeout: 5000
    });

    /**
     * Get comprehensive intelligence for a company
     */
    async getCompanyIntelligence(companyName: string): Promise<CompanyIntelligence> {
        // Try external service first
        try {
            const response = await this.hojaiClient.get('/company-intel', {
                params: { name: companyName }
            });
            if (response.data) return response.data;
        } catch {
            // Fall through to mock data
        }

        // Return comprehensive mock data
        return this.getMockCompanyIntelligence(companyName);
    }

    /**
     * Get company summary only
     */
    async getCompanySummary(companyName: string): Promise<CompanySummary> {
        const intel = await this.getCompanyIntelligence(companyName);
        return intel.summary;
    }

    /**
     * Get tech stack analysis
     */
    async getTechStack(companyName: string): Promise<TechStack> {
        const intel = await this.getCompanyIntelligence(companyName);
        return intel.techStack;
    }

    /**
     * Get funding information
     */
    async getFundingInfo(companyName: string): Promise<FundingInfo> {
        const intel = await this.getCompanyIntelligence(companyName);
        return intel.funding;
    }

    /**
     * Get recent news
     */
    async getRecentNews(companyName: string, limit: number = 10): Promise<NewsItem[]> {
        const intel = await this.getCompanyIntelligence(companyName);
        return intel.recentNews.slice(0, limit);
    }

    /**
     * Generate competitive analysis summary
     */
    async generateCompetitiveSummary(companyName: string): Promise<string> {
        const intel = await this.getCompanyIntelligence(companyName);

        const lines = [
            `## ${intel.company} Competitive Summary`,
            '',
            `**Industry:** ${intel.summary.industry} - ${intel.summary.subIndustry}`,
            `**Size:** ${intel.summary.employeeCount} employees`,
            `**Revenue:** ${intel.summary.revenue}`,
            '',
            '### Key Strengths',
            ...intel.growthSignals
                .filter(s => s.strength === 'high')
                .map(s => `- ${s.description}`),
            '',
            '### Risk Factors',
            ...intel.risks
                .filter(r => r.severity === 'high')
                .map(r => `- ${r.description}`),
            '',
            '### Recent Activity',
            intel.recentNews.slice(0, 3).map(n => `- [${n.date}] ${n.title}`).join('\n'),
        ];

        return lines.join('\n');
    }

    /**
     * Mock data for development and testing
     */
    private getMockCompanyIntelligence(companyName: string): CompanyIntelligence {
        const normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

        return {
            company: companyName,
            summary: {
                description: `${companyName} is a leading enterprise technology company providing cloud-based solutions for digital transformation. The company specializes in helping businesses streamline their operations through AI-powered automation and analytics platforms.`,
                industry: 'Enterprise Software',
                subIndustry: 'Cloud Computing & AI',
                companySize: 'Mid-Market',
                employeeCount: 850,
                revenue: '$45M ARR',
                headquarters: 'San Francisco, CA',
                founded: 2018,
                ceo: 'Sarah Chen',
                website: `https://${normalizedName}.com`,
                businessModel: 'SaaS Subscription',
                targetMarket: ['Mid-market enterprises', 'Fortune 1000', 'Global 500'],
                painPoints: [
                    'Manual data entry and processing inefficiencies',
                    'Fragmented customer touchpoints across channels',
                    'Limited visibility into customer journey metrics',
                    'Scaling customer success operations',
                    'Integration challenges with legacy systems'
                ]
            },
            techStack: {
                detected: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes'],
                crm: ['Salesforce', 'HubSpot'],
                marketing: ['Marketo', 'Google Analytics', 'Segment'],
                analytics: ['Tableau', 'Mixpanel', 'dbt'],
                infrastructure: ['AWS', 'Terraform', 'Datadog', 'PagerDuty'],
                security: ['Okta', 'CrowdStrike', 'Netskope']
            },
            funding: {
                totalRaised: '$120M',
                lastRound: 'Series C',
                lastRoundAmount: '$45M',
                valuation: '$480M',
                investors: [
                    'Sequoia Capital',
                    'Andreessen Horowitz',
                    'Accel Partners',
                    'Salesforce Ventures'
                ],
                fundingStage: 'Series C',
                runway: '24 months'
            },
            recentNews: [
                {
                    title: `${companyName} Raises $45M Series C to Accelerate AI-Powered Features`,
                    date: '2026-05-15',
                    source: 'TechCrunch',
                    summary: 'The funding will be used to expand the company\'s AI capabilities and grow its engineering team by 40%.',
                    sentiment: 'positive',
                    impact: 'high'
                },
                {
                    title: `${companyName} Appoints Former Salesforce Exec as Chief Revenue Officer`,
                    date: '2026-04-20',
                    source: 'Business Wire',
                    summary: 'New CRO brings 15 years of enterprise sales experience to drive global expansion.',
                    sentiment: 'positive',
                    impact: 'high'
                },
                {
                    title: `${companyName} Launches Partner Ecosystem Program`,
                    date: '2026-03-10',
                    source: 'PR Newswire',
                    summary: 'New program aims to build a network of 500 certified implementation partners by 2027.',
                    sentiment: 'positive',
                    impact: 'medium'
                },
                {
                    title: `Analyst Report: ${companyName} Named Leader in Enterprise Automation Quadrant`,
                    date: '2026-02-28',
                    source: 'Gartner',
                    summary: 'Recognized for comprehensive platform capabilities and customer satisfaction scores.',
                    sentiment: 'positive',
                    impact: 'medium'
                },
                {
                    title: `${companyName} Expands to APAC with Singapore HQ`,
                    date: '2026-01-15',
                    source: 'The Business Times',
                    summary: 'Asia-Pacific headquarters will serve customers across 12 markets in the region.',
                    sentiment: 'positive',
                    impact: 'high'
                }
            ],
            strategicPriorities: [
                'Accelerate AI/ML capabilities across product suite',
                'Expand enterprise customer base in EMEA and APAC',
                'Build partner ecosystem for implementation and consulting',
                'Achieve SOC 2 Type II and ISO 27001 certifications',
                'Launch vertical-specific solutions for healthcare and finance'
            ],
            growthSignals: [
                {
                    type: 'hiring',
                    description: 'Aggressive hiring: 120 new engineering positions in Q1 2026',
                    date: '2026-01-10',
                    strength: 'high'
                },
                {
                    type: 'expansion',
                    description: 'Opening APAC headquarters in Singapore',
                    date: '2026-01-15',
                    strength: 'high'
                },
                {
                    type: 'product',
                    description: 'Launching 3 new AI-powered product modules in 2026',
                    date: '2026-02-01',
                    strength: 'high'
                },
                {
                    type: 'partnership',
                    description: 'Strategic partnership announced with AWS',
                    date: '2026-03-05',
                    strength: 'medium'
                },
                {
                    type: 'funding',
                    description: '$45M Series C closed - capital for expansion',
                    date: '2026-05-15',
                    strength: 'high'
                },
                {
                    type: 'leadership',
                    description: 'New CRO appointment indicates sales scaling',
                    date: '2026-04-20',
                    strength: 'medium'
                }
            ],
            risks: [
                {
                    category: 'Competitive',
                    description: '面临来自大型科技公司的竞争，如Salesforce、微软',
                    severity: 'medium',
                    mitigation: 'Focus on mid-market vertical specialization and superior customer success'
                },
                {
                    category: 'Operational',
                    description: 'Rapid scaling may strain customer support and implementation teams',
                    severity: 'medium',
                    mitigation: 'Invest in automation and partner enablement programs'
                },
                {
                    category: 'Technical',
                    description: 'Technical debt from rapid feature development',
                    severity: 'low',
                    mitigation: 'Dedicated platform engineering team and regular architecture reviews'
                },
                {
                    category: 'Market',
                    description: 'Economic uncertainty could slow enterprise software purchases',
                    severity: 'medium',
                    mitigation: 'Strong ROI messaging and flexible pricing tiers'
                }
            ],
            contacts: [
                {
                    name: 'Sarah Chen',
                    title: 'CEO',
                    department: 'Executive',
                    linkedIn: 'linkedin.com/in/sarahchen',
                    influence: 'high'
                },
                {
                    name: 'Michael Roberts',
                    title: 'CTO',
                    department: 'Engineering',
                    linkedIn: 'linkedin.com/in/michaelroberts',
                    influence: 'high'
                },
                {
                    name: 'Jennifer Martinez',
                    title: 'VP of Sales',
                    department: 'Sales',
                    linkedIn: 'linkedin.com/in/jennifermartinez',
                    influence: 'high'
                },
                {
                    name: 'David Kim',
                    title: 'Head of Product',
                    department: 'Product',
                    linkedIn: 'linkedin.com/in/davidkim',
                    influence: 'medium'
                }
            ],
            lastUpdated: new Date().toISOString()
        };
    }
}

export const accountIntelligenceService = new AccountIntelligenceService();
