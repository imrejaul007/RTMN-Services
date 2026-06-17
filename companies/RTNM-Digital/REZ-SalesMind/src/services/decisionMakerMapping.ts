/**
 * Decision Maker Mapping Service
 * Maps organizational hierarchy including:
 * - CEO, CTO, CIO, Marketing Head, Procurement, Finance, Security
 * - Reporting structure
 * - Influence scores
 * - Decision hierarchy
 * - Buying committee members
 *
 * Route: GET /api/ecosystem/decision-makers/:company
 */
import axios from 'axios';

export interface DecisionMakerMap {
    company: string;
    orgChart: OrgNode[];
    buyingCommittee: BuyingCommitteeMember[];
    decisionHierarchy: DecisionNode[];
    keyContacts: KeyContact[];
    influenceNetwork: InfluenceLink[];
    lastUpdated: string;
}

export interface OrgNode {
    name: string;
    title: string;
    department: string;
    level: number;
    reportsTo: string | null;
    children: string[];
    email: string;
    phone: string;
    linkedIn: string;
    influence: number;
    accessibility: 'easy' | 'moderate' | 'difficult';
}

export interface BuyingCommitteeMember {
    name: string;
    title: string;
    role: 'champion' | 'decision_maker' | 'influencer' | 'user' | 'technical' | 'financial';
    department: string;
    influence: number;
    painPoints: string[];
    successCriteria: string[];
    communicationStyle: 'analytical' | 'relationship' | 'technical' | 'executive';
    lastContacted: string | null;
    notes: string;
}

export interface DecisionNode {
    level: number;
    role: string;
    name: string | null;
    approvalRequired: boolean;
    typicalTimeline: string;
    concerns: string[];
}

export interface KeyContact {
    name: string;
    title: string;
    bestApproach: string;
    priorRelationship: string;
    linkedIn: string;
    mutualConnections: string[];
}

export interface InfluenceLink {
    from: string;
    to: string;
    type: 'reports_to' | 'influences' | 'partners_with';
    strength: 'strong' | 'moderate' | 'weak';
}

export class DecisionMakerMappingService {
    private hojaiClient = axios.create({
        baseURL: process.env.HOJAI_LEAD_SERVICE || 'http://localhost:4752',
        timeout: 5000
    });

    /**
     * Get complete decision maker map for a company
     */
    async getDecisionMakerMap(companyName: string): Promise<DecisionMakerMap> {
        // Try external service first
        try {
            const response = await this.hojaiClient.get('/decision-makers', {
                params: { company: companyName }
            });
            if (response.data) return response.data;
        } catch {
            // Fall through to mock data
        }

        return this.getMockDecisionMakerMap(companyName);
    }

    /**
     * Get buying committee for a specific deal/initiative
     */
    async getBuyingCommittee(companyName: string, dealType?: string): Promise<BuyingCommitteeMember[]> {
        const map = await this.getDecisionMakerMap(companyName);

        if (dealType) {
            return map.buyingCommittee.filter(member => {
                switch (dealType.toLowerCase()) {
                    case 'technology':
                        return ['champion', 'technical', 'decision_maker'].includes(member.role);
                    case 'budget':
                        return ['decision_maker', 'financial'].includes(member.role);
                    default:
                        return true;
                }
            });
        }

        return map.buyingCommittee;
    }

    /**
     * Get recommended outreach sequence based on influence
     */
    async getRecommendedSequence(companyName: string): Promise<OutreachStep[]> {
        const map = await this.getDecisionMakerMap(companyName);

        const sequence: OutreachStep[] = [];
        const sortedByInfluence = [...map.buyingCommittee]
            .sort((a, b) => b.influence - a.influence);

        for (const member of sortedByInfluence) {
            sequence.push({
                order: sequence.length + 1,
                name: member.name,
                title: member.title,
                role: member.role,
                approach: this.getRecommendedApproach(member),
                channel: this.getBestChannel(member),
                messageType: this.getMessageType(member),
                timing: this.getTiming(member)
            });
        }

        return sequence;
    }

