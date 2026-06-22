/**
 * RoleGuard HOC — RBAC enforcement for sensitive admin screens.
 *
 * ADM-002 FIX: Many sensitive screens had no role checks. This HOC wraps
 * components that require specific admin roles and renders an Access Denied
 * screen when the current user's role does not match the required roles.
 *
 * Usage:
 *   // Wrap at export level (recommended — screen never renders for unauthorized roles)
 *   export default withRole(SensitiveScreen, [ADMIN_ROLES.ADMIN]);
 *
 *   // Or guard a sub-section within a screen:
 *   if (!useHasAnyRole([ADMIN_ROLES.ADMIN])) return <AccessDenied />;
 *
 * The HOC returns null (renders nothing) when the user is not authenticated.
 * This prevents any content flash before redirecting to login.
 *
 * SECURITY FIX: RoleGuard now uses the canonical AdminRole type from constants/roles.ts
 * to ensure alignment with the backend role system (super_admin, admin, operator, support).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { isValidAdminRole, AdminRole as BackendAdminRole, ADMIN_ROLES } from '@/constants/roles';

/**
 * Re-export AdminRole from constants/roles.ts for use in role guards.
 * This type matches the backend role system.
 */
export type AdminRole = BackendAdminRole;

/**
 * Role hierarchy for RBAC decisions.
 * Numeric levels: SUPER_ADMIN(100) > ADMIN(80) > OPERATOR(70) > SUPPORT(60)
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  [ADMIN_ROLES.SUPER_ADMIN]: 100,
  [ADMIN_ROLES.ADMIN]: 80,
  [ADMIN_ROLES.OPERATOR]: 70,
  [ADMIN_ROLES.SUPPORT]: 60,
};

/**
 * HOC: wrap a component to require one or more roles.
 * - Returns null if user is not yet loaded (auth is loading)
 * - Returns null if user is not authenticated
 * - Returns Access Denied UI if user's role is not in requiredRoles
 * - Otherwise renders the wrapped component normally
 */
export function withRole<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRoles: AdminRole[]
) {
  return function RoleGuardedComponent(props: P) {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading || !isAuthenticated) {
      return null;
    }

    const userRole = user?.role;

    // SECURITY FIX: Use hierarchical role matching to align with hasRouteAccess logic
    // A user at level X satisfies any role requirement at level <= X
    const isAuthorized =
      userRole &&
      isValidAdminRole(userRole) &&
      requiredRoles.some((required) => {
        const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
        const requiredLevel = ROLE_HIERARCHY[required] ?? 0;
        return userLevel >= requiredLevel;
      });

    if (!isAuthorized) {
      return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔒</Text>
          </View>
          <Text style={styles.title}>Access Denied</Text>
          <Text style={styles.message}>
            Your role ({userRole || 'unknown'}) does not have permission to view this screen.
            {'\n'}Required: {requiredRoles.join(', ')}
          </Text>
          <Text style={styles.hint}>
            If you believe this is an error, contact your administrator.
          </Text>
        </View>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Hook: check whether the current user has one of the given roles.
 * Uses hierarchical matching: a user at level X satisfies any role at level <= X.
 *
 * @example
 * const hasAccess = useHasAnyRole([ADMIN_ROLES.ADMIN]);
 * if (!hasAccess) return <AccessDenied />;
 */
export function useHasAnyRole(roles: AdminRole[]): boolean {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading || !isAuthenticated || !user?.role) return false;

  // SECURITY FIX: Use hierarchical role matching for consistent authorization
  if (!isValidAdminRole(user.role)) return false;

  const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
  return roles.some((required) => {
    const requiredLevel = ROLE_HIERARCHY[required] ?? 0;
    return userLevel >= requiredLevel;
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.light.background,
  },
  iconContainer: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#687076',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
