/**
 * Meeting Intelligence Service
 * Meeting prep capabilities:
 * - Auto-generated agendas
 * - Company briefings
 * - Stakeholder notes
 * - Questions to ask
 * - Possible objections
 * - Battle cards
 * - Action items
 *
 * Routes:
 * - GET /api/sales/meeting-prep/:leadId
 * - POST /api/sales/meeting-prep/generate
 */
import axios from 'axios';
import { accountIntelligenceService, CompanyIntelligence } from './accountIntelligence.js';
import { decisionMakerMappingService } from './decisionMakerMapping.js';
import { battleCardsService } from './battleCards.js';

export interface MeetingPrep {
    leadId: string;
    meetingDate: string;
    duration: number;
    companyBriefing: CompanyBriefing;
    stakeholderNotes: StakeholderNote[];
    agenda: MeetingAgenda;
    questionsToAsk: Question[];
    possibleObjections: ObjectionPrep[];
    battleCardSummary: BattleCardSummary;
    actionItems: ActionItem[];
    talkingPoints: TalkingPoint[];
    preCallChecklist: ChecklistItem[];
    successMetrics: SuccessMetric[];
    lastUpdated: string;
}

export interface CompanyBriefing {
    companyName: string;
    summary: string;
    recentNews: string[];
    keyContacts: string[];
    painPoints: string[];
    opportunities: string[];
    techStack: string[];
    fundingStatus: string;
    competitors: string[];
}

export interface StakeholderNote {
    name: string;
    title: string;
    role: string;
    influence: number;
    communicationStyle: string;
    priorities: string[];
    concerns: string[];
    talkingPoints: string[];
    personalNotes: string;
}

export interface MeetingAgenda {
    totalMinutes: number;
    sections: AgendaSection[];
    suggestedFlow: string;
}

export interface AgendaSection {
    topic: string;
    durationMinutes: number;
    objective: string;
    keyPoints: string[];
}

export interface Question {
    id: string;
    category: string;
    question: string;
    whyItMatters: string;
    followUpQuestions: string[];
}

export interface ObjectionPrep {
    objection: string;
    category: string;
    response: string;
    proofPoints: string[];
}

export interface BattleCardSummary {
    competitor: string;
    ourAdvantages: string[];
    theirStrengths: string[];
    winThemes: string[];
    keyMessages: string[];
}

export interface ActionItem {
    id: string;
    task: string;
    owner: string;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'in_progress' | 'completed';
}

export interface TalkingPoint {
    category: string;
    points: string[];
    whenToUse: string;
}

export interface ChecklistItem {
    item: string;
    completed: boolean;
    notes: string;
}

export interface SuccessMetric {
    metric: string;
    target: string;
    currentState: string;
}

export class MeetingIntelligenceService {
    private hojaiClient = axios.create({
        baseURL: process.env.HOJAI_LEAD_SERVICE || 'http://localhost:4752',
        timeout: 5000
    });

    /**
     * Get meeting preparation for a specific lead
     */
    async getMeetingPrep(leadId: string): Promise<MeetingPrep> {
        try {
            const response = await this.hojaiClient.get('/meeting-prep', {
                params: { leadId }
            });
            if (response.data) return response.data;
        } catch {
            // Fall through to mock data
        }

        return this.generateMockMeetingPrep(leadId);
    }

    /**
     * Generate meeting prep with full context
     */
    async generateMeetingPrep(request: {
        leadId: string;
        companyName: string;
        contactName?: string;
        contactTitle?: string;
        meetingDate?: string;
        duration?: number;
        meetingType?: 'discovery' | 'demo' | 'proposal' | 'negotiation' | 'executive';
        objectives?: string[];
    }): Promise<MeetingPrep> {
        // Gather intelligence from multiple sources
        const [companyIntel, decisionMakers, _battleCards] = await Promise.all([
            accountIntelligenceService.getCompanyIntelligence(request.companyName),
            decisionMakerMappingService.getDecisionMakerMap(request.companyName),
            Promise.resolve(null) // Battle cards would be fetched if needed
        ]);

        return this.buildMeetingPrep(request, companyIntel, decisionMakers);
    }

