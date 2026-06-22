import { logger } from '../../shared/logger';
import { NextRequest, NextResponse } from 'next/server';
import {
  ServiceContract,
  ContractTemplate,
  ContractStatus,
  ContractTerms,
  RenewalType,
  ContractAttachment,
} from '@nextabizz/shared-types';
import { rateLimitMiddleware, getRateLimitHeaders, getRateLimitRecord } from '@/middleware/rateLimit';

// ============================================
// In-Memory Store (Replace with Database)
// ============================================

// Generate unique IDs
const generateId = () => crypto.randomUUID();
const generateContractNumber = () => `CTR-${Date.now().toString(36).toUpperCase()}`;

// Mock data store
let contracts: ServiceContract[] = [];
let templates: ContractTemplate[] = [];

// Default contract terms
const defaultTerms: ContractTerms = {
  paymentTerms: 'Net 30 days from invoice date',
  deliveryTerms: 'Delivery within 7 business days of order confirmation',
  terminationTerms: 'Either party may terminate with 30 days written notice',
  warrantyTerms: 'Standard manufacturer warranty applies',
  penaltyTerms: 'Late delivery penalty: 1% per week of delayed amount',
};

// Default templates
const initTemplates = () => {
  if (templates.length === 0) {
    templates = [
      {
        id: generateId(),
        name: 'Standard Service Agreement',
        description: 'Default template for recurring service contracts',
        content: `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of {{startDate}} by and between:
{{merchantName}} ("Client")
{{supplierName}} ("Service Provider")

1. SCOPE OF SERVICES
The Service Provider agrees to provide the services as outlined in the attached schedule.

2. TERM
This Agreement shall commence on {{startDate}} and continue until {{endDate}}.

3. COMPENSATION
The Client agrees to pay {{totalValue}} {{currency}} for services rendered.

4. PAYMENT TERMS
{{paymentTerms}}

5. DELIVERY TERMS
{{deliveryTerms}}

6. TERMINATION
{{terminationTerms}}

7. CONFIDENTIALITY
Both parties agree to maintain confidentiality of proprietary information.

8. GOVERNING LAW
This Agreement shall be governed by applicable laws.`,
        terms: defaultTerms,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: generateId(),
        name: 'Monthly Retainer Contract',
        description: 'Template for monthly retainer services',
        content: `MONTHLY RETAINER AGREEMENT

Entered on {{startDate}}

BETWEEN:
{{merchantName}} (Client)
{{supplierName}} (Provider)

This retainer agreement establishes a monthly service commitment.

Monthly retainer amount: {{totalValue}} {{currency}}
Service period: {{startDate}} to {{endDate}}
Renewal: {{renewalType}}`,
        terms: {
          ...defaultTerms,
          paymentTerms: 'Monthly advance payment before the 5th of each month',
        },
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: generateId(),
        name: 'Project-Based Contract',
        description: 'Template for one-time project engagements',
        content: `PROJECT CONTRACT

Project Contract Number: {{contractNumber}}
Date: {{startDate}}

CLIENT: {{merchantName}}
PROVIDER: {{supplierName}}

Project Value: {{totalValue}} {{currency}}
Delivery: {{endDate}}

SCOPE:
[Project details to be inserted]

TERMS:
Payment upon completion or milestone-based as agreed.`,
        terms: defaultTerms,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
};

// Initialize templates
initTemplates();

// ============================================
// Helper Functions
// ============================================

const parseQueryParams = (searchParams: URLSearchParams) => {
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    merchantId: searchParams.get('merchantId') || undefined,
    supplierId: searchParams.get('supplierId') || undefined,
    status: (searchParams.get('status') as ContractStatus) || undefined,
    renewalType: (searchParams.get('renewalType') as RenewalType) || undefined,
    search: searchParams.get('search') || undefined,
  };
};

const filterContracts = (query: ReturnType<typeof parseQueryParams>) => {
  return contracts.filter((contract) => {
    if (query.merchantId && contract.merchantId !== query.merchantId) return false;
    if (query.supplierId && contract.supplierId !== query.supplierId) return false;
    if (query.status && contract.status !== query.status) return false;
    if (query.renewalType && contract.renewalType !== query.renewalType) return false;
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      const matchesSearch =
        contract.title.toLowerCase().includes(searchLower) ||
        contract.contractNumber.toLowerCase().includes(searchLower) ||
        contract.merchantName.toLowerCase().includes(searchLower) ||
        contract.supplierName.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });
};

const paginateResults = <T>(items: T[], page: number, limit: number) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    items: items.slice(start, end),
    total: items.length,
    page,
    limit,
    totalPages: Math.ceil(items.length / limit),
  };
};

