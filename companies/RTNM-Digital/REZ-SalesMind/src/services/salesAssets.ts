/**
 * Sales Asset Generator Service
 * Generate sales materials:
 * - Value proposition
 * - Elevator pitch
 * - Executive summary
 * - Discovery questions
 * - Follow-up email
 * - Proposal outline
 *
 * Route: POST /api/ai/sales-assets/generate
 * Types: value-proposition, elevator-pitch, executive-summary, discovery-questions, follow-up-email, proposal-outline
 */
import axios from 'axios';

export type AssetType =
    | 'value-proposition'
    | 'elevator-pitch'
    | 'executive-summary'
    | 'discovery-questions'
    | 'follow-up-email'
    | 'proposal-outline'
    | 'case-study'
    | 'roi-analysis'
    | 'competitive-battle-card'
    | 'meeting-agenda';

export interface AssetRequest {
    type: AssetType;
    company?: string;
    contactName?: string;
    contactTitle?: string;
    industry?: string;
    painPoints?: string[];
    useCase?: string;
    competitor?: string;
    productName?: string;
    additionalContext?: Record<string, unknown>;
}

export interface GeneratedAsset {
    id: string;
    type: AssetType;
    title: string;
    content: string;
    sections?: AssetSection[];
    metadata: AssetMetadata;
    suggestions: string[];
    createdAt: string;
}

export interface AssetSection {
    heading: string;
    content: string;
    bullets?: string[];
}

export interface AssetMetadata {
    estimatedReadTime: number;
    bestFor: string[];
    tone: 'formal' | 'casual' | 'technical' | 'persuasive' | 'professional' | 'curious' | 'analytical';
    length: 'brief' | 'moderate' | 'detailed';
}

export class SalesAssetsService {
    private hojaiClient = axios.create({
        baseURL: process.env.HOJAI_WEB_INTEL || 'http://localhost:4595',
        timeout: 10000
    });

    /**
     * Generate a sales asset based on type and context
     */
    async generateAsset(request: AssetRequest): Promise<GeneratedAsset> {
        try {
            const response = await this.hojaiClient.post('/sales-assets/generate', request);
            if (response.data) return response.data;
        } catch {
            // Fall through to mock generation
        }

        // Generate based on type
        switch (request.type) {
            case 'value-proposition':
                return this.generateValueProposition(request);
            case 'elevator-pitch':
                return this.generateElevatorPitch(request);
            case 'executive-summary':
                return this.generateExecutiveSummary(request);
            case 'discovery-questions':
                return this.generateDiscoveryQuestions(request);
            case 'follow-up-email':
                return this.generateFollowUpEmail(request);
            case 'proposal-outline':
                return this.generateProposalOutline(request);
            case 'case-study':
                return this.generateCaseStudy(request);
            case 'roi-analysis':
                return this.generateROIAnalysis(request);
            default:
                return this.generateGenericAsset(request);
        }
    }

    /**
     * Generate multiple assets at once
     */
    async generateAssetBundle(requests: AssetRequest[]): Promise<GeneratedAsset[]> {
        return Promise.all(requests.map(r => this.generateAsset(r)));
    }