    /**
     * Get pre-call checklist
     */
    async getPreCallChecklist(leadId: string): Promise<ChecklistItem[]> {
        const prep = await this.getMeetingPrep(leadId);
        return prep.preCallChecklist;
    }

    /**
     * Get questions to ask based on meeting type
     */
    async getQuestionsForMeeting(leadId: string, meetingType: string): Promise<Question[]> {
        const prep = await this.getMeetingPrep(leadId);

        switch (meetingType) {
            case 'discovery':
                return prep.questionsToAsk.filter(q =>
                    ['discovery', 'pain_points', 'budget', 'timeline'].includes(q.category)
                );
            case 'demo':
                return prep.questionsToAsk.filter(q =>
                    ['requirements', 'technical', 'use_case'].includes(q.category)
                );
            case 'proposal':
                return prep.questionsToAsk.filter(q =>
                    ['roi', 'decision_criteria', 'competition'].includes(q.category)
                );
            default:
                return prep.questionsToAsk;
        }
    }

    /**
     * Generate follow-up email after meeting
     */
    async generateFollowUpEmail(leadId: string, meetingNotes?: string): Promise<string> {
        const prep = await this.getMeetingPrep(leadId);

        const sections = [
            `Thank you for your time today, ${prep.stakeholderNotes[0]?.name || 'there'}.`,
            '',
            'Key takeaways from our conversation:',
            ...prep.actionItems.map(item => `- ${item.task} (${item.owner})`),
            '',
            'Next steps:',
            ...prep.actionItems
                .filter(item => item.priority === 'high')
                .map(item => `- ${item.task} - due ${item.dueDate}`),
            '',
            'As discussed, I\'ll follow up with more information on:',
            ...prep.talkingPoints[0]?.points.slice(0, 3).map(p => `- ${p}`) || [],
            '',
            'Please don\'t hesitate to reach out if you have any questions.',
            '',
            'Best regards'
        ];

        return sections.join('\n');
    }

    private buildMeetingPrep(
        request: {
            leadId: string;
            companyName: string;
            contactName?: string;
            contactTitle?: string;
            meetingDate?: string;
            duration?: number;
            meetingType?: string;
            objectives?: string[];
        },
        companyIntel: CompanyIntelligence,
        decisionMakers: ReturnType<typeof decisionMakerMappingService.getDecisionMakerMap> extends Promise<infer T> ? T : never
    ): MeetingPrep {
        const meetingDate = request.meetingDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const duration = request.duration || 30;
        const meetingType = request.meetingType || 'discovery';

        return {
            leadId: request.leadId,
            meetingDate,
            duration,
            companyBriefing: this.buildCompanyBriefing(companyIntel),
            stakeholderNotes: this.buildStakeholderNotes(decisionMakers, request.contactName, request.contactTitle),
            agenda: this.buildAgenda(duration, meetingType, request.objectives || []),
            questionsToAsk: this.buildQuestions(meetingType, companyIntel),
            possibleObjections: this.buildObjections(meetingType),
            battleCardSummary: this.buildBattleCardSummary(companyIntel),
            actionItems: this.buildActionItems(meetingType),
            talkingPoints: this.buildTalkingPoints(meetingType, companyIntel),
            preCallChecklist: this.buildPreCallChecklist(),
            successMetrics: this.buildSuccessMetrics(meetingType),
            lastUpdated: new Date().toISOString()
        };
    }

    private buildCompanyBriefing(companyIntel: CompanyIntelligence) {
        return {
            companyName: companyIntel.company,
            summary: companyIntel.summary.description,
            recentNews: companyIntel.recentNews.slice(0, 3).map(n => `${n.date}: ${n.title}`),
            keyContacts: companyIntel.contacts.map(c => `${c.name} (${c.title})`),
            painPoints: companyIntel.summary.painPoints,
            opportunities: companyIntel.strategicPriorities.slice(0, 3),
            techStack: companyIntel.techStack.detected,
            fundingStatus: `${companyIntel.funding.lastRound} - ${companyIntel.funding.lastRoundAmount}`,
            competitors: ['Competitor A', 'Competitor B', 'Competitor C'] // Would come from external data
        };
    }

