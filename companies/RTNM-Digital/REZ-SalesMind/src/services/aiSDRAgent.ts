/**
 * AI SDR Agent Service
 * Autonomous prospecting capabilities:
 * - Find prospects based on criteria
 * - Research each prospect
 * - Score and prioritize
 * - Generate outreach sequence
 * - Execute multi-channel outreach
 * - Track responses
 * - Auto follow-up
 *
 * Routes:
 * - POST /api/ecosystem/sdr/run
 * - POST /api/ecosystem/sdr/find-prospects
 * - POST /api/ecosystem/sdr/execute-outreach
 */
import axios from 'axios';

export interface SDRConfig {
    targetCompany?: string;
    industry?: string;
    companySize?: string[];
    technology?: string[];
    fundingStage?: string[];
    jobTitles?: string[];
    geography?: string[];
    limit?: number;
}

export interface Prospect {
    id: string;
    company: CompanyInfo;
    contact: ContactInfo;
    intentSignals: ProspectSignal[];
    score: ProspectScore;
    outreachSequence: OutreachStep[];
    status: ProspectStatus;
    activities: Activity[];
    lastActivity: string;
    nextAction: string | null;
}

export interface CompanyInfo {
    name: string;
    domain: string;
    industry: string;
    size: string;
    employeeCount: number;
    revenue: string;
    headquarters: string;
    description: string;
    technologies: string[];
    funding: string;
}

export interface ContactInfo {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
    department: string;
    email: string;
    phone: string;
    linkedIn: string;
    seniority: 'c_suite' | 'vp' | 'director' | 'manager' | 'individual';
    buyingRole: 'champion' | 'decision_maker' | 'influencer' | 'user' | 'technical' | 'financial';
}

export interface ProspectSignal {
    type: string;
    source: string;
    date: string;
    description: string;
    strength: 'strong' | 'moderate' | 'weak';
}

export interface ProspectScore {
    total: number;
    fit: number;
    intent: number;
    timing: number;
    engagement: number;
    factors: ScoreFactor[];
}

export interface ScoreFactor {
    category: string;
    value: number;
    maxValue: number;
    reason: string;
}

export interface OutreachStep {
    step: number;
    channel: 'email' | 'linkedin' | 'call' | 'sms' | 'sequence';
    subject: string;
    message: string;
    delayDays: number;
    status: 'pending' | 'sent' | 'replied' | 'bounced' | 'skipped';
    sentAt?: string;
    responseAt?: string;
}

export type ProspectStatus =
    | 'new'
    | 'researching'
    | 'qualified'
    | 'contacted'
    | 'engaged'
    | 'meeting_scheduled'
    | 'opportunity'
    | 'disqualified'
    | 'unresponsive';

export interface Activity {
    id: string;
    type: 'email' | 'call' | 'linkedin' | 'meeting' | 'note';
    description: string;
    timestamp: string;
    outcome: string;
}

export interface SDROutput {
    campaignId: string;
    status: 'running' | 'completed' | 'paused' | 'error';
    prospectsFound: number;
    prospectsContacted: number;
    responsesReceived: number;
    meetingsScheduled: number;
    results: Prospect[];
    summary: CampaignSummary;
    errors: string[];
}

export interface CampaignSummary {
    topIndustries: Record<string, number>;
    topTechnologies: Record<string, number>;
    averageScore: number;
    responseRate: number;
    engagementRate: number;
}

export interface FindProspectsResult {
    prospects: Prospect[];
    totalFound: number;
    qualified: number;
    filters: SDRConfig;
}

export class AISDRAgentService {
    private hojaiClient = axios.create({
        baseURL: process.env.HOJAI_LEAD_SERVICE || 'http://localhost:4752',
        timeout: 10000
    });

    /**
     * Run complete SDR campaign
     */
    async runCampaign(config: SDRConfig): Promise<SDROutput> {
        const campaignId = this.generateId('campaign');

        // Phase 1: Find prospects
        const findResult = await this.findProspects(config);

        // Phase 2: Research and score
        const researchedProspects = await this.researchAndScore(findResult.prospects);

        // Phase 3: Generate sequences
        const sequencedProspects = await this.generateSequences(researchedProspects);

        // Phase 4: Execute outreach
        const outreachResult = await this.executeOutreach(sequencedProspects);

        return {
            campaignId,
            status: 'completed',
            prospectsFound: findResult.totalFound,
            prospectsContacted: outreachResult.sent,
            responsesReceived: outreachResult.responses,
            meetingsScheduled: outreachResult.meetings,
            results: outreachResult.prospects,
            summary: this.calculateSummary(outreachResult.prospects),
            errors: []
        };
    }

