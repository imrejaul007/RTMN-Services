/**
 * Contract Routes
 * Contract Lifecycle Management API Endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory contract storage
const contracts: Map<string, any> = new Map();

// Contract templates
const templates: Map<string, any> = new Map([
  ['nda-mutual', {
    templateId: 'nda-mutual',
    name: 'Mutual NDA',
    description: 'Mutual Non-Disclosure Agreement for two parties',
    category: 'confidentiality',
    content: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of {{effectiveDate}} by and between:

Party A: {{partyAName}}
Party B: {{partyBName}}

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public information disclosed by either party to the other, whether orally or in writing, that is designated as confidential or that reasonably should be understood to be confidential.

2. OBLIGATIONS
The Receiving Party agrees to:
- Hold all Confidential Information in strict confidence
- Not disclose Confidential Information to third parties without prior written consent
- Use Confidential Information solely for the purpose of evaluating the proposed business relationship

3. TERM
This Agreement shall remain in effect for a period of {{termYears}} years from the Effective Date.

4. RETURN OF INFORMATION
Upon termination, the Receiving Party shall return or destroy all Confidential Information.

IN WITNESS WHEREOF, the parties have executed this Agreement.

{{partyASignature}} Date: {{partyADate}}
{{partyBSignature}} Date: {{partyBDate}}`
  }],
  ['service-agreement', {
    templateId: 'service-agreement',
    name: 'Service Agreement',
    description: 'Professional Services Agreement',
    category: 'services',
    content: `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of {{effectiveDate}} between:

Service Provider: {{providerName}}
Client: {{clientName}}

1. SERVICES
The Service Provider agrees to provide the following services:
{{serviceDescription}}

2. COMPENSATION
Client agrees to pay Service Provider:
- Rate: {{rate}} per {{rateUnit}}
- Payment Terms: {{paymentTerms}}

3. TERM
This Agreement shall commence on {{startDate}} and continue until {{endDate}}.

4. INTELLECTUAL PROPERTY
All work product created shall be owned by {{ipOwner}}.

5. CONFIDENTIALITY
Both parties agree to maintain confidentiality of proprietary information.

6. TERMINATION
Either party may terminate with {{noticeDays}} days written notice.`
  }],
  ['employment', {
    templateId: 'employment',
    name: 'Employment Contract',
    description: 'Standard Employment Agreement',
    category: 'employment',
    content: `EMPLOYMENT AGREEMENT

This Employment Agreement is made on {{effectiveDate}} between:

Employer: {{employerName}}
Employee: {{employeeName}}

1. POSITION
Employee is hired as {{position}} in the {{department}} department.

2. COMPENSATION
- Salary: {{salary}} per annum
- Payment Frequency: Monthly

3. BENEFITS
Employee shall be entitled to:
- {{leaveDays}} days of paid leave per year
- Health insurance coverage
- Provident Fund contribution as per law

4. WORKING HOURS
Standard working hours: {{workingHours}}

5. PROBATION
This agreement is subject to a probation period of {{probationMonths}} months.

6. TERMINATION
Either party may terminate with {{noticeDays}} days notice or salary in lieu.`
  }],
  ['lease', {
    templateId: 'lease',
    name: 'Rental Lease Agreement',
    description: 'Commercial/Residential Property Lease',
    category: 'property',
    content: `LEASE AGREEMENT

This Lease Agreement is made on {{effectiveDate}} between:

Landlord: {{landlordName}}
Tenant: {{tenantName}}

1. PREMISES
Address: {{propertyAddress}}
Type: {{propertyType}}

2. TERM
Lease period: {{leaseYears}} years
Start Date: {{startDate}}
End Date: {{endDate}}

3. RENT
Monthly Rent: {{monthlyRent}}
Security Deposit: {{securityDeposit}}
Payment Due: {{paymentDueDay}} of each month

4. MAINTENANCE
Tenant shall maintain the premises in good condition.

5. UTILITIES
Tenant shall pay for all utilities consumed.

6. TERMINATION
Notice period: {{noticePeriod}}`
  }]
]);

// GET /api/contracts - List all contracts
router.get('/', (req: Request, res: Response) => {
  const { status, type, clientId, page = 1, limit = 20 } = req.query;

  let filteredContracts = Array.from(contracts.values());

  if (status) {
    filteredContracts = filteredContracts.filter(c => c.status === status);
  }
  if (type) {
    filteredContracts = filteredContracts.filter(c => c.type === type);
  }
  if (clientId) {
    filteredContracts = filteredContracts.filter(c => c.clientId === clientId);
  }

  const start = (Number(page) - 1) * Number(limit);
  const paginatedContracts = filteredContracts.slice(start, start + Number(limit));

  res.json({
    success: true,
    contracts: paginatedContracts,
    total: filteredContracts.length,
    page: Number(page),
    limit: Number(limit)
  });
});

// GET /api/contracts/:id - Get contract by ID
router.get('/:id', (req: Request, res: Response) => {
  const contract = contracts.get(req.params.id);

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  res.json({ success: true, contract });
});

// POST /api/contracts - Create new contract
router.post('/', (req: Request, res: Response) => {
  const { title, type, content, parties, startDate, endDate, value, terms, clientId, caseId } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: 'Missing required fields: title, type' });
  }

  const contractId = uuidv4();
  const now = new Date().toISOString();

  const newContract = {
    contractId,
    title,
    type, // nda, service, employment, lease, partnership, etc.
    content,
    parties: parties || [],
    startDate,
    endDate,
    value,
    status: 'draft', // draft, review, pending-signature, active, expired, terminated
    terms: terms || [],
    clauses: [],
    clientId,
    caseId,
    documents: [],
    amendments: [],
    renewals: [],
    createdAt: now,
    updatedAt: now
  };

  contracts.set(contractId, newContract);

  res.status(201).json({ success: true, contract: newContract });
});

// PATCH /api/contracts/:id - Update contract
router.patch('/:id', (req: Request, res: Response) => {
  const contract = contracts.get(req.params.id);

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const updates = req.body;
  const updatedContract = {
    ...contract,
    ...updates,
    contractId: contract.contractId,
    updatedAt: new Date().toISOString()
  };

  contracts.set(req.params.id, updatedContract);

  res.json({ success: true, contract: updatedContract });
});

// POST /api/contracts/:id/clauses - Add clause
router.post('/:id/clauses', (req: Request, res: Response) => {
  const contract = contracts.get(req.params.id);

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const { clauseId, content, title, category } = req.body;

  const clause = {
    id: uuidv4(),
    clauseId,
    title,
    content,
    category,
    addedAt: new Date().toISOString()
  };

  contract.clauses.push(clause);
  contract.updatedAt = new Date().toISOString();
  contracts.set(req.params.id, contract);

  res.json({ success: true, clause });
});

// POST /api/contracts/:id/sign - Sign contract
router.post('/:id/sign', (req: Request, res: Response) => {
  const contract = contracts.get(req.params.id);

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const { partyId, signedBy, signatureData } = req.body;

  contract.signatures = contract.signatures || [];
  contract.signatures.push({
    partyId,
    signatory: signedBy,
    signatureData,
    signedAt: new Date().toISOString(),
    ipAddress: req.ip
  });

  if (contract.signatures.length >= contract.parties.length) {
    contract.status = 'active';
    contract.activatedAt = new Date().toISOString();
  } else {
    contract.status = 'pending-signature';
  }

  contract.updatedAt = new Date().toISOString();
  contracts.set(req.params.id, contract);

  res.json({ success: true, status: contract.status, signatures: contract.signatures });
});

// POST /api/contracts/:id/amend - Create amendment
router.post('/:id/amend', (req: Request, res: Response) => {
  const contract = contracts.get(req.params.id);

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const { description, changes, effectiveDate } = req.body;

  if (contract.status !== 'active') {
    return res.status(400).json({ error: 'Can only amend active contracts' });
  }

  const amendment = {
    amendmentId: uuidv4(),
    description,
    changes,
    effectiveDate,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  contract.amendments.push(amendment);
  contract.updatedAt = new Date().toISOString();
  contracts.set(req.params.id, contract);

  res.json({ success: true, amendment });
});

// POST /api/contracts/:id/renew - Renew contract
router.post('/:id/renew', (req: Request, res: Response) => {
  const contract = contracts.get(req.params.id);

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const { newEndDate, newValue } = req.body;

  const renewal = {
    renewalId: uuidv4(),
    previousEndDate: contract.endDate,
    newEndDate,
    newValue,
    renewedAt: new Date().toISOString()
  };

  contract.renewals.push(renewal);
  contract.endDate = newEndDate;
  if (newValue) contract.value = newValue;
  contract.updatedAt = new Date().toISOString();
  contracts.set(req.params.id, contract);

  res.json({ success: true, renewal });
});

// GET /api/contracts/templates - List templates
router.get('/templates/list', (req: Request, res: Response) => {
  const { category } = req.query;

  let templateList = Array.from(templates.values());

  if (category) {
    templateList = templateList.filter(t => t.category === category);
  }

  res.json({ success: true, templates: templateList });
});

// GET /api/contracts/templates/:id - Get template
router.get('/templates/:id', (req: Request, res: Response) => {
  const template = templates.get(req.params.id);

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json({ success: true, template });
});

// POST /api/contracts/templates/:id/generate - Generate from template
router.post('/templates/:id/generate', (req: Request, res: Response) => {
  const template = templates.get(req.params.id);

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const { data } = req.body;

  // Replace placeholders with data
  let content = template.content;
  Object.entries(data).forEach(([key, value]) => {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
  });

  res.json({
    success: true,
    content,
    template: {
      id: template.templateId,
      name: template.name
    }
  });
});

// DELETE /api/contracts/:id - Delete contract
router.delete('/:id', (req: Request, res: Response) => {
  if (!contracts.has(req.params.id)) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  contracts.delete(req.params.id);

  res.json({ success: true, message: 'Contract deleted' });
});

export default router;