    private buildStakeholderNotes(
        decisionMakers: unknown,
        contactName?: string,
        contactTitle?: string
    ): StakeholderNote[] {
        const dm = decisionMakers as { buyingCommittee?: Array<{
            name: string;
            title: string;
            role: string;
            influence: number;
            painPoints?: string[];
            successCriteria?: string[];
            communicationStyle?: string;
        }> };

        const notes: StakeholderNote[] = [];

        if (contactName) {
            notes.push({
                name: contactName,
                title: contactTitle || 'Primary Contact',
                role: 'champion',
                influence: 8,
                communicationStyle: 'collaborative',
                priorities: ['Proving value to stakeholders', 'Achieving quick wins', 'Building internal credibility'],
                concerns: ['Implementation complexity', 'User adoption', 'Budget justification'],
                talkingPoints: [
                    `How ${contactName.split(' ')[0]} can demonstrate ROI to leadership`,
                    'Quick implementation path to show early wins',
                    'Change management support available'
                ],
                personalNotes: ''
            });
        }

        // Add buying committee members
        if (dm.buyingCommittee) {
            dm.buyingCommittee.slice(0, 3).forEach(member => {
                notes.push({
                    name: member.name,
                    title: member.title,
                    role: member.role,
                    influence: member.influence,
                    communicationStyle: member.communicationStyle || 'balanced',
                    priorities: member.painPoints || [],
                    concerns: member.successCriteria || [],
                    talkingPoints: this.getTalkingPointsForRole(member.role),
                    personalNotes: ''
                });
            });
        }

        return notes;
    }

    private getTalkingPointsForRole(role: string): string[] {
        const rolePoints: Record<string, string[]> = {
            champion: ['How to build internal case', 'Key stakeholders to involve', 'Success metrics that matter'],
            decision_maker: ['Business value and ROI', 'Competitive advantage', 'Risk mitigation'],
            influencer: ['Technical capabilities', 'Integration requirements', 'Security posture'],
            user: ['Ease of use', 'Training requirements', 'Daily workflow impact'],
            technical: ['Architecture', 'Security', 'Scalability'],
            financial: ['Cost structure', 'ROI timeline', 'Budget impact']
        };
        return rolePoints[role] || ['Value proposition', 'Implementation path', 'Support structure'];
    }

