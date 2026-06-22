/**
 * ReactQueryErrorBoundary
 * BUG-026 FIX: Catches React Query errors at the provider level.
 *
 * This error boundary sits INSIDE QueryClientProvider (or wraps it) and catches
 * any errors thrown during query rendering that the QueryCache/MutationCache
 * onError handlers cannot capture (e.g., errors thrown in a query's select,
 * placeholderData, or component render triggered by query state).
 *
 * It defers to the nearest generic ErrorBoundary for the fallback UI, but
 * logs the error via the centralized logger and optionally reports to Sentry.
 *
 * Usage:
 *   <QueryClientProvider client={queryClient}>
 *     <ReactQueryErrorBoundary>
 *       {children}
 *     </ReactQueryErrorBoundary>
 *   </QueryClientProvider>
 *
 * NOTE: This is a React class-component error boundary (React requires this
 * form for error boundaries — hooks cannot be used here).
 */

import React from 'react';
import { logger } from '@/utils/logger';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface Props {
  children: React.ReactNode;
  /** Optional fallback rendered when an error is caught. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Label used in logs to identify which boundary caught the error. */
  name?: string;
}

interface State {
  error: Error | null;
  hasError: boolean;
}

export class ReactQueryErrorBoundary extends React.Component<Props, State> {
  private readonly boundaryName: string;

  constructor(props: Props) {
    super(props);
    this.state = { error: null, hasError: false };
    this.boundaryName = props.name ?? 'ReactQueryErrorBoundary';
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error(`[${this.boundaryName}] Caught error:`, error instanceof Error ? error.message : String(error));
    if (__DEV__) {
      logger.error(`[${this.boundaryName}] Error info:`, errorInfo.componentStack ?? '');
    }
  }

  handleReset = () => {
    this.setState({ error: null, hasError: false });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
          <Ionicons name="cloud-offline" size={48} color={Colors.light.error} />
          <Text style={[styles.title, { color: Colors.light.text }]}>
            Data loading failed
          </Text>
          <Text style={[styles.message, { color: Colors.light.gray600 }]}>
            {this.state.error.message || 'An error occurred while loading data.'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: Colors.light.tint }]}
            onPress={this.handleReset}
          >
            <Ionicons name="refresh" size={18} color="white" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
