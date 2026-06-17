/**
 * LegalProfile Model
 * Represents a legal entity's profile in the RTMN ecosystem
 */

export interface LegalEntity {
  id: string;
  type: 'individual' | 'corporation' | 'partnership' | 'llc' | 'nonprofit';
  name: string;
  email: string;
  phone?: string;
  address: Address;
  taxId?: string;
  registrationNumber?: string;
  jurisdiction: string;
  industry?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Contract {
  id: string;
  profileId: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  parties: ContractParty[];
  terms: ContractTerms;
  effectiveDate?: Date;
  expirationDate?: Date;
  renewalDate?: Date;
  value?: number;
  currency?: string;
  documents: string[];
  milestones: ContractMilestone[];
  complianceRequirements: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type ContractType =
  | 'service_agreement'
  | 'nda'
  | 'employment'
  | 'lease'
  | 'partnership'
  | 'licensing'
  | 'sales'
  | 'consulting'
  | 'vendor'
  | 'customer'
  | 'other';

export type ContractStatus =
  | 'draft'
  | 'pending_review'
  | 'pending_signature'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'terminated'
  | 'renewed';

export interface ContractParty {
  id: string;
  name: string;
  type: 'individual' | 'organization';
  email: string;
  role: 'client' | 'vendor' | 'partner' | 'employee' | 'contractor';
  signedAt?: Date;
  signature?: string;
}

export interface ContractTerms {
  paymentTerms?: string;
  deliveryTerms?: string;
  terminationClause?: string;
  confidentialityPeriod?: number;
  jurisdiction?: string;
  governingLaw?: string;
  disputeResolution?: string;
  customTerms?: Record<string, any>;
}

export interface ContractMilestone {
  id: string;
  name: string;
  description?: string;
  dueDate?: Date;
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  notificationSent?: boolean;
}

export interface ComplianceItem {
  id: string;
  profileId: string;
  contractId?: string;
  type: ComplianceType;
  category: string;
  title: string;
  description: string;
  requirement: string;
  status: ComplianceStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: Date;
  completedAt?: Date;
  evidence?: string[];
  notes?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ComplianceType =
  | 'regulatory'
  | 'contractual'
  | 'financial'
  | 'operational'
  | 'data_protection'
  | 'environmental'
  | 'labor'
  | 'tax'
  | 'licensing'
  | 'insurance';

export type ComplianceStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'compliant'
  | 'partially_compliant'
  | 'non_compliant'
  | 'waived'
  | 'expired';

export interface LegalDocument {
  id: string;
  profileId: string;
  contractId?: string;
  type: DocumentType;
  title: string;
  description?: string;
  filePath?: string;
  content?: string;
  templateId?: string;
  version: string;
  status: DocumentStatus;
  signatories: string[];
  signatures: DocumentSignature[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export type DocumentType =
  | 'contract'
  | 'amendment'
  | 'addendum'
  | 'nda'
  | 'agreement'
  | 'policy'
  | 'certificate'
  | 'report'
  | 'correspondence'
  | 'other';

export type DocumentStatus =
  | 'draft'
  | 'review'
  | 'pending_signature'
  | 'executed'
  | 'archived'
  | 'expired'
  | 'revoked';

export interface DocumentSignature {
  partyId: string;
  partyName: string;
  signedAt?: Date;
  signature?: string;
  ipAddress?: string;
  method?: 'digital' | 'physical' | 'electronic';
  status: 'pending' | 'signed' | 'rejected';
}

// In-memory storage for demo
export class LegalProfileStore {
  private profiles: Map<string, LegalEntity> = new Map();
  private contracts: Map<string, Contract> = new Map();
  private complianceItems: Map<string, ComplianceItem> = new Map();
  private documents: Map<string, LegalDocument> = new Map();

  // Profile methods
  createProfile(profile: Omit<LegalEntity, 'id' | 'createdAt' | 'updatedAt'>): LegalEntity {
    const now = new Date();
    const newProfile: LegalEntity = {
      ...profile,
      id: `LP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    };
    this.profiles.set(newProfile.id, newProfile);
    return newProfile;
  }

  getProfile(id: string): LegalEntity | undefined {
    return this.profiles.get(id);
  }

  getAllProfiles(): LegalEntity[] {
    return Array.from(this.profiles.values());
  }

  updateProfile(id: string, updates: Partial<LegalEntity>): LegalEntity | undefined {
    const profile = this.profiles.get(id);
    if (!profile) return undefined;
    const updated = { ...profile, ...updates, updatedAt: new Date() };
    this.profiles.set(id, updated);
    return updated;
  }

  // Contract methods
  createContract(contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Contract {
    const now = new Date();
    const newContract: Contract = {
      ...contract,
      id: `CTR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    };
    this.contracts.set(newContract.id, newContract);
    return newContract;
  }

  getContract(id: string): Contract | undefined {
    return this.contracts.get(id);
  }

  getContractsByProfile(profileId: string): Contract[] {
    return Array.from(this.contracts.values()).filter(c => c.profileId === profileId);
  }

  getAllContracts(): Contract[] {
    return Array.from(this.contracts.values());
  }

  updateContract(id: string, updates: Partial<Contract>): Contract | undefined {
    const contract = this.contracts.get(id);
    if (!contract) return undefined;
    const updated = { ...contract, ...updates, updatedAt: new Date() };
    this.contracts.set(id, updated);
    return updated;
  }

  // Compliance methods
  createComplianceItem(item: Omit<ComplianceItem, 'id' | 'createdAt' | 'updatedAt'>): ComplianceItem {
    const now = new Date();
    const newItem: ComplianceItem = {
      ...item,
      id: `CMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    };
    this.complianceItems.set(newItem.id, newItem);
    return newItem;
  }

  getComplianceItem(id: string): ComplianceItem | undefined {
    return this.complianceItems.get(id);
  }

  getComplianceByProfile(profileId: string): ComplianceItem[] {
    return Array.from(this.complianceItems.values()).filter(c => c.profileId === profileId);
  }

  getComplianceByContract(contractId: string): ComplianceItem[] {
    return Array.from(this.complianceItems.values()).filter(c => c.contractId === contractId);
  }

  getAllComplianceItems(): ComplianceItem[] {
    return Array.from(this.complianceItems.values());
  }

  updateComplianceItem(id: string, updates: Partial<ComplianceItem>): ComplianceItem | undefined {
    const item = this.complianceItems.get(id);
    if (!item) return undefined;
    const updated = { ...item, ...updates, updatedAt: new Date() };
    this.complianceItems.set(id, updated);
    return updated;
  }

  // Document methods
  createDocument(doc: Omit<LegalDocument, 'id' | 'createdAt' | 'updatedAt'>): LegalDocument {
    const now = new Date();
    const newDoc: LegalDocument = {
      ...doc,
      id: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    };
    this.documents.set(newDoc.id, newDoc);
    return newDoc;
  }

  getDocument(id: string): LegalDocument | undefined {
    return this.documents.get(id);
  }

  getDocumentsByProfile(profileId: string): LegalDocument[] {
    return Array.from(this.documents.values()).filter(d => d.profileId === profileId);
  }

  getDocumentsByContract(contractId: string): LegalDocument[] {
    return Array.from(this.documents.values()).filter(d => d.contractId === contractId);
  }

  getAllDocuments(): LegalDocument[] {
    return Array.from(this.documents.values());
  }

  updateDocument(id: string, updates: Partial<LegalDocument>): LegalDocument | undefined {
    const doc = this.documents.get(id);
    if (!doc) return undefined;
    const updated = { ...doc, ...updates, updatedAt: new Date() };
    this.documents.set(id, updated);
    return updated;
  }
}

// Singleton instance
export const legalProfileStore = new LegalProfileStore();
