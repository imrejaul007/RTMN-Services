/**
 * Centralized UI Strings — Admin App
 *
 * TS-L1: All user-visible strings should live here to document the intent for
 * Phase 2 internationalization. This is NOT a full i18n solution — it is a
 * flat constants object that centralizes the most common UI strings so that
 * future `react-i18next` extraction has a single source to migrate from.
 *
 * USAGE:
 *   import { Strings } from '@/constants/strings';
 *   <Text>{Strings.common.loading}</Text>
 *
 * TODO (Phase 2 i18n): Replace this file with react-i18next locale files.
 * See TS-L1 in docs/Bugs/15-TYPESCRIPT-UI.md for tracking.
 */

export const Strings = {
  common: {
    loading: 'Loading...',
    error: 'Something went wrong',
    retry: 'Try Again',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    search: 'Search',
    filter: 'Filter',
    refresh: 'Refresh',
    noData: 'No data available',
    noResults: 'No results found',
  },
  auth: {
    login: 'Log In',
    logout: 'Log Out',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    sessionExpired: 'Your session has expired. Please log in again.',
    unauthorized: 'You do not have permission to access this page.',
  },
  errors: {
    networkError: 'Network error. Please check your connection.',
    serverError: 'Server error. Please try again later.',
    notFound: 'The requested resource was not found.',
    validationFailed: 'Please check the form for errors.',
    unknownError: 'An unexpected error occurred.',
  },
  actions: {
    approve: 'Approve',
    reject: 'Reject',
    suspend: 'Suspend',
    activate: 'Activate',
    deactivate: 'Deactivate',
    export: 'Export',
    import: 'Import',
    download: 'Download',
    upload: 'Upload',
    preview: 'Preview',
    edit: 'Edit',
    view: 'View Details',
    create: 'Create',
    update: 'Update',
  },
  status: {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    suspended: 'Suspended',
    verified: 'Verified',
    unverified: 'Unverified',
  },
} as const;

export type StringKey = keyof typeof Strings;
