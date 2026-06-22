/**
 * Document Assistant Agent
 * AI-powered document drafting and analysis
 */

import { DocumentService } from '../services/document-service.js';
import { ContractService } from '../services/contract-service.js';

export interface DocumentDraft {
  title: string;
  content: string;
  type: string;
  suggestions: string[];
  estimatedTime: string;
}

export interface DocumentAnalysis {
  documentId: string;
  summary: string;
  keyClauses: string[];
  risks: string[];
  recommendations: string[];
  complianceFlags: string[];
}

export class DocumentAssistantAgent {
  private documentService: DocumentService;
  private contractService: ContractService;
  private name = 'Document Assistant';
  private capabilities = [
    'Contract drafting',
    'Document review',
    'Clause library',
    'Template generation',
    'Version control'
  ];

  // Document templates
  private templates: Map<string, any> = new Map([
    ['nda', {
      name: 'Non-Disclosure Agreement',
      category: 'confidentiality',
      keyClauses: ['Definition of Confidential Information', 'Obligations of Receiving Party', 'Term', 'Return of Information']
    }],
    ['service', {
      name: 'Service Agreement',
      category: 'services',
      keyClauses: ['Scope of Services', 'Compensation', 'Term', 'Intellectual Property', 'Confidentiality']
    }],
    ['employment', {
      name: 'Employment Contract',
      category: 'employment',
      keyClauses: ['Position', 'Compensation', 'Benefits', 'Working Hours', 'Termination']
    }],
    ['lease', {
      name: 'Lease Agreement',
      category: 'property',
      keyClauses: ['Premises', 'Term', 'Rent', 'Maintenance', 'Utilities']
    }]
  ]);

  constructor(documentService: DocumentService, contractService: ContractService) {
    this.documentService = documentService;
    this.contractService = contractService;
  }

  /**
   * Draft a document based on type and context
   */
  async draftDocument(type: string, context: any): Promise<DocumentDraft> {
    const template = this.templates.get(type);

    if (!template) {
      throw new Error(`Unknown document type: ${type}`);
    }

    const content = this.generateDocumentContent(type, template, context);
    const suggestions = this.generateSuggestions(type, context);

    return {
      title: context.title || `${template.name} - Draft`,
      content,
      type,
      suggestions,
      estimatedTime: this.estimateDraftTime(type)
    };
  }

  /**
   * Analyze a document
   */
  async analyzeDocument(documentId: string): Promise<DocumentAnalysis> {
    const document = await this.documentService.getDocument(documentId);

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    const content = document.content;

    // Extract key clauses
    const keyClauses = this.extractKeyClauses(content);

    // Identify risks
    const risks = this.identifyRisks(content, document.type);

    // Check compliance
    const complianceFlags = this.checkCompliance(content, document.type);

    // Generate recommendations
    const recommendations = this.generateRecommendations(document.type, risks, complianceFlags);

    return {
      documentId: document.documentId,
      summary: this.generateSummary(document),
      keyClauses,
      risks,
      recommendations,
      complianceFlags
    };
  }

  /**
   * Generate document content from template
   */
  private generateDocumentContent(type: string, template: any, context: any): string {
    let content = `# ${context.title || template.name}\n\n`;

    switch (type) {
      case 'nda':
        content += `This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of ${context.effectiveDate || new Date().toLocaleDateString()} between:\n\n`;
        content += `**Party A:** ${context.partyAName || '[Party A Name]'}\n`;
        content += `**Party B:** ${context.partyBName || '[Party B Name]'}\n\n`;
        content += `## 1. DEFINITION OF CONFIDENTIAL INFORMATION\n`;
        content += `Confidential Information means any non-public information disclosed by either party, whether orally or in writing, that is designated as confidential.\n\n`;
        content += `## 2. OBLIGATIONS\n`;
        content += `The Receiving Party agrees to:\n- Hold all Confidential Information in strict confidence\n- Not disclose to third parties without prior written consent\n- Use solely for evaluating the proposed business relationship\n\n`;
        content += `## 3. TERM\n`;
        content += `This Agreement shall remain in effect for ${context.term || '2'} years from the Effective Date.\n\n`;
        content += `## 4. RETURN OF INFORMATION\n`;
        content += `Upon termination, the Receiving Party shall return or destroy all Confidential Information.\n\n`;
        break;

      case 'service':
        content += `SERVICE AGREEMENT\n\n`;
        content += `This Service Agreement is entered into as of ${context.effectiveDate || new Date().toLocaleDateString()} between:\n\n`;
        content += `**Service Provider:** ${context.providerName || '[Provider Name]'}\n`;
        content += `**Client:** ${context.clientName || '[Client Name]'}\n\n`;
        content += `## 1. SERVICES\n`;
        content += `${context.serviceDescription || 'The Service Provider agrees to provide professional services as mutually agreed.'}\n\n`;
        content += `## 2. COMPENSATION\n`;
        content += `Client agrees to pay ${context.rate || '[Amount]'} per ${context.rateUnit || 'month'}.\n\n`;
        content += `## 3. TERM\n`;
        content += `This Agreement commences on ${context.startDate || '[Start Date]'} and continues until ${context.endDate || '[End Date]'}.\n\n`;
        break;

      case 'employment':
        content += `EMPLOYMENT AGREEMENT\n\n`;
        content += `This Agreement is made on ${context.effectiveDate || new Date().toLocaleDateString()}:\n\n`;
        content += `**Employer:** ${context.employerName || '[Employer Name]'}\n`;
        content += `**Employee:** ${context.employeeName || '[Employee Name]'}\n\n`;
        content += `## 1. POSITION\n`;
        content += `Employee is hired as ${context.position || '[Job Title]'}.\n\n`;
        content += `## 2. COMPENSATION\n`;
        content += `Salary: ${context.salary || '[Amount]'} per annum\n\n`;
        content += `## 3. PROBATION\n`;
        content += `Probation period: ${context.probation || '3'} months\n\n`;
        break;

      default:
        content += `## GENERAL TERMS\n\n`;
        content += `${context.content || 'Terms and conditions to be added.'}\n`;
    }

    content += `\n---\n\n**Signatures:**\n\n_________________________     _________________________\n`;
    content += `${context.partyAName || '[Party A]'}             ${context.partyBName || '[Party B]'}\n`;
    content += `Date: ________________     Date: ________________\n`;

    return content;
  }