    /**
     * Get key influencer for a specific topic
     */
    async getInfluencerForTopic(companyName: string, topic: string): Promise<BuyingCommitteeMember | null> {
        const map = await this.getDecisionMakerMap(companyName);

        const topicLower = topic.toLowerCase();
        const topicExperts: Record<string, string[]> = {
            'technology': ['technical', 'decision_maker'],
            'budget': ['financial', 'decision_maker'],
            'security': ['technical'],
            'implementation': ['champion', 'user'],
            'strategy': ['decision_maker', 'champion'],
            'operations': ['champion', 'influencer']
        };

        const relevantRoles = topicExperts[topicLower] || ['influencer', 'champion'];

        return map.buyingCommittee.find(member =>
            relevantRoles.includes(member.role) && member.influence >= 7
        ) || null;
    }

    /**
     * Get organizational influence map
     */
    async getInfluenceNetwork(companyName: string): Promise<InfluenceLink[]> {
        const map = await this.getDecisionMakerMap(companyName);
        return map.influenceNetwork;
    }

    private getRecommendedApproach(member: BuyingCommitteeMember): string {
        switch (member.communicationStyle) {
            case 'analytical':
                return 'Provide data-driven insights, ROI calculations, and detailed case studies';
            case 'relationship':
                return 'Focus on building rapport, industry trends, and peer success stories';
            case 'technical':
                return 'Share technical architecture details, security specs, and integration capabilities';
            case 'executive':
                return 'Lead with business outcomes, strategic value, and competitive positioning';
            default:
                return 'Provide comprehensive solution overview with clear business value';
        }
    }

    private getBestChannel(member: BuyingCommitteeMember): string {
        switch (member.role) {
            case 'champion':
                return 'Email + LinkedIn';
            case 'decision_maker':
                return 'Direct call + Executive briefing';
            case 'technical':
                return 'Technical deep-dive + POC';
            case 'financial':
                return 'ROI analysis + Business case';
            default:
                return 'Email + Meeting request';
        }
    }

    private getMessageType(member: BuyingCommitteeMember): string {
        switch (member.role) {
            case 'champion':
                return 'Value proposition + Success criteria alignment';
            case 'decision_maker':
                return 'Executive summary + Strategic benefits';
            case 'technical':
                return 'Technical capabilities + Integration roadmap';
            case 'financial':
                return 'ROI calculator + Total cost of ownership';
            default:
                return 'General solution overview';
        }
    }

    private getTiming(member: BuyingCommitteeMember): string {
        switch (member.role) {
            case 'champion':
                return 'Week 1 - Initial contact';
            case 'technical':
                return 'Week 2 - Technical evaluation';
            case 'financial':
                return 'Week 3 - Business case';
            case 'decision_maker':
                return 'Week 4 - Final presentation';
            default:
                return 'Week 2-3 - Stakeholder engagement';
        }
    }

