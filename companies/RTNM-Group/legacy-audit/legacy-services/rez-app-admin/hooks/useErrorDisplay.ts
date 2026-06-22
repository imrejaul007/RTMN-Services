/**
 * BUG-048 FIX: Centralized error display hook.
 *
 * Provides consistent error extraction and display across all screens.
 * Previously: some screens used showAlert, some used Toast, some used inline banners.
 * Now: all API errors go through extractErrorMessage for consistent formatting.
 */
import { useCallback } from 'react';
import { showAlert } from '../utils/alert';

export interface ApiError {
  message?: string;
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    message?: string;
  };
  status?: number;
  statusText?: string;
}

/** Extract a human-readable message from any error shape */
function extractErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (!error) return fallback;

  const e = error as ApiError;

  return (
    e?.message ||
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.response?.message ||
    e?.statusText ||
    (typeof error === 'string' ? error : fallback)
  );
}

export function useErrorDisplay() {
  /** Show a user-facing error alert from any error shape */
  const showApiError = useCallback(
    (error: unknown, title: string = 'Error', fallback?: string) => {
      const message = extractErrorMessage(error, fallback ?? 'An error occurred. Please try again.');
      showAlert(title, message);
    },
    []
  );

  /** Show a validation error for a specific field */
  const showValidationError = useCallback(
    (field: string, message?: string) => {
      showAlert('Validation Error', message ?? `Invalid ${field}. Please check and try again.`);
    },
    []
  );

  /** Show a network error */
  const showNetworkError = useCallback(() => {
    showAlert('Network Error', 'Unable to reach the server. Please check your connection and try again.');
  }, []);

  /** Show a session/error from the API with status code */
  const showApiErrorWithStatus = useCallback(
    (error: unknown) => {
      const e = error as ApiError;
      const base = extractErrorMessage(error);
      if (e?.status) {
        showAlert(`Error (${e.status})`, base);
      } else {
        showAlert('Error', base);
      }
    },
    []
  );

  return {
    showApiError,
    showValidationError,
    showNetworkError,
    showApiErrorWithStatus,
    extractErrorMessage,
  };
}
