// ============================================================================
// SUTAR Contract OS - Clause Library Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { ClauseLibraryItem } from '../types/index';

// In-memory store for clauses
const clauseStore = new Map<string, ClauseLibraryItem>();

// Initialize default clauses
const initializeDefaultClauses = (): void => {
  const defaultClauses: Partial<ClauseLibraryItem>[] = [
    // Confidentiality Clauses
    {
      title: 'Standard Confidentiality',
      content: 'Both parties agree to maintain the confidentiality of all proprietary information, trade secrets, and business processes disclosed during the term of this Agreement. Neither party shall disclose such information to any third party without the prior written consent of the disclosing party.',
      category: 'Confidentiality',
      subcategory: 'General',
      tags: ['confidentiality', 'nda', 'standard'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    {
      title: 'Extended Confidentiality with Return of Materials',
      content: 'The Receiving Party agrees to hold in confidence all Confidential Information disclosed by the Disclosing Party and to use such information solely for the Purpose. Upon termination or request, the Receiving Party shall promptly return or destroy all Confidential Information and any copies thereof, and provide written certification of such destruction.',
      category: 'Confidentiality',
      subcategory: 'Enhanced',
      tags: ['confidentiality', 'return of materials', 'extended'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    {
      title: 'Mutual NDA Clause',
      content: 'Each party agrees to maintain the confidentiality of all non-public information received from the other party. This obligation shall survive the termination of this Agreement for a period of {{survival_years}} years. Information shall be considered confidential if marked as such or if a reasonable person would understand it to be confidential.',
      category: 'Confidentiality',
      subcategory: 'Mutual',
      tags: ['nda', 'mutual', 'bilateral'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    // Payment Clauses
    {
      title: 'Net 30 Payment Terms',
      content: 'Payment shall be due within thirty (30) days from the date of invoice. Late payments shall accrue interest at the rate of {{interest_rate}}% per month or the maximum rate permitted by applicable law, whichever is lower.',
      category: 'Payment',
      subcategory: 'Standard Terms',
      tags: ['payment', 'net-30', 'invoice'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    {
      title: 'Advance Payment Required',
      content: 'A non-refundable advance payment of {{advance_percentage}}% of the total contract value is required before commencement of services. The remaining balance shall be due upon completion or according to the payment schedule specified in Exhibit A.',
      category: 'Payment',
      subcategory: 'Advance',
      tags: ['payment', 'advance', 'upfront'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    {
      title: 'Milestone-Based Payment',
      content: 'Payment shall be made upon completion of mutually agreed milestones as specified in the project schedule. Each milestone payment shall be {{milestone_percentage}}% of the total contract value. No payment shall be due until the previous milestone has been accepted in writing.',
      category: 'Payment',
      subcategory: 'Milestone',
      tags: ['payment', 'milestone', 'deliverables'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    {
      title: 'Late Payment Penalty',
      content: 'In the event of late payment, the defaulting party shall pay a late fee of {{late_fee_percentage}}% per month on the outstanding amount, calculated from the due date until full payment is received. The defaulting party shall also be responsible for any collection costs, including reasonable attorney fees.',
      category: 'Payment',
      subcategory: 'Penalties',
      tags: ['payment', 'late', 'penalty', 'fee'],
      jurisdiction: 'Universal',
      isStandard: false,
      riskLevel: 'high',
      usageCount: 0,
    },
    // Termination Clauses
    {
      title: 'Termination for Convenience',
      content: 'Either party may terminate this Agreement at any time without cause by providing {{notice_days}} days written notice to the other party. Upon such termination, the Client shall pay for all services rendered and expenses incurred up to the termination date.',
      category: 'Termination',
      subcategory: 'Convenience',
      tags: ['termination', 'convenience', 'without cause'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    {
      title: 'Termination for Cause',
      content: 'Either party may terminate this Agreement immediately upon written notice if the other party: (a) materially breaches this Agreement and fails to cure such breach within {{cure_period}} days of receiving notice; (b) becomes insolvent or files for bankruptcy; (c) engages in illegal or fraudulent activities.',
      category: 'Termination',
      subcategory: 'For Cause',
      tags: ['termination', 'breach', 'cause', 'default'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    {
      title: 'Immediate Termination Rights',
      content: 'This Agreement may be terminated immediately without notice if: (a) either party ceases to conduct business operations; (b) either party is convicted of a criminal offense related to the business; (c) either party misappropriates funds or assets; (d) a force majeure event continues for more than {{force_majeure_days}} days.',
      category: 'Termination',
      subcategory: 'Immediate',
      tags: ['termination', 'immediate', 'emergency'],
      jurisdiction: 'Universal',
      isStandard: false,
      riskLevel: 'high',
      usageCount: 0,
    },
    // Liability Clauses
    {
      title: 'Limitation of Liability',
      content: 'IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, REGARDLESS OF THE CAUSE OF ACTION OR WHETHER SUCH PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. EACH PARTY\'S TOTAL LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED {{liability_cap}}.',
      category: 'Liability',
      subcategory: 'Limitation',
      tags: ['liability', 'limitation', 'cap', 'damages'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    {
      title: 'Indemnification Standard',
      content: 'Each party agrees to indemnify, defend, and hold harmless the other party from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorney fees) arising out of or relating to: (a) the indemnifying party\'s breach of this Agreement; (b) the indemnifying party\'s negligence or willful misconduct; (c) any intellectual property infringement.',
      category: 'Liability',
      subcategory: 'Indemnification',
      tags: ['indemnification', 'defense', 'hold harmless'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    {
      title: 'Mutual Indemnification',
      content: 'Each party shall indemnify the other party against third-party claims arising from: (a) the indemnifying party\'s violation of applicable laws; (b) the indemnifying party\'s gross negligence or willful misconduct; (c) the indemnifying party\'s infringement of intellectual property rights. The indemnified party shall provide prompt notice and reasonable cooperation.',
      category: 'Liability',
      subcategory: 'Mutual Indemnification',
      tags: ['indemnification', 'mutual', 'bilateral'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    // Intellectual Property Clauses
    {
      title: 'Work Product Ownership',
      content: 'All work product, deliverables, inventions, and intellectual property created by the Service Provider in the performance of this Agreement shall be the sole and exclusive property of the Client. The Service Provider hereby assigns all right, title, and interest in such work product to the Client.',
      category: 'Intellectual Property',
      subcategory: 'Work Product',
      tags: ['ip', 'ownership', 'work product', 'deliverables'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    {
      title: 'License Grant',
      content: 'The Licensor hereby grants to the Licensee a {{license_type}} license to use the intellectual property described herein. This license is limited to the specific purposes set forth in this Agreement and does not include the right to sublicense, modify, or transfer the intellectual property without prior written consent.',
      category: 'Intellectual Property',
      subcategory: 'License',
      tags: ['ip', 'license', 'grant'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    {
      title: 'Pre-Existing IP Retained',
      content: 'Each party retains ownership of its pre-existing intellectual property. Any intellectual property developed jointly by the parties shall be owned jointly. The Service Provider grants the Client a perpetual, royalty-free license to use any pre-existing IP incorporated into the deliverables.',
      category: 'Intellectual Property',
      subcategory: 'Pre-Existing',
      tags: ['ip', 'pre-existing', 'retained', 'joint'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    // Governing Law Clauses
    {
      title: 'Governing Law - India',
      content: 'This Agreement shall be governed by and construed in accordance with the laws of India. Any disputes arising under this Agreement shall be subject to the exclusive jurisdiction of the courts of {{jurisdiction_state}}, India.',
      category: 'Governing Law',
      subcategory: 'India',
      tags: ['governing law', 'india', 'jurisdiction'],
      jurisdiction: 'India',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    {
      title: 'Arbitration Clause - Indian Arbitration',
      content: 'Any dispute, controversy, or claim arising out of or relating to this Agreement shall be settled by arbitration in accordance with the Arbitration and Conciliation Act, 1996. The arbitration shall be conducted in {{arbitration_city}} by a sole arbitrator appointed by mutual consent. The arbitration award shall be final and binding.',
      category: 'Governing Law',
      subcategory: 'Arbitration',
      tags: ['arbitration', 'dispute resolution', 'india'],
      jurisdiction: 'India',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    {
      title: 'Choice of Law - Delaware',
      content: 'This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, United States of America, without regard to its conflict of laws principles. The parties consent to the exclusive jurisdiction of state and federal courts located in Wilmington, Delaware.',
      category: 'Governing Law',
      subcategory: 'United States',
      tags: ['governing law', 'delaware', 'usa'],
      jurisdiction: 'United States',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    // Non-Compete Clauses
    {
      title: 'Non-Competition During Term',
      content: 'During the term of this Agreement, the Contractor shall not directly or indirectly engage in any business that competes with the Client\'s business or provide services to any competitor of the Client. This restriction shall apply within the geographic area of {{geographic_scope}}.',
      category: 'Non-Compete',
      subcategory: 'During Term',
      tags: ['non-compete', 'competition', 'restriction'],
      jurisdiction: 'Universal',
      isStandard: false,
      riskLevel: 'high',
      usageCount: 0,
    },
    {
      title: 'Post-Termination Non-Compete',
      content: 'For a period of {{non_compete_months}} months following the termination of this Agreement, the Contractor shall not: (a) engage in any competing business within {{geographic_scope}}; (b) solicit the Client\'s employees or customers; (c) use the Client\'s confidential information. This clause shall not apply if termination is without cause by the Client.',
      category: 'Non-Compete',
      subcategory: 'Post-Termination',
      tags: ['non-compete', 'post-termination', 'restriction'],
      jurisdiction: 'Universal',
      isStandard: false,
      riskLevel: 'high',
      usageCount: 0,
    },
    // Force Majeure
    {
      title: 'Force Majeure Standard',
      content: 'Neither party shall be liable for any failure or delay in performing its obligations under this Agreement where such failure or delay results from Force Majeure events including but not limited to: acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, epidemics, or strikes. The affected party shall provide prompt notice and use reasonable efforts to mitigate the impact.',
      category: 'Force Majeure',
      subcategory: 'Standard',
      tags: ['force majeure', 'acts of god', 'liability'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    {
      title: 'Extended Force Majeure with Termination',
      content: 'If a Force Majeure event continues for more than {{fm_duration_days}} consecutive days, either party may terminate this Agreement upon written notice without liability. The Client shall pay for all services rendered up to the date of termination. Neither party shall be required to perform obligations during the Force Majeure period.',
      category: 'Force Majeure',
      subcategory: 'Extended',
      tags: ['force majeure', 'termination', 'extended'],
      jurisdiction: 'Universal',
      isStandard: false,
      riskLevel: 'medium',
      usageCount: 0,
    },
    // Data Protection Clauses
    {
      title: 'Data Protection - GDPR Compliant',
      content: 'The Processor shall process personal data only on documented instructions from the Controller. The Processor shall implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk. The Processor shall assist the Controller in ensuring compliance with GDPR obligations.',
      category: 'Data Protection',
      subcategory: 'GDPR',
      tags: ['gdpr', 'data protection', 'privacy', 'personal data'],
      jurisdiction: 'European Union',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    {
      title: 'Data Security Requirements',
      content: 'The Service Provider shall implement and maintain appropriate technical and organizational security measures to protect personal data against unauthorized or unlawful processing, accidental loss, destruction, or damage. Such measures shall include: encryption, access controls, regular security assessments, and incident response procedures.',
      category: 'Data Protection',
      subcategory: 'Security',
      tags: ['data security', 'technical measures', 'encryption'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    // Warranty Clauses
    {
      title: 'Limited Warranty',
      content: 'The Service Provider warrants that the services will be performed in a professional and workmanlike manner consistent with industry standards. This warranty is exclusive and in lieu of all other warranties, whether express, implied, or statutory, including any warranties of merchantability or fitness for a particular purpose.',
      category: 'Warranty',
      subcategory: 'Limited',
      tags: ['warranty', 'limited', 'services'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    {
      title: 'Warranty Disclaimer',
      content: 'EXCEPT AS EXPRESSLY SET FORTH IN THIS AGREEMENT, THE PARTIES DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, OR NON-INFRINGEMENT.',
      category: 'Warranty',
      subcategory: 'Disclaimer',
      tags: ['warranty', 'disclaimer', 'as-is'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    // Service Level Clauses
    {
      title: 'SLA - Standard Uptime',
      content: 'The Service Provider guarantees an uptime availability of {{uptime_percentage}}% per calendar month, excluding scheduled maintenance. For each 0.1% below the guaranteed uptime, the Client shall receive a service credit of {{credit_percentage}}% of the monthly service fee.',
      category: 'Service Level',
      subcategory: 'Uptime',
      tags: ['sla', 'uptime', 'availability', 'service level'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    {
      title: 'Response Time SLA',
      content: 'The Service Provider agrees to the following response time commitments: Critical issues - {{critical_response}} hours; High priority - {{high_response}} hours; Medium priority - {{medium_response}} hours; Low priority - {{low_response}} hours. Response time is measured from the time of issue submission.',
      category: 'Service Level',
      subcategory: 'Response Time',
      tags: ['sla', 'response time', 'support', 'priority'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    // Assignment Clauses
    {
      title: 'Assignment - Restricted',
      content: 'Neither party may assign or transfer this Agreement or any rights or obligations hereunder without the prior written consent of the other party, except that either party may assign this Agreement to an affiliate or in connection with a merger, acquisition, or sale of substantially all of its assets.',
      category: 'Assignment',
      subcategory: 'Restricted',
      tags: ['assignment', 'transfer', 'restriction'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    {
      title: 'Assignment - Free',
      content: 'Either party may assign this Agreement to any successor or assign without the prior written consent of the other party, provided that the assignee agrees to be bound by the terms of this Agreement. Notice of such assignment shall be provided within {{notice_days}} days.',
      category: 'Assignment',
      subcategory: 'Free',
      tags: ['assignment', 'free', 'successor'],
      jurisdiction: 'Universal',
      isStandard: false,
      riskLevel: 'medium',
      usageCount: 0,
    },
    // Insurance Clauses
    {
      title: 'Insurance Requirements',
      content: 'The Service Provider shall maintain the following insurance coverage throughout the term of this Agreement: (a) Commercial General Liability insurance with minimum coverage of {{gl_coverage}}; (b) Professional Liability/Errors and Omissions insurance with minimum coverage of {{pl_coverage}}; (c) Workers\' Compensation insurance as required by law.',
      category: 'Insurance',
      subcategory: 'Requirements',
      tags: ['insurance', 'liability', 'coverage', 'requirements'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    // Notices Clauses
    {
      title: 'Notice Requirements',
      content: 'All notices required or permitted under this Agreement shall be in writing and shall be deemed delivered: (a) upon personal delivery; (b) upon confirmed transmission by email; (c) one (1) business day after deposit with a nationally recognized overnight courier; or (d) three (3) business days after mailing by certified mail to the addresses specified in this Agreement.',
      category: 'Notices',
      subcategory: 'Requirements',
      tags: ['notices', 'communication', 'delivery'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    // Relationship Clauses
    {
      title: 'Independent Contractor Relationship',
      content: 'The Service Provider is an independent contractor and not an employee, agent, or representative of the Client. Nothing in this Agreement shall be construed to create a partnership, joint venture, or employment relationship. The Service Provider shall not have authority to bind the Client or incur any obligations on its behalf.',
      category: 'Relationship',
      subcategory: 'Independent Contractor',
      tags: ['independent contractor', 'relationship', 'employment'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    {
      title: 'No Exclusivity',
      content: 'This Agreement does not grant either party exclusivity in the relevant market. Either party may engage in similar arrangements with other parties, subject to any confidentiality or non-compete obligations contained herein.',
      category: 'Relationship',
      subcategory: 'Exclusivity',
      tags: ['exclusivity', 'non-exclusive', 'open'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
    // Audit Clauses
    {
      title: 'Audit Rights',
      content: 'The Client shall have the right to audit the Service Provider\'s records and systems related to this Agreement upon reasonable notice and during normal business hours. The Service Provider shall cooperate with any such audit and provide access to relevant personnel, records, and systems. Audits shall not occur more than {{audit_frequency}} times per year.',
      category: 'Audit',
      subcategory: 'Rights',
      tags: ['audit', 'inspection', 'records', 'access'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'medium',
      usageCount: 0,
    },
    // Publicity Clauses
    {
      title: 'No Publicity Without Consent',
      content: 'Neither party shall use the other party\'s name, logo, trademarks, or other identifying information in any publicity, advertising, or promotional materials without the prior written consent of the other party.',
      category: 'Publicity',
      subcategory: 'Restrictions',
      tags: ['publicity', 'marketing', 'consent', 'logo'],
      jurisdiction: 'Universal',
      isStandard: true,
      riskLevel: 'low',
      usageCount: 0,
    },
  ];

  // Initialize all default clauses
  defaultClauses.forEach((clause) => {
    const fullClause: ClauseLibraryItem = {
      id: `clause-lib-${uuidv4()}`,
      title: clause.title!,
      content: clause.content!,
      category: clause.category!,
      subcategory: clause.subcategory,
      tags: clause.tags!,
      jurisdiction: clause.jurisdiction,
      isStandard: clause.isStandard!,
      riskLevel: clause.riskLevel,
      effectiveFrom: new Date().toISOString(),
      version: 1,
      usageCount: clause.usageCount!,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    clauseStore.set(fullClause.id, fullClause);
  });
};

// Initialize default clauses
initializeDefaultClauses();

// Clause Library Service Functions
export const clauseLibraryService = {
  // List all clauses
  listClauses: (options: {
    category?: string;
    subcategory?: string;
    tags?: string[];
    jurisdiction?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    isStandard?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): { clauses: ClauseLibraryItem[]; total: number } => {
    let result = Array.from(clauseStore.values());

    if (options.category) {
      result = result.filter(c => c.category === options.category);
    }
    if (options.subcategory) {
      result = result.filter(c => c.subcategory === options.subcategory);
    }
    if (options.tags && options.tags.length > 0) {
      result = result.filter(c => options.tags!.some(tag => c.tags.includes(tag)));
    }
    if (options.jurisdiction) {
      result = result.filter(c => c.jurisdiction === options.jurisdiction || c.jurisdiction === 'Universal');
    }
    if (options.riskLevel) {
      result = result.filter(c => c.riskLevel === options.riskLevel);
    }
    if (options.isStandard !== undefined) {
      result = result.filter(c => c.isStandard === options.isStandard);
    }
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(searchLower) ||
        c.content.toLowerCase().includes(searchLower) ||
        c.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    const total = result.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    result = result.slice(offset, offset + limit);

    return { clauses: result, total };
  },

  // Get single clause
  getClause: (id: string): ClauseLibraryItem | undefined => {
    return clauseStore.get(id);
  },

  // Create new clause
  createClause: (clause: Partial<ClauseLibraryItem>): ClauseLibraryItem => {
    const newClause: ClauseLibraryItem = {
      id: `clause-lib-${uuidv4()}`,
      title: clause.title || 'Untitled Clause',
      content: clause.content || '',
      category: clause.category || 'General',
      subcategory: clause.subcategory,
      tags: clause.tags || [],
      jurisdiction: clause.jurisdiction,
      isStandard: clause.isStandard ?? false,
      riskLevel: clause.riskLevel,
      version: 1,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: clause.createdBy,
    };
    clauseStore.set(newClause.id, newClause);
    console.log(`[CLAUSE] Created: ${newClause.id} - ${newClause.title}`);
    return newClause;
  },

  // Update clause
  updateClause: (id: string, updates: Partial<ClauseLibraryItem>): ClauseLibraryItem | undefined => {
    const clause = clauseStore.get(id);
    if (!clause) return undefined;

    const updatedClause: ClauseLibraryItem = {
      ...clause,
      ...updates,
      id: clause.id,
      version: clause.version + 1,
      updatedAt: new Date().toISOString(),
    };
    clauseStore.set(id, updatedClause);
    console.log(`[CLAUSE] Updated: ${id}`);
    return updatedClause;
  },

  // Delete clause
  deleteClause: (id: string): boolean => {
    const deleted = clauseStore.delete(id);
    if (deleted) {
      console.log(`[CLAUSE] Deleted: ${id}`);
    }
    return deleted;
  },

  // Increment usage count
  incrementUsage: (id: string): void => {
    const clause = clauseStore.get(id);
    if (clause) {
      clause.usageCount++;
      clause.lastUsedAt = new Date().toISOString();
      clauseStore.set(id, clause);
    }
  },

  // Get categories
  getCategories: (): string[] => {
    const categories = new Set<string>();
    clauseStore.forEach(c => categories.add(c.category));
    return Array.from(categories);
  },

  // Get subcategories for a category
  getSubcategories: (category: string): string[] => {
    const subcategories = new Set<string>();
    clauseStore.forEach(c => {
      if (c.category === category && c.subcategory) {
        subcategories.add(c.subcategory);
      }
    });
    return Array.from(subcategories);
  },

  // Get all tags
  getAllTags: (): string[] => {
    const tags = new Set<string>();
    clauseStore.forEach(c => c.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  },

  // Get jurisdictions
  getJurisdictions: (): string[] => {
    const jurisdictions = new Set<string>();
    clauseStore.forEach(c => jurisdictions.add(c.jurisdiction || 'Universal'));
    return Array.from(jurisdictions);
  },

  // Get popular clauses
  getPopularClauses: (limit: number = 10): ClauseLibraryItem[] => {
    return Array.from(clauseStore.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  },

  // Get clauses by category
  getByCategory: (category: string): ClauseLibraryItem[] => {
    return Array.from(clauseStore.values()).filter(c => c.category === category);
  },

  // Get standard clauses
  getStandardClauses: (): ClauseLibraryItem[] => {
    return Array.from(clauseStore.values()).filter(c => c.isStandard);
  },

  // Search clauses
  searchClauses: (query: string): ClauseLibraryItem[] => {
    const queryLower = query.toLowerCase();
    return Array.from(clauseStore.values()).filter(c =>
      c.title.toLowerCase().includes(queryLower) ||
      c.content.toLowerCase().includes(queryLower) ||
      c.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
      c.category.toLowerCase().includes(queryLower)
    );
  },

  // Render clause with variables
  renderClause: (clauseId: string, variableValues: Record<string, string>): string | undefined => {
    const clause = clauseStore.get(clauseId);
    if (!clause) return undefined;

    let rendered = clause.content;
    Object.entries(variableValues).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value);
    });

    return rendered;
  },
};

export default clauseLibraryService;