    private getMockDecisionMakerMap(companyName: string): DecisionMakerMap {
        return {
            company: companyName,
            orgChart: [
                {
                    name: 'Sarah Chen',
                    title: 'Chief Executive Officer',
                    department: 'Executive',
                    level: 1,
                    reportsTo: null,
                    children: ['Michael Roberts', 'Jennifer Martinez', 'Lisa Thompson', 'Robert Wilson'],
                    email: 'schen@company.com',
                    phone: '+1-415-555-0100',
                    linkedIn: 'linkedin.com/in/sarahchen-ceo',
                    influence: 10,
                    accessibility: 'difficult'
                },
                {
                    name: 'Michael Roberts',
                    title: 'Chief Technology Officer',
                    department: 'Engineering',
                    level: 2,
                    reportsTo: 'Sarah Chen',
                    children: ['Alex Johnson', 'Maria Garcia'],
                    email: 'mroberts@company.com',
                    phone: '+1-415-555-0101',
                    linkedIn: 'linkedin.com/in/michaelroberts-cto',
                    influence: 9,
                    accessibility: 'moderate'
                },
                {
                    name: 'Jennifer Martinez',
                    title: 'Chief Revenue Officer',
                    department: 'Sales',
                    level: 2,
                    reportsTo: 'Sarah Chen',
                    children: ['Tom Anderson', 'Emily Davis'],
                    email: 'jmartinez@company.com',
                    phone: '+1-415-555-0102',
                    linkedIn: 'linkedin.com/in/jennifermartinez-cro',
                    influence: 8,
                    accessibility: 'moderate'
                },
                {
                    name: 'Lisa Thompson',
                    title: 'Chief Financial Officer',
                    department: 'Finance',
                    level: 2,
                    reportsTo: 'Sarah Chen',
                    children: ['Chris Brown'],
                    email: 'lthompson@company.com',
                    phone: '+1-415-555-0103',
                    linkedIn: 'linkedin.com/in/lisathompson-cfo',
                    influence: 9,
                    accessibility: 'difficult'
                },
                {
                    name: 'Robert Wilson',
                    title: 'Chief Information Security Officer',
                    department: 'Security',
                    level: 2,
                    reportsTo: 'Sarah Chen',
                    children: [],
                    email: 'rwilson@company.com',
                    phone: '+1-415-555-0104',
                    linkedIn: 'linkedin.com/in/robertwilson-ciso',
                    influence: 7,
                    accessibility: 'moderate'
                },
                {
                    name: 'David Kim',
                    title: 'VP of Engineering',
                    department: 'Engineering',
                    level: 3,
                    reportsTo: 'Michael Roberts',
                    children: [],
                    email: 'dkim@company.com',
                    phone: '+1-415-555-0105',
                    linkedIn: 'linkedin.com/in/davidkim-vpe',
                    influence: 6,
                    accessibility: 'easy'
                },
                {
                    name: 'Emily Davis',
                    title: 'VP of Marketing',
                    department: 'Marketing',
                    level: 3,
                    reportsTo: 'Jennifer Martinez',
                    children: [],
                    email: 'edavis@company.com',
                    phone: '+1-415-555-0106',
                    linkedIn: 'linkedin.com/in/emilydavis-vpmarketing',
                    influence: 5,
                    accessibility: 'easy'
                },
                {
                    name: 'Chris Brown',
                    title: 'Director of Procurement',
                    department: 'Finance',
                    level: 3,
                    reportsTo: 'Lisa Thompson',
                    children: [],
                    email: 'cbrown@company.com',
                    phone: '+1-415-555-0107',
                    linkedIn: 'linkedin.com/in/chrisbrown-procurement',
                    influence: 6,
                    accessibility: 'easy'
                }
            ],
            buyingCommittee: [
                {
                    name: 'David Kim',
                    title: 'VP of Engineering',
                    role: 'champion',
                    department: 'Engineering',
                    influence: 8,
                    painPoints: [
                        'Manual deployment processes slowing down releases',
                        'Lack of visibility into system performance',
                        'Integration complexity with existing tools'
                    ],
                    successCriteria: [
                        'Reduced deployment time by 50%',
                        'Real-time monitoring and alerting',
                        'Seamless integration with CI/CD pipeline'
                    ],
                    communicationStyle: 'technical',
                    lastContacted: '2026-06-10',
                    notes: 'Strong advocate for DevOps automation. Recently attended KubeCon.'
                },
                {
                    name: 'Michael Roberts',
                    title: 'CTO',
                    role: 'decision_maker',
                    department: 'Engineering',
                    influence: 9,
                    painPoints: [
                        'Technical debt across legacy systems',
                        'Vendor lock-in concerns',
                        'Scaling infrastructure costs'
                    ],
                    successCriteria: [
                        'Cloud-native architecture',
                        'Vendor-agnostic solution',
                        'Predictable cost model'
                    ],
                    communicationStyle: 'analytical',
                    lastContacted: null,
                    notes: 'Former AWS solutions architect. Very data-driven decision maker.'
                },
                {
                    name: 'Lisa Thompson',
                    title: 'CFO',
                    role: 'financial',
                    department: 'Finance',
                    influence: 8,
                    painPoints: [
                        'Unpredictable software costs',
                        'ROI measurement challenges',
                        'Budget allocation constraints'
                    ],
                    successCriteria: [
                        'Clear ROI payback period',
                        'Transparent pricing model',
                        'Alignment with annual budget cycles'
                    ],
                    communicationStyle: 'analytical',
                    lastContacted: null,
                    notes: 'Requires detailed financial modeling. Quarter-end focused.'
                },
                {
                    name: 'Robert Wilson',
                    title: 'CISO',
                    role: 'technical',
                    department: 'Security',
                    influence: 7,
                    painPoints: [
                        'Data security and compliance',
                        'Access control and authentication',
                        'Security audit requirements'
                    ],
                    successCriteria: [
                        'SOC 2 Type II compliance',
                        'Role-based access controls',
                        'Complete audit trail'
                    ],
                    communicationStyle: 'technical',
                    lastContacted: '2026-05-28',
                    notes: 'Previously at a Fortune 500. Very thorough security reviews.'
                },
                {
                    name: 'Jennifer Martinez',
                    title: 'CRO',
                    role: 'influencer',
                    department: 'Sales',
                    influence: 7,
                    painPoints: [
                        'Customer data silos',
                        'Limited visibility into customer health',
                        'Manual reporting processes'
                    ],
                    successCriteria: [
                        'Unified customer view',
                        'Real-time customer metrics',
                        'Automated reporting'
                    ],
                    communicationStyle: 'relationship',
                    lastContacted: null,
                    notes: 'Success-driven mindset. Values peer references.'
                },
                {
                    name: 'Chris Brown',
                    title: 'Director of Procurement',
                    role: 'user',
                    department: 'Finance',
                    influence: 5,
                    painPoints: [
                        'Contract negotiation complexity',
                        'Multiple vendor management',
                        'Purchase approval workflows'
                    ],
                    successCriteria: [
                        'Flexible contract terms',
                        'Volume discounts',
                        'Efficient procurement process'
                    ],
                    communicationStyle: 'analytical',
                    lastContacted: null,
                    notes: 'Process-oriented. Needs clear pricing and terms.'
                }
            ],
            decisionHierarchy: [
                {
                    level: 1,
                    role: 'Executive Sponsor',
                    name: 'Sarah Chen (CEO)',
                    approvalRequired: true,
                    typicalTimeline: 'Final approval',
                    concerns: ['Strategic fit', 'Brand reputation', 'Long-term partnership']
                },
                {
                    level: 2,
                    role: 'Technical Decision Maker',
                    name: 'Michael Roberts (CTO)',
                    approvalRequired: true,
                    typicalTimeline: 'Week 4',
                    concerns: ['Architecture', 'Integration', 'Security']
                },
                {
                    level: 3,
                    role: 'Business Decision Maker',
                    name: 'Lisa Thompson (CFO)',
                    approvalRequired: true,
                    typicalTimeline: 'Week 5',
                    concerns: ['Cost', 'ROI', 'Budget']
                },
                {
                    level: 4,
                    role: 'Technical Evaluator',
                    name: 'David Kim (VP Eng)',
                    approvalRequired: false,
                    typicalTimeline: 'Week 2-3',
                    concerns: ['Implementation', 'Performance', 'Support']
                },
                {
                    level: 5,
                    role: 'Security Reviewer',
                    name: 'Robert Wilson (CISO)',
                    approvalRequired: true,
                    typicalTimeline: 'Week 3-4',
                    concerns: ['Compliance', 'Data protection', 'Access control']
                }
            ],
            keyContacts: [
                {
                    name: 'David Kim',
                    title: 'VP of Engineering',
                    bestApproach: 'Technical deep-dive + POC demonstration',
                    priorRelationship: 'Met at TechCrunch Disrupt 2025',
                    linkedIn: 'linkedin.com/in/davidkim-vpe',
                    mutualConnections: ['Former colleague at AWS']
                },
                {
                    name: 'Emily Davis',
                    title: 'VP of Marketing',
                    bestApproach: 'Industry event networking + case study sharing',
                    priorRelationship: 'Connected on LinkedIn',
                    linkedIn: 'linkedin.com/in/emilydavis-vpmarketing',
                    mutualConnections: ['Shared connection with marketing automation vendor']
                }
            ],
            influenceNetwork: [
                { from: 'Sarah Chen', to: 'Michael Roberts', type: 'reports_to', strength: 'strong' },
                { from: 'Sarah Chen', to: 'Jennifer Martinez', type: 'reports_to', strength: 'strong' },
                { from: 'Sarah Chen', to: 'Lisa Thompson', type: 'reports_to', strength: 'strong' },
                { from: 'Michael Roberts', to: 'David Kim', type: 'reports_to', strength: 'strong' },
                { from: 'Jennifer Martinez', to: 'Emily Davis', type: 'reports_to', strength: 'strong' },
                { from: 'Lisa Thompson', to: 'Chris Brown', type: 'reports_to', strength: 'strong' },
                { from: 'David Kim', to: 'Michael Roberts', type: 'influences', strength: 'moderate' },
                { from: 'Robert Wilson', to: 'Michael Roberts', type: 'influences', strength: 'moderate' },
                { from: 'Jennifer Martinez', to: 'Lisa Thompson', type: 'partners_with', strength: 'moderate' }
            ],
            lastUpdated: new Date().toISOString()
        };
    }
}

interface OutreachStep {
    order: number;
    name: string;
    title: string;
    role: string;
    approach: string;
    channel: string;
    messageType: string;
    timing: string;
}

export const decisionMakerMappingService = new DecisionMakerMappingService();
