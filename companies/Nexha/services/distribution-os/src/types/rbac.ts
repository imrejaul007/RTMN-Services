/**
 * RBAC Types - Re-exported for convenience
 */

export type Role =
  | 'super_admin'
  | 'admin'
  | 'distributor_owner'
  | 'distributor_manager'
  | 'franchise_owner'
  | 'franchise_manager'
  | 'supplier_owner'
  | 'supplier_manager'
  | 'merchant_owner'
  | 'merchant_staff'
  | 'auditor'
  | 'support';

export type Resource =
  | 'distributors'
  | 'franchises'
  | 'manufacturers'
  | 'suppliers'
  | 'orders'
  | 'rfqs'
  | 'credits'
  | 'reports'
  | 'settings'
  | 'users'
  | 'audit';

export type Action = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export';
