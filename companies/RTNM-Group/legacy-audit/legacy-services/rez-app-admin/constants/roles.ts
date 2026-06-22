/**
 * Admin role constants
 * ADMIN-022+: Centralize hardcoded role strings
 */

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  SUPPORT: 'support',
} as const;

export type AdminRole = (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES];

/**
 * Get human-readable role name
 */
export function getRoleDisplayName(role: string): string {
  switch (role) {
    case ADMIN_ROLES.SUPER_ADMIN:
      return 'Super Admin';
    case ADMIN_ROLES.ADMIN:
      return 'Admin';
    case ADMIN_ROLES.OPERATOR:
      return 'Operator';
    case ADMIN_ROLES.SUPPORT:
      return 'Support';
    default:
      return role;
  }
}

/**
 * List of all valid admin roles
 */
export const VALID_ADMIN_ROLES: AdminRole[] = Object.values(ADMIN_ROLES);

/**
 * Check if a role is a valid admin role
 */
export function isValidAdminRole(role: string): role is AdminRole {
  return VALID_ADMIN_ROLES.includes(role as AdminRole);
}

/**
 * BUG-007 FIX: Per-route role requirements map.
 *
 * Maps each dashboard route name (as registered in app/(dashboard)/_layout.tsx) to
 * the array of roles allowed to access it. If a route is absent from this map,
 * it is treated as accessible to any authenticated admin (no role restriction).
 *
 * Role hierarchy (numeric level, used by AuthContext.hasRole):
 *   SUPER_ADMIN(100) > ADMIN(80) > OPERATOR(70) > SUPPORT(60)
 *
 * IMPORTANT: When adding a new protected route:
 *   1. Add it to this map with the minimum required role.
 *   2. Do NOT rely on hasRole's numeric hierarchy alone — use an explicit array
 *      so that only the intended roles are granted access (e.g., SUPPORT can
 *      inherit OPERATOR's numeric level but should not inherit ADMIN routes).
 *
 * Routes not listed here are accessible to all authenticated admin users.
 */
