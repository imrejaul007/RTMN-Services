// Tool definitions for Invoice OCR MCP Server
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface UploadInvoiceParams {
  fileName: string;
  fileContent?: string;
  fileUrl?: string;
}

export interface ExtractInvoiceParams {
  invoiceId: string;
}

export interface ValidateGSTParams {
  gstin: string;
}

export interface GetInvoiceParams {
  invoiceId: string;
}

export interface ExportInvoiceParams {
  invoiceId: string;
  format: 'pdf' | 'json' | 'csv' | 'xml';
}

function generateInvoiceId(): string {
  return `INV_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function generateMockInvoiceData(invoiceId: string): {
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  vendor: {
    name: string;
    address: string;
    gstin: string;
  };
  customer: {
    name: string;
    address: string;
    gstin: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    hsnCode: string;
  }>;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  paymentTerms: string;
  dueDate: string;
} {
  const items = [
    { description: 'Professional Services - Consulting', quantity: 40, unitPrice: 2500, hsnCode: '998311' },
    { description: 'Software Development - Custom', quantity: 80, unitPrice: 1500, hsnCode: '998312' },
    { description: 'Cloud Infrastructure - Monthly', quantity: 1, unitPrice: 45000, hsnCode: '998314' },
  ];
  
  const calculatedItems = items.map(item => ({
    ...item,
    total: item.quantity * item.unitPrice
  }));
  
  const subtotal = calculatedItems.reduce((sum, item) => sum + item.total, 0);
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const igst = subtotal * 0.18;
  const total = subtotal + cgst + sgst;
  
  return {
    invoiceId,
    invoiceNumber: `INV-2026-${Math.floor(Math.random() * 9000) + 1000}`,
    date: new Date().toISOString().split('T')[0],
    vendor: {
      name: 'TechCorp Solutions Pvt. Ltd.',
      address: '123 Tech Park, Whitefield, Bangalore - 560066',
      gstin: '29AABCU9603R1ZM'
    },
    customer: {
      name: 'Acme Corporation',
      address: '456 Business Hub, MG Road, Mumbai - 400001',
      gstin: '27AAACH1234P1ZP'
    },
    items: calculatedItems,
    subtotal,
    cgst,
    sgst,
    igst,
    total,
    paymentTerms: 'Net 30',
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  };
}

function validateGSTFormat(gstin: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!gstin) {
    errors.push('GSTIN is required');
    return { valid: false, errors };
  }
  
  if (gstin.length !== 15) {
    errors.push('GSTIN must be exactly 15 characters');
  }
  
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z][0-9A-Z]$/.test(gstin)) {
    errors.push('Invalid GSTIN format');
  }
  
  return { valid: errors.length === 0, errors };
}

export const tools: Tool[] = [
  {
    name: "upload_invoice",
    description: "Upload an invoice document for OCR processing",
    inputSchema: {
      type: "object",
      properties: {
        fileName: {
          type: "string",
          description: "Name of the invoice file"
        },
        fileContent: {
          type: "string",
          description: "Base64 encoded file content (optional)"
        },
        fileUrl: {
          type: "string",
          description: "URL to the invoice file (optional)"
        }
      },
      required: ["fileName"]
    }
  },
  {
    name: "extract_invoice_data",
    description: "Extract structured data from an uploaded invoice using OCR",
    inputSchema: {
      type: "object",
      properties: {
        invoiceId: {
          type: "string",
          description: "ID of the uploaded invoice"
        }
      },
      required: ["invoiceId"]
    }
  },
  {
    name: "validate_gst",
    description: "Validate a GST Identification Number (GSTIN)",
    inputSchema: {
      type: "object",
      properties: {
        gstin: {
          type: "string",
          description: "15-digit GST Identification Number"
        }
      },
      required: ["gstin"]
    }
  },
  {
    name: "get_invoice",
    description: "Retrieve an invoice by ID",
    inputSchema: {
      type: "object",
      properties: {
        invoiceId: {
          type: "string",
          description: "ID of the invoice"
        }
      },
      required: ["invoiceId"]
    }
  },
  {
    name: "export_invoice",
    description: "Export an invoice in the specified format",
    inputSchema: {
      type: "object",
      properties: {
        invoiceId: {
          type: "string",
          description: "ID of the invoice to export"
        },
        format: {
          type: "string",
          enum: ["pdf", "json", "csv", "xml"],
          description: "Export format"
        }
      },
      required: ["invoiceId", "format"]
    }
  }
];

export const toolHandlers: Record<string, (params: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>> = {
  upload_invoice: async (params) => {
    const { fileName } = params as unknown as UploadInvoiceParams;
    const invoiceId = generateInvoiceId();
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          result: {
            invoiceId,
            fileName,
            uploadedAt: new Date().toISOString(),
            status: 'completed',
            message: 'Invoice uploaded successfully'
          }
        }, null, 2)
      }]
    };
  },

  extract_invoice_data: async (params) => {
    const { invoiceId } = params as unknown as ExtractInvoiceParams;
    const invoiceData = generateMockInvoiceData(invoiceId);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          invoiceData,
          extractionConfidence: 0.94,
          message: 'Invoice data extracted successfully'
        }, null, 2)
      }]
    };
  },

  validate_gst: async (params) => {
    const { gstin } = params as unknown as ValidateGSTParams;
    const validation = validateGSTFormat(gstin);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          validation: {
            valid: validation.valid,
            gstin,
            errors: validation.errors,
            warnings: validation.valid ? [] : ['Please verify the GSTIN with official records'],
            businessName: validation.valid ? 'ABC Company Pvt Ltd' : undefined,
            registrationDate: validation.valid ? '15-04-2018' : undefined,
            status: validation.valid ? 'Active' : 'Unknown'
          }
        }, null, 2)
      }]
    };
  },

  get_invoice: async (params) => {
    const { invoiceId } = params as unknown as GetInvoiceParams;
    const invoiceData = generateMockInvoiceData(invoiceId);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          invoice: invoiceData
        }, null, 2)
      }]
    };
  },

  export_invoice: async (params) => {
    const { invoiceId, format } = params as unknown as ExportInvoiceParams;
    const invoiceData = generateMockInvoiceData(invoiceId);
    
    let exportContent = '';
    switch (format) {
      case 'json':
        exportContent = JSON.stringify(invoiceData, null, 2);
        break;
      case 'csv':
        exportContent = 'Invoice Field,Value\n' +
          Object.entries(invoiceData).map(([key, value]) => 
            `${key},"${typeof value === 'object' ? JSON.stringify(value) : value}"`
          ).join('\n');
        break;
      default:
        exportContent = JSON.stringify(invoiceData, null, 2);
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          invoiceId,
          format,
          exportedAt: new Date().toISOString(),
          contentLength: exportContent.length,
          message: `Invoice exported as ${format.toUpperCase()}`
        }, null, 2)
      }]
    };
  }
};