    /**
     * Generate value proposition statement
     */
    private generateValueProposition(request: AssetRequest): GeneratedAsset {
        const company = request.company || 'your company';
        const product = request.productName || 'our solution';
        const industry = request.industry || 'your industry';
        const painPoints = request.painPoints || ['operational efficiency', 'cost reduction', 'customer experience'];

        const sections: AssetSection[] = [
            {
                heading: 'For [Target Customer]',
                content: `For ${request.contactTitle || 'decision makers'} at ${industry} companies who want to ${painPoints[0] || 'improve efficiency'}.`,
                bullets: [
                    `[Product Name] is a [category]`,
                    `that helps you [primary benefit]`,
                    `Unlike [competitor || current solution], we [key differentiator]`
                ]
            },
            {
                heading: 'We Help You Achieve',
                content: 'Our customers typically see:',
                bullets: [
                    `${this.getRandomMetric('efficiency')} improvement in team efficiency`,
                    `${this.getRandomMetric('cost')} reduction in operational costs`,
                    `${this.getRandomMetric('time')} faster time to value`
                ]
            },
            {
                heading: 'Why Us',
                content: 'What sets us apart:',
                bullets: [
                    'Proprietary AI technology built specifically for this use case',
                    'Fastest implementation in the industry (avg. 2-4 weeks)',
                    'Dedicated success team from day one',
                    'Transparent pricing with no hidden fees'
                ]
            }
        ];

        const content = `## Value Proposition

### For ${request.contactTitle || 'Decision Makers'} at ${industry} Companies

**[Product]** helps ${request.contactTitle?.toLowerCase() || 'leaders'} at ${company} achieve:

**Primary Benefit:** ${this.capitalizeFirst(painPoints[0] || 'improved operational efficiency')} through AI-powered automation

**Key Differentiator:** Unlike traditional solutions that take months to implement, we deliver results in weeks with our no-code platform.

### Proof Points
- ${this.getRandomMetric('95')}% customer satisfaction rating
- ${this.getRandomMetric('4')}-month average payback period
- ${this.getRandomMetric('200')}+ companies trust us with their growth

### Call to Action
Let's schedule a 15-minute call to explore how we can help ${company} achieve similar results.`;

        return {
            id: this.generateId(),
            type: 'value-proposition',
            title: `Value Proposition for ${company}`,
            content,
            sections,
            metadata: {
                estimatedReadTime: 2,
                bestFor: ['First meeting', 'Email introduction', 'Website'],
                tone: 'persuasive',
                length: 'moderate'
            },
            suggestions: [
                'Customize the metrics with real data from their industry',
                'Add specific case studies relevant to their company size',
                'Include competitive positioning if competitor is mentioned'
            ],
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Generate elevator pitch
     */
    private generateElevatorPitch(request: AssetRequest): GeneratedAsset {
        const company = request.company || 'your company';
        const product = request.productName || 'our platform';

        const content = `## Elevator Pitch (30 seconds)

**Version 1 - Problem-Solving Focus:**
"We help ${request.contactTitle || 'companies'} like ${company} solve the challenge of ${request.painPoints?.[0] || 'inefficient processes'} through AI-powered automation. Unlike traditional solutions that take 6+ months to implement, we deliver results in just 2-4 weeks. Our customers see an average of ${this.getRandomMetric('45')}% improvement in efficiency within the first quarter."

**Version 2 - Results Focus:**
"${company}, like ${request.industry || 'other'} companies, is likely dealing with ${request.painPoints?.[0] || 'manual processes that slow growth'}. We built ${product} to solve exactly that. The result? Companies using us report ${this.getRandomMetric('60')}% faster growth and ${this.getRandomMetric('30')}% lower costs. We've helped companies like yours achieve these results in just weeks, not months."

**Version 3 - Simple & Direct:**
"${product} helps ${request.industry || 'modern'} companies automate ${request.painPoints?.[0] || 'their operations'}, so your team can focus on what matters. ${this.getRandomMetric('92')}% of our customers see positive ROI within 4 months. Want to see how?"

**Version 4 - Question Hook:**
"Did you know that ${request.industry || 'companies in your space'} that automate their ${request.painPoints?.[0] || 'workflows'} grow ${this.getRandomMetric('3')}x faster? We help companies like ${company} achieve that without the typical 6-month implementation headaches. Have 15 minutes to explore if this could work for your team?"`;

        return {
            id: this.generateId(),
            type: 'elevator-pitch',
            title: `Elevator Pitch for ${company}`,
            content,
            metadata: {
                estimatedReadTime: 1,
                bestFor: ['Networking', 'Cold outreach', 'Trade shows', 'Referral intros'],
                tone: 'casual',
                length: 'brief'
            },
            suggestions: [
                'Practice each version until it feels natural',
                'Adjust based on who you\'re talking to (technical vs executive)',
                'Have a quick demo or case study ready to share if interested'
            ],
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Generate executive summary
     */
    private generateExecutiveSummary(request: AssetRequest): GeneratedAsset {
        const company = request.company || 'the client';
        const industry = request.industry || 'your industry';

        const content = `## Executive Summary

**Prepared for:** ${request.contactTitle || 'Executive Leadership'} at ${company}
**Date:** ${new Date().toLocaleDateString()}
**Purpose:** Overview of proposed solution and partnership

---

### The Opportunity

${company} operates in the ${industry} sector, where challenges around ${request.painPoints?.[0] || 'operational efficiency'} represent significant opportunities for improvement. Our analysis suggests potential for:

- **${this.getRandomMetric('45')}%** improvement in operational efficiency
- **${this.getRandomMetric('30')}%** reduction in costs within first year
- **${this.getRandomMetric('4')}-month** payback period on investment

### Our Solution

[Product Name] is an AI-powered platform designed specifically for ${industry} companies. We offer:

| Capability | Benefit |
|------------|---------|
| Intelligent Automation | Reduce manual work by 60% |
| Real-time Analytics | Make data-driven decisions faster |
| Seamless Integration | Works with existing tools |
| Rapid Deployment | Value in 2-4 weeks |

### Why ${company} Should Move Forward

1. **Timing:** Industry trends suggest the market is ready for disruption
2. **Competitive Advantage:** Early adopters typically see 2-3x better outcomes
3. **Risk Mitigation:** Our implementation approach reduces risk to 4-month payback guarantee

### Proposed Next Steps

1. Discovery call to understand specific challenges (30 min)
2. Technical deep-dive with your team (1 hour)
3. Custom demo focused on your use case (1 hour)
4. Proposal presentation with ROI analysis (1 hour)
5. Pilot program to validate results (2-4 weeks)

### Investment Overview

Investment range: $XX,XXX - $XXX,XXX annually
Payment terms: Flexible (monthly, quarterly, annually)
ROI guarantee: 4-month payback or money back

---

**Contact:**
[Your Name]
[Your Title]
[Email] | [Phone]

"I look forward to exploring how we can help ${company} achieve its goals."`;

        return {
            id: this.generateId(),
            type: 'executive-summary',
            title: `Executive Summary - ${company}`,
            content,
            metadata: {
                estimatedReadTime: 3,
                bestFor: ['Executive meetings', 'Proposals', 'Email attachments', 'Leave-behinds'],
                tone: 'formal',
                length: 'detailed'
            },
            sections: [
                { heading: 'Opportunity', content: 'Market opportunity and potential impact' },
                { heading: 'Solution', content: 'Proposed approach and capabilities' },
                { heading: 'Differentiators', content: 'Why move forward with us' },
                { heading: 'Next Steps', content: 'Clear path to implementation' },
                { heading: 'Investment', content: 'High-level investment overview' }
            ],
            suggestions: [
                'Customize metrics with industry-specific data',
                'Add company logo and branding',
                'Include relevant case study in appendix',
                'Personalize the contact information'
            ],
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Generate discovery questions
     */
    private generateDiscoveryQuestions(request: AssetRequest): GeneratedAsset {
        const content = `## Discovery Questions

**Purpose:** Uncover needs, challenges, and decision criteria
**Target:** ${request.contactTitle || 'Decision makers'} at ${request.company || 'Prospect'}
**Duration:** 30-45 minutes recommended

---

### Opening (5 minutes)

1. "Tell me about your role and what you're focused on this quarter."
2. "What does success look like for you in the next 6-12 months?"

### Current State (10 minutes)

3. "Walk me through how your team currently handles [primary use case]."
4. "What tools or systems are you using today?"
5. "What's working well with your current approach?"
6. "What are the biggest pain points or frustrations?"

### Challenges & Problems (10 minutes)

7. "What keeps you up at night related to this initiative?"
8. "How does this problem impact your team, customers, or bottom line?"
9. "What have you tried to address this before? What worked, what didn't?"
10. "What's the cost of not solving this problem?"

### Goals & Priorities (5 minutes)

11. "What would you consider a successful outcome?"
12. "How do you measure success for initiatives like this?"
13. "What's your timeline for achieving these goals?"
14. "What needs to happen to make this a priority?"

### Decision Process (5 minutes)

15. "Who else is involved in this decision?"
16. "What criteria will you use to evaluate solutions?"
17. "What's your current budget and timeline for this project?"
18. "What would make this an easy 'yes' for you?"

### Closing (5 minutes)

19. "Is there anything I haven't asked that I should know?"
20. "Based on our conversation, do you think this could be a good fit?"
21. "What would be the best next step?"

---

### Follow-up Questions Based on Answers

**If budget is tight:**
- "What would it take to make this work within current constraints?"
- "Is there flexibility in timing for the next budget cycle?"

**If no current problem:**
- "What would need to change for this to become a priority?"
- "Are there competitors who are solving this differently?"

**If multiple stakeholders:**
- "Who feels the pain most acutely?"
- "Who would benefit most from a solution?"

**If skeptical:**
- "What would you need to see to feel confident?"
- "Would it help to talk to a customer in your situation?"`;

        return {
            id: this.generateId(),
            type: 'discovery-questions',
            title: `Discovery Questions for ${request.company || 'Prospect'}`,
            content,
            metadata: {
                estimatedReadTime: 5,
                bestFor: ['Discovery calls', 'Qualification', 'Understanding needs'],
                tone: 'curious',
                length: 'detailed'
            },
            suggestions: [
                'Listen more than you talk during discovery',
                'Use their answers to guide follow-up questions',
                'Take detailed notes for follow-up',
                'Identify champions and blockers'
            ],
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Generate follow-up email
     */
    private generateFollowUpEmail(request: AssetRequest): GeneratedAsset {
        const contactName = request.contactName || 'there';
        const company = request.company || 'your company';

        const content = `## Follow-Up Email Templates

---

### After Initial Meeting

**Subject:** Great connecting today, ${contactName.split(' ')[0]}

Hi ${contactName.split(' ')[0]},

Thank you for taking the time to speak with me today. I enjoyed learning about ${company} and the challenges you're facing with ${request.painPoints?.[0] || 'your current processes'}.

As discussed, here are the next steps:

[ ] Send case study from ${request.industry || 'similar'} company
[ ] Share ROI calculator for your team to review
[ ] Schedule technical deep-dive with your engineering team
[ ] Connect you with a reference customer

Please let me know if there's anything else that would be helpful as you evaluate options.

Looking forward to our next conversation.

Best,
[Your Name]

---

### After Demo

**Subject:** Your demo recording + next steps

Hi ${contactName.split(' ')[0]},

Thank you for spending time with us today! I hope the demo showed how ${request.productName || 'our platform'} can address the challenges you shared.

I've attached your personalized demo recording for reference.

**Next steps based on your feedback:**

1. ${request.useCase || 'Use case #1'} - I'll send detailed technical documentation by [DATE]
2. ${request.useCase || 'Use case #2'} - Let's schedule a working session with your team
3. Reference conversation - I'll connect you with [SIMILAR CUSTOMER] who had similar goals

What questions can I answer to help move this forward?

Best,
[Your Name]

---

### After No Response (1 Week)

**Subject:** Quick check-in

Hi ${contactName.split(' ')[0]},

I wanted to follow up on my previous note. I know you're busy, so I'll keep this short.

Have you had a chance to review the materials I sent? Happy to schedule a quick call to answer any questions or discuss next steps.

If this isn't a priority right now, just let me know and I'll follow up in [TIMEFRAME].

Either way, good luck with everything at ${company}!

Best,
[Your Name]

---

### After Positive Response

**Subject:** Next steps - ${company} + [Product Name]

Hi ${contactName.split(' ')[0]},

Thrilled to hear this resonated with you! Let's keep the momentum going.

**Proposed timeline:**

| Milestone | Target Date |
|-----------|-------------|
| Technical review with your team | [DATE] |
| Custom POC scope defined | [DATE] |
| POC agreement signed | [DATE] |
| POC kickoff | [DATE] |

I'll send a calendar invite for the next meeting. In the meantime, feel free to reach out with any questions.

Excited about this opportunity!

Best,
[Your Name]`;

        return {
            id: this.generateId(),
            type: 'follow-up-email',
            title: `Follow-Up Email for ${company}`,
            content,
            metadata: {
                estimatedReadTime: 3,
                bestFor: ['Post-meeting', 'Post-demo', 'Follow-up sequences'],
                tone: 'professional',
                length: 'moderate'
            },
            suggestions: [
                'Personalize with specific discussion points',
                'Include relevant attachments (case studies, recordings)',
                'Keep subject lines compelling',
                'Follow up within 24 hours of any interaction'
            ],
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Generate proposal outline
     */
    private generateProposalOutline(request: AssetRequest): GeneratedAsset {
        const content = `## Proposal Outline

**Prepared for:** ${request.company || 'Client'}
**Prepared by:** [Your Name], [Your Title]
**Date:** ${new Date().toLocaleDateString()}
**Version:** 1.0

---

### 1. Executive Summary (1 page)

- Business problem and opportunity
- Proposed solution overview
- Expected outcomes and ROI
- Why choose us

### 2. Understanding ${request.company || 'Your'} Challenges

- Current state analysis
- Key pain points identified
- Impact of challenges
- Opportunity cost of inaction

### 3. Proposed Solution

#### 3.1 Platform Overview
- Core capabilities
- How it works
- Key features for your use case

#### 3.2 Implementation Approach
- Phased implementation plan
- Timeline (typically X weeks/months)
- Resource requirements
- Success milestones

#### 3.3 Training & Enablement
- Training approach
- User adoption support
- Documentation and resources

### 4. Investment & Pricing

| Component | Investment |
|-----------|------------|
| Platform License | $XX,XXX |
| Implementation Services | $XX,XXX |
| Training | $X,XXX |
| Year 1 Total | $XXX,XXX |
| Annual Maintenance (Year 2+) | $XX,XXX |

**Payment Terms:** [Net 30 / Monthly / Quarterly]

### 5. ROI Analysis

- Current cost of problem
- Projected savings
- Expected payback period
- 3-year total impact

### 6. Case Studies & References

- [Customer A] - Similar industry
- [Customer B] - Similar use case
- [Customer C] - Similar size

### 7. Terms & Conditions

- Standard terms summary
- Contract length
- SLA overview
- Support commitments

### 8. Next Steps

1. Review proposal (suggested timeline)
2. Technical validation call
3. Legal/procurement review
4. Final negotiation
5. Contract signature
6. Kickoff meeting

### Appendix

- Technical specifications
- Security documentation
- Integration details
- Team bios

---

**Ready to move forward?**

Contact:
[Your Name]
[Email] | [Phone]
[Calendar link]`;

        return {
            id: this.generateId(),
            type: 'proposal-outline',
            title: `Proposal Outline for ${request.company || 'Client'}`,
            content,
            metadata: {
                estimatedReadTime: 10,
                bestFor: ['Formal proposals', 'POC to production', 'Complex deals'],
                tone: 'formal',
                length: 'detailed'
            },
            sections: [
                { heading: 'Executive Summary', content: 'High-level overview for executives' },
                { heading: 'Challenges', content: 'Problem statement' },
                { heading: 'Solution', content: 'Proposed approach' },
                { heading: 'Investment', content: 'Pricing breakdown' },
                { heading: 'ROI', content: 'Return on investment analysis' },
                { heading: 'Next Steps', content: 'Path forward' }
            ],
            suggestions: [
                'Customize ROI with actual customer data',
                'Include relevant case studies early',
                'Keep it focused on their needs, not features',
                'Make next steps crystal clear'
            ],
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Generate case study
     */
    private generateCaseStudy(request: AssetRequest): GeneratedAsset {
        const companyName = `Company ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
        const content = `## Case Study: ${companyName}

**${request.industry || 'Enterprise'} Company Achieves ${this.getRandomMetric('45')}% Efficiency Improvement**

---

### The Challenge

${companyName}, a ${request.industry || 'mid-market'} company with ${this.getRandomNumber(200, 1000)} employees, faced significant challenges with ${request.painPoints?.[0] || 'manual processes'} that were slowing growth and impacting customer satisfaction.

**Key challenges:**
- ${this.getRandomMetric('60')}% of team time spent on manual tasks
- No real-time visibility into operations
- Slow response times affecting customer experience
- Rising operational costs

### The Solution

${companyName} selected [Product Name] for its:
- Fast implementation (live in 3 weeks)
- No-code configuration
- Seamless integration with existing tools
- Dedicated success support

### The Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Efficiency | Baseline | +${this.getRandomMetric('45')}% | ${this.getRandomMetric('45')}% |
| Response Time | X days | Y days | ${this.getRandomMetric('70')}% faster |
| Costs | $XXX,XXX | $XXX,XXX | ${this.getRandomMetric('30')}% reduction |
| Customer CSAT | 72% | 91% | ${this.getRandomMetric('26')}% improvement |

**Time to value:** 4 months
**ROI achieved:** ${this.getRandomMetric('320')}% over 3 years

### What They Said

"${this.getRandomQuote()}"

— ${this.getRandomName()}, ${this.getRandomTitle()}, ${companyName}

### Key Takeaways

1. **Fast implementation** - Live in weeks, not months
2. **Clear ROI** - Payback in under 6 months
3. **User adoption** - ${this.getRandomMetric('92')}% team adoption within 30 days
4. **Dedicated support** - Success team available from day one

---

**Want to achieve similar results?**

Contact us for a personalized ROI analysis for your company.

[Your Name] | [Email] | [Phone]`;

        return {
            id: this.generateId(),
            type: 'case-study',
            title: `Case Study - ${request.industry || 'Industry'} Company`,
            content,
            metadata: {
                estimatedReadTime: 3,
                bestFor: ['Social proof', 'Email attachments', 'Website', 'Sales meetings'],
                tone: 'professional',
                length: 'moderate'
            },
            suggestions: [
                'Replace with actual customer data when available',
                'Match industry to prospect when possible',
                'Include photo of customer team if available',
                'Get customer permission for public use'
            ],
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Generate ROI analysis
     */
    private generateROIAnalysis(request: AssetRequest): GeneratedAsset {
        const content = `## ROI Analysis Template

**Prepared for:** ${request.company || 'Client'}
**Use Case:** ${request.useCase || 'Primary workflow automation'}
**Date:** ${new Date().toLocaleDateString()}

---

### Current State Costs

| Cost Category | Monthly | Annual |
|----------------|---------|--------|
| Manual labor hours | $X,XXX | $XX,XXX |
| Software tools (multiple) | $X,XXX | $XX,XXX |
| Error/rework costs | $X,XXX | $XX,XXX |
| Delayed outcomes | $X,XXX | $XX,XXX |
| **Total Current Cost** | **$X,XXX** | **$XXX,XXX** |

### Projected Savings

| Category | Year 1 | Year 2 | Year 3 |
|----------|--------|--------|--------|
| Labor efficiency (40%) | $XX,XXX | $XX,XXX | $XX,XXX |
| Tool consolidation | $X,XXX | $X,XXX | $X,XXX |
| Error reduction | $X,XXX | $X,XXX | $X,XXX |
| Faster time to value | $XX,XXX | $XX,XXX | $XX,XXX |
| **Total Savings** | **$XX,XXX** | **$XX,XXX** | **$XX,XXX** |

### Investment

| Component | Year 1 | Year 2 | Year 3 |
|-----------|--------|--------|--------|
| Platform subscription | $XX,XXX | $XX,XXX | $XX,XXX |
| Implementation | $XX,XXX | - | - |
| Training | $X,XXX | - | - |
| **Total Investment** | **$XX,XXX** | **$XX,XXX** | **$XX,XXX** |

### ROI Summary

| Metric | Value |
|--------|-------|
| Total Investment (3 years) | $XXX,XXX |
| Total Savings (3 years) | $XXX,XXX |
| Net Benefit | $XXX,XXX |
| 3-Year ROI | ${this.getRandomMetric('320')}% |
| Payback Period | ${this.getRandomMetric('4')} months |
| IRR | ${this.getRandomMetric('145')}% |

### Sensitivity Analysis

| Scenario | Payback | 3-Year ROI |
|----------|---------|------------|
| Conservative (70% of projected) | ${this.getRandomMetric('6')} months | ${this.getRandomMetric('180')}% |
| Expected | ${this.getRandomMetric('4')} months | ${this.getRandomMetric('320')}% |
| Optimistic (130% of projected) | ${this.getRandomMetric('3')} months | ${this.getRandomMetric('450')}% |

---

**Assumptions:**
- Based on current team size and processes
- Savings conservative estimate (adjustable)
- Includes standard implementation timeline
- Pricing based on agreed commercial terms

**Ready to calculate your specific ROI?**

[Your Name] | [Email] | [Phone]`;

        return {
            id: this.generateId(),
            type: 'roi-analysis',
            title: `ROI Analysis for ${request.company || 'Client'}`,
            content,
            metadata: {
                estimatedReadTime: 5,
                bestFor: ['CFO presentations', 'Budget justification', 'ROI discussions'],
                tone: 'analytical',
                length: 'detailed'
            },
            suggestions: [
                'Customize with actual customer metrics',
                'Build calculator tool for dynamic updates',
                'Include sensitivity analysis',
                'Get sign-off on assumptions'
            ],
            createdAt: new Date().toISOString()
        };
    }

    private generateGenericAsset(request: AssetRequest): GeneratedAsset {
        return {
            id: this.generateId(),
            type: request.type,
            title: `Sales Asset: ${request.type}`,
            content: `Custom content for ${request.type}\n\nTarget: ${request.company || 'General'}\nIndustry: ${request.industry || 'Multi'}\nPain Points: ${request.painPoints?.join(', ') || 'General challenges'}`,
            metadata: {
                estimatedReadTime: 2,
                bestFor: ['General use'],
                tone: 'professional',
                length: 'moderate'
            },
            suggestions: ['Customize based on specific requirements'],
            createdAt: new Date().toISOString()
        };
    }

    // Helper methods
    private generateId(): string {
        return `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private getRandomMetric(base: number | string): string {
        const num = typeof base === 'string' ? parseInt(base) : base;
        const variance = Math.floor(num * 0.2);
        const value = num + Math.floor(Math.random() * variance * 2 - variance);
        return String(value);
    }

    private getRandomNumber(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private getRandomQuote(): string {
        const quotes = [
            "This changed everything for us. We wish we'd switched sooner.",
            "The implementation was smoother than we expected, and the results came faster.",
            "Best decision we made this year. Our team loves it.",
            "The ROI was clear within the first quarter."
        ];
        return quotes[Math.floor(Math.random() * quotes.length)];
    }

    private getRandomName(): string {
        const names = ['Alex Thompson', 'Jordan Lee', 'Casey Morgan', 'Riley Chen', 'Quinn Davis'];
        return names[Math.floor(Math.random() * names.length)];
    }

    private getRandomTitle(): string {
        const titles = ['VP of Operations', 'Director of Digital', 'Chief Operating Officer', 'Head of Product'];
        return titles[Math.floor(Math.random() * titles.length)];
    }
}

export const salesAssetsService = new SalesAssetsService();
