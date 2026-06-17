/**
 * Compliance Validator Service
 * Validates compliance rules and data
 */

import { ComplianceRule, RuleCondition, ComplianceType } from '../models/Compliance';
import { PersonalInfo, BusinessInfo, Document, VerificationLevel } from '../models/KYC';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  matchedRules: ComplianceRule[];
  violations: string[];
}

export class ComplianceValidator {
  /**
   * Evaluate a rule condition against data
   */
  evaluateCondition(condition: RuleCondition, data: Record<string, unknown>): boolean {
    const fieldValue = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;

      case 'not_equals':
        return fieldValue !== condition.value;

      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(condition.value as string);
        }
        if (typeof fieldValue === 'string') {
          return fieldValue.includes(condition.value as string);
        }
        return false;

      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > (condition.value as number);

      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < (condition.value as number);

      case 'in':
        if (Array.isArray(condition.value)) {
          return condition.value.includes(fieldValue);
        }
        return false;

      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;

      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;

      default:
        return false;
    }
  }

  /**
   * Evaluate all conditions in a rule against data
   */
  evaluateRule(rule: ComplianceRule, data: Record<string, unknown>): boolean {
    if (rule.conditions.length === 0) {
      return true;
    }

    let result = true;
    let currentOperator: 'AND' | 'OR' = 'AND';

    for (const condition of rule.conditions) {
      const conditionResult = this.evaluateCondition(condition, data);

      if (condition.logicalOperator) {
        currentOperator = condition.logicalOperator;
      }

      if (currentOperator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
    }

    return result;
  }

  /**
   * Check data against all compliance rules
   */
  validateCompliance(data: Record<string, unknown>, rules: ComplianceRule[]): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      matchedRules: [],
      violations: []
    };

    for (const rule of rules) {
      if (rule.status !== 'ACTIVE') continue;

      if (this.evaluateRule(rule, data)) {
        result.matchedRules.push(rule);

        for (const action of rule.actions) {
          switch (action.type) {
            case 'block':
              result.valid = false;
              result.errors.push(action.message || `Rule ${rule.name} blocked operation`);
              break;
            case 'alert':
            case 'flag':
              result.warnings.push(action.message || `Rule ${rule.name} flagged`);
              break;
            case 'notify':
              // Log notification (would send to notification service)
              break;
          }
        }

        // Check severity for critical violations
        if (rule.severity === 'critical') {
          result.violations.push(`${rule.name}: ${rule.description}`);
          result.valid = false;
        }
      }
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let value: unknown = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return value;
  }
}

export class KYCValidator {
  /**
   * Validate personal information
   */
  validatePersonalInfo(info: PersonalInfo): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!info.firstName || info.firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters');
    }

    if (!info.lastName || info.lastName.trim().length < 2) {
      errors.push('Last name must be at least 2 characters');
    }

    if (!info.dateOfBirth) {
      errors.push('Date of birth is required');
    } else {
      const age = this.calculateAge(new Date(info.dateOfBirth));
      if (age < 18) {
        errors.push('User must be at least 18 years old');
      }
      if (age > 120) {
        errors.push('Invalid date of birth');
      }
    }

    if (!info.nationality || info.nationality.trim().length !== 2) {
      errors.push('Valid nationality code (2 characters) is required');
    }

    if (!info.email || !this.isValidEmail(info.email)) {
      errors.push('Valid email address is required');
    }

    if (!info.address) {
      errors.push('Address is required');
    } else {
      const addressErrors = this.validateAddress(info.address);
      errors.push(...addressErrors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate business information
   */
  validateBusinessInfo(info: BusinessInfo): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!info.businessName || info.businessName.trim().length < 2) {
      errors.push('Business name must be at least 2 characters');
    }

    if (!info.registrationNumber || info.registrationNumber.trim().length < 3) {
      errors.push('Valid business registration number is required');
    }

    if (!info.businessType) {
      errors.push('Business type is required');
    }

    if (!info.incorporationDate) {
      errors.push('Incorporation date is required');
    } else if (new Date(info.incorporationDate) > new Date()) {
      errors.push('Incorporation date cannot be in the future');
    }

    if (!info.registeredAddress) {
      errors.push('Registered address is required');
    } else {
      const addressErrors = this.validateAddress(info.registeredAddress);
      errors.push(...addressErrors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate document
   */
  validateDocument(doc: Document, level: VerificationLevel): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!doc.type) {
      errors.push('Document type is required');
    }

    if (!doc.issuingCountry || doc.issuingCountry.trim().length !== 2) {
      errors.push('Valid issuing country code (2 characters) is required');
    }

    if (!doc.expiryDate) {
      errors.push('Document expiry date is required');
    } else {
      const expiryDate = new Date(doc.expiryDate);
      if (expiryDate <= new Date()) {
        errors.push('Document has expired');
      }
    }

    // Enhanced verification requires more documents
    if (level === VerificationLevel.ENHANCED || level === VerificationLevel.PREMIUM) {
      if (!doc.documentNumber) {
        errors.push('Document number is required for enhanced verification');
      }
      if (!doc.fileUrl) {
        errors.push('Document file is required for enhanced verification');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check required documents for verification level
   */
  getRequiredDocuments(level: VerificationLevel): string[] {
    switch (level) {
      case VerificationLevel.BASIC:
        return ['PASSPORT', 'SELFIE'];
      case VerificationLevel.STANDARD:
        return ['PASSPORT', 'SELFIE', 'PROOF_OF_ADDRESS'];
      case VerificationLevel.ENHANCED:
        return ['PASSPORT', 'SELFIE', 'PROOF_OF_ADDRESS', 'PROOF_OF_FUNDS'];
      case VerificationLevel.PREMIUM:
        return ['PASSPORT', 'SELFIE', 'PROOF_OF_ADDRESS', 'PROOF_OF_FUNDS', 'BUSINESS_REGISTRATION'];
      default:
        return ['PASSPORT', 'SELFIE'];
    }
  }

  /**
   * Validate address
   */
  private validateAddress(address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }): string[] {
    const errors: string[] = [];

    if (!address.street || address.street.trim().length < 5) {
      errors.push('Valid street address is required');
    }

    if (!address.city || address.city.trim().length < 2) {
      errors.push('City is required');
    }

    if (!address.postalCode || address.postalCode.trim().length < 3) {
      errors.push('Valid postal code is required');
    }

    if (!address.country || address.country.trim().length !== 2) {
      errors.push('Valid country code (2 characters) is required');
    }

    return errors;
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const complianceValidator = new ComplianceValidator();
export const kycValidator = new KYCValidator();
