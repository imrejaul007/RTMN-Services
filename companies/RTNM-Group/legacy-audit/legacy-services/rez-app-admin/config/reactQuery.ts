import {
  QueryClient,
  QueryCache,
  MutationCache,
  DefaultOptions,
} from '@tanstack/react-query';
import { logger } from '@/utils/logger';

// BUG-026 FIX: Global React Query error handlers — eliminates identical
// onError boilerplate from every screen.
//
// onError: logs all query/mutation errors via the centralized logger.
// onSettled: tracks query state for debugging (e.g., telemetry, monitoring).
//
// These handlers run for EVERY query and mutation across the entire app.
// Individual queries/mutations can still override via their own onError.

// ── QueryCache: global handlers for all query errors ──────────────────────────

const queryCache = new QueryCache({
  onError: (error, query) => {
    // Log all query errors centrally — never use console.error directly.
    // The logger redacts sensitive fields (tokens, passwords, etc.) in dev.
    logger.error(
      `[ReactQuery:query] Error for query "${String(query.queryKey)}"`,
      error instanceof Error ? error.message : String(error)
    );
  },
  onSettled: (_data, error, query) => {
    // Could be extended to emit telemetry events for monitoring dashboards.
    if (error) {
      logger.warn(
        `[ReactQuery:query] Query settled with error: "${String(query.queryKey)}"`
      );
    }
  },
});

// ── MutationCache: global handlers for all mutation errors ───────────────────

const mutationCache = new MutationCache({
  onError: (error, _variables, context) => {
    // context is the value returned from onMutate — use its type field if set.
    const mutationLabel = (context as { type?: string } | undefined)?.type ?? 'unknown';
    logger.error(
      `[ReactQuery:mutation] Error in mutation "${mutationLabel}"`,
      error instanceof Error ? error.message : String(error)
    );
  },
  onSettled: (_data, error, _variables, context) => {
    if (error) {
      const mutationLabel = (context as { type?: string } | undefined)?.type ?? 'unknown';
      logger.warn(
        `[ReactQuery:mutation] Mutation settled with error: "${mutationLabel}"`
      );
    }
  },
});

// ── Default options (applied to all queries/mutations unless overridden) ───────

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  },
  mutations: {
    retry: 1,
    retryDelay: 1000,
  },
};

// ── Singleton QueryClient — created once at module load ─────────────────────────

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions,
});

export const queryConfig = {
  dashboard: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  merchants: {
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  orders: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  fraud: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  featureFlags: {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },
  campaigns: {
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  adminList: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  offers: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  cashStore: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  stores: {
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  loyalty: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  challenges: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  achievements: {
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  gameConfig: {
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  socialImpact: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  flashSales: {
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  travel: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  system: {
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  adminWallet: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  platformConfig: {
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  bonusZone: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  // PERF-9: Data that changes at most once per session (or never).
  // Under the old 5-min default this was refetching on nearly every
  // screen mount. Bumping to 30-60 min eliminates ~4-6 refetches per
  // admin session.
  userProfile: {
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  },
  storeCategories: {
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  },
  staticConfig: {
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  },
};