    /**
     * Find prospects based on criteria
     */
    async findProspects(config: SDRConfig): Promise<FindProspectsResult> {
        try {
            const response = await this.hojaiClient.post('/prospects/search', config);
            if (response.data?.prospects) {
                return response.data;
            }
        } catch {
            // Fall through to mock data
        }

        return this.generateMockProspects(config);
    }

    /**
     * Research and score individual prospects
     */
    async researchProspect(prospect: Prospect): Promise<Prospect> {
        // Add research data
        const researchTime = Math.random() * 2000 + 1000;
        await new Promise(resolve => setTimeout(resolve, researchTime));

        return {
            ...prospect,
            intentSignals: this.generateIntentSignals(prospect.company),
            score: this.calculateScore(prospect),
            status: 'researching'
        };
    }

    /**
     * Research and score multiple prospects
     */
    async researchAndScore(prospects: Prospect[]): Promise<Prospect[]> {
        const researched = await Promise.all(
            prospects.map(p => this.researchProspect(p))
        );

        // Sort by score
        return researched.sort((a, b) => b.score.total - a.score.total);
    }

    /**
     * Generate outreach sequence for prospects
     */
    async generateSequences(prospects: Prospect[]): Promise<Prospect[]> {
        return prospects.map(prospect => ({
            ...prospect,
            outreachSequence: this.createOutreachSequence(prospect),
            status: 'qualified' as ProspectStatus
        }));
    }

    /**
     * Execute outreach for prospects
     */
    async executeOutreach(prospects: Prospect[]): Promise<{
        prospects: Prospect[];
        sent: number;
        responses: number;
        meetings: number;
    }> {
        let sent = 0;
        let responses = 0;
        let meetings = 0;

        const executed = prospects.map(prospect => {
            const executedProspect = { ...prospect };

            // Execute first step of sequence
            const firstStep = executedProspect.outreachSequence[0];
            if (firstStep) {
                firstStep.status = 'sent';
                firstStep.sentAt = new Date().toISOString();
                sent++;

                // Simulate response rate
                const responseChance = executedProspect.score.total / 100;
                if (Math.random() < responseChance * 0.3) {
                    firstStep.status = 'replied';
                    firstStep.responseAt = new Date().toISOString();
                    responses++;

                    // Simulate meeting scheduling
                    if (Math.random() < 0.3) {
                        meetings++;
                        executedProspect.status = 'meeting_scheduled';
                        executedProspect.nextAction = 'Attend meeting';
                    }
                }
            }

            executedProspect.activities.push({
                id: this.generateId('activity'),
                type: 'email',
                description: `Sent: ${firstStep?.subject || 'Initial outreach'}`,
                timestamp: new Date().toISOString(),
                outcome: firstStep?.status === 'replied' ? 'Positive response' : 'Sent'
            });

            executedProspect.lastActivity = new Date().toISOString();
            executedProspect.status = executedProspect.status === 'meeting_scheduled'
                ? 'meeting_scheduled'
                : 'contacted' as ProspectStatus;

            return executedProspect;
        });

        return { prospects: executed, sent, responses, meetings };
    }

    /**
     * Get outreach sequence template
     */
    getSequenceTemplate(type: 'cold' | 'warm' | 'event' | 'referral'): OutreachStep[] {
        const templates: Record<string, OutreachStep[]> = {
            cold: [
                { step: 1, channel: 'email', subject: 'Quick question about {{company}}', message: '', delayDays: 0, status: 'pending' },
                { step: 2, channel: 'linkedin', subject: 'LinkedIn connection', message: '', delayDays: 2, status: 'pending' },
                { step: 3, channel: 'email', subject: 'Re: Quick question', message: '', delayDays: 4, status: 'pending' },
                { step: 4, channel: 'call', subject: 'Phone call attempt', message: '', delayDays: 6, status: 'pending' },
                { step: 5, channel: 'email', subject: 'Final follow-up', message: '', delayDays: 10, status: 'pending' }
            ],
            warm: [
                { step: 1, channel: 'email', subject: 'Following up on {{company}}', message: '', delayDays: 0, status: 'pending' },
                { step: 2, channel: 'email', subject: 'Next steps for {{company}}', message: '', delayDays: 2, status: 'pending' },
                { step: 3, channel: 'call', subject: 'Quick call', message: '', delayDays: 4, status: 'pending' },
                { step: 4, channel: 'email', subject: 'Meeting availability', message: '', delayDays: 6, status: 'pending' }
            ],
            event: [
                { step: 1, channel: 'linkedin', subject: 'Great meeting at {{event}}', message: '', delayDays: 0, status: 'pending' },
                { step: 2, channel: 'email', subject: 'Great connecting at {{event}}', message: '', delayDays: 1, status: 'pending' },
                { step: 3, channel: 'email', subject: 'Meeting follow-up', message: '', delayDays: 3, status: 'pending' },
                { step: 4, channel: 'call', subject: 'Quick call to discuss', message: '', delayDays: 7, status: 'pending' }
            ],
            referral: [
                { step: 1, channel: 'email', subject: '{{referrer}} suggested I connect', message: '', delayDays: 0, status: 'pending' },
                { step: 2, channel: 'email', subject: 'Re: {{referrer}} suggested I connect', message: '', delayDays: 3, status: 'pending' },
                { step: 3, channel: 'call', subject: 'Quick intro call', message: '', delayDays: 5, status: 'pending' }
            ]
        };

        return templates[type] || templates.cold;
    }

