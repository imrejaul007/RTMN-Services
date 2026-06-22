/**
 * CorpPerks API Access Matrix
 * Who can access what
 */

const express = require('express');
const router = express.Router();

// This file documents the access matrix

/**
 * =============================================================================
 * ACCESS MATRIX - WHO ACCESSES WHAT
 * =============================================================================
 *
 * THREE USER TYPES:
 *
 * 1. REZ ADMIN (Platform Owner)
 *    - Manages platform-wide settings
 *    - Sets default benefits
 *    - Monitors all companies
 *
 * 2. COMPANY ADMIN (CorpPerks Customer)
 *    - Manages their company's employees
 *    - Sets corporate wallet benefits
 *    - Allocates budgets
 *
 * 3. MERCHANT (ReZ Partner)
 *    - Sets their own discount/cashback offers
 *    - Views transactions at their store
 *    - Manages their profile
 *
 * 4. EMPLOYEE (End User)
 *    - Views their wallet
 *    - Makes purchases
 *    - Checks benefits
 *
 * =============================================================================
 */

// =============================================================================
// REZ ADMIN ROUTES
// Path: /api/admin/ (future) or direct
// =============================================================================

/**
 * REZ ADMIN CAN ACCESS:
 *
 * Platform Settings:
 * - GET/PUT /api/benefits-config/platform
 *   → Set default cashback, coins rate, caps
 *
 * Company Management:
 * - GET /api/corp/companies
 * - PUT /api/corp/companies/:id/status
 *
 * Analytics (All Companies):
 * - GET /api/analytics/platform (platform-wide stats)
 *
 * Merchant Management:
 * - GET /api/benefits-config/merchants
 * - PUT /api/merchants/:id/verify
 */

// =============================================================================
// COMPANY ADMIN ROUTES
// Path: /api/corp/
// =============================================================================

/**
 * COMPANY ADMIN CAN ACCESS:
 *
 * Corporate Wallet:
 * - GET /api/wallet/corporate/:companyId
 * - POST /api/wallet/corporate/:companyId/topup
 * - POST /api/wallet/employee-corporate/:employeeId/allocate
 * - POST /api/wallet/bulk-allocate
 *
 * Corporate Benefits:
 * - GET/PUT /api/benefits-config/company/:companyId
 *   → Set corporate discount (10%, 12%, etc.)
 *   → Set corporate cashback (5%, 6%, etc.)
 *
 * Employees:
 * - GET /api/corp/employees
 * - POST /api/corp/employees
 * - POST /api/corp/employees/:id/benefits
 *
 * Campaigns:
 * - GET /api/campaigns
 * - POST /api/campaigns
 * - PUT /api/campaigns/:id
 *
 * GST:
 * - GET /api/gst/invoices
 * - POST /api/gst/invoices
 * - POST /api/gst/reports/gstr1
 *
 * Analytics:
 * - GET /api/analytics/dashboard/:companyId
 * - GET /api/analytics/benefits/:companyId
 * - GET /api/analytics/financial/:companyId
 */

// =============================================================================
// MERCHANT ROUTES
// Path: /api/merchant/ (future) or /api/benefits-config/merchant/
// =============================================================================

/**
 * MERCHANT CAN ACCESS:
 *
 * Merchant Benefits (Own Settings):
 * - GET /api/benefits-config/merchant/:merchantId
 * - PUT /api/benefits-config/merchant/:merchantId
 *   → Set custom discount rate
 *   → Set custom cashback rate
 *   → Set custom coins rate
 *
 * Merchant Dashboard:
 * - GET /api/merchant/transactions (their transactions only)
 * - GET /api/merchant/stats (their analytics)
 *
 * Merchant Profile:
 * - GET/PUT /api/merchants/:id/profile
 */

// =============================================================================
// EMPLOYEE ROUTES
// Path: /api/wallet/personal/, /api/wallet/employee-corporate/
// =============================================================================

/**
 * EMPLOYEE CAN ACCESS:
 *
 * Personal Wallet:
 * - GET /api/wallet/personal/:employeeId
 * - POST /api/wallet/personal/:employeeId/topup
 * - POST /api/wallet/personal/:employeeId/spend
 *
 * Corporate Wallet:
 * - GET /api/wallet/employee-corporate/:employeeId
 * - GET /api/wallet/employee-corporate/:employeeId/:type
 * - POST /api/wallet/employee-corporate/:employeeId/spend
 *
 * Combined View:
 * - GET /api/wallet/combined/:employeeId
 *   → Shows both wallets
 *
 * Check Benefits:
 * - POST /api/benefits-config/resolve
 *   → Check best benefits before purchase
 *
 * Transactions:
 * - GET /api/wallet/transactions?employeeId=E001
 */

// =============================================================================
// PUBLIC ROUTES (No Auth Required)
// =============================================================================

/**
 * PUBLIC (No Auth):
 * - GET /api/benefits-config/merchant/:id
 *   → Merchant's public offers (shown to customers)
 * - GET /api/merchants (search merchants)
 * - GET /health
 */

module.exports = router;
