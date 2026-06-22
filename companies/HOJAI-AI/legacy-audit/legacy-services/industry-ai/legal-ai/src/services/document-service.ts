/**
 * Document Service
 * Business logic for document management
 */

import { v4 as uuidv4 } from 'uuid';

export interface LegalDocument {
  documentId: string;
  title: string;
  type: 'contract' | 'pleading' | 'correspondence' | 'evidence' | 'general';
  content: string;
  caseId?: string;
  clientId?: string;
  status: 'draft' | 'review' | 'approved' | 'executed' | 'archived';
  tags: string[];
  metadata: Record<string, any>;
  versions: DocumentVersion[];
  signatures: Signature[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  versionId: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

export interface Signature {
  signatoryId: string;
  signatureData?: string;
  signedAt: string;
  ipAddress?: string;
}

export class DocumentService {
  private documents: Map<string, LegalDocument> = new Map();

  async createDocument(input: Partial<LegalDocument>): Promise<LegalDocument> {
    const documentId = uuidv4();
    const now = new Date().toISOString();

    const newDocument: LegalDocument = {
      documentId,
      title: input.title || 'Untitled Document',
      type: input.type || 'general',
      content: input.content || '',
      caseId: input.caseId,
      clientId: input.clientId,
      status: 'draft',
      tags: input.tags || [],
      metadata: input.metadata || {},
      versions: [{
        versionId: uuidv4(),
        content: input.content || '',
        createdAt: now,
        createdBy: 'system'
      }],
      signatures: [],
      createdAt: now,
      updatedAt: now
    };

    this.documents.set(documentId, newDocument);
    return newDocument;
  }

  async getDocument(documentId: string): Promise<LegalDocument | null> {
    return this.documents.get(documentId) || null;
  }

  async updateDocument(documentId: string, updates: Partial<LegalDocument>): Promise<LegalDocument | null> {
    const existingDoc = this.documents.get(documentId);
    if (!existingDoc) return null;

    const now = new Date().toISOString();

    // Track version if content changed
    if (updates.content && updates.content !== existingDoc.content) {
      existingDoc.versions.push({
        versionId: uuidv4(),
        content: existingDoc.content,
        createdAt: now,
        createdBy: 'system'
      });
    }

    const updatedDocument: LegalDocument = {
      ...existingDoc,
      ...updates,
      documentId: existingDoc.documentId,
      content: updates.content || existingDoc.content,
      updatedAt: now
    };

    this.documents.set(documentId, updatedDocument);
    return updatedDocument;
  }

  async addSignature(documentId: string, signatoryId: string, signatureData?: string, ipAddress?: string): Promise<LegalDocument | null> {
    const document = this.documents.get(documentId);
    if (!document) return null;

    document.signatures.push({
      signatoryId,
      signatureData,
      signedAt: new Date().toISOString(),
      ipAddress
    });

    // Update status if all parties have signed
    if (document.signatures.length >= 2) {
      document.status = 'executed';
    }

    document.updatedAt = new Date().toISOString();
    this.documents.set(documentId, document);

    return document;
  }

  async searchDocuments(query: string): Promise<LegalDocument[]> {
    const results: LegalDocument[] = [];
    const lowerQuery = query.toLowerCase();

    this.documents.forEach(doc => {
      if (
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.content.toLowerCase().includes(lowerQuery) ||
        doc.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      ) {
        results.push(doc);
      }
    });

    return results;
  }

  async getDocumentsByCase(caseId: string): Promise<LegalDocument[]> {
    const documents: LegalDocument[] = [];

    this.documents.forEach(doc => {
      if (doc.caseId === caseId) {
        documents.push(doc);
      }
    });

    return documents;
  }
}

export default DocumentService;
