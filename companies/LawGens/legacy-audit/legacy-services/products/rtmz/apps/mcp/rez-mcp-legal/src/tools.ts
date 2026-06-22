// Tool definitions for Legal AI MCP Server
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface AnalyzeDocumentParams {
  content?: string;
  documentUrl?: string;
  documentType?: string;
}

export interface ExtractClausesParams {
  documentId: string;
}

export interface AssessRiskParams {
  documentId: string;
}

export interface CheckComplianceParams {
  documentId: string;
  framework?: string;
}

export interface AskQuestionParams {
  question: string;
  context?: string;
}

function generateDocumentId(): string {
  return `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function generateMockAnalysis(): {
  documentId: string;
  summary: string;
  documentType: string;
  keyEntities: string[];
  sentiment: string;
  language: string;
  wordCount: number;
  keyDates: string[];
  obligations: string[];
} {
  return {
    documentId: generateDocumentId(),
    summary: 'This legal document outlines a service agreement between two parties, establishing terms for software development services, payment schedules, confidentiality obligations, and termination conditions.',
    documentType: 'Service Agreement',
    keyEntities: [
      'TechCorp Solutions Pvt. Ltd.',
      'Acme Corporation',
      'Indian Contract Act, 1872',
      'IT Act, 2000'
    ],
    sentiment: 'neutral',
    language: 'en',
    wordCount: 2450,
    keyDates: [
      'Effective Date: 2026-01-01',
      'Renewal Date: 2027-01-01',
      'Notice Period: 30 days'
    ],
    obligations: [
      'Service Provider to deliver agreed milestones',
      'Client to provide timely feedback and resources',
      'Both parties to maintain confidentiality',
      'Payment within 30 days of invoice'
    ]
  };
}

function generateMockClauses(): Array<{
  id: string;
  type: string;
  title: string;
  content: string;
  riskLevel: string;
  implications: string[];
}> {
  return [
    {
      id: 'CL-001',
      type: 'confidentiality',
      title: 'Confidentiality',
      content: 'Both parties agree to maintain strict confidentiality of all proprietary information exchanged during the term of this agreement.',
      riskLevel: 'low',
      implications: ['Standard NDA clause', 'Survives termination for 2 years']
    },
    {
      id: 'CL-002',
      type: 'payment',
      title: 'Payment Terms',
      content: 'Client agrees to pay all invoices within 30 days of receipt. Late payments shall incur interest at 1.5% per month.',
      riskLevel: 'medium',
      implications: ['Penalty clause for late payment', 'May affect cash flow if strictly enforced']
    },
    {
      id: 'CL-003',
      type: 'termination',
      title: 'Termination',
      content: 'Either party may terminate this agreement with 30 days written notice. In case of breach, the non-breaching party may terminate immediately.',
      riskLevel: 'low',
      implications: ['Standard termination clause', 'Provides flexibility for both parties']
    },
    {
      id: 'CL-004',
      type: 'liability',
      title: 'Limitation of Liability',
      content: 'Total liability under this agreement shall not exceed the total fees paid in the preceding 12 months.',
      riskLevel: 'high',
      implications: ['Caps liability to 1 year fees', 'May not cover all potential damages', 'Consider negotiating higher cap']
    },
    {
      id: 'CL-005',
      type: 'ip',
      title: 'Intellectual Property',
      content: 'All work product created shall be owned by the Client upon full payment.',
      riskLevel: 'medium',
      implications: ['Standard IP assignment', 'Ensure payment terms protect both parties']
    }
  ];
}

function generateMockRiskAssessment(): {
  overallRisk: string;
  riskScore: number;
  riskFactors: Array<{
    factor: string;
    severity: string;
    description: string;
    mitigation?: string;
  }>;
  recommendations: string[];
} {
  return {
    overallRisk: 'medium',
    riskScore: 45,
    riskFactors: [
      {
        factor: 'Liability Cap',
        severity: 'high',
        description: 'The liability cap may not adequately protect against all potential losses',
        mitigation: 'Consider negotiating a higher cap or specific carve-outs for negligence'
      },
      {
        factor: 'Termination Terms',
        severity: 'medium',
        description: 'Termination clause is balanced but may need clarity on cure periods',
        mitigation: 'Add explicit cure period before termination for breach'
      },
      {
        factor: 'Payment Terms',
        severity: 'medium',
        description: 'Late payment interest rate is relatively high',
        mitigation: 'Negotiate lower interest rate or remove entirely'
      },
      {
        factor: 'Confidentiality',
        severity: 'low',
        description: 'Standard confidentiality provisions are in place',
        mitigation: 'No changes needed'
      }
    ],
    recommendations: [
      'Review and potentially renegotiate liability cap terms',
      'Add explicit cure period for breach before termination',
      'Consider reducing late payment interest rate',
      'Ensure all deliverables are clearly defined in SOW',
      'Add dispute resolution clause with arbitration option'
    ]
  };
}

function generateMockCompliance(): {
  compliant: boolean;
  framework: string;
  violations: string[];
  suggestions: string[];
  lastAuditDate: string;
  nextAuditDate: string;
} {
  return {
    compliant: true,
    framework: 'GDPR',
    violations: [],
    suggestions: [
      'Consider adding explicit consent checkbox for data processing',
      'Implement automated data retention policy enforcement',
      'Add data processing addendum template'
    ],
    lastAuditDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    nextAuditDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]
  };
}

function generateMockLegalAnswer(question: string): {
  question: string;
  answer: string;
  confidence: number;
  sources: string[];
  relatedLaws: string[];
} {
  const answers: Record<string, { answer: string; laws: string[] }> = {
    default: {
      answer: 'Based on the query, the relevant legal considerations include contract formation requirements under the Indian Contract Act, 1872, specifically the principles of offer, acceptance, and consideration. For enforceability, the contract must be for lawful consideration, between competent parties, and not violate any existing laws.',
      laws: ['Indian Contract Act, 1872', 'Specific Relief Act, 1963']
    }
  };

  const q = question.toLowerCase();
  if (q.includes('liability') || q.includes('damages')) {
    return {
      question,
      answer: 'Under Indian law, liability for breach of contract is governed by Section 73-75 of the Indian Contract Act, 1872. The non-breaching party is entitled to compensation for any loss or damage naturally arising from the breach. Punitive damages are generally not awarded in contract cases in India.',
      confidence: 0.92,
      sources: ['Indian Contract Act, 1872', 'Hadley v. Baxendale principle'],
      relatedLaws: ['Indian Contract Act, 1872 (Sec 73-75)', 'Civil Procedure Code']
    };
  }
  if (q.includes('termination') || q.includes('breach')) {
    return {
      question,
      answer: 'Termination for breach requires clear identification of the specific breach. Generally, a party must provide notice and opportunity to cure before terminating. Section 39 of the Indian Contract Act addresses the effects of abandonment. For immediate termination, the breach must be material.',
      confidence: 0.89,
      sources: ['Indian Contract Act, 1872', 'Contract Law Principles'],
      relatedLaws: ['Indian Contract Act, 1872 (Sec 39)', 'Specific Relief Act']
    };
  }
  if (q.includes('data') || q.includes('privacy') || q.includes('gdpr')) {
    return {
      question,
      answer: 'Data protection in India is governed by the Digital Personal Data Protection Act, 2023 (DPDP Act). Key requirements include obtaining valid consent, ensuring data minimization, and providing data principal rights. For cross-border transfers, compliance with specific provisions of the DPDP Act is required.',
      confidence: 0.95,
      sources: ['Digital Personal Data Protection Act, 2023', 'IT Act, 2000'],
      relatedLaws: ['DPDP Act, 2023', 'IT Act, 2000', 'SPDI Guidelines']
    };
  }

  return {
    question,
    answer: answers.default.answer,
    confidence: 0.78,
    sources: ['Indian Contract Act, 1872', 'Legal Precedents'],
    relatedLaws: answers.default.laws
  };
}

export const tools: Tool[] = [
  {
    name: "analyze_document",
    description: "Analyze a legal document and extract key information including summary, entities, and obligations",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Text content of the document (optional)"
        },
        documentUrl: {
          type: "string",
          description: "URL to the document (optional)"
        },
        documentType: {
          type: "string",
          enum: ["contract", "agreement", "policy", "letter", "court_order", "other"],
          description: "Type of legal document"
        }
      }
    }
  },
  {
    name: "extract_clauses",
    description: "Extract and analyze individual clauses from a legal document",
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "ID of the document to analyze"
        }
      },
      required: ["documentId"]
    }
  },
  {
    name: "assess_risk",
    description: "Assess legal and business risks in a document",
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "ID of the document to assess"
        }
      },
      required: ["documentId"]
    }
  },
  {
    name: "check_compliance",
    description: "Check document compliance against legal frameworks",
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "ID of the document to check"
        },
        framework: {
          type: "string",
          enum: ["gdpr", "hipaa", "pci_dss", "sox", "iso27001", "custom"],
          description: "Compliance framework to check against"
        }
      },
      required: ["documentId"]
    }
  },
  {
    name: "ask_question",
    description: "Ask a legal question and get an AI-powered answer with sources",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "Legal question to ask"
        },
        context: {
          type: "string",
          description: "Additional context for the question (optional)"
        }
      },
      required: ["question"]
    }
  }
];

export const toolHandlers: Record<string, (params: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>> = {
  analyze_document: async (params) => {
    const analysis = generateMockAnalysis();
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          analysis,
          message: 'Document analyzed successfully'
        }, null, 2)
      }]
    };
  },

  extract_clauses: async (params) => {
    const { documentId } = params as unknown as ExtractClausesParams;
    const clauses = generateMockClauses();
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          documentId,
          clauses,
          summary: {
            totalClauses: clauses.length,
            highRisk: clauses.filter(c => c.riskLevel === 'high').length,
            mediumRisk: clauses.filter(c => c.riskLevel === 'medium').length,
            lowRisk: clauses.filter(c => c.riskLevel === 'low').length
          },
          message: `Extracted ${clauses.length} clauses from document`
        }, null, 2)
      }]
    };
  },

  assess_risk: async (params) => {
    const { documentId } = params as unknown as AssessRiskParams;
    const assessment = generateMockRiskAssessment();
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          documentId,
          assessment,
          message: 'Risk assessment completed'
        }, null, 2)
      }]
    };
  },

  check_compliance: async (params) => {
    const { documentId, framework } = params as unknown as CheckComplianceParams;
    const compliance = generateMockCompliance();
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          documentId,
          compliance: {
            ...compliance,
            framework: framework || 'GDPR'
          },
          message: compliance.compliant ? 'Document is compliant' : 'Document has compliance issues'
        }, null, 2)
      }]
    };
  },

  ask_question: async (params) => {
    const { question, context } = params as unknown as AskQuestionParams;
    const answer = generateMockLegalAnswer(question);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          answer,
          context: context || 'General legal query',
          message: 'Legal question answered'
        }, null, 2)
      }]
    };
  }
};