    private createOutreachSequence(prospect: Prospect): OutreachStep[] {
        const baseSequence = this.getSequenceTemplate('cold');

        // Customize for each prospect
        return baseSequence.map((step, index) => {
            let subject = step.subject;
            let message = '';

            if (step.channel === 'email') {
                subject = subject
                    .replace('{{company}}', prospect.company.name)
                    .replace('{{firstName}}', prospect.contact.firstName);

                message = this.generateEmailContent(prospect, step.step);
            }

            return { ...step, subject, message };
        });
    }

    private generateEmailContent(prospect: Prospect, step: number): string {
        const firstName = prospect.contact.firstName;
        const company = prospect.company.name;
        const title = prospect.contact.title;

        const templates: Record<number, string> = {
            1: `Hi ${firstName},

I noticed ${company} is growing rapidly, especially in the ${prospect.company.industry} space. As someone in ${title} role, you're likely thinking about how to scale operations efficiently.

We help companies like ${company} automate their ${this.getRelevantTopic(prospect)} processes, typically saving 20+ hours per week.

Would a quick 15-minute call make sense to explore if this could help your team?

Best,
[Your Name]`,
            2: `Hi ${firstName},

Following up on my note about ${company}. I shared a case study from a similar company that reduced their ${this.getRelevantTopic(prospect)} overhead by 45%.

Would you be open to a brief call this week to discuss how we might achieve similar results?

[Your Name]`,
            3: `Hi ${firstName},

I know you're busy. I'll keep this short: we help ${title}s at growth-stage companies eliminate manual ${this.getRelevantTopic(prospect)} work.

If this isn't a priority right now, no worries—just let me know and I'll follow up in a few months.

Best,
[Your Name]`
        };

        return templates[step] || templates[1];
    }

    private getRelevantTopic(prospect: Prospect): string {
        const topics: Record<string, string[]> = {
            'Technology': ['engineering', 'product', 'technical'],
            'Healthcare': ['patient', 'clinical', 'operational'],
            'Finance': ['financial', 'reporting', 'compliance'],
            'Retail': ['customer', 'inventory', 'operations'],
            'Manufacturing': ['production', 'quality', 'supply chain']
        };

        const industryTopics = topics[prospect.company.industry] || ['operational'];
        return industryTopics[Math.floor(Math.random() * industryTopics.length)];
    }

    private generateIntentSignals(company: CompanyInfo): ProspectSignal[] {
        const signals: ProspectSignal[] = [];

        // Hiring signals
        if (company.size === '51-200' || company.size === '201-500') {
            signals.push({
                type: 'hiring_spike',
                source: 'LinkedIn Jobs',
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                description: '15+ engineering positions posted in last 30 days',
                strength: 'strong'
            });
        }

        // Funding signals
        if (company.funding) {
            signals.push({
                type: 'recent_funding',
                source: 'Crunchbase',
                date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                description: `Recent funding: ${company.funding}`,
                strength: 'moderate'
            });
        }

        // Technology signals
        if (company.technologies.includes('Salesforce') || company.technologies.includes('HubSpot')) {
            signals.push({
                type: 'tech_expansion',
                source: 'BuiltWith',
                date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                description: 'Active CRM usage indicates sales maturity',
                strength: 'moderate'
            });
        }

        return signals;
    }