    private buildAgenda(duration: number, meetingType: string, objectives: string[]): MeetingAgenda {
        const baseMinutes = duration;

        const typeAgendas: Record<string, AgendaSection[]> = {
            discovery: [
                { topic: 'Introduction & Objectives', durationMinutes: Math.round(baseMinutes * 0.15), objective: 'Build rapport and align on goals', keyPoints: ['Confirm meeting objectives', 'Quick company overview', 'Understand their role'] },
                { topic: 'Discovery Questions', durationMinutes: Math.round(baseMinutes * 0.35), objective: 'Understand pain points and needs', keyPoints: ['Current challenges', 'Desired outcomes', 'Decision process'] },
                { topic: 'Solution Overview', durationMinutes: Math.round(baseMinutes * 0.25), objective: 'Present relevant capabilities', keyPoints: ['Key differentiators', 'Relevant case studies', 'How others solved similar problems'] },
                { topic: 'Next Steps', durationMinutes: Math.round(baseMinutes * 0.15), objective: 'Define path forward', keyPoints: ['Action items', 'Timeline', 'Follow-up resources'] },
                { topic: 'Q&A', durationMinutes: Math.round(baseMinutes * 0.10), objective: 'Address any concerns', keyPoints: ['Open questions', 'Additional information needed'] }
            ],
            demo: [
                { topic: 'Recap & Objectives', durationMinutes: Math.round(baseMinutes * 0.10), objective: 'Confirm focus areas', keyPoints: ['Confirmed pain points', 'Key features to highlight'] },
                { topic: 'Live Demonstration', durationMinutes: Math.round(baseMinutes * 0.55), objective: 'Showcase relevant capabilities', keyPoints: ['Key workflow', 'Unique features', 'User experience'] },
                { topic: 'Discussion & Questions', durationMinutes: Math.round(baseMinutes * 0.25), objective: 'Address questions', keyPoints: ['Technical questions', 'Implementation questions', 'Pricing questions'] },
                { topic: 'Next Steps', durationMinutes: Math.round(baseMinutes * 0.10), objective: 'Define evaluation path', keyPoints: ['Trial/POC options', 'Timeline', 'Success criteria'] }
            ],
            proposal: [
                { topic: 'Executive Summary', durationMinutes: Math.round(baseMinutes * 0.15), objective: 'Set context', keyPoints: ['Business problem', 'Proposed solution', 'Expected outcomes'] },
                { topic: 'Detailed Proposal Review', durationMinutes: Math.round(baseMinutes * 0.35), objective: 'Walk through solution', keyPoints: ['Scope and deliverables', 'Timeline and milestones', 'Investment and terms'] },
                { topic: 'ROI Analysis', durationMinutes: Math.round(baseMinutes * 0.20), objective: 'Quantify value', keyPoints: ['Cost of current state', 'Projected savings', 'Payback period'] },
                { topic: 'Q&A and Negotiation', durationMinutes: Math.round(baseMinutes * 0.20), objective: 'Address concerns', keyPoints: ['Open items', 'Flexibility points', 'Risk mitigation'] },
                { topic: 'Decision Timeline', durationMinutes: Math.round(baseMinutes * 0.10), objective: 'Set expectations', keyPoints: ['Decision criteria', 'Timeline', 'Next steps'] }
            ],
            negotiation: [
                { topic: 'Recap Agreement Points', durationMinutes: Math.round(baseMinutes * 0.20), objective: 'Confirm shared understanding', keyPoints: ['What we\'ve agreed on', 'Remaining open items'] },
                { topic: 'Open Issues Discussion', durationMinutes: Math.round(baseMinutes * 0.40), objective: 'Work through differences', keyPoints: ['Pricing terms', 'Scope adjustments', 'Risk allocation'] },
                { topic: 'Final Terms', durationMinutes: Math.round(baseMinutes * 0.25), objective: 'Agree on final terms', keyPoints: ['Key terms', 'Contract length', 'Special provisions'] },
                { topic: 'Close & Next Steps', durationMinutes: Math.round(baseMinutes * 0.15), objective: 'Move to signature', keyPoints: ['Contract delivery', 'Implementation kickoff', 'Key contacts'] }
            ],
            executive: [
                { topic: 'Executive Introductions', durationMinutes: Math.round(baseMinutes * 0.10), objective: 'Set the stage', keyPoints: ['Who we are', 'Why we\'re here'] },
                { topic: 'Strategic Value Discussion', durationMinutes: Math.round(baseMinutes * 0.40), objective: 'Discuss business impact', keyPoints: ['Industry trends', 'Competitive positioning', 'Potential outcomes'] },
                { topic: 'Partnership Vision', durationMinutes: Math.round(baseMinutes * 0.30), objective: 'Paint the future', keyPoints: ['Long-term value', 'Joint opportunities', 'Success stories'] },
                { topic: 'Commitment & Next Steps', durationMinutes: Math.round(baseMinutes * 0.20), objective: 'Secure commitment', keyPoints: ['Clear next steps', 'Timeline', 'Stakeholders involved'] }
            ]
        };

        return {
            totalMinutes: baseMinutes,
            sections: typeAgendas[meetingType] || typeAgendas.discovery,
            suggestedFlow: this.getSuggestedFlow(meetingType)
        };
    }

