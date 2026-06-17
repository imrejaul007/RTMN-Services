/**
 * AI Email Writer - Personalized outreach emails
 * FIXED: XSS protection via HTML entity encoding in personalization
 */

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

export class EmailWriter {
    /**
     * Generate personalized outreach email
     * FIXED: validates context, escapes HTML in personalization
     */
    generateEmail(type: string, context: Record<string, unknown> = {}): { type: string; subject: string; body: string; tone: string } {
        const templates = this.getTemplates();
        const template = templates[type];
        if (!template) {
            const available = Object.keys(templates).join(', ');
            throw new Error(`Unknown email type "${type}". Available: ${available}`);
        }
        // FIXED: validate context is an object
        if (!context || typeof context !== 'object') {
            context = {};
        }
        const subject = this.personalizeSubject(template.subject, context);
        const body = this.personalizeBody(template.body, context);
        return { type, subject, body, tone: template.tone };
    }

    /**
     * Generate follow-up sequence
     */
    generateSequence(context: Record<string, unknown> = {}): Array<{ type: string; subject: string; body: string; tone: string }> {
        return [
            this.generateEmail('intro', context),
            this.generateEmail('follow_up', { ...context, previousInteractions: ['Initial email sent'] }),
            this.generateEmail('meeting_request', context),
            this.generateEmail('reengagement', context),
        ];
    }

    /**
     * A/B test variants — capped at reasonable count
     */
    generateVariants(type: string, context: Record<string, unknown> = {}, count = 3): Array<{ type: string; subject: string; body: string; tone: string }> {
        const variants: Array<{ type: string; subject: string; body: string; tone: string }> = [];
        const tones = ['formal', 'casual', 'friendly', 'professional'];
        const safeCount = Math.min(10, Math.max(1, parseInt(String(count)) || 3));
        for (let i = 0; i < safeCount; i++) {
            const variant = this.generateEmail(type, context);
            variant.tone = tones[i % tones.length];
            variants.push(variant);
        }
        return variants;
    }

    // FIXED: escape HTML in all substituted values to prevent XSS
    private personalizeSubject(subject: string, context: Record<string, unknown>): string {
        return subject
            .replace('{prospectName}', escapeHtml(String(context.prospectName || '')))
            .replace('{company}', escapeHtml(String(context.company || '')))
            .replace('{product}', escapeHtml(String(context.product || '')));
    }

    private personalizeBody(body: string, context: Record<string, unknown>): string {
        let personalized = body
            .replace('{prospectName}', escapeHtml(String(context.prospectName || '')))
            .replace('{prospectTitle}', escapeHtml(String(context.prospectTitle || 'there')))
            .replace('{company}', escapeHtml(String(context.company || '')))
            .replace('{product}', escapeHtml(String(context.product || '')));

        if (context.painPoint) {
            personalized += `\n\nI noticed ${escapeHtml(String(context.company || ''))} might be facing challenges with ${escapeHtml(String(context.painPoint))}.`;
        }
        if (Array.isArray(context.personalizationNotes) && context.personalizationNotes.length > 0) {
            personalized += `\n\n${escapeHtml(String(context.personalizationNotes[0]))}`;
        }
        return personalized;
    }

    private getTemplates(): Record<string, { subject: string; body: string; tone: string }> {
        return {
            outreach: {
                subject: 'Quick question about {company}',
                body: `Hi {prospectName},

I hope this email finds you well. I've been following {company}'s growth and I think there's a real opportunity to help your team achieve great results.

{product} has helped companies like yours:
• Increase efficiency by 40%
• Reduce costs by 25%
• Scale operations without adding headcount

Would you be open to a quick 15-minute call this week?

Best,
Sales Team`,
                tone: 'professional',
            },
            intro: {
                subject: 'Quick question about {company}',
                body: `Hi {prospectName},

I hope this email finds you well. I've been following {company}'s growth in the industry space, and I think there's a real opportunity to help your team achieve similar results.

{product} has helped companies like yours:
• Increase efficiency by 40%
• Reduce costs by 25%
• Scale operations without adding headcount

Would you be open to a quick 15-minute call this week to explore if this could work for {company}?

Best,
Sales Team`,
                tone: 'professional',
            },
            follow_up: {
                subject: 'Following up - {prospectName}',
                body: `Hi {prospectName},

I wanted to follow up on my previous email. I understand you're busy, so I'll keep this short.

If {company} is currently looking at solutions to improve operations, I'd love to share how we've helped similar companies achieve significant results.

Just let me know a time that works for you, or feel free to book directly on my calendar.

Best,
Sales Team`,
                tone: 'friendly',
            },
            proposal: {
                subject: 'Proposal for {company} - {prospectName}',
                body: `Hi {prospectName},

Thank you for your time during our call. As discussed, I'm attaching a customized proposal for {company}.

Key highlights:
• Implementation timeline: 4-6 weeks
• Expected ROI: 3-6 months
• Dedicated support included

Let me know if you have any questions or would like to schedule a follow-up call to discuss.

Best,
Sales Team`,
                tone: 'professional',
            },
            meeting_request: {
                subject: 'Next steps for {company}',
                body: `Hi {prospectName},

I'd love to continue our conversation and dive deeper into how {product} can specifically help {company}.

Are you available for a 30-minute call this week? I'm flexible with timing and can work around your schedule.

Best,
Sales Team`,
                tone: 'friendly',
            },
            thank_you: {
                subject: 'Great speaking with you, {prospectName}!',
                body: `Hi {prospectName},

Thank you for taking the time to speak with me today. I really enjoyed learning more about {company}'s goals and challenges.

As promised, I'm sending over the materials we discussed. Please don't hesitate to reach out if you have any questions.

Looking forward to our next conversation!

Best,
Sales Team`,
                tone: 'friendly',
            },
            reengagement: {
                subject: 'Checking in - {prospectName}',
                body: `Hi {prospectName},

It's been a while since we last connected, and I wanted to check in.

{company} has been on my mind, and I think there might be some new developments that could be relevant.

Would you be open to a quick catch-up call?

Best,
Sales Team`,
                tone: 'casual',
            },
        };
    }
}
