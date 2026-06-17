import { v4 as uuidv4 } from 'uuid';

export function generateId(prefix: string = ''): string {
  const id = uuidv4();
  return prefix ? `${prefix}-${id.slice(0, 8)}` : id;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomDelay(min: number = 100, max: number = 500): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return sleep(delay);
}

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

export function calculateDuration(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 1000);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
}

export function sanitizeString(str: string): string {
  return str.replace(/[<>]/g, '').trim();
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function generateSalesConversation(): string {
  return `Sales Rep: Good morning! I'm reaching out from REZ SalesMind. How are you doing today?

Prospect: Good morning! I'm doing well, thanks for calling. How can I help you?

Sales Rep: Great! I wanted to follow up on our recent conversation about AI-powered sales automation. Have you had a chance to review the materials I sent?

Prospect: Yes, I did review them. The autonomous SDR capabilities look interesting, especially the multi-channel outreach integration.

Sales Rep: Excellent! That's exactly what makes SalesMind different. We integrate seamlessly with HubSpot, support email, SMS, and WhatsApp campaigns, and our AI can analyze sentiment and auto-generate personalized emails.

Prospect: That sounds comprehensive. What about pricing and implementation time?

Sales Rep: Pricing scales with your team size, and most customers are fully operational within two weeks. We also provide full CRM write-back, so your data stays synchronized.

Prospect: I'd need to discuss this with my team. Can you send over a detailed proposal?

Sales Rep: Absolutely! I'll send a comprehensive proposal today. Would tomorrow afternoon work for a follow-up call?

Prospect: Yes, tomorrow at 3 PM would be perfect.

Sales Rep: Great! I'll send the proposal and calendar invite shortly. Talk to you then!`;
}

export function generateVoicemailText(): string {
  return `Hey, this is Sarah from REZ SalesMind calling. I wanted to follow up on the AI sales automation platform we discussed. Our autonomous SDR can handle 80% of your prospecting workload, with full CRM integration including HubSpot write-back. Give me a call back at 555-0123 or reply to our email. Thanks, talk soon!`;
}

export function estimateSpeakerCount(duration: number): number {
  if (duration < 30) return 1;
  if (duration < 120) return 2;
  if (duration < 300) return Math.floor(Math.random() * 2) + 2;
  return Math.floor(Math.random() * 3) + 2;
}

export function calculateLeadScore(lead: any): number {
  let score = 0;

  if (lead.company) score += 10;
  if (lead.title) score += 10;
  if (lead.email) score += 20;
  if (lead.phone) score += 15;
  if (lead.source === 'referral') score += 25;
  if (lead.source === 'linkedin') score += 20;
  if (lead.metadata?.engaged) score += 15;

  return Math.min(score, 100);
}

export function generateCampaignStats() {
  const total = Math.floor(Math.random() * 1000) + 500;
  const sent = Math.floor(total * 0.95);
  const delivered = Math.floor(sent * 0.92);
  const opened = Math.floor(delivered * 0.45);
  const clicked = Math.floor(opened * 0.25);
  const replied = Math.floor(opened * 0.15);
  const converted = Math.floor(replied * 0.2);

  return {
    total,
    sent,
    delivered,
    opened,
    clicked,
    replied,
    converted,
    failed: total - sent
  };
}
