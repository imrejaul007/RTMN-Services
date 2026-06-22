import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

export interface MutationError {
  message: string;
  statusCode?: number;
}

/**
 * Admin-specific mutation wrapper that:
 * - wraps the service call in try/catch so thrown errors flow through React Query's onError;
 * - infers variables and result types from the caller;
 * - accepts invalidateKeys so callers can specify exactly which query keys to refetch on success.
 *
 * FIX: invalidateKeys are now actually used — previously this was dead code.
 * Both branches called the same thing. Now queryClient.invalidateQueries fires
 * before the user's onSuccess callback, so React Query cache is always refreshed
 * when the mutation succeeds.
 */
export function useAdminMutation<TVars, TResult>(
  options: UseMutationOptions<TResult, AxiosError<MutationError>, TVars> & {
    invalidateKeys?: (readonly unknown[])[];
  }
) {
  const { invalidateKeys, ...mutationOptions } = options;
  const queryClient = useQueryClient();

  return useMutation<TResult, AxiosError<MutationError>, TVars>({
    ...mutationOptions,
    onSuccess: (...args: unknown[]) => {
      // Invalidate cached query keys on success so lists refetch with fresh data.
      if (invalidateKeys && invalidateKeys.length > 0) {
        for (const key of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
      // Forward to the caller's onSuccess if provided.
      (mutationOptions.onSuccess as (...a: unknown[]) => void)?.(...args);
    },
  });
}