  /**
   * Extract key clauses from document
   */
  private extractKeyClauses(content: string): string[] {
    const clauses: string[] = [];

    const clausePatterns = [
      /confidential/i,
      /indemnif/i,
      /termination/i,
      /liability/i,
      /intellectual property/i,
      /payment/i,
      /term/i,
      /warrant/i
    ];

    clausePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        const match = content.match(new RegExp(`(${pattern.source}[\\s\\S]{0,50})`, 'i'));
        if (match) {
          clauses.push(match[0].trim().substring(0, 80));
        }
      }
    });

    return clauses.slice(0, 8);
  }

  /**
   * Identify risks in document
   */
  private identifyRisks(content: string, type: string): string[] {
    const risks: string[] = [];

    // Check for problematic clauses
    if (/unlimited liability/i.test(content)) {
      risks.push('Unlimited liability clause detected - may expose to significant risk');
    }

    if (/perpetual/i.test(content)) {
      risks.push('Perpetual obligation detected - may not be enforceable');
    }

    if (/waive.*rights/i.test(content)) {
      risks.push('Waiver of rights clause - review carefully');
    }

    if (/auto-renew/i.test(content) && !/cancellation.*notice/i.test(content)) {
      risks.push('Auto-renewal without clear cancellation terms');
    }

    if (/indemnif.*any.*whatsoever/i.test(content)) {
      risks.push('Broad indemnification clause - consider limiting scope');
    }

    // Type-specific risks
    if (type === 'employment') {
      if (!/termination.*notice/i.test(content)) {
        risks.push('No clear termination notice period defined');
      }
    }

    return risks.length > 0 ? risks : ['No significant risks identified'];
  }

  /**
   * Check compliance flags
   */
  private checkCompliance(content: string, type: string): string[] {
    const flags: string[] = [];

    // Check for GDPR-like clauses
    if (/personal data/i.test(content) && !/consent/i.test(content)) {
      flags.push('Personal data processing without explicit consent clause');
    }

    // Check for payment terms
    if (type === 'service' && !/payment.*terms/i.test(content)) {
      flags.push('Payment terms not clearly defined');
    }

    // Check for jurisdiction
    if (!/jurisdiction/i.test(content) && !/governing law/i.test(content)) {
      flags.push('No governing law or jurisdiction clause');
    }

    return flags.length > 0 ? flags : ['Document appears compliant'];
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(type: string, risks: string[], complianceFlags: string[]): string[] {
    const recommendations: string[] = [];

    if (risks.length > 2) {
      recommendations.push('Consider having senior counsel review high-risk clauses');
    }

    if (complianceFlags.length > 0) {
      recommendations.push('Address compliance flags before finalizing');
    }

    if (type === 'service') {
      recommendations.push('Include detailed scope of work and deliverables');
    }

    recommendations.push('Ensure all parties have adequate time to review');

    return recommendations;
  }

  /**
   * Generate summary
   */
  private generateSummary(document: any): string {
    return `${document.type.charAt(0).toUpperCase() + document.type.slice(1)} document: "${document.title}". Status: ${document.status}. Contains ${document.versions.length} version(s).`;
  }

  /**
   * Generate suggestions for document
   */
  private generateSuggestions(type: string, context: any): string[] {
    const suggestions: string[] = [];

    suggestions.push('Review with all parties before signing');
    suggestions.push('Save signed copy in secure location');

    if (type === 'nda') {
      suggestions.push('Ensure definition of Confidential Information is clear and not overly broad');
    }

    if (type === 'service') {
      suggestions.push('Include payment schedule and penalty clauses');
    }

    return suggestions;
  }

  /**
   * Estimate draft time
   */
  private estimateDraftTime(type: string): string {
    switch (type) {
      case 'nda': return '15-30 minutes';
      case 'service': return '1-2 hours';
      case 'employment': return '30-45 minutes';
      case 'lease': return '45-60 minutes';
      default: return '30-60 minutes';
    }
  }

  // Agent info
  getInfo() {
    return {
      name: this.name,
      capabilities: this.capabilities,
      status: 'active'
    };
  }
}

export default DocumentAssistantAgent;