// ============================================
// GET /api/service-contracts
// ============================================
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = parseQueryParams(searchParams);
    const action = searchParams.get('action');

    // List contracts
    if (!action || action === 'list') {
      const filtered = filterContracts(query);
      const paginated = paginateResults(filtered, query.page, query.limit);

      return NextResponse.json({
        success: true,
        data: paginated,
      });
    }

    // Get single contract
    if (action === 'get') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Contract ID is required' },
          { status: 400 }
        );
      }

      const contract = contracts.find((c) => c.id === id);
      if (!contract) {
        return NextResponse.json(
          { success: false, error: 'Contract not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: contract });
    }

    // List templates
    if (action === 'templates') {
      return NextResponse.json({
        success: true,
        data: templates,
      });
    }

    // Get template
    if (action === 'template') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Template ID is required' },
          { status: 400 }
        );
      }

      const template = templates.find((t) => t.id === id);
      if (!template) {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: template });
    }

    // Get contract statistics
    if (action === 'stats') {
      const merchantId = searchParams.get('merchantId');
      const merchantContracts = merchantId
        ? contracts.filter((c) => c.merchantId === merchantId)
        : contracts;

      const stats = {
        total: merchantContracts.length,
        active: merchantContracts.filter((c) => c.status === 'active').length,
        draft: merchantContracts.filter((c) => c.status === 'draft').length,
        expired: merchantContracts.filter((c) => c.status === 'expired').length,
        terminated: merchantContracts.filter((c) => c.status === 'terminated').length,
        totalValue: merchantContracts.reduce((sum, c) => sum + c.totalValue, 0),
        expiringIn30Days: merchantContracts.filter((c) => {
          if (c.status !== 'active') return false;
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          return new Date(c.endDate) <= thirtyDaysFromNow && new Date(c.endDate) > new Date();
        }).length,
      };

      return NextResponse.json({ success: true, data: stats });
    }

    // Generate PDF
    if (action === 'generate-pdf') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Contract ID is required' },
          { status: 400 }
        );
      }

      const contract = contracts.find((c) => c.id === id);
      if (!contract) {
        return NextResponse.json(
          { success: false, error: 'Contract not found' },
          { status: 404 }
        );
      }

      // In production, this would generate a PDF using a library like puppeteer or jsPDF
      const pdfData = {
        contractNumber: contract.contractNumber,
        title: contract.title,
        parties: {
          merchant: contract.merchantName,
          supplier: contract.supplierName,
        },
        terms: contract.terms,
        dates: {
          start: contract.startDate,
          end: contract.endDate,
        },
        value: {
          amount: contract.totalValue,
          currency: contract.currency,
        },
        generatedAt: new Date().toISOString(),
      };

      return NextResponse.json({ success: true, data: pdfData });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Service contracts GET error:', errorMessage);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve contracts' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/service-contracts