    private getSuggestedFlow(meetingType: string): string {
        const flows: Record<string, string> = {
            discovery: 'Open with rapport building → Dig deep on pain points → Present solution fit → Create urgency → Set next steps',
            demo: 'Confirm objectives → Progressive demonstration → Pause for questions → Technical deep-dive (if needed) → ROI connection → Next steps',
            proposal: 'Lead with business value → Walk through solution → Present ROI → Address objections → Review terms → Set decision timeline',
            negotiation: 'Confirm progress → Focus on mutual value → Work through issues → Create win-win → Secure verbal commitment',
            executive: 'Executive presence → Industry context → Strategic value → Partnership vision → Clear ask'
        };
        return flows[meetingType] || flows.discovery;
    }

    private buildQuestions(meetingType: string, companyIntel: CompanyIntelligence): Question[] {
        const allQuestions: Question[] = [
            // Discovery Questions
            { id: 'q1', category: 'discovery', question: 'What are the top 3 challenges your team faces today with your current process?', whyItMatters: 'Uncovers pain points and sets up solution relevance', followUpQuestions: ['How long has this been a problem?', 'What have you tried before?'] },
            { id: 'q2', category: 'discovery', question: 'What would success look like for you in 6-12 months?', whyItMatters: 'Establishes goals and measurement criteria', followUpQuestions: ['How do you measure success today?', 'What would change if you achieved this?'] },
            { id: 'q3', category: 'discovery', question: 'Who else is affected by this problem?', whyItMatters: 'Identifies stakeholders and buying committee', followUpQuestions: ['Who feels the pain most?', 'Who would benefit most from a solution?'] },
            { id: 'q4', category: 'budget', question: 'What budget range have you allocated for solving this problem?', whyItMatters: 'Qualifies financial readiness', followUpQuestions: ['Is this flexible?', 'What\'s included in that budget?'] },
            { id: 'q5', category: 'budget', question: 'What\'s the cost of not solving this problem?', whyItMatters: 'Creates urgency and justifies investment', followUpQuestions: ['How does this impact revenue?', 'What\'s the cost of delay?'] },
            { id: 'q6', category: 'timeline', question: 'What\'s your ideal timeline for implementing a solution?', whyItMatters: 'Sets expectations and creates urgency', followUpQuestions: ['Any constraints on timing?', 'What needs to happen before we start?'] },
            { id: 'q7', category: 'requirements', question: 'What features or capabilities are must-haves vs nice-to-haves?', whyItMatters: 'Defines requirements and competitive positioning', followUpQuestions: ['What\'s non-negotiable?', 'What\'s on the wish list?'] },
            { id: 'q8', category: 'technical', question: 'What systems does your team currently use that a solution would need to integrate with?', whyItMatters: 'Assesses integration complexity', followUpQuestions: ['Which systems are most critical?', 'Any legacy systems to consider?'] },
            { id: 'q9', category: 'technical', question: 'What are your security and compliance requirements?', whyItMatters: 'Ensures solution meets minimum requirements', followUpQuestions: ['Any certifications required?', 'Data residency requirements?'] },
            { id: 'q10', category: 'use_case', question: 'Can you walk me through a typical day/week using our solution?', whyItMatters: 'Validates fit and identifies training needs', followUpQuestions: ['What would change in daily workflows?', 'How would this fit into existing processes?'] },
            { id: 'q11', category: 'roi', question: 'How are you currently measuring the ROI of similar investments?', whyItMatters: 'Establishes measurement framework', followUpQuestions: ['What metrics matter most?', 'How do you report on success?'] },
            { id: 'q12', category: 'decision_criteria', question: 'What would make this an easy yes for you?', whyItMatters: 'Uncovers decision criteria and objections', followUpQuestions: ['What\'s standing in the way today?', 'What would need to be true to move forward?'] },
            { id: 'q13', category: 'competition', question: 'What other solutions are you evaluating?', whyItMatters: 'Identifies competition and positioning', followUpQuestions: ['What do you like about other options?', 'What are the key differentiators you\'re looking for?'] },
            { id: 'q14', category: 'pain_points', question: 'What\'s the biggest frustration with your current solution (if using one)?', whyItMatters: 'Identifies switching triggers', followUpQuestions: ['How long has this been an issue?', 'What have you tried to address it?'] },
            { id: 'q15', category: 'discovery', question: 'What happens if you don\'t solve this problem?', whyItMatters: 'Creates urgency and stakes', followUpQuestions: ['What\'s the cost of inaction?', 'How does this impact your goals?'] }
        ];

        return allQuestions;
    }

