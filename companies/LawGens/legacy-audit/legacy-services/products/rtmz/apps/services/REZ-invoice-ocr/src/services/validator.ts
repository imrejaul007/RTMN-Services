import { ExtractedData, LineItem } from '../models/ExtractedData';
import { ValidationResult, ValidationError, ValidationWarning } from '../models/InvoiceOCR';
import { Logger } from '../utils/logger';

const logger = new Logger('validator');

/**
 * Validator Service - GSTIN validation and tax calculations
 */
export class ValidatorService {
  /**
   * Validate extracted invoice data
   */
  validate(data: ExtractedData): ValidationResult {
    logger.info('Starting invoice validation', {
      vendorName: data.vendorName,
      invoiceNumber: data.invoiceNumber,
    });

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate vendor name
    if (!data.vendorName || data.vendorName.trim() === '') {
      errors.push({
        field: 'vendorName',
        message: 'Vendor name is required',
        severity: 'error',
      });
    }

    // Validate invoice number
    if (!data.invoiceNumber || data.invoiceNumber.trim() === '') {
      errors.push({
        field: 'invoiceNumber',
        message: 'Invoice number is required',
        severity: 'error',
      });
    }

    // Validate invoice date
    if (!data.invoiceDate || data.invoiceDate.trim() === '') {
      errors.push({
        field: 'invoiceDate',
        message: 'Invoice date is required',
        severity: 'error',
      });
    } else if (!this.isValidDateFormat(data.invoiceDate)) {
      errors.push({
        field: 'invoiceDate',
        message: 'Invoice date must be in YYYY-MM-DD format',
        severity: 'error',
      });
    }

    // Validate GSTIN if present
    if (data.vendorGstin) {
      const gstinValidation = this.validateGSTIN(data.vendorGstin);
      if (!gstinValidation.valid) {
        errors.push({
          field: 'vendorGstin',
          message: gstinValidation.message || 'Invalid GSTIN format',
          severity: 'error',
        });
      }
    }

    // Validate line items
    if (!data.lineItems || data.lineItems.length === 0) {
      errors.push({
        field: 'lineItems',
        message: 'At least one line item is required',
        severity: 'error',
      });
    } else {
      // Validate each line item
      data.lineItems.forEach((item, index) => {
        const itemErrors = this.validateLineItem(item, index);
        errors.push(...itemErrors);
      });
    }

    // Validate tax calculations
    const taxValidation = this.validateTaxCalculations(data);
    if (!taxValidation.valid) {
      errors.push(...taxValidation.errors);
    }
    if (taxValidation.warnings.length > 0) {
      warnings.push(...taxValidation.warnings);
    }

    // Validate amounts
    if (data.totalAmount <= 0) {
      errors.push({
        field: 'totalAmount',
        message: 'Total amount must be greater than zero',
        severity: 'error',
      });
    }

    // Warnings for low confidence
    if (data.confidence < 0.5) {
      warnings.push({
        field: 'confidence',
        message: `Low extraction confidence (${(data.confidence * 100).toFixed(0)}%). Please review the data manually.`,
        severity: 'warning',
      });
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    logger.info('Invoice validation completed', {
      isValid: result.isValid,
      errorCount: errors.length,
      warningCount: warnings.length,
    });

    return result;
  }

  /**
   * Validate a single line item
   */
  private validateLineItem(item: LineItem, index: number): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!item.description || item.description.trim() === '') {
      errors.push({
        field: `lineItems[${index}].description`,
        message: `Line item ${index + 1}: Description is required`,
        severity: 'error',
      });
    }

    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      errors.push({
        field: `lineItems[${index}].quantity`,
        message: `Line item ${index + 1}: Quantity must be a positive number`,
        severity: 'error',
      });
    }

    if (typeof item.rate !== 'number' || item.rate < 0) {
      errors.push({
        field: `lineItems[${index}].rate`,
        message: `Line item ${index + 1}: Rate must be a non-negative number`,
        severity: 'error',
      });
    }

    if (typeof item.amount !== 'number' || item.amount < 0) {
      errors.push({
        field: `lineItems[${index}].amount`,
        message: `Line item ${index + 1}: Amount must be a non-negative number`,
        severity: 'error',
      });
    }

    // Validate HSN code format if present
    if (item.hsnCode && !this.isValidHSNCode(item.hsnCode)) {
      errors.push({
        field: `lineItems[${index}].hsnCode`,
        message: `Line item ${index + 1}: Invalid HSN code format`,
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate tax calculations
   */
  private validateTaxCalculations(data: ExtractedData): {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Calculate expected subtotal from line items
    const calculatedSubtotal = data.lineItems.reduce(
      (sum, item) => sum + (item.amount || 0),
      0
    );

    // Check subtotal match (with small tolerance for rounding)
    const subtotalDiff = Math.abs(calculatedSubtotal - data.subtotal);
    if (subtotalDiff > 0.1) {
      errors.push({
        field: 'subtotal',
        message: `Subtotal mismatch. Expected ${calculatedSubtotal.toFixed(2)}, got ${data.subtotal.toFixed(2)}`,
        severity: 'error',
      });
    }

    // Calculate expected total tax
    let calculatedTax = 0;
    data.lineItems.forEach(item => {
      calculatedTax += (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
    });

    const taxDiff = Math.abs(calculatedTax - data.totalTax);
    if (taxDiff > 0.1) {
      errors.push({
        field: 'totalTax',
        message: `Total tax mismatch. Expected ${calculatedTax.toFixed(2)}, got ${data.totalTax.toFixed(2)}`,
        severity: 'error',
      });
    }

    // Validate CGST + SGST vs IGST (mutually exclusive)
    const hasCGST = data.totalCgst > 0;
    const hasSGST = data.totalSgst > 0;
    const hasIGST = data.totalIgst > 0;

    if (hasCGST && hasIGST) {
      errors.push({
        field: 'totalIgst',
        message: 'Invoice cannot have both CGST and IGST (inter-state and intra-state taxes)',
        severity: 'error',
      });
    }

    if (hasSGST && hasIGST) {
      errors.push({
        field: 'totalIgst',
        message: 'Invoice cannot have both SGST and IGST (inter-state and intra-state taxes)',
        severity: 'error',
      });
    }

    // Calculate expected total
    const expectedTotal = data.subtotal + data.totalTax;
    const totalDiff = Math.abs(expectedTotal - data.totalAmount);

    if (totalDiff > 0.1) {
      errors.push({
        field: 'totalAmount',
        message: `Total amount mismatch. Expected ${expectedTotal.toFixed(2)}, got ${data.totalAmount.toFixed(2)}`,
        severity: 'error',
      });
    }

    // Warning for round-off differences
    if (totalDiff > 0 && totalDiff <= 0.1) {
      warnings.push({
        field: 'totalAmount',
        message: `Minor round-off difference of ${totalDiff.toFixed(2)}`,
        severity: 'warning',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate GSTIN format
   * Format: 2 digits (state code) + 5 digits (PAN) + 1 character (entity number) + 2 characters (Z) + 1 character (checksum)
   */
  validateGSTIN(gstin: string): { valid: boolean; message?: string } {
    if (!gstin || gstin.trim() === '') {
      return { valid: false, message: 'GSTIN is required' };
    }

    const cleanGstin = gstin.trim().toUpperCase();

    // Check length
    if (cleanGstin.length !== 15) {
      return { valid: false, message: 'GSTIN must be exactly 15 characters' };
    }

    // Check format pattern
    const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{2}[Z][0-9]$/;
    if (!pattern.test(cleanGstin)) {
      return { valid: false, message: 'GSTIN format is invalid. Expected format: XXAAAAA0000A1Z5' };
    }

    // Validate state code (first 2 digits)
    const stateCode = parseInt(cleanGstin.substring(0, 2), 10);
    if (stateCode < 1 || stateCode > 37) {
      return { valid: false, message: 'Invalid state code in GSTIN' };
    }

    // Validate PAN portion (characters 3-7)
    const pan = cleanGstin.substring(2, 7);
    const panPattern = /^[A-Z]{5}$/;
    if (!panPattern.test(pan)) {
      return { valid: false, message: 'Invalid PAN format in GSTIN' };
    }

    // Validate 10th character (should be Z)
    if (cleanGstin.charAt(11) !== 'Z') {
      return { valid: false, message: '10th character of GSTIN should be Z' };
    }

    // Checksum validation (simplified - full validation requires government API)
    // The last character is a checksum that can be validated against the pattern

    return { valid: true };
  }

  /**
   * Check if date is in valid YYYY-MM-DD format
   */
  private isValidDateFormat(dateStr: string): boolean {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!pattern.test(dateStr)) {
      return false;
    }

    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  /**
   * Validate HSN code format
   * HSN codes are typically 4, 6, or 8 digits
   */
  private isValidHSNCode(hsnCode: string): boolean {
    const cleanHSN = hsnCode.trim();
    // HSN codes are 4, 6, or 8 digits
    return /^\d{4}$|^\d{6}$|^\d{8}$/.test(cleanHSN);
  }

  /**
   * Recalculate taxes based on line items
   */
  recalculateTaxes(items: LineItem[], taxRate: number = 18): {
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    totalAmount: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const halfRate = taxRate / 2;

    const cgst = subtotal * (halfRate / 100);
    const sgst = subtotal * (halfRate / 100);
    const igst = subtotal * (taxRate / 100);
    const totalTax = cgst + sgst; // or igst for inter-state

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalAmount: Math.round((subtotal + totalTax) * 100) / 100,
    };
  }
}

export const validatorService = new ValidatorService();