// ============================================
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const body = await request.json();
    const { action } = body;

    // Create contract from quote
    if (action === 'create-from-quote') {
      const { quoteId, merchantId, supplierId, merchantName, supplierName, startDate, endDate, renewalType, renewalPeriodMonths, terms } = body;

      if (!quoteId || !merchantId || !supplierId || !startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields for quote conversion' },
          { status: 400 }
        );
      }

      const contract: ServiceContract = {
        id: generateId(),
        contractNumber: generateContractNumber(),
        title: `Service Contract - ${merchantName} / ${supplierName}`,
        description: `Contract converted from quote ${quoteId}`,
        merchantId,
        supplierId,
        merchantName,
        supplierName,
        terms: terms || defaultTerms,
        totalValue: 0,
        currency: 'INR',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        renewalType: renewalType || 'manual',
        renewalPeriodMonths,
        status: 'draft',
        sourceType: 'quote',
        sourceId: quoteId,
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: merchantId,
      };

      contracts.push(contract);

      return NextResponse.json({ success: true, data: contract }, { status: 201 });
    }

    // Create manual contract
    if (action === 'create-manual' || !action) {
      const {
        merchantId,
        supplierId,
        title,
        description,
        totalValue,
        currency,
        startDate,
        endDate,
        renewalType,
        renewalPeriodMonths,
        terms,
        templateId,
        createdBy,
      } = body;

      // Validation
      if (!merchantId || !supplierId || !title || !startDate || !endDate || !terms || !createdBy) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      if (new Date(endDate) <= new Date(startDate)) {
        return NextResponse.json(
          { success: false, error: 'End date must be after start date' },
          { status: 400 }
        );
      }

      const template = templateId ? templates.find((t) => t.id === templateId) : null;

      const contract: ServiceContract = {
        id: generateId(),
        contractNumber: generateContractNumber(),
        title,
        description,
        merchantId,
        supplierId,
        merchantName: body.merchantName || 'Merchant',
        supplierName: body.supplierName || 'Supplier',
        terms,
        totalValue: totalValue || 0,
        currency: currency || 'INR',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        renewalType: renewalType || 'manual',
        renewalPeriodMonths,
        status: 'draft',
        sourceType: 'manual',
        templateId,
        templateName: template?.name,
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
      };

      contracts.push(contract);

      return NextResponse.json({ success: true, data: contract }, { status: 201 });
    }

    // Create template
    if (action === 'create-template') {
      const { name, description, content, terms, isDefault } = body;

      if (!name || !content || !terms) {
        return NextResponse.json(
          { success: false, error: 'Missing required template fields' },
          { status: 400 }
        );
      }

      if (isDefault) {
        templates.forEach((t) => (t.isDefault = false));
      }

      const template: ContractTemplate = {
        id: generateId(),
        name,
        description,
        content,
        terms,
        isDefault: isDefault || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templates.push(template);

      return NextResponse.json({ success: true, data: template }, { status: 201 });
    }

    // Add attachment
    if (action === 'add-attachment') {
      const { contractId, name, fileUrl, fileType, fileSize } = body;

      if (!contractId || !name || !fileUrl || !fileType || !fileSize) {
        return NextResponse.json(
          { success: false, error: 'Missing required attachment fields' },
          { status: 400 }
        );
      }

      const contract = contracts.find((c) => c.id === contractId);
      if (!contract) {
        return NextResponse.json(
          { success: false, error: 'Contract not found' },
          { status: 404 }
        );
      }

      const attachment: ContractAttachment = {
        id: generateId(),
        contractId,
        name,
        fileUrl,
        fileType,
        fileSize,
        uploadedAt: new Date(),
      };

      contract.attachments.push(attachment);
      contract.updatedAt = new Date();

      return NextResponse.json({ success: true, data: attachment }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Service contracts POST error:', errorMessage);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/service-contracts
// ============================================
export async function PUT(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Contract ID is required' },
        { status: 400 }
      );
    }

    const contractIndex = contracts.findIndex((c) => c.id === id);
    if (contractIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      );
    }

    const contract = contracts[contractIndex];

    // Update contract
    if (action === 'update' || !action) {
      const {
        title,
        description,
        totalValue,
        currency,
        startDate,
        endDate,
        renewalType,
        renewalPeriodMonths,
        terms,
        status,
      } = body;

      if (title) contract.title = title;
      if (description !== undefined) contract.description = description;
      if (totalValue !== undefined) contract.totalValue = totalValue;
      if (currency) contract.currency = currency;
      if (startDate) contract.startDate = new Date(startDate);
      if (endDate) contract.endDate = new Date(endDate);
      if (renewalType) contract.renewalType = renewalType;
      if (renewalPeriodMonths !== undefined) contract.renewalPeriodMonths = renewalPeriodMonths;
      if (terms) contract.terms = { ...contract.terms, ...terms };
      if (status) contract.status = status;

      contract.updatedAt = new Date();
      contracts[contractIndex] = contract;

      return NextResponse.json({ success: true, data: contract });
    }

    // Activate contract
    if (action === 'activate') {
      if (contract.status !== 'draft') {
        return NextResponse.json(
          { success: false, error: 'Only draft contracts can be activated' },
          { status: 400 }
        );
      }

      contract.status = 'active';
      contract.signedDate = new Date();
      contract.updatedAt = new Date();
      contracts[contractIndex] = contract;

      return NextResponse.json({ success: true, data: contract });
    }

    // Terminate contract
    if (action === 'terminate') {
      if (contract.status === 'terminated' || contract.status === 'expired') {
        return NextResponse.json(
          { success: false, error: 'Contract is already terminated or expired' },
          { status: 400 }
        );
      }

      contract.status = 'terminated';
      contract.updatedAt = new Date();
      contracts[contractIndex] = contract;

      return NextResponse.json({ success: true, data: contract });
    }

    // Renew contract
    if (action === 'renew') {
      if (contract.status !== 'active') {
        return NextResponse.json(
          { success: false, error: 'Only active contracts can be renewed' },
          { status: 400 }
        );
      }

      const newStartDate = new Date(contract.endDate);
      const newEndDate = new Date(newStartDate);
      newEndDate.setMonth(newEndDate.getMonth() + (contract.renewalPeriodMonths || 12));

      const renewedContract: ServiceContract = {
        ...contract,
        id: generateId(),
        contractNumber: generateContractNumber(),
        startDate: newStartDate,
        endDate: newEndDate,
        status: 'draft',
        signedDate: undefined,
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      contracts.push(renewedContract);

      return NextResponse.json({ success: true, data: renewedContract }, { status: 201 });
    }

    // Update template
    if (action === 'update-template') {
      const templateId = body.id;
      const templateIndex = templates.findIndex((t) => t.id === templateId);

      if (templateIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }

      const template = templates[templateIndex];
      const { name, description, content, terms, isDefault } = body;

      if (name) template.name = name;
      if (description !== undefined) template.description = description;
      if (content) template.content = content;
      if (terms) template.terms = terms;
      if (isDefault !== undefined) {
        if (isDefault) {
          templates.forEach((t) => (t.isDefault = false));
        }
        template.isDefault = isDefault;
      }

      template.updatedAt = new Date();
      templates[templateIndex] = template;

      return NextResponse.json({ success: true, data: template });
    }

    // Remove attachment
    if (action === 'remove-attachment') {
      const { attachmentId } = body;

      if (!attachmentId) {
        return NextResponse.json(
          { success: false, error: 'Attachment ID is required' },
          { status: 400 }
        );
      }

      const attachmentIndex = contract.attachments.findIndex((a) => a.id === attachmentId);
      if (attachmentIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Attachment not found' },
          { status: 404 }
        );
      }

      contract.attachments.splice(attachmentIndex, 1);
      contract.updatedAt = new Date();
      contracts[contractIndex] = contract;

      return NextResponse.json({ success: true, message: 'Attachment removed' });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Service contracts PUT error:', errorMessage);
    return NextResponse.json(
      { success: false, error: 'Failed to update contract' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/service-contracts
// ============================================
export async function DELETE(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    // Delete contract
    if (action === 'contract' || !action) {
      const contractIndex = contracts.findIndex((c) => c.id === id);
      if (contractIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Contract not found' },
          { status: 404 }
        );
      }

      if (contracts[contractIndex].status === 'active') {
        return NextResponse.json(
          { success: false, error: 'Cannot delete active contracts. Terminate first.' },
          { status: 400 }
        );
      }

      contracts.splice(contractIndex, 1);

      return NextResponse.json({ success: true, message: 'Contract deleted' });
    }

    // Delete template
    if (action === 'template') {
      const templateIndex = templates.findIndex((t) => t.id === id);
      if (templateIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }

      templates.splice(templateIndex, 1);

      return NextResponse.json({ success: true, message: 'Template deleted' });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Service contracts DELETE error:', errorMessage);
    return NextResponse.json(
      { success: false, error: 'Failed to delete' },
      { status: 500 }
    );
  }
}