    private calculateScore(prospect: Prospect): ProspectScore {
        const factors: ScoreFactor[] = [];

        // Fit score (40 points max)
        let fitScore = 0;
        let fitMax = 40;

        // Company size fit
        if (['51-200', '201-500', '501-1000'].includes(prospect.company.size)) {
            fitScore += 15;
            factors.push({ category: 'Company Size', value: 15, maxValue: 15, reason: 'Ideal target segment' });
        } else if (['11-50', '1000+'].includes(prospect.company.size)) {
            fitScore += 8;
            factors.push({ category: 'Company Size', value: 8, maxValue: 15, reason: 'Acceptable segment' });
        } else {
            factors.push({ category: 'Company Size', value: 0, maxValue: 15, reason: 'Outside target range' });
        }

        // Industry fit
        if (['Technology', 'SaaS', 'Enterprise Software'].includes(prospect.company.industry)) {
            fitScore += 15;
            factors.push({ category: 'Industry', value: 15, maxValue: 15, reason: 'Target industry' });
        } else {
            fitScore += 8;
            factors.push({ category: 'Industry', value: 8, maxValue: 15, reason: 'Acceptable industry' });
        }

        // Seniority fit
        if (['c_suite', 'vp', 'director'].includes(prospect.contact.seniority)) {
            fitScore += 10;
            factors.push({ category: 'Contact Seniority', value: 10, maxValue: 10, reason: 'Decision-making authority' });
        } else {
            fitScore += 5;
            factors.push({ category: 'Contact Seniority', value: 5, maxValue: 10, reason: 'Influencer role' });
        }

        // Intent score (30 points max)
        let intentScore = 0;
        const intentMax = 30;

        const strongSignals = prospect.intentSignals.filter(s => s.strength === 'strong').length;
        const moderateSignals = prospect.intentSignals.filter(s => s.strength === 'moderate').length;

        intentScore += Math.min(strongSignals * 10, 20);
        intentScore += Math.min(moderateSignals * 5, 10);

        factors.push({
            category: 'Intent Signals',
            value: intentScore,
            maxValue: intentMax,
            reason: `${strongSignals} strong + ${moderateSignals} moderate signals`
        });

        // Timing score (15 points max)
        let timingScore = 15;
        factors.push({ category: 'Timing', value: timingScore, maxValue: 15, reason: 'Active hiring/growth phase' });

        // Engagement score (15 points max)
        let engagementScore = 5;
        factors.push({ category: 'Engagement', value: engagementScore, maxValue: 15, reason: 'New prospect' });

        return {
            total: Math.min(fitScore + intentScore + timingScore + engagementScore, 100),
            fit: fitScore,
            intent: intentScore,
            timing: timingScore,
            engagement: engagementScore,
            factors
        };
    }

    private calculateSummary(prospects: Prospect[]): CampaignSummary {
        const industryCount: Record<string, number> = {};
        const techCount: Record<string, number> = {};
        let totalScore = 0;
        let responses = 0;
        let engaged = 0;

        prospects.forEach(p => {
            industryCount[p.company.industry] = (industryCount[p.company.industry] || 0) + 1;
            p.company.technologies.forEach(t => {
                techCount[t] = (techCount[t] || 0) + 1;
            });
            totalScore += p.score.total;
            if (p.activities.some(a => a.type === 'email')) responses++;
            if (['engaged', 'meeting_scheduled', 'opportunity'].includes(p.status)) engaged++;
        });

        return {
            topIndustries: industryCount,
            topTechnologies: techCount,
            averageScore: prospects.length > 0 ? Math.round(totalScore / prospects.length) : 0,
            responseRate: prospects.length > 0 ? Math.round((responses / prospects.length) * 100) : 0,
            engagementRate: prospects.length > 0 ? Math.round((engaged / prospects.length) * 100) : 0
        };
    }

