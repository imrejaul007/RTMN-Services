/**
 * Contract Service
 * Business logic for contract lifecycle management
 */

import { v4 as uuidv4 } from 'uuid';

export interface Contract {
  contractId: string;
  title: string;
  type: 'nda' | 'service' | 'employment' | 'lease' | 'partnership' | 'other';
  content: string;
  parties: ContractParty[];
  startDate: string;
  endDate: string;
  value?: number;
  status: 'draft' | 'review' | 'pending-signature' | 'active' | 'expired' | 'terminated';
  clauses: ContractClause[];
  signatures: ContractSignature[];
  amendments: ContractAmendment[];
  renewals: ContractRenewal[];
  clientId?: string;
  caseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractParty {
  id: string;
  name: string;
  role: 'party-a' | 'party-b' | 'guarantor';
  email?: string;
  signed: boolean;
}

export interface ContractClause {
  id: string;
  title: string;
  content: string;
  category: string;
}

export interface ContractSignature {
  partyId: string;
  signatory: string;
  signedAt: string;
  ipAddress?: string;
}

export interface ContractAmendment {
  amendmentId: string;
  description: string;
  changes: Record<string, any>;
  effectiveDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ContractRenewal {
  renewalId: string;
  previousEndDate: string;
  newEndDate: string;
  newValue?: number;
  renewedAt: string;
}

export class ContractService {
  private contracts: Map<string, Contract> = new Map();

  async createContract(input: Partial<Contract>): Promise<Contract> {
    const contractId = uuidv4();
    const now = new Date().toISOString();

    const newContract: Contract = {
      contractId,
      title: input.title || 'Untitled Contract',
      type: input.type || 'other',
      content: input.content || '',
      parties: input.parties || [],
      startDate: input.startDate || now,
      endDate: input.endDate || '',
      value: input.value,
      status: 'draft',
      clauses: [],
      signatures: [],
      amendments: [],
      renewals: [],
      clientId: input.clientId,
      caseId: input.caseId,
      createdAt: now,
      updatedAt: now
    };

    this.contracts.set(contractId, newContract);
    return newContract;
  }

  async getContract(contractId: string): Promise<Contract | null> {
    return this.contracts.get(contractId) || null;
  }

  async updateContract(contractId: string, updates: Partial<Contract>): Promise<Contract | null> {
    const existingContract = this.contracts.get(contractId);
    if (!existingContract) return null;

    const updatedContract: Contract = {
      ...existingContract,
      ...updates,
      contractId: existingContract.contractId,
      updatedAt: new Date().toISOString()
    };

    this.contracts.set(contractId, updatedContract);
    return updatedContract;
  }

  async addSignature(contractId: string, partyId: string, signatory: string, ipAddress?: string): Promise<Contract | null> {
    const contract = this.contracts.get(contractId);
    if (!contract) return null;

    contract.signatures.push({
      partyId,
      signatory,
      signedAt: new Date().toISOString(),
      ipAddress
    });

    // Check if all parties have signed
    const allSigned = contract.parties.every(party =>
      contract.signatures.some(sig => sig.partyId === party.id)
    );

    if (allSigned) {
      contract.status = 'active';
    } else {
      contract.status = 'pending-signature';
    }

    contract.updatedAt = new Date().toISOString();
    this.contracts.set(contractId, contract);

    return contract;
  }

  async createAmendment(contractId: string, description: string, changes: Record<string, any>, effectiveDate: string): Promise<Contract | null> {
    const contract = this.contracts.get(contractId);
    if (!contract) return null;

    if (contract.status !== 'active') {
      throw new Error('Can only amend active contracts');
    }

    contract.amendments.push({
      amendmentId: uuidv4(),
      description,
      changes,
      effectiveDate,
      status: 'pending'
    });

    contract.updatedAt = new Date().toISOString();
    this.contracts.set(contractId, contract);

    return contract;
  }

  async renewContract(contractId: string, newEndDate: string, newValue?: number): Promise<Contract | null> {
    const contract = this.contracts.get(contractId);
    if (!contract) return null;

    contract.renewals.push({
      renewalId: uuidv4(),
      previousEndDate: contract.endDate,
      newEndDate,
      newValue,
      renewedAt: new Date().toISOString()
    });

    contract.endDate = newEndDate;
    if (newValue) contract.value = newValue;
    contract.updatedAt = new Date().toISOString();
    this.contracts.set(contractId, contract);

    return contract;
  }

  async getExpiringContracts(daysAhead: number = 30): Promise<Contract[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const expiring: Contract[] = [];

    this.contracts.forEach(contract => {
      if (contract.status === 'active') {
        const endDate = new Date(contract.endDate);
        if (endDate >= now && endDate <= futureDate) {
          expiring.push(contract);
        }
      }
    });

    return expiring.sort((a, b) =>
      new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    );
  }

  async searchContracts(query: string): Promise<Contract[]> {
    const results: Contract[] = [];
    const lowerQuery = query.toLowerCase();

    this.contracts.forEach(contract => {
      if (
        contract.title.toLowerCase().includes(lowerQuery) ||
        contract.parties.some(p => p.name.toLowerCase().includes(lowerQuery))
      ) {
        results.push(contract);
      }
    });

    return results;
  }
}

export default ContractService;