    private buildObjections(meetingType: string): ObjectionPrep[] {
        return [
            { objection: 'We need to think about it / Not ready to decide today', category: 'timing', response: 'I understand. What specifically needs more thought? Often the real question is about risk or uncertainty—let\'s address that directly.', proofPoints: ['Most decisions happen within 2 weeks of the meeting', 'We can structure terms to reduce risk'] },
            { objection: 'Budget is tight right now', category: 'budget', response: 'That\'s common. Let me ask—what\'s the cost of the problem you\'re trying to solve? Often the real question is ROI, not budget.', proofPoints: ['4-month payback typical', 'Flexible payment options available'] },
            { objection: 'We need to involve other stakeholders', category: 'authority', response: 'Absolutely. Who else should be part of this conversation? The best outcomes happen when we bring in key stakeholders early.', proofPoints: ['We can schedule additional sessions', 'Executive briefing available'] },
            { objection: 'This seems complex to implement', category: 'implementation', response: 'That\'s a fair concern. Let me walk you through our implementation approach—most customers are live within 30 days.', proofPoints: ['Average 2-4 week implementation', 'Dedicated success manager assigned'] }
        ];
    }

    private buildBattleCardSummary(companyIntel: CompanyIntelligence): BattleCardSummary {
        return {
            competitor: 'Competitor X',
            ourAdvantages: [
                '60% lower total cost of ownership',
                '4x faster implementation',
                '92% user adoption vs 45% industry average'
            ],
            theirStrengths: [
                'Strong brand recognition',
                'Comprehensive feature set',
                'Large partner ecosystem'
            ],
            winThemes: [
                'Speed to value',
                'Simplicity and adoption',
                'Total cost advantage'
            ],
            keyMessages: [
                'Enterprise results without enterprise complexity',
                'First value in weeks, not months',
                'Lower risk through faster time to value'
            ]
        };
    }

