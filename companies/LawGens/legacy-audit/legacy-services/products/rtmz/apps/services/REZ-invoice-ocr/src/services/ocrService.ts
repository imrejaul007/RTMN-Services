import Anthropic from '@anthropic-ai/sdk';
import { ExtractedData, LineItem } from '../models/ExtractedData';
import { Logger } from '../utils/logger';

const logger = new Logger('ocr-service');

/**
 * OCR Service - Claude AI integration for invoice data extraction
 */
export class OCRService {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
    this.maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10);
  }

  /**
   * Extract invoice data from document text using Claude
   */
  async extractFromText(documentText: string): Promise<ExtractedData> {
    logger.info('Starting invoice extraction from text', {
      textLength: documentText.length,
      model: this.model,
    });

    const systemPrompt = `You are an expert invoice data extraction AI. Your task is to analyze invoice documents and extract structured data.

Extract the following information from the invoice:
- vendorName: The name of the company/vendor issuing the invoice
- vendorAddress: The vendor's address (optional)
- vendorGstin: The vendor's GSTIN number (15 characters, format: XXAAAAA0000A1Z5) (optional)
- invoiceNumber: The unique invoice number
- invoiceDate: The date of the invoice (ISO format: YYYY-MM-DD)
- dueDate: Payment due date if mentioned (optional, ISO format)
- lineItems: Array of items with:
  - description: Item description
  - hsnCode: HSN code for the item (optional)
  - quantity: Number of items
  - rate: Rate per item
  - amount: Total amount for the line item
  - cgst: CGST amount if applicable (optional)
  - sgst: SGST amount if applicable (optional)
  - igst: IGST amount if applicable (optional)
- subtotal: Sum of all line item amounts before tax
- totalCgst: Total CGST amount
- totalSgst: Total SGST amount
- totalIgst: Total IGST amount
- totalTax: Total tax amount (sum of all taxes)
- totalAmount: Grand total amount
- confidence: A number between 0 and 1 indicating extraction confidence

Indian GST Format Rules:
- GSTIN is 15 characters: 2 digits (state code) + 5 digits (PAN) + 1 character (entity number) + 2 characters (Z) + 1 character (checksum)
- Example: 27AAAAA0000A1Z5

Return your response as a valid JSON object with all extracted fields. If a field cannot be determined, use null for optional fields or an empty string for required fields.`;

    const userPrompt = `Please extract the invoice data from the following document:

${documentText}

Return the extracted data as a JSON object.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const contentBlock = response.content[0];
      if (!contentBlock || contentBlock.type !== 'text') {
        throw new Error('Invalid response from Claude');
      }

      const extractedData = this.parseClaudeResponse(contentBlock.text);

      logger.info('Invoice extraction completed', {
        vendorName: extractedData.vendorName,
        invoiceNumber: extractedData.invoiceNumber,
        confidence: extractedData.confidence,
        lineItemCount: extractedData.lineItems?.length || 0,
      });

      return extractedData;
    } catch (error) {
      logger.error('Invoice extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Extract invoice data from base64 encoded image
   */
  async extractFromImage(base64Image: string, mimeType: string = 'image/png'): Promise<ExtractedData> {
    logger.info('Starting invoice extraction from image', {
      imageSize: base64Image.length,
      mimeType,
      model: this.model,
    });

    const systemPrompt = `You are an expert invoice data extraction AI. Your task is to analyze invoice images and extract structured data.

Extract the following information from the invoice:
- vendorName: The name of the company/vendor issuing the invoice
- vendorAddress: The vendor's address (optional)
- vendorGstin: The vendor's GSTIN number (15 characters, format: XXAAAAA0000A1Z5) (optional)
- invoiceNumber: The unique invoice number
- invoiceDate: The date of the invoice (ISO format: YYYY-MM-DD)
- dueDate: Payment due date if mentioned (optional, ISO format)
- lineItems: Array of items with:
  - description: Item description
  - hsnCode: HSN code for the item (optional)
  - quantity: Number of items
  - rate: Rate per item
  - amount: Total amount for the line item
  - cgst: CGST amount if applicable (optional)
  - sgst: SGST amount if applicable (optional)
  - igst: IGST amount if applicable (optional)
- subtotal: Sum of all line item amounts before tax
- totalCgst: Total CGST amount
- totalSgst: Total SGST amount
- totalIgst: Total IGST amount
- totalTax: Total tax amount (sum of all taxes)
- totalAmount: Grand total amount
- confidence: A number between 0 and 1 indicating extraction confidence

Indian GST Format Rules:
- GSTIN is 15 characters: 2 digits (state code) + 5 digits (PAN) + 1 character (entity number) + 2 characters (Z) + 1 character (checksum)
- Dates can be in various Indian formats like DD/MM/YYYY, DD-MM-YYYY, convert to ISO format YYYY-MM-DD

Return your response as a valid JSON object with all extracted fields.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as 'image/png' | 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: 'Please extract all invoice data from this image and return as JSON.',
              },
            ],
          },
        ],
      });

      const contentBlock = response.content[0];
      if (!contentBlock || contentBlock.type !== 'text') {
        throw new Error('Invalid response from Claude');
      }

      const extractedData = this.parseClaudeResponse(contentBlock.text);

      logger.info('Invoice extraction from image completed', {
        vendorName: extractedData.vendorName,
        invoiceNumber: extractedData.invoiceNumber,
        confidence: extractedData.confidence,
      });

      return extractedData;
    } catch (error) {
      logger.error('Invoice extraction from image failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Parse Claude's JSON response into ExtractedData format
   */
  private parseClaudeResponse(responseText: string): ExtractedData {
    // Try to extract JSON from the response
    let jsonStr = responseText.trim();

    // Remove markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to find JSON object in the response
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonStr);

      // Validate and normalize the response
      const extractedData: ExtractedData = {
        vendorName: parsed.vendorName || parsed.vendor_name || '',
        vendorAddress: parsed.vendorAddress || parsed.vendor_address || '',
        vendorGstin: parsed.vendorGstin || parsed.vendor_gstin || '',
        invoiceNumber: parsed.invoiceNumber || parsed.invoice_number || '',
        invoiceDate: this.normalizeDate(parsed.invoiceDate || parsed.invoice_date || ''),
        dueDate: this.normalizeDate(parsed.dueDate || parsed.due_date),
        lineItems: this.parseLineItems(parsed.lineItems || parsed.line_items || []),
        subtotal: this.parseNumber(parsed.subtotal || parsed.sub_total || 0),
        totalCgst: this.parseNumber(parsed.totalCgst || parsed.total_cgst || 0),
        totalSgst: this.parseNumber(parsed.totalSgst || parsed.total_sgst || 0),
        totalIgst: this.parseNumber(parsed.totalIgst || parsed.total_igst || 0),
        totalTax: this.parseNumber(parsed.totalTax || parsed.total_tax || 0),
        totalAmount: this.parseNumber(parsed.totalAmount || parsed.total_amount || 0),
        confidence: this.parseNumber(parsed.confidence || 0.5, true),
      };

      return extractedData;
    } catch (error) {
      logger.error('Failed to parse Claude response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responsePreview: jsonStr.substring(0, 500),
      });
      throw new Error('Failed to parse extracted data from AI response');
    }
  }

  /**
   * Parse line items from various formats
   */
  private parseLineItems(items: unknown[]): LineItem[] {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        description: String(record.description || record.desc || record.name || ''),
        hsnCode: String(record.hsnCode || record.hsn_code || record.hsn || ''),
        quantity: this.parseNumber(record.quantity || record.qty || record.qtyty || 0),
        rate: this.parseNumber(record.rate || record.unit_price || record.unitPrice || 0),
        amount: this.parseNumber(record.amount || record.total || record.lineTotal || record.line_total || 0),
        cgst: record.cgst !== undefined ? this.parseNumber(record.cgst) : undefined,
        sgst: record.sgst !== undefined ? this.parseNumber(record.sgst) : undefined,
        igst: record.igst !== undefined ? this.parseNumber(record.igst) : undefined,
      };
    });
  }

  /**
   * Parse number from string or number
   */
  private parseNumber(value: unknown, asFloat: boolean = false): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and spaces
      const cleaned = value.replace(/[₹$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Normalize date to ISO format YYYY-MM-DD
   */
  private normalizeDate(dateStr: string | undefined | null): string {
    if (!dateStr) return '';

    // Already in correct format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Try parsing various formats
    const formats = [
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      // DD.MM.YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    // Try JavaScript Date parsing as fallback
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return dateStr;
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return false;
    }

    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const ocrService = new OCRService();
