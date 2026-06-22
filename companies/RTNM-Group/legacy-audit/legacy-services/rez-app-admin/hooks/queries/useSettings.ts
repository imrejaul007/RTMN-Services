/**
 * useSettings
 *
 * React Query hooks for the admin settings screen.
 * Wraps authService.getCurrentUser() for profile data and the
 * change-password / logout-all-devices mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService, AdminUser } from '@/services/api/auth';
import { apiClient } from '@/services/api/apiClient';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export function useCurrentUser() {
  const { user } = useAuth();
  return useQuery<AdminUser, Error>({
    queryKey: queryKeys.settings.currentUser(),
    queryFn: () => authService.getCurrentUser().then((res) => {
      if (!res) throw new Error('Failed to load user');
      return res;
    }),
    enabled: !!user,
    ...queryConfig.userProfile,
  });
}

export interface ChangePasswordVariables {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message?: string }, Error, ChangePasswordVariables>({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const res = await apiClient.post<{ success: boolean; message?: string }>(
        'admin/auth/change-password',
        { currentPassword, newPassword },
        { headers: { 'X-App-Version': '1.0.0' } }
      );
      if (!res.success) {
        throw new Error(res.message || 'Failed to change password');
      }
      return res as { success: boolean; message?: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

export function useLogoutAllDevices() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  return useMutation<void, Error>({
    mutationFn: () => authService.logoutAllDevices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      // Force local logout after remote sessions are terminated
      logout();
    },
    onError: (error) => {
      // Even if remote logout fails, force local logout (security guarantee)
      logout();
      throw error;
    },
  });
}