    private buildActionItems(meetingType: string): ActionItem[] {
        const baseItems: ActionItem[] = [
            { id: 'a1', task: 'Send meeting summary email', owner: 'Sales Rep', dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], priority: 'high', status: 'pending' },
            { id: 'a2', task: 'Follow up on action items discussed', owner: 'Sales Rep', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], priority: 'high', status: 'pending' },
            { id: 'a3', task: 'Schedule next meeting call', owner: 'Sales Rep', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], priority: 'medium', status: 'pending' }
        ];

        if (meetingType === 'discovery') {
            baseItems.push({ id: 'a4', task: 'Send case studies relevant to their industry', owner: 'Sales Rep', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], priority: 'medium', status: 'pending' });
            baseItems.push({ id: 'a5', task: 'Research competitor they mentioned', owner: 'Sales Rep', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], priority: 'low', status: 'pending' });
        }

        if (meetingType === 'demo') {
            baseItems.push({ id: 'a4', task: 'Send demo recording or sandbox access', owner: 'Sales Rep', dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], priority: 'high', status: 'pending' });
            baseItems.push({ id: 'a5', task: 'Send technical documentation', owner: 'Sales Rep', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], priority: 'medium', status: 'pending' });
        }

        return baseItems;
    }

    private buildTalkingPoints(meetingType: string, companyIntel: CompanyIntelligence): TalkingPoint[] {
        return [
            {
                category: 'Opening',
                points: [
                    `Thank ${companyIntel.contacts[0]?.name?.split(' ')[0] || 'you'} for making time today`,
                    'Confirm agenda and objectives for the meeting',
                    'Briefly acknowledge their recent news (funding/expansion)'
                ],
                whenToUse: 'First 5 minutes of meeting'
            },
            {
                category: 'Value Proposition',
                points: [
                    'Focus on outcomes, not features',
                    'Use their industry language',
                    'Connect to their specific pain points'
                ],
                whenToUse: 'During solution discussion'
            },
            {
                category: 'Social Proof',
                points: [
                    'Share relevant case studies',
                    'Use similar company examples',
                    'Quantify results where possible'
                ],
                whenToUse: 'When building credibility'
            },
            {
                category: 'Objection Prevention',
                points: [
                    'Proactively address known concerns',
                    'Share proof before asked',
                    'Acknowledge any challenges upfront'
                ],
                whenToUse: 'Throughout meeting'
            },
            {
                category: 'Closing',
                points: [
                    'Summarize key takeaways',
                    'Confirm next steps',
                    'Set clear timeline and owner'
                ],
                whenToUse: 'Last 5-10 minutes of meeting'
            }
        ];
    }

    private buildPreCallChecklist(): ChecklistItem[] {
        return [
            { item: 'Review company intelligence brief', completed: false, notes: '' },
            { item: 'Review stakeholder notes and backgrounds', completed: false, notes: '' },
            { item: 'Confirm meeting agenda and timing', completed: false, notes: '' },
            { item: 'Prepare specific questions for this contact', completed: false, notes: '' },
            { item: 'Review battle card if competitor mentioned', completed: false, notes: '' },
            { item: 'Test demo environment (if applicable)', completed: false, notes: '' },
            { item: 'Prepare relevant case studies or materials', completed: false, notes: '' },
            { item: 'Set up meeting notes template', completed: false, notes: '' },
            { item: 'Join meeting 2-3 minutes early', completed: false, notes: '' },
            { item: 'Have water and notes ready', completed: false, notes: '' }
        ];
    }

    private buildSuccessMetrics(meetingType: string): SuccessMetric[] {
        const baseMetrics: SuccessMetric[] = [
            { metric: 'Understand key pain points', target: '3+ specific pain points identified', currentState: 'TBD - measure during meeting' },
            { metric: 'Identify decision makers', target: 'Complete buying committee mapped', currentState: 'TBD - measure during meeting' },
            { metric: 'Set next steps', target: 'Clear next meeting or action agreed', currentState: 'TBD - measure during meeting' },
            { metric: 'Stakeholder engagement', target: 'Active participation from all attendees', currentState: 'TBD - measure during meeting' }
        ];

        if (meetingType === 'discovery') {
            baseMetrics.push({ metric: 'Discovery completion', target: '80%+ of discovery questions answered', currentState: 'TBD' });
        }

        if (meetingType === 'demo') {
            baseMetrics.push({ metric: 'Feature relevance', target: 'Key features addressed per requirements', currentState: 'TBD' });
            baseMetrics.push({ metric: 'Trial/POC interest', target: 'Clear interest in next step', currentState: 'TBD' });
        }

        if (meetingType === 'proposal') {
            baseMetrics.push({ metric: 'Proposal acceptance', target: 'Proposal acknowledged without major objections', currentState: 'TBD' });
            baseMetrics.push({ metric: 'Negotiation progress', target: 'Open items reduced by 50%+', currentState: 'TBD' });
        }

        return baseMetrics;
    }

    private generateMockMeetingPrep(leadId: string): MeetingPrep {
        return {
            leadId,
            meetingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            duration: 30,
            companyBriefing: {
                companyName: 'Sample Company',
                summary: 'Leading enterprise software company focused on digital transformation.',
                recentNews: ['Recently raised Series C funding', 'New CRO appointed', 'Expanding to APAC'],
                keyContacts: ['John Smith (VP Sales)', 'Jane Doe (CTO)'],
                painPoints: ['Manual data entry', 'Limited visibility', 'Scaling challenges'],
                opportunities: ['AI-powered automation', 'Real-time analytics', 'Integration capabilities'],
                techStack: ['React', 'Node.js', 'AWS', 'Salesforce'],
                fundingStatus: 'Series C - $45M',
                competitors: ['Salesforce', 'HubSpot', 'Microsoft Dynamics']
            },
            stakeholderNotes: [
                {
                    name: 'John Smith',
                    title: 'VP of Sales',
                    role: 'champion',
                    influence: 8,
                    communicationStyle: 'Results-oriented',
                    priorities: ['Revenue growth', 'Team efficiency', 'Data-driven decisions'],
                    concerns: ['Implementation time', 'User adoption', 'ROI measurement'],
                    talkingPoints: ['How we\'ve helped similar companies', 'Quick time to value', 'ROI examples'],
                    personalNotes: ''
                }
            ],
            agenda: {
                totalMinutes: 30,
                sections: [
                    { topic: 'Introduction', durationMinutes: 5, objective: 'Build rapport and align', keyPoints: ['Confirm objectives', 'Quick overview'] },
                    { topic: 'Discovery', durationMinutes: 10, objective: 'Understand needs', keyPoints: ['Pain points', 'Goals', 'Process'] },
                    { topic: 'Solution Overview', durationMinutes: 10, objective: 'Present fit', keyPoints: ['Key features', 'Case study', 'Differentiators'] },
                    { topic: 'Next Steps', durationMinutes: 5, objective: 'Define path forward', keyPoints: ['Action items', 'Timeline'] }
                ],
                suggestedFlow: 'Open with rapport → Discover needs → Present solution → Set next steps'
            },
            questionsToAsk: this.buildQuestions('discovery', {
                company: 'Sample',
                summary: { description: '', industry: 'Technology', subIndustry: '', companySize: '', employeeCount: 100, revenue: '', headquarters: '', founded: 2020, ceo: '', website: '', businessModel: '', targetMarket: [], painPoints: [] },
                recentNews: [],
                contacts: [],
                techStack: { detected: ['React', 'Node.js'] },
                funding: { totalRaised: '', lastRound: 'Series B', lastRoundAmount: '', valuation: '', investors: [], fundingStage: '', runway: '' },
                strategicPriorities: [],
                growthSignals: [],
                risks: [],
                lastUpdated: ''
            }),
            possibleObjections: this.buildObjections('discovery'),
            battleCardSummary: this.buildBattleCardSummary({
                company: 'Sample',
                summary: { description: '', industry: 'Technology', subIndustry: '', companySize: '', employeeCount: 100, revenue: '', headquarters: '', founded: 2020, ceo: '', website: '', businessModel: '', targetMarket: [], painPoints: [] },
                recentNews: [],
                contacts: [],
                techStack: { detected: ['React', 'Node.js'] },
                funding: { totalRaised: '', lastRound: 'Series B', lastRoundAmount: '', valuation: '', investors: [], fundingStage: '', runway: '' },
                strategicPriorities: [],
                growthSignals: [],
                risks: [],
                lastUpdated: ''
            }),
            actionItems: this.buildActionItems('discovery'),
            talkingPoints: this.buildTalkingPoints('discovery', {
                company: 'Sample',
                summary: { description: '', industry: 'Technology', subIndustry: '', companySize: '', employeeCount: 100, revenue: '', headquarters: '', founded: 2020, ceo: '', website: '', businessModel: '', targetMarket: [], painPoints: [] },
                recentNews: [],
                contacts: [],
                techStack: { detected: ['React', 'Node.js'] },
                funding: { totalRaised: '', lastRound: 'Series B', lastRoundAmount: '', valuation: '', investors: [], fundingStage: '', runway: '' },
                strategicPriorities: [],
                growthSignals: [],
                risks: [],
                lastUpdated: ''
            }),
            preCallChecklist: this.buildPreCallChecklist(),
            successMetrics: this.buildSuccessMetrics('discovery'),
            lastUpdated: new Date().toISOString()
        };
    }
}

export const meetingIntelligenceService = new MeetingIntelligenceService();
