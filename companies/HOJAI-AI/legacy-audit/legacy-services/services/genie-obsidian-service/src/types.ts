/**
 * GENIE genie-obsidian-service - Type Definitions
 * Port: 4719
 */

export interface TenantContext { tenant_id: string; namespace: string; user_id?: string; }
declare global { namespace Express { interface Request { tenantContext?: TenantContext; userId?: string; } } }
