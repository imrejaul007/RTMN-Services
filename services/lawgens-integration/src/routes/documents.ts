import { Router, Request, Response } from 'express';
import { legalProfileStore, LegalDocument } from '../models/LegalProfile';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { LegalSyncService } from '../services/legalSync';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

export function documentsRouter(
  customerOpsBridge: CustomerOpsBridge,
  legalSyncService: LegalSyncService,
  logger: winston.Logger
): Router {
  const router = Router();

  const storagePath = process.env.DOCUMENT_STORAGE_PATH || './documents';

  // Ensure storage directory exists
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  // Get all documents
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { profileId, contractId, type, status } = req.query;
      let documents = legalProfileStore.getAllDocuments();

      if (profileId) {
        documents = documents.filter(d => d.profileId === profileId);
      }
      if (contractId) {
        documents = documents.filter(d => d.contractId === contractId);
      }
      if (type) {
        documents = documents.filter(d => d.type === type);
      }
      if (status) {
        documents = documents.filter(d => d.status === status);
      }

      res.json({ documents, count: documents.length });
    } catch (error) {
      logger.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  // Get document by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const document = legalProfileStore.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      res.json(document);
    } catch (error) {
      logger.error('Error fetching document:', error);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  });

  // Create document
  router.post('/', async (req: Request, res: Response) => {
    try {
      const docData = req.body;

      // Validate required fields
      if (!docData.profileId || !docData.title || !docData.type) {
        return res.status(400).json({
          error: 'Missing required fields: profileId, title, type'
        });
      }

      const document = legalProfileStore.createDocument({
        ...docData,
        version: '1.0',
        status: 'draft',
        signatories: docData.signatories || [],
        signatures: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Save content to file if provided
      if (docData.content && docData.filePath) {
        const filePath = path.join(storagePath, `${document.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify({
          id: document.id,
          content: docData.content,
          createdAt: document.createdAt
        }, null, 2));
      }

      // Sync to Knowledge Twin
      await legalSyncService.syncDocumentToKnowledgeTwin(document);

      // Publish event
      await customerOpsBridge.publishEvent('document.created', {
        documentId: document.id,
        profileId: document.profileId,
        type: document.type,
        title: document.title
      });

      logger.info(`Document created: ${document.id}`);
      res.status(201).json(document);
    } catch (error) {
      logger.error('Error creating document:', error);
      res.status(500).json({ error: 'Failed to create document' });
    }
  });

  // Generate document from template
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const { templateId, profileId, contractId, data, title } = req.body;

      if (!templateId || !profileId) {
        return res.status(400).json({
          error: 'Missing required fields: templateId, profileId'
        });
      }

      // Generate document content from template
      const content = generateFromTemplate(templateId, data || {});

      const document = legalProfileStore.createDocument({
        profileId,
        contractId,
        type: getDocumentTypeFromTemplate(templateId),
        title: title || `Generated Document from ${templateId}`,
        description: `Auto-generated from template: ${templateId}`,
        content,
        templateId,
        version: '1.0',
        status: 'draft',
        signatories: [],
        signatures: []
      });

      // Sync to Knowledge Twin
      await legalSyncService.syncDocumentToKnowledgeTwin(document);

      logger.info(`Document generated from template ${templateId}: ${document.id}`);
      res.status(201).json(document);
    } catch (error) {
      logger.error('Error generating document:', error);
      res.status(500).json({ error: 'Failed to generate document' });
    }
  });

  // Update document
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const existing = legalProfileStore.getDocument(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const updates: Partial<LegalDocument> = { ...req.body };
      if (req.body.content) {
        const filePath = path.join(storagePath, `${existing.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify({
          id: existing.id,
          content: req.body.content,
          updatedAt: new Date()
        }, null, 2));
      }

      const updated = legalProfileStore.updateDocument(req.params.id, updates);
      if (!updated) {
        return res.status(500).json({ error: 'Failed to update document' });
      }

      // Sync to Knowledge Twin
      await legalSyncService.syncDocumentToKnowledgeTwin(updated);

      await customerOpsBridge.publishEvent('document.updated', {
        documentId: updated.id,
        changes: Object.keys(req.body)
      });

      logger.info(`Document updated: ${updated.id}`);
      res.json(updated);
    } catch (error) {
      logger.error('Error updating document:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  });

  // Add signature to document
  router.post('/:id/sign', async (req: Request, res: Response) => {
    try {
      const { partyId, partyName, signature, method } = req.body;
      const document = legalProfileStore.getDocument(req.params.id);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (!document.signatories.includes(partyId)) {
        return res.status(400).json({ error: 'Party not authorized to sign this document' });
      }

      const signatureRecord = {
        partyId,
        partyName,
        signedAt: new Date(),
        signature,
        method: method || 'digital',
        status: 'signed' as const
      };

      const existingSigIndex = document.signatures.findIndex(s => s.partyId === partyId);
      const signatures = [...document.signatures];
      if (existingSigIndex >= 0) {
        signatures[existingSigIndex] = signatureRecord;
      } else {
        signatures.push(signatureRecord);
      }

      // Check if all signatories have signed
      const allSigned = document.signatories.every(sig =>
        signatures.some(s => s.partyId === sig && s.status === 'signed')
      );

      const updated = legalProfileStore.updateDocument(req.params.id, {
        signatures,
        status: allSigned ? 'executed' : 'pending_signature'
      });

      await customerOpsBridge.publishEvent('document.signed', {
        documentId: document.id,
        partyId,
        allSigned,
        newStatus: updated!.status
      });

      logger.info(`Document ${document.id} signed by ${partyName}`);
      res.json({ document: updated, allSigned });
    } catch (error) {
      logger.error('Error signing document:', error);
      res.status(500).json({ error: 'Failed to sign document' });
    }
  });

  // Add signatory to document
  router.post('/:id/signatories', async (req: Request, res: Response) => {
    try {
      const document = legalProfileStore.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const { partyId, partyName } = req.body;
      if (document.signatories.includes(partyId)) {
        return res.status(400).json({ error: 'Signatory already exists' });
      }

      const updated = legalProfileStore.updateDocument(req.params.id, {
        signatories: [...document.signatories, partyId],
        signatures: [
          ...document.signatures,
          {
            partyId,
            partyName,
            status: 'pending' as const,
            method: 'pending' as const
          }
        ]
      });

      res.status(201).json({ addedSignatory: partyId });
    } catch (error) {
      logger.error('Error adding signatory:', error);
      res.status(500).json({ error: 'Failed to add signatory' });
    }
  });

  // Download document content
  router.get('/:id/content', async (req: Request, res: Response) => {
    try {
      const document = legalProfileStore.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const filePath = path.join(storagePath, `${document.id}.json`);
      if (fs.existsSync(filePath)) {
        const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        res.json({ content: fileContent.content, documentId: document.id });
      } else if (document.content) {
        res.json({ content: document.content, documentId: document.id });
      } else {
        res.status(404).json({ error: 'Document content not found' });
      }
    } catch (error) {
      logger.error('Error fetching document content:', error);
      res.status(500).json({ error: 'Failed to fetch document content' });
    }
  });

  // Get document templates
  router.get('/templates/list', async (req: Request, res: Response) => {
    const templates = [
      { id: 'nda_standard', name: 'Standard NDA', type: 'nda', category: 'confidentiality' },
      { id: 'nda_mutual', name: 'Mutual NDA', type: 'nda', category: 'confidentiality' },
      { id: 'service_agreement', name: 'Service Agreement', type: 'service_agreement', category: 'commercial' },
      { id: 'employment_contract', name: 'Employment Contract', type: 'employment', category: 'hr' },
      { id: 'vendor_contract', name: 'Vendor Contract', type: 'vendor', category: 'commercial' },
      { id: 'lease_agreement', name: 'Lease Agreement', type: 'lease', category: 'property' },
      { id: 'partnership_agreement', name: 'Partnership Agreement', type: 'partnership', category: 'commercial' },
      { id: 'consulting_agreement', name: 'Consulting Agreement', type: 'consulting', category: 'commercial' },
      { id: 'licensing_agreement', name: 'Licensing Agreement', type: 'licensing', category: 'ip' },
      { id: 'sales_agreement', name: 'Sales Agreement', type: 'sales', category: 'commercial' }
    ];

    res.json({ templates });
  });

  // Archive document
  router.post('/:id/archive', async (req: Request, res: Response) => {
    try {
      const document = legalProfileStore.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const updated = legalProfileStore.updateDocument(req.params.id, {
        status: 'archived'
      });

      await customerOpsBridge.publishEvent('document.archived', {
        documentId: document.id,
        profileId: document.profileId
      });

      logger.info(`Document archived: ${document.id}`);
      res.json({ status: 'archived', documentId: document.id });
    } catch (error) {
      logger.error('Error archiving document:', error);
      res.status(500).json({ error: 'Failed to archive document' });
    }
  });

  // Delete document
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const document = legalProfileStore.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Only allow deletion of draft documents
      if (document.status !== 'draft') {
        return res.status(400).json({
          error: 'Only draft documents can be deleted. Archive executed documents instead.'
        });
      }

      // Delete file if exists
      const filePath = path.join(storagePath, `${document.id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Remove from store (use update to maintain audit trail)
      legalProfileStore.updateDocument(req.params.id, {
        status: 'archived',
        metadata: { ...document.metadata, deletedAt: new Date() }
      });

      await customerOpsBridge.publishEvent('document.deleted', {
        documentId: document.id,
        profileId: document.profileId
      });

      res.json({ status: 'deleted', documentId: document.id });
    } catch (error) {
      logger.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  return router;
}

// Template generation helpers
function generateFromTemplate(templateId: string, data: Record<string, any>): string {
  const templates: Record<string, (data: Record<string, any>) => string> = {
    nda_standard: (d) => `
NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of ${d.effectiveDate || new Date().toISOString().split('T')[0]} by and between:

Disclosing Party: ${d.disclosingParty || '[Party Name]'}
Receiving Party: ${d.receivingParty || '[Party Name]'}

1. DEFINITION OF CONFIDENTIAL INFORMATION
Confidential Information means any information disclosed by the Disclosing Party...

2. OBLIGATIONS OF RECEIVING PARTY
The Receiving Party agrees to:
- Maintain the confidentiality of all Confidential Information
- Not disclose to any third parties without prior written consent
- Use only for the purpose of ${d.purpose || 'evaluating a potential business relationship'}

3. TERM
This Agreement shall remain in effect for ${d.term || 'two (2)'} years from the Effective Date.

4. GOVERNING LAW
This Agreement shall be governed by the laws of ${d.jurisdiction || 'the State'}.

IN WITNESS WHEREOF, the parties have executed this Agreement.

${d.disclosingParty || '[Party Name]'}
Date: _______________

${d.receivingParty || '[Party Name]'}
Date: _______________
`.trim(),

    service_agreement: (d) => `
SERVICE AGREEMENT

This Service Agreement ("Agreement") is made effective as of ${d.effectiveDate || new Date().toISOString().split('T')[0]}

BETWEEN:
Service Provider: ${d.serviceProvider || '[Company Name]'}
Client: ${d.client || '[Client Name]'}

SERVICES:
The Service Provider agrees to provide the following services:
${d.services || '[Description of services]'}

PAYMENT TERMS:
Total Amount: ${d.amount || '[Amount]'} ${d.currency || 'USD'}
Payment Schedule: ${d.paymentTerms || 'Net 30 days'}

TERM:
This Agreement shall commence on the Effective Date and continue for ${d.term || '12 months'}.

${d.serviceProvider || '[Company]'}
Date: _______________

${d.client || '[Client]'}
Date: _______________
`.trim(),

    employment_contract: (d) => `
EMPLOYMENT CONTRACT

This Employment Contract is entered into as of ${d.effectiveDate || new Date().toISOString().split('T')[0]}

EMPLOYER: ${d.employer || '[Company Name]'}
EMPLOYEE: ${d.employee || '[Employee Name]'}

POSITION: ${d.position || '[Job Title]'}
DEPARTMENT: ${d.department || '[Department]'}
START DATE: ${d.startDate || '[Start Date]'}
COMPENSATION: ${d.salary || '[Salary]'} per ${d.payPeriod || 'year'}

DUTIES AND RESPONSIBILITIES:
${d.duties || '[Description of duties]'}

BENEFITS:
- Health Insurance: ${d.healthInsurance || 'Standard package'}
- PTO: ${d.pto || '15 days per year'}
- ${d.otherBenefits || 'As per company policy'}

${d.employer || '[Employer]'}
Date: _______________

${d.employee || '[Employee]'}
Date: _______________
`.trim()
  };

  const templateFn = templates[templateId];
  if (templateFn) {
    return templateFn(data);
  }

  return `Document generated from template: ${templateId}\nData: ${JSON.stringify(data, null, 2)}`;
}

function getDocumentTypeFromTemplate(templateId: string): LegalDocument['type'] {
  const typeMap: Record<string, LegalDocument['type']> = {
    nda_standard: 'nda',
    nda_mutual: 'nda',
    service_agreement: 'contract',
    employment_contract: 'agreement',
    vendor_contract: 'contract',
    lease_agreement: 'agreement',
    partnership_agreement: 'agreement',
    consulting_agreement: 'contract',
    licensing_agreement: 'agreement',
    sales_agreement: 'contract'
  };

  return typeMap[templateId] || 'other';
}