export const ROUTE_ROLE_REQUIREMENTS: Record<string, string[]> = {
  // ── User & Admin Management ────────────────────────────────────────────────
  // admin-users: manage admin accounts — super_admin only
  'admin-users': [ADMIN_ROLES.SUPER_ADMIN],
  // admin-settings: app-wide configuration — super_admin only
  'admin-settings': [ADMIN_ROLES.SUPER_ADMIN],
  // audit-log: security audit trail — super_admin + admin
  'audit-log': [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN],
  // users/[id]: individual user detail — operator and above
  'users/[id]': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR, ADMIN_ROLES.SUPPORT],

  // ── Analytics & Reporting ─────────────────────────────────────────────────
  // analytics-dashboard: central analytics — admin and above
  'analytics-dashboard': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // business-metrics: revenue and growth metrics — admin and above
  'business-metrics': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // cohort-analysis: user cohort analysis — admin and above
  'cohort-analysis': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // funnel-analytics: conversion funnel — admin and above
  'funnel-analytics': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // revenue-report: financial reporting — admin and above
  'revenue-report': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // revenue-by-vertical: revenue breakdown — admin and above
  'revenue-by-vertical': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // merchant-plan-analytics: plan upgrade analytics — admin and above
  'merchant-plan-analytics': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // web-menu-analytics: web menu performance — admin and above
  'web-menu-analytics': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // rez-now-analytics: REZ Now analytics — admin and above
  'rez-now-analytics': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // marketing-analytics: marketing campaign analytics — admin and above
  'marketing-analytics': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],

  // ── Gamification & Economy ─────────────────────────────────────────────────
  // gamification-economy: coin economy controls — admin only
  'gamification-economy': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // economics: platform economics dashboard — admin only
  'economics': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // coin-governor: coin minting/burning controls — admin only
  'coin-governor': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // coin-rewards: reward configuration — admin and support
  'coin-rewards': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // loyalty-milestones: loyalty tier configuration — admin and support
  'loyalty-milestones': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // leaderboard-config: leaderboard settings — admin and support
  'leaderboard-config': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // surprise-coin-drops: coin drop campaigns — admin and support
  'surprise-coin-drops': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // coin-gifts: gift coin management — admin and support
  'coin-gifts': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // achievements: achievement definitions — admin and support
  'achievements': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // challenges: challenge configuration — admin and support
  'challenges': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // tournaments: tournament management — admin and support
  'tournaments': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // game-config: game settings — admin only
  'game-config': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // event-rewards: event reward config — admin and support
  'event-rewards': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // bonus-zone: bonus zone management — admin and support
  'bonus-zone': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // extra-rewards: extra reward rules — admin and support
  'extra-rewards': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],

  // ── Merchant Management ────────────────────────────────────────────────────
  // merchant-flags/[merchantId]: per-merchant feature flags — admin only
  'merchant-flags/[merchantId]': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],

  // ── Financial & Disbursement ───────────────────────────────────────────────
  // merchant-withdrawals: payout approvals — admin and operator
  'merchant-withdrawals': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],
  // wallet-adjustment: manual wallet corrections — admin only
  'wallet-adjustment': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // partner-earnings: partner commission reports — admin and operator
  'partner-earnings': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],
  // cash-store: cash store management — admin only
  'cash-store': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // value-cards: value card management — admin only
  'value-cards': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // gift-cards-admin: gift card admin — admin only
  'gift-cards-admin': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // voucher-management: voucher system — admin and support
  'voucher-management': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // cashback-rules: cashback configuration — admin only
  'cashback-rules': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // payroll: payroll disbursements — admin only
  'payroll': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],

  // ── Fraud & Security ────────────────────────────────────────────────────────
  // fraud-config: fraud detection configuration — admin only
  'fraud-config': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // fraud-alerts: active fraud alerts — admin and support
  'fraud-alerts': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // fraud-queue: flagged transaction queue — admin and support
  'fraud-queue': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // fraud-reports: fraud case reports — admin and support
  'fraud-reports': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // device-security: device fingerprinting — admin only
  'device-security': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],

  // ── Platform & System Configuration ───────────────────────────────────────
  // platform-config: platform-wide settings — super_admin only
  'platform-config': [ADMIN_ROLES.SUPER_ADMIN],
  // platform-control-center: low-level platform control — super_admin only
  'platform-control-center': [ADMIN_ROLES.SUPER_ADMIN],
  // feature-flags: feature toggle management — admin only
  'feature-flags': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // support-config: support system config — admin and support
  'support-config': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // support-tools: advanced support utilities — admin and support
  'support-tools': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // support-tickets: ticket system config — admin and support
  'support-tickets': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // wallet-config: wallet settings — admin only
  'wallet-config': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // delivery-settings: delivery configuration — admin only
  'delivery-settings': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // api-latency: API latency monitoring — admin and operator
  'api-latency': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],
  // aggregator-monitor: service aggregator health — admin and operator
  'aggregator-monitor': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],

  // ── Moderation ─────────────────────────────────────────────────────────────
  // users: user management list — operator and above
  'users': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR, ADMIN_ROLES.SUPPORT],
  // pending-approvals: content/identity approvals — admin and support
  'pending-approvals': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // stores-moderation: store moderation queue — admin and support
  'stores-moderation': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // review-moderation: review moderation queue — admin and support
  'review-moderation': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // comments-moderation: comment moderation — admin and support
  'comments-moderation': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // ugc-moderation: UGC moderation — admin and support
  'ugc-moderation': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // photo-moderation: photo moderation — admin and support
  'photo-moderation': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // verifications: KYC/user verifications — admin and support
  'verifications': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // trial-approvals: trial program approvals — admin and support
  'trial-approvals': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],

  // ── BBPS & Bill Payments ──────────────────────────────────────────────────
  // bbps-config: BBPS service configuration — admin only
  'bbps-config': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // bbps-health: BBPS service health — admin and operator
  'bbps-health': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],
  // bbps-analytics: BBPS analytics — admin and operator
  'bbps-analytics': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],
  // bbps-transactions: BBPS transaction log — admin and operator
  'bbps-transactions': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],
  // bbps-providers: BBPS provider config — admin only
  'bbps-providers': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],

  // ── Campaigns & Engagement ───────────────────────────────────────────────
  // campaign-management: campaign builder — admin and support
  'campaign-management': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // broadcast: push broadcast — admin and support
  'broadcast': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // engagement-config: engagement settings — admin and support
  'engagement-config': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // homepage-deals: homepage deal config — admin and support
  'homepage-deals': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // flash-sales: flash sale management — admin and support
  'flash-sales': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // ab-test-manager: A/B test configuration — admin only
  'ab-test-manager': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],

  // ── Operations & Monitoring ───────────────────────────────────────────────
  // unified-monitor: command center dashboard — admin and operator
  'unified-monitor': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],
  // live-monitor: real-time live monitoring — admin and operator
  'live-monitor': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],
  // system-health: system health dashboard — admin and operator
  'system-health': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],
  // sla-monitor: SLA compliance monitor — admin and operator
  'sla-monitor': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],
  // job-monitor: background job monitor — admin and operator
  'job-monitor': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],
  // alert-rules: alerting rules — admin and operator
  'alert-rules': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],

  // ── Miscellaneous ─────────────────────────────────────────────────────────
  // ads: ads management — admin only
  'ads': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // membership-config: membership tier config — admin and support
  'membership-config': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // dispute: dispute resolution — admin and support
  'disputes': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // special-profiles: special profile management — admin only
  'special-profiles': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
  // special-programs: special programs — admin and support
  'special-programs': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // institute-referrals: institute referral program — admin and support
  'institute-referrals': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // merchant-live-status: live merchant status — admin and operator
  'merchant-live-status': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.OPERATOR],
  // moderation-queue: general moderation queue — admin and support
  'moderation-queue': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPPORT],
  // reconciliation: financial reconciliation — admin only
  'reconciliation': [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN],
};

