/**
 * Proposal Generator - Auto-generate proposals from deal context
 */

export interface ProposalSection {
  title: string;
  content: string;
  items?: { label: string; value: string | number }[];
}

export interface Proposal {
  id: string;
  dealId: string;
  company: string;
  contactName: string;
  contactEmail: string;
  createdAt: Date;
  expiresAt: Date;
  sections: ProposalSection[];
  pricing: {
    items: { name: string; quantity: number; unitPrice: number; total: number }[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
  terms: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
}

export interface DealContext {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactTitle?: string;
  industry: string;
  companySize: string;
  painPoints: string[];
  goals: string[];
  selectedProducts: { name: string; quantity: number; unitPrice: number }[];
  notes?: string;
}

export class ProposalGenerator {
  /**
   * Generate a complete proposal from deal context
   */
  generateProposal(dealContext: DealContext): Proposal {
    const id = 'prop_' + Date.now();
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return {
      id,
      dealId: dealContext.companyName.toLowerCase().replace(/\s/g, '-'),
      company: dealContext.companyName,
      contactName: dealContext.contactName,
      contactEmail: dealContext.contactEmail,
      createdAt: now,
      expiresAt: expires,
      sections: this.generateSections(dealContext),
      pricing: this.calculatePricing(dealContext.selectedProducts),
      terms: this.getStandardTerms(),
      status: 'draft',
    };
  }

  /**
   * Generate PDF-ready HTML version
   */
  generateHTML(proposal: Proposal): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Proposal for ${proposal.company}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .section { margin-bottom: 30px; }
    .section h2 { border-bottom: 2px solid #333; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f4f4f4; }
    .total { font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 20px; }
    .footer { margin-top: 50px; text-align: center; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Business Proposal</h1>
    <h2>${proposal.company}</h2>
    <p>Prepared for: ${proposal.contactName}</p>
    <p>Date: ${proposal.createdAt.toLocaleDateString()}</p>
    <p>Valid until: ${proposal.expiresAt.toLocaleDateString()}</p>
  </div>

  ${proposal.sections.map(s => `
  <div class="section">
    <h2>${s.title}</h2>
    <p>${s.content}</p>
    ${s.items ? `
    <ul>
      ${s.items.map(i => `<li><strong>${i.label}:</strong> ${i.value}</li>`).join('')}
    </ul>` : ''}
  </div>
  `).join('')}

  <div class="section">
    <h2>Pricing</h2>
    <table>
      <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
      ${proposal.pricing.items.map(i => `
        <tr><td>${i.name}</td><td>${i.quantity}</td><td>$${i.unitPrice}</td><td>$${i.total}</td></tr>
      `).join('')}
    </table>
    <div class="total">
      <p>Subtotal: $${proposal.pricing.subtotal}</p>
      ${proposal.pricing.discount > 0 ? `<p>Discount: -$${proposal.pricing.discount}</p>` : ''}
      <p>Tax: $${proposal.pricing.tax}</p>
      <p><strong>Total: $${proposal.pricing.total}</strong></p>
    </div>
  </div>

  <div class="section">
    <h2>Terms & Conditions</h2>
    <p>${proposal.terms}</p>
  </div>

  <div class="footer">
    <p>Thank you for considering our proposal. We look forward to working with you!</p>
  </div>
</body>
</html>`;
  }

  private generateSections(context: DealContext): ProposalSection[] {
    return [
      {
        title: 'Executive Summary',
        content: `${context.companyName} is looking to address key challenges in the ${context.industry} sector. Our solution is designed to help ${context.companyName} achieve its goals of ${context.goals.join(', ')}.`,
      },
      {
        title: 'Understanding Your Needs',
        content: `Based on our discussions, we've identified the following priorities:`,
        items: context.painPoints.map(p => ({ label: 'Challenge', value: p })),
      },
      {
        title: 'Our Solution',
        content: `We've curated a solution specifically for ${context.companyName}:`,
        items: context.selectedProducts.map(p => ({ label: p.name, value: `${p.quantity} x $${p.unitPrice}` })),
      },
      {
        title: 'Implementation Plan',
        content: `We propose the following implementation timeline:`,
        items: [
          { label: 'Phase 1 - Discovery', value: 'Week 1-2' },
          { label: 'Phase 2 - Setup', value: 'Week 3-4' },
          { label: 'Phase 3 - Training', value: 'Week 5-6' },
          { label: 'Phase 4 - Launch', value: 'Week 7-8' },
        ],
      },
      {
        title: 'Why Choose Us',
        content: `With over 500+ clients in the ${context.industry} industry, we've developed proven methodologies that deliver results.`,
        items: [
          { label: 'Industry Experience', value: '10+ years' },
          { label: 'Client Satisfaction', value: '98%' },
          { label: 'Support Response', value: '< 4 hours' },
        ],
      },
    ];
  }

  private calculatePricing(products: { name: string; quantity: number; unitPrice: number }[]) {
    const items = products.map(p => ({
      ...p,
      total: p.quantity * p.unitPrice,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const discount = subtotal > 10000 ? subtotal * 0.1 : 0;
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * 0.1;
    const total = afterDiscount + tax;

    return { items, subtotal, discount, tax, total };
  }

  private getStandardTerms(): string {
    return `
1. Payment terms: Net 30 days
2. This proposal is valid for 30 days from the date
3. Implementation timeline begins upon contract signing
4. Annual support and maintenance available at additional cost
5. All intellectual property remains with the client
    `.trim();
  }
}
