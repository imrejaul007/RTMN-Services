/**
 * Objection Handler Service
 * Pre-built responses for common objections:
 * - Too expensive
 * - Already using competitor
 * - No budget
 * - No priority
 * - Timing concerns
 * - Security
 * - Integration
 * - ROI questions
 *
 * Routes:
 * - GET /api/ai/objections/:type
 * - GET /api/ai/objections/all
 */
import axios from 'axios';

export type ObjectionType =
    | 'pricing'
    | 'competitor'
    | 'budget'
    | 'priority'
    | 'timing'
    | 'security'
    | 'integration'
    | 'roi'
    | 'authority'
    | 'need'
    | 'trust';

export interface ObjectionResponse {
    id: string;
    type: ObjectionType;
    objection: string;
    response: string;
    framework: string;
    proofPoints: ProofPoint[];
    reframing: string;
    bridgeQuestion: string;
    examples: Example[];
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface ProofPoint {
    type: 'statistic' | 'testimonial' | 'case_study' | 'roi_calculation' | 'comparison';
    content: string;
    source?: string;
}

export interface Example {
    scenario: string;
    response: string;
    outcome: string;
}

export interface ObjectionCategory {
    type: ObjectionType;
    name: string;
    description: string;
    frequency: 'very_common' | 'common' | 'occasional';
}

export class ObjectionHandlerService {
    private hojaiClient = axios.create({
        baseURL: process.env.HOJAI_WEB_INTEL || 'http://localhost:4595',
        timeout: 5000
    });

    /**
     * Get response for a specific objection type
     */
    async getObjectionResponse(type: ObjectionType): Promise<ObjectionResponse> {
        try {
            const response = await this.hojaiClient.get('/objections', {
                params: { type }
            });
            if (response.data) return response.data;
        } catch {
            // Fall through to mock data
        }

        return this.getMockObjectionResponse(type);
    }

    /**
     * Get all objection responses
     */
    async getAllObjectionResponses(): Promise<ObjectionResponse[]> {
        const types: ObjectionType[] = [
            'pricing', 'competitor', 'budget', 'priority', 'timing',
            'security', 'integration', 'roi', 'authority', 'need', 'trust'
        ];

        return Promise.all(types.map(type => this.getObjectionResponse(type)));
    }

    /**
     * Get objection categories with metadata
     */
    async getObjectionCategories(): Promise<ObjectionCategory[]> {
        return [
            { type: 'pricing', name: 'Pricing & Cost', description: 'Concerns about cost, ROI, and budget allocation', frequency: 'very_common' },
            { type: 'competitor', name: 'Competitor Already', description: 'Using or considering a competitor solution', frequency: 'very_common' },
            { type: 'budget', name: 'Budget Constraints', description: 'No current budget or budget frozen', frequency: 'common' },
            { type: 'priority', name: 'Not a Priority', description: 'Other initiatives take precedence', frequency: 'common' },
            { type: 'timing', name: 'Timing Issues', description: 'Bad timing or need to wait', frequency: 'common' },
            { type: 'security', name: 'Security & Compliance', description: 'Security concerns or compliance requirements', frequency: 'occasional' },
            { type: 'integration', name: 'Integration Challenges', description: 'Technical integration with existing systems', frequency: 'common' },
            { type: 'roi', name: 'ROI Questions', description: 'Unclear return on investment', frequency: 'very_common' },
            { type: 'authority', name: 'Authority Issues', description: 'Talking to the wrong person', frequency: 'occasional' },
            { type: 'need', name: 'Need More Urgency', description: 'Don\'t see the problem as urgent', frequency: 'common' },
            { type: 'trust', name: 'Trust & Credibility', description: 'Don\'t trust the vendor or solution', frequency: 'occasional' }
        ];
    }

    /**
     * Get response by objection text (fuzzy match)
     */
    async findMatchingObjection(objectionText: string): Promise<ObjectionResponse | null> {
        const allResponses = await this.getAllObjectionResponses();
        const textLower = objectionText.toLowerCase();

        // Keywords mapping
        const keywordMap: Record<string, ObjectionType> = {
            'expensive': 'pricing',
            'cost': 'pricing',
            'price': 'pricing',
            'money': 'pricing',
            'salesforce': 'competitor',
            'hubspot': 'competitor',
            'competitor': 'competitor',
            'already using': 'competitor',
            'already have': 'competitor',
            'budget': 'budget',
            'no budget': 'budget',
            "don't have budget": 'budget',
            'freeze': 'budget',
            'priority': 'priority',
            'not priority': 'priority',
            'focus elsewhere': 'priority',
            'timing': 'timing',
            'wait': 'timing',
            'later': 'timing',
            'not right now': 'timing',
            'security': 'security',
            'compliance': 'security',
            'gdpr': 'security',
            'hipaa': 'security',
            'soc 2': 'security',
            'integrat': 'integration',
            'connect': 'integration',
            'work with': 'integration',
            'roi': 'roi',
            'return': 'roi',
            'value': 'roi',
            'justify': 'roi',
            'prove': 'roi',
            'authority': 'authority',
            'wrong person': 'authority',
            'decision maker': 'authority',
            'need': 'need',
            "don't need": 'need',
            "won't help": 'need',
            'trust': 'trust',
            'credibility': 'trust',
            'believe': 'trust'
        };

        for (const [keyword, type] of Object.entries(keywordMap)) {
            if (textLower.includes(keyword)) {
                return allResponses.find(r => r.type === type) || null;
            }
        }

        return null;
    }

