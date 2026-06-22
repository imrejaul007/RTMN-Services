// REST Client for Invoice OCR Service
const INVOICE_SERVICE_URL = process.env.INVOICE_SERVICE_URL || 'http://localhost:5002';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

export interface InvoiceData {
  invoiceNumber?: string;
  date?: string;
  vendor?: string;
  customer?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal?: number;
  tax?: number;
  total?: number;
  gstin?: string;
}

export interface UploadResult {
  invoiceId: string;
  fileName: string;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function fetchFromInvoice<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${INVOICE_SERVICE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_SERVICE_TOKEN,
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as T;
  } catch (error) {
    console.error(`Invoice API error (${endpoint}):`, error);
    return null;
  }
}

export async function uploadInvoice(fileName: string, fileContent: string): Promise<UploadResult | null> {
  return fetchFromInvoice<UploadResult>('/api/invoices/upload', {
    method: 'POST',
    body: JSON.stringify({ fileName, fileContent })
  });
}

export async function extractInvoiceData(invoiceId: string): Promise<InvoiceData | null> {
  return fetchFromInvoice<InvoiceData>(`/api/invoices/${invoiceId}/extract`);
}

export async function validateGST(gstin: string): Promise<ValidationResult | null> {
  return fetchFromInvoice<ValidationResult>(`/api/invoices/validate-gst/${gstin}`);
}

export async function getInvoice(invoiceId: string): Promise<InvoiceData | null> {
  return fetchFromInvoice<InvoiceData>(`/api/invoices/${invoiceId}`);
}

export async function exportInvoice(invoiceId: string, format: string): Promise<string | null> {
  return fetchFromInvoice<string>(`/api/invoices/${invoiceId}/export?format=${format}`);
}