/**
 * BUG-007 FIX: Check if the user's role matches any of the required roles for a route.
 *
 * Uses the hierarchy from AuthContext.hasRole: SUPER_ADMIN(100) > ADMIN(80) >
 * OPERATOR(70) > SUPPORT(60). A user at a higher level satisfies any lower-level
 * requirement (e.g., a SUPER_ADMIN can access ADMIN-only routes).
 *
 * Routes not in ROUTE_ROLE_REQUIREMENTS are accessible to any authenticated admin.
 *
 * @param userRole  - The current user's role string (e.g. ADMIN_ROLES.ADMIN)
 * @param routeName - The route name from useSegments() (e.g. 'admin-users', 'users/[id]')
 * @returns true if the user is allowed to access the route, false otherwise
 */
export function hasRouteAccess(userRole: string | undefined, routeName: string): boolean {
  // Unauthenticated or unknown role — deny by default
  if (!userRole) return false;

  // Routes not in the map are open to all authenticated admin users
  const requiredRoles = ROUTE_ROLE_REQUIREMENTS[routeName];
  if (!requiredRoles) return true;

  // Check against the hierarchy: a higher-level role satisfies a lower-level requirement
  // NOTE: hasRole in AuthContext uses the same hierarchy, so SUPER_ADMIN satisfies ADMIN,
  // ADMIN satisfies OPERATOR, etc.
  return requiredRoles.some((required) => {
    // Use the numeric hierarchy from AuthContext for hierarchical inheritance:
    // SUPER_ADMIN(100) > ADMIN(80) > OPERATOR(70) > SUPPORT(60)
    const hierarchy: Record<string, number> = {
      [ADMIN_ROLES.SUPER_ADMIN]: 100,
      [ADMIN_ROLES.ADMIN]: 80,
      [ADMIN_ROLES.OPERATOR]: 70,
      [ADMIN_ROLES.SUPPORT]: 60,
    };

    const userLevel = hierarchy[userRole] ?? 0;
    const requiredLevel = hierarchy[required] ?? 0;

    // Grant access if user is at or above the required level
    return userLevel >= requiredLevel;
  });
}
