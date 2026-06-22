// Tool definitions for Contract Management MCP Server
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface CreateContractParams {
  title: string;
  parties: string[];
  type: string;
  startDate: string;
  endDate: string;
  value?: number;
  content?: string;
}

export interface GetContractParams {
  contractId: string;
}

export interface UpdateContractParams {
  contractId: string;
  title?: string;
  parties?: string[];
  type?: string;
  startDate?: string;
  endDate?: string;
  value?: number;
  content?: string;
}

export interface SendForSignatureParams {
  contractId: string;
  signers: Array<{
    email: string;
    name: string;
    role: string;
  }>;
  message?: string;
}

export interface SignContractParams {
  signatureId: string;
  signerEmail: string;
}

export interface GetRenewalRemindersParams {
  daysAhead?: number;
}

function generateContractId(): string {
  return `CTR_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function generateMockContract(params: CreateContractParams): {
  id: string;
  title: string;
  parties: string[];
  status: string;
  startDate: string;
  endDate: string;
  value?: number;
  type: string;
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: generateContractId(),
    title: params.title,
    parties: params.parties,
    status: 'draft',
    startDate: params.startDate,
    endDate: params.endDate,
    value: params.value,
    type: params.type,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function generateMockContractDetail(contractId: string): {
  id: string;
  title: string;
  parties: Array<{ name: string; role: string; signed: boolean }>;
  status: string;
  startDate: string;
  endDate: string;
  value: number;
  type: string;
  clauses: string[];
  createdAt: string;
  updatedAt: string;
  versions: Array<{ version: number; createdAt: string; changes: string }>;
} {
  return {
    id: contractId,
    title: 'Service Agreement',
    parties: [
      { name: 'Company A', role: 'Service Provider', signed: true },
      { name: 'Company B', role: 'Client', signed: false }
    ],
    status: 'pending_signature',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    value: 500000,
    type: 'Service Agreement',
    clauses: [
      'Scope of Services',
      'Payment Terms',
      'Confidentiality',
      'Intellectual Property',
      'Termination',
      'Dispute Resolution'
    ],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    versions: [
      { version: 1, createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), changes: 'Initial draft' },
      { version: 2, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), changes: 'Updated payment terms' }
    ]
  };
}

export const tools: Tool[] = [
  {
    name: "create_contract",
    description: "Create a new contract with specified parties and terms",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title of the contract"
        },
        parties: {
          type: "array",
          items: { type: "string" },
          description: "List of party names involved in the contract"
        },
        type: {
          type: "string",
          enum: ["service_agreement", "nda", "employment", "lease", "partnership", "licensing", "other"],
          description: "Type of contract"
        },
        startDate: {
          type: "string",
          description: "Contract start date (YYYY-MM-DD)"
        },
        endDate: {
          type: "string",
          description: "Contract end date (YYYY-MM-DD)"
        },
        value: {
          type: "number",
          description: "Contract monetary value (optional)"
        },
        content: {
          type: "string",
          description: "Contract content or summary (optional)"
        }
      },
      required: ["title", "parties", "type", "startDate", "endDate"]
    }
  },
  {
    name: "get_contract",
    description: "Retrieve contract details by ID",
    inputSchema: {
      type: "object",
      properties: {
        contractId: {
          type: "string",
          description: "ID of the contract"
        }
      },
      required: ["contractId"]
    }
  },
  {
    name: "update_contract",
    description: "Update an existing contract's details",
    inputSchema: {
      type: "object",
      properties: {
        contractId: {
          type: "string",
          description: "ID of the contract to update"
        },
        title: {
          type: "string",
          description: "New title (optional)"
        },
        parties: {
          type: "array",
          items: { type: "string" },
          description: "Updated parties list (optional)"
        },
        type: {
          type: "string",
          description: "New contract type (optional)"
        },
        startDate: {
          type: "string",
          description: "New start date (optional)"
        },
        endDate: {
          type: "string",
          description: "New end date (optional)"
        },
        value: {
          type: "number",
          description: "New contract value (optional)"
        },
        content: {
          type: "string",
          description: "Updated content (optional)"
        }
      },
      required: ["contractId"]
    }
  },
  {
    name: "send_for_signature",
    description: "Send a contract for electronic signature",
    inputSchema: {
      type: "object",
      properties: {
        contractId: {
          type: "string",
          description: "ID of the contract to send"
        },
        signers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email: { type: "string" },
              name: { type: "string" },
              role: { type: "string" }
            },
            required: ["email", "name", "role"]
          },
          description: "List of signers with email, name, and role"
        },
        message: {
          type: "string",
          description: "Optional message to include in the signature request"
        }
      },
      required: ["contractId", "signers"]
    }
  },
  {
    name: "sign_contract",
    description: "Sign a contract with a signature ID",
    inputSchema: {
      type: "object",
      properties: {
        signatureId: {
          type: "string",
          description: "Signature request ID"
        },
        signerEmail: {
          type: "string",
          description: "Email of the signer"
        }
      },
      required: ["signatureId", "signerEmail"]
    }
  },
  {
    name: "get_renewal_reminders",
    description: "Get contracts expiring within the specified number of days",
    inputSchema: {
      type: "object",
      properties: {
        daysAhead: {
          type: "number",
          minimum: 1,
          maximum: 365,
          description: "Number of days ahead to check for renewals (default: 30)"
        }
      }
    }
  }
];

export const toolHandlers: Record<string, (params: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>> = {
  create_contract: async (params) => {
    const contract = generateMockContract(params as CreateContractParams);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          contract,
          message: `Contract '${contract.title}' created successfully`
        }, null, 2)
      }]
    };
  },

  get_contract: async (params) => {
    const { contractId } = params as GetContractParams;
    const contract = generateMockContractDetail(contractId);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          contract
        }, null, 2)
      }]
    };
  },

  update_contract: async (params) => {
    const { contractId, ...updates } = params as UpdateContractParams & { contractId: string };
    const contract = {
      id: contractId,
      ...generateMockContractDetail(contractId),
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          contract,
          message: 'Contract updated successfully'
        }, null, 2)
      }]
    };
  },

  send_for_signature: async (params) => {
    const { contractId, signers, message } = params as SendForSignatureParams;
    const signatureId = `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          signatureRequest: {
            signatureId,
            contractId,
            signers,
            message,
            status: 'sent',
            sentAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()
          },
          message: `Signature request sent to ${signers.length} signer(s)`
        }, null, 2)
      }]
    };
  },

  sign_contract: async (params) => {
    const { signatureId, signerEmail } = params as SignContractParams;
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          signature: {
            signatureId,
            signedBy: signerEmail,
            signedAt: new Date().toISOString(),
            status: 'signed'
          },
          message: 'Contract signed successfully'
        }, null, 2)
      }]
    };
  },

  get_renewal_reminders: async (params) => {
    const daysAhead = (params as GetRenewalRemindersParams).daysAhead || 30;
    const reminders = Array.from({ length: 3 }, (_, i) => ({
      id: `CTR_REM_${i + 1}`,
      title: `Contract ${['Service Agreement', 'NDA', 'License Agreement'][i]}`,
      parties: [[`Party ${i + 1}A`, `Party ${i + 1}B`][i % 2]],
      status: 'active',
      endDate: new Date(Date.now() + (i + 1) * 10 * 86400000).toISOString().split('T')[0],
      daysUntilExpiry: (i + 1) * 10,
      renewalValue: 100000 * (i + 1),
      autoRenewal: i % 2 === 0
    }));
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          reminders,
          summary: {
            totalExpiring: reminders.length,
            within7Days: reminders.filter(r => r.daysUntilExpiry <= 7).length,
            within30Days: reminders.filter(r => r.daysUntilExpiry <= 30).length,
            totalRenewalValue: reminders.reduce((sum, r) => sum + r.renewalValue, 0)
          },
          message: `Found ${reminders.length} contracts expiring within ${daysAhead} days`
        }, null, 2)
      }]
    };
  }
};
