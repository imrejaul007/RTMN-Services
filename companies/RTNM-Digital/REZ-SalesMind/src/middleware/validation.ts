/**
 * Validation Middleware - Input validation for all routes
 */

/**
 * HTML/entity encode a string to prevent XSS injection
 */
function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Sanitize an object by escaping all string values recursively
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            // Limit length and escape HTML entities
            result[key] = escapeHtml(value.trim().substring(0, 1000));
        } else if (Array.isArray(value)) {
            result[key] = value.map(v => typeof v === 'string' ? escapeHtml(v).substring(0, 1000) : v);
        } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeObject(value as Record<string, unknown>);
        } else {
            result[key] = value;
        }
    }
    return result;
}

export interface ValidationRule {
    param: 'body' | 'queryParams' | 'params';
    fields: string[];
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => string | null; // returns error message or null
}

export function validateRequest(rules: ValidationRule[]) {
    return (req: { body: unknown; query: unknown; params: unknown }, res: { status: (code: number) => { json: (data: object) => void } }, next: () => void) => {
        const errors: string[] = [];
        for (const rule of rules) {
            const paramMap: Record<string, unknown> = {
                body: req.body as Record<string, unknown> | undefined,
                queryParams: req.query as Record<string, unknown> | undefined,
                params: req.params as Record<string, unknown> | undefined
            };
            const data = paramMap[rule.param];
            for (const field of rule.fields) {
                const value = data?.[field];
                if (value === undefined || value === null || value === '') {
                    errors.push(`${field} is required in ${rule.param}`);
                } else if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
                    errors.push(`${field} exceeds max length of ${rule.maxLength}`);
                } else if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
                    errors.push(`${field} must be at least ${rule.minLength} characters`);
                } else if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
                    errors.push(`${field} has an invalid format`);
                } else if (rule.custom) {
                    const customError = rule.custom(value);
                    if (customError) errors.push(customError);
                }
            }
        }
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }
        next();
    };
}

/**
 * Email validation helper
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Phone validation helper (basic)
 */
export function isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-+()]{7,20}$/;
    return phoneRegex.test(phone);
}

/**
 * Sanitize string input - prevent injection — FIXED: proper HTML entity encoding
 */
export function sanitizeString(input: unknown): string {
    if (typeof input !== 'string') return '';
    return escapeHtml(input.trim().substring(0, 1000));
}

/**
 * Sanitize a full request body object — FIXED: recursive object sanitization
 */
export function sanitizeBody(body: unknown): Record<string, unknown> {
    if (typeof body !== 'object' || body === null) return {};
    return sanitizeObject(body as Record<string, unknown>);
}

/**
 * Validate leadId format (alphanumeric UUID or safe string)
 */
export function isValidLeadId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    if (id.length > 128) return false;
    // Allow UUIDs, alphanumeric with dashes/underscores
    return /^[a-zA-Z0-9_-]+$/.test(id);
}
