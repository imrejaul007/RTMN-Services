/**
 * GENIE genie-memory-review-service - Type Definitions
 * Port: 4723
 */

export interface TenantContext { tenant_id: string; namespace: string; user_id?: string; }
declare global { namespace Express { interface Request { tenantContext?: TenantContext; userId?: string; } } }