    /**
     * Generate personalized response based on context
     */
    async generatePersonalizedResponse(
        type: ObjectionType,
        context: {
            companyName?: string;
            industry?: string;
            companySize?: string;
            useCase?: string;
            competitor?: string;
        }
    ): Promise<string> {
        const objection = await this.getObjectionResponse(type);

        let response = objection.response;

        // Customize based on context
        if (context.companyName) {
            response = response.replace('{company}', context.companyName);
        }
        if (context.competitor) {
            response = response.replace('{competitor}', context.competitor);
        }

        // Add relevant proof point
        const proofPoint = objection.proofPoints[0];
        if (proofPoint) {
            response += `\n\nHere's what we've seen: ${proofPoint.content}`;
        }

        return response;
    }

    private getMockObjectionResponse(type: ObjectionType): ObjectionResponse {
        const responses: Record<ObjectionType, ObjectionResponse> = {
            pricing: {
                id: 'pricing-001',
                type: 'pricing',
                objection: 'Too expensive / Can\'t afford it',
                response: 'I understand budget is a real constraint. Let me ask: when you say expensive, compared to what? Often the real question is value, not cost. How much is your current problem costing you? If we can show a 4-month payback, does the investment make sense? We also offer flexible payment options that align with value delivery.',
                framework: 'LAER: Listen, Acknowledge, Explore, Respond',
                proofPoints: [
                    { type: 'statistic', content: 'Average customer sees 320% ROI over 3 years', source: 'Forrester TEI Study' },
                    { type: 'roi_calculation', content: 'Typical 4-month payback period through efficiency gains' },
                    { type: 'testimonial', content: '"Switching cost us less than staying with our old vendor for 6 more months"', source: 'Customer case study' }
                ],
                reframing: 'The question isn\'t whether you can afford it—it\'s whether you can afford to keep the problem.',
                bridgeQuestion: 'What would it be worth to solve this problem if you knew the payback was under 6 months?',
                examples: [
                    { scenario: 'CFO pushback on enterprise pricing', response: 'Share TCO analysis comparing 3-year costs. Show hidden costs of current solution.', outcome: 'Average 40% reduction in price negotiation through value framing' }
                ],
                difficulty: 'medium'
            },
            competitor: {
                id: 'competitor-001',
                type: 'competitor',
                objection: 'Already using a competitor / Happy with current solution',
                response: 'That\'s great—most successful companies have evaluated alternatives. What I\'m curious about: if you were completely satisfied, what would be different? Often when people explore alternatives, there\'s something they wish was better. What\'s prompting the conversation today?',
                framework: ' acknowledge → explore → uncover → educate',
                proofPoints: [
                    { type: 'comparison', content: '92% user adoption vs industry average of 45% after 1 year' },
                    { type: 'statistic', content: '60% lower total cost of ownership over 3 years' },
                    { type: 'testimonial', content: '"We switched from {competitor} and wished we had done it sooner"', source: 'Customer case study' }
                ],
                reframing: 'Being satisfied doesn\'t mean you\'re optimal. There might be a better way to achieve your goals.',
                bridgeQuestion: 'If you could change one thing about your current solution, what would it be?',
                examples: [
                    { scenario: 'Salesforce user claims satisfaction', response: 'Ask about hidden costs, implementation timeline, and actual usage rates. Most "satisfied" users haven\'t fully adopted.', outcome: 'Uncover 3-5 unaddressed pain points on average' }
                ],
                difficulty: 'hard'
            },
            budget: {
                id: 'budget-001',
                type: 'budget',
                objection: 'No budget / Budget frozen',
                response: 'I completely understand. Budget cycles are real. Here\'s what I\'ve seen work: the companies that grow fastest often budget for opportunities, not just operational costs. When does your next budget cycle begin? And is there flexibility for high-ROI investments that pay for themselves?',
                framework: 'Acknowledge budget reality → Identify timeline → Position as investment',
                proofPoints: [
                    { type: 'roi_calculation', content: 'Average payback period of 4 months means it\'s self-funding' },
                    { type: 'statistic', content: '73% of our customers found budget within 60 days when ROI was clear' }
                ],
                reframing: 'The best time to invest is when others are holding back.',
                bridgeQuestion: 'When does your next planning cycle start, and who has discretion for strategic investments?',
                examples: [
                    { scenario: 'Q4 budget freeze', response: 'Schedule for Q1. Use the time to build internal case and gather data.', outcome: 'Pre-plan leads to faster close in new fiscal year' }
                ],
                difficulty: 'medium'
            },
            priority: {
                id: 'priority-001',
                type: 'priority',
                objection: 'Not a priority right now / Working on other things',
                response: 'I hear you—there\'s always more to do than time allows. Help me understand: what would need to be true for this to become a priority? Often when leaders see the cost of inaction or the potential upside, priorities shift. What\'s driving your focus right now, and how would solving this problem help with that?',
                framework: 'Understand current priorities → Connect to their goals → Create urgency',
                proofPoints: [
                    { type: 'statistic', content: 'Companies that delay CRM initiatives lose 23% more deals to competitors' },
                    { type: 'case_study', content: 'Customer reduced sales cycle by 40% after prioritizing process automation' }
                ],
                reframing: 'What\'s not being prioritized is still costing you.',
                bridgeQuestion: 'If this problem were solved tomorrow, what would that enable for your team?',
                examples: [
                    { scenario: 'VP is focused on product launch', response: 'Connect CRM success to smoother launch execution. Show how visibility prevents last-minute surprises.', outcome: 'Position as enabler, not distraction' }
                ],
                difficulty: 'medium'
            },
            timing: {
                id: 'timing-001',
                type: 'timing',
                objection: 'Not the right time / Too busy / Need to think about it',
                response: 'I appreciate that you want to make an informed decision. My question is: what specifically needs to be thought through? Often "need to think" means there\'s an unspoken concern. What would you need to see to feel confident moving forward? And what\'s the cost of waiting another quarter?',
                framework: 'Surface the real concern → Quantify timing cost → Create deadline',
                proofPoints: [
                    { type: 'statistic', content: 'Average deal latency costs 1.2% deal value per week of delay' },
                    { type: 'roi_calculation', content: 'Every month of delay = $X in lost revenue from inefficiency' }
                ],
                reframing: 'The best time to solve a problem is before it gets worse.',
                bridgeQuestion: 'What\'s the worst that happens if you wait another quarter?',
                examples: [
                    { scenario: '"Let\'s revisit next year"', response: 'Challenge the assumption. What changes in a year? Usually the problem gets worse, not better.', outcome: 'Creates urgency through cost of inaction' }
                ],
                difficulty: 'easy'
            },
            security: {
                id: 'security-001',
                type: 'security',
                objection: 'Security concerns / Don\'t trust with our data',
                response: 'Data security is absolutely critical—I\'m glad you\'re asking these questions. What specific security concerns do you have? I\'d love to walk through our certifications, architecture, and the measures we take to protect customer data. For context, 40% of our customers are in regulated industries.',
                framework: 'Validate concern → Demonstrate credentials → Provide proof',
                proofPoints: [
                    { type: 'statistic', content: 'SOC 2 Type II, ISO 27001, GDPR, HIPAA, and CCPA certified' },
                    { type: 'statistic', content: '99.99% uptime SLA with zero data breaches in 5 years' },
                    { type: 'testimonial', content: '"Their security posture exceeded our enterprise requirements"', source: 'CISO testimonial' }
                ],
                reframing: 'Security should be table stakes, not a concern.',
                bridgeQuestion: 'What would you need to see in our security posture to feel confident?',
                examples: [
                    { scenario: 'Healthcare company concerned about HIPAA', response: 'Share healthcare-specific case study, BA agreement, and audit results.', outcome: 'Most security concerns resolved in single conversation' }
                ],
                difficulty: 'easy'
            },
            integration: {
                id: 'integration-001',
                type: 'integration',
                objection: 'Won\'t work with our systems / Too complex to integrate',
                response: 'Integration concerns are smart to raise. What systems are you running? We\'ve connected with 200+ tools, including most enterprise stacks. Let me show you how we\'ve integrated with similar companies—what\'s your current tech stack looking like?',
                framework: 'Acknowledge complexity → Demonstrate capability → Prove with examples',
                proofPoints: [
                    { type: 'statistic', content: '200+ pre-built integrations with enterprise software' },
                    { type: 'statistic', content: 'Average integration time: 2 weeks vs industry average of 6 weeks' },
                    { type: 'case_study', content: 'Integrated with SAP, Oracle, and legacy systems at Fortune 500 company in 30 days' }
                ],
                reframing: 'Integration capability is a feature—many vendors claim it, we prove it.',
                bridgeQuestion: 'What specific system are you most concerned about connecting?',
                examples: [
                    { scenario: 'SAP integration concern', response: 'Show live SAP connector documentation and customer success story.', outcome: 'Integration objection resolved' }
                ],
                difficulty: 'medium'
            },
            roi: {
                id: 'roi-001',
                type: 'roi',
                objection: 'Can\'t prove ROI / Don\'t see the value',
                response: 'That\'s a fair challenge. Let me ask: what would need to be true for this to be a clear ROI story? We\'ve measured ROI extensively—would it help if I walked you through our ROI framework and what similar companies have achieved? Most see payback within 4 months.',
                framework: 'Establish ROI criteria → Share proof → Calculate for them',
                proofPoints: [
                    { type: 'statistic', content: '320% average ROI over 3 years', source: 'Forrester TEI' },
                    { type: 'statistic', content: '4-month average payback period' },
                    { type: 'roi_calculation', content: 'Calculate specific ROI based on their metrics and goals' }
                ],
                reframing: 'ROI isn\'t a reason to wait—it\'s a reason to move faster.',
                bridgeQuestion: 'What metrics would make this an easy yes for you?',
                examples: [
                    { scenario: 'CFO wants hard numbers', response: 'Build custom ROI model using their actual data and benchmarks.', outcome: '95% of custom ROI presentations lead to next steps' }
                ],
                difficulty: 'medium'
            },
            authority: {
                id: 'authority-001',
                type: 'authority',
                objection: 'I\'m not the decision maker / Need to involve others',
                response: 'I appreciate you being direct. Who else should be part of this evaluation? Often the best outcomes happen when we bring in stakeholders early. Would it make sense to schedule a brief overview call with the team, or would you prefer to share some context and I can prepare relevant materials?',
                framework: 'Acknowledge → Map stakeholders → Create coalition',
                proofPoints: [
                    { type: 'statistic', content: 'Deals with 4+ stakeholders close 40% faster' },
                    { type: 'case_study', content: 'Multi-stakeholder deals have 65% higher retention' }
                ],
                reframing: 'Complex decisions are best made with the right team.',
                bridgeQuestion: 'Who else would need to be involved for this to move forward?',
                examples: [
                    { scenario: 'Talking to individual contributor', response: 'Ask about decision process and who cares most about this problem.', outcome: 'Often identify true champion' }
                ],
                difficulty: 'easy'
            },
            need: {
                id: 'need-001',
                type: 'need',
                objection: 'Don\'t need it / Not a problem for us',
                response: 'I appreciate your confidence in your current approach. Help me understand: what does success look like for your team in the next 12 months? Sometimes what we don\'t realize we\'re missing becomes clear when we compare to peers. What would need to be true for this to be relevant?',
                framework: 'Understand vision → Compare to peers → Surface latent needs',
                proofPoints: [
                    { type: 'statistic', content: '85% of companies believe they\'re above average—only 50% can be' },
                    { type: 'case_study', content: '"We thought we were fine until we saw what peers were achieving"' }
                ],
                reframing: 'You might not have the problem—but your competitors might be solving it.',
                bridgeQuestion: 'What would your ideal outcome look like, and how are you measuring progress toward it?',
                examples: [
                    { scenario: '"We have this covered"', response: 'Ask to benchmark against industry. Often surface hidden inefficiencies.', outcome: 'Create awareness without being pushy' }
                ],
                difficulty: 'hard'
            },
            trust: {
                id: 'trust-001',
                type: 'trust',
                objection: 'Don\'t know your company / Don\'t trust startups',
                response: 'That\'s a smart concern—you should vet any vendor carefully. Let me share a bit about us: we\'re [X] years old, with [Y] customers, and [Z] in funding. I\'d love to connect you with similar customers in your industry so you can hear firsthand. What would help you feel confident in our staying power and reliability?',
                framework: 'Acknowledge concern → Provide proof → Offer references',
                proofPoints: [
                    { type: 'statistic', content: '8 years in business with 99.99% uptime' },
                    { type: 'statistic', content: '1,200+ customers including 50 Fortune 1000' },
                    { type: 'testimonial', content: 'Customer references available in your industry' }
                ],
                reframing: 'You\'re not just buying software—you\'re choosing a partner.',
                bridgeQuestion: 'What would you need to see to feel confident in our long-term partnership?',
                examples: [
                    { scenario: '"What if you go out of business?"', response: 'Share financials, funding, customer count. Offer contract protections.', outcome: 'Trust established through transparency' }
                ],
                difficulty: 'medium'
            }
        };

        return responses[type];
    }
}

export const objectionHandlerService = new ObjectionHandlerService();