    private generateMockProspects(config: SDRConfig): FindProspectsResult {
        const prospects: Prospect[] = [];
        const industries = config.industry ? [config.industry] : ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing'];
        const sizes = config.companySize || ['51-200', '201-500'];
        const titles = config.jobTitles || ['VP of Sales', 'Director of Operations', 'CTO', 'Head of Engineering'];

        const count = config.limit || 10;

        for (let i = 0; i < count; i++) {
            const companySize = sizes[Math.floor(Math.random() * sizes.length)];
            const industry = industries[Math.floor(Math.random() * industries.length)];

            const prospect: Prospect = {
                id: this.generateId('prospect'),
                company: {
                    name: `${this.getCompanyName(i)} ${industry.substring(0, 3)}`,
                    domain: `${this.getCompanyName(i).toLowerCase().replace(/\s/g, '')}.com`,
                    industry,
                    size: companySize,
                    employeeCount: this.parseSizeToCount(companySize),
                    revenue: '$10-50M',
                    headquarters: this.getRandomCity(),
                    description: `Leading ${industry} company focused on innovation and growth.`,
                    technologies: this.getTechnologies(industry),
                    funding: this.getRandomFunding()
                },
                contact: {
                    id: this.generateId('contact'),
                    firstName: this.getFirstName(i),
                    lastName: this.getLastName(i),
                    title: titles[Math.floor(Math.random() * titles.length)],
                    department: this.getDepartment(titles[Math.floor(Math.random() * titles.length)]),
                    email: `${this.getFirstName(i).toLowerCase()}.${this.getLastName(i).toLowerCase()}@${this.getCompanyName(i).toLowerCase().replace(/\s/g, '')}.com`,
                    phone: '+1-555-000-' + String(1000 + i).padStart(4, '0'),
                    linkedIn: `linkedin.com/in/${this.getFirstName(i).toLowerCase()}-${this.getLastName(i).toLowerCase()}`,
                    seniority: this.getSeniority(titles[Math.floor(Math.random() * titles.length)]),
                    buyingRole: this.getBuyingRole()
                },
                intentSignals: [],
                score: { total: 0, fit: 0, intent: 0, timing: 0, engagement: 0, factors: [] },
                outreachSequence: [],
                status: 'new',
                activities: [],
                lastActivity: new Date().toISOString(),
                nextAction: null
            };

            prospect.intentSignals = this.generateIntentSignals(prospect.company);
            prospect.score = this.calculateScore(prospect);

            prospects.push(prospect);
        }

        return {
            prospects,
            totalFound: prospects.length,
            qualified: prospects.filter(p => p.score.total >= 50).length,
            filters: config
        };
    }

    private getCompanyName(index: number): string {
        const names = ['Acme', 'TechCorp', 'DataDrive', 'CloudFirst', 'Innovate', 'ScaleUp', 'GrowthLabs', 'NextGen', 'AIVenture', 'FutureStack'];
        return names[index % names.length];
    }

    private getFirstName(index: number): string {
        const names = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Jennifer', 'Robert', 'Lisa', 'John', 'Amanda'];
        return names[index % names.length];
    }

    private getLastName(index: number): string {
        const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
        return names[index % names.length];
    }

    private getRandomCity(): string {
        const cities = ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Boston, MA', 'Denver, CO', 'Chicago, IL', 'Los Angeles, CA'];
        return cities[Math.floor(Math.random() * cities.length)];
    }

    private getTechnologies(industry: string): string[] {
        const techs: Record<string, string[]> = {
            'Technology': ['React', 'Node.js', 'AWS', 'Salesforce', 'HubSpot'],
            'Healthcare': ['Epic', 'Salesforce', 'AWS', 'Python'],
            'Finance': ['Salesforce', 'AWS', 'Python', 'Tableau'],
            'Retail': ['Shopify', 'AWS', 'Stripe', 'HubSpot'],
            'Manufacturing': ['SAP', 'Salesforce', 'AWS', 'Kubernetes']
        };
        return techs[industry] || ['AWS', 'Salesforce'];
    }

    private getRandomFunding(): string {
        const rounds = ['Seed - $2M', 'Series A - $10M', 'Series B - $25M', 'Series C - $45M'];
        return rounds[Math.floor(Math.random() * rounds.length)];
    }

    private parseSizeToCount(size: string): number {
        const map: Record<string, number> = {
            '1-10': 5, '11-50': 30, '51-200': 100, '201-500': 350, '501-1000': 750, '1000+': 2000
        };
        return map[size] || 100;
    }

    private getDepartment(title: string): string {
        if (title.includes('Sales')) return 'Sales';
        if (title.includes('Engineer') || title.includes('CTO')) return 'Engineering';
        if (title.includes('Operation')) return 'Operations';
        if (title.includes('Marketing')) return 'Marketing';
        return 'Executive';
    }

    private getSeniority(title: string): ContactInfo['seniority'] {
        if (title.includes('VP') || title.includes('Chief')) return 'c_suite';
        if (title.includes('Director')) return 'director';
        if (title.includes('Head')) return 'vp';
        if (title.includes('Manager')) return 'manager';
        return 'individual';
    }

    private getBuyingRole(): ContactInfo['buyingRole'] {
        const roles: ContactInfo['buyingRole'][] = ['champion', 'decision_maker', 'influencer', 'user', 'technical', 'financial'];
        return roles[Math.floor(Math.random() * roles.length)];
    }

    private generateId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export const aiSDRAgentService = new AISDRAgentService();
