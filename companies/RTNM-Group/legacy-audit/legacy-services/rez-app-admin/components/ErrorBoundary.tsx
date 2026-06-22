/**
 * Error Boundary Component
 * ADMIN-018: Catch and display errors to prevent white screen crashes
 *
 * TS-H6 FIX: Admin ErrorBoundary upgraded to match merchant app feature parity.
 * Added: useErrorBoundary hook, withErrorBoundary HOC, ErrorBoundaryContext,
 * ErrorBoundaryProvider, and AsyncErrorBoundary — identical API surface to
 * rezmerchant/rez-merchant-master/components/common/ErrorBoundary.tsx.
 *
 * NOTE: These two files are intentionally kept separate (not extracted to
 * rez-shared) until the TS-H5 shared component sprint. Any API changes must
 * be mirrored in both files until then.
 */

import React from 'react';
import { logger } from '../utils/logger';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// BUG-070 FIX: @sentry/react-native does not support web. Import it only on
// native platforms via a conditional require so web builds don't fail.
const Sentry: typeof import('@sentry/react-native') | null =
  Platform.OS !== 'web' ? require('@sentry/react-native') : null;
import { Colors } from '../constants/Colors';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  hasError: boolean;
  errorCount: number;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      hasError: false,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // BUG-083 FIX: Do not reset errorCount here — getDerivedStateFromError has no
    // access to prevState, so including errorCount: 0 silently resets the counter
    // each time a new error occurs. Let componentDidCatch increment it instead.
    return {
      error,
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // BUG-083 FIX: Increment errorCount here where we have access to current state
    this.setState((prev) => ({ errorCount: prev.errorCount + 1 }));

    if (__DEV__) {
      logger.error('[ErrorBoundary] Caught error:', error);
      logger.error('[ErrorBoundary] Error info:', errorInfo);
    }

    // Capture exception in Sentry for production error tracking (native only)
    if (Sentry) {
      Sentry.captureException(error, { extra: { errorInfo } });
    }
  }

  handleReset = () => {
    this.setState({
      error: null,
      hasError: false,
      errorCount: this.state.errorCount + 1,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }

    // If error happens repeatedly, suggest deeper issues
    if (this.state.errorCount > 3) {
      logger.warn('[ErrorBoundary] Error repeated multiple times, may need restart');
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default error UI
      return (
        <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle" size={64} color={Colors.light.error} />
            </View>

            <Text style={[styles.errorTitle, { color: Colors.light.text }]}>
              Something went wrong
            </Text>

            <Text style={[styles.errorMessage, { color: Colors.light.gray700 }]}>
              {this.state.error.message || 'An unexpected error occurred'}
            </Text>

            {__DEV__ && (
              <View
                style={[
                  styles.errorStack,
                  { backgroundColor: Colors.light.gray100, borderColor: Colors.light.gray200 },
                ]}
              >
                <Text style={[styles.stackTrace, { color: Colors.light.text }]}>
                  {this.state.error.stack}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: Colors.light.error }]}
              onPress={this.handleReset}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.resetButtonText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
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
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorStack: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
    maxHeight: 200,
  },
  stackTrace: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;

// ---------------------------------------------------------------------------
// TS-H6: The primitives below bring the admin ErrorBoundary to parity with
// rezmerchant/rez-merchant-master/components/common/ErrorBoundary.tsx.
// ---------------------------------------------------------------------------

/**
 * Hook-based error boundary alternative using state.
 * More lightweight than the class component for functional components.
 */
interface UseErrorBoundaryReturn {
  error: Error | null;
  hasError: boolean;
  resetError: () => void;
  setError: (error: Error) => void;
}

export const useErrorBoundary = (): UseErrorBoundaryReturn => {
  const [error, setErrorState] = React.useState<Error | null>(null);

  const handleError = React.useCallback((err: Error) => {
    if (__DEV__) logger.error('[useErrorBoundary]', err);
    if (Sentry) Sentry.captureException(err);
    setErrorState(err);
  }, []);

  const resetError = React.useCallback(() => {
    setErrorState(null);
  }, []);

  return {
    error,
    hasError: !!error,
    resetError,
    setError: handleError,
  };
};

/**
 * Error Boundary Context — allows child components to trigger error boundary
 * state from deep within the tree without prop-drilling.
 */
interface ErrorBoundaryContextType {
  error: Error | null;
  setError: (error: Error) => void;
  resetError: () => void;
}

export const ErrorBoundaryContext = React.createContext<ErrorBoundaryContextType | undefined>(
  undefined
);

interface ErrorBoundaryProviderProps {
  children: React.ReactNode;
}

export const ErrorBoundaryProvider = ({ children }: ErrorBoundaryProviderProps) => {
  const [error, setErrorState] = React.useState<Error | null>(null);

  const handleSetError = (err: Error) => {
    if (__DEV__) logger.error('[ErrorBoundaryProvider]', err);
    if (Sentry) Sentry.captureException(err);
    setErrorState(err);
  };

  const handleResetError = () => {
    setErrorState(null);
  };

  const value: ErrorBoundaryContextType = {
    error,
    setError: handleSetError,
    resetError: handleResetError,
  };

  return (
    <ErrorBoundary onReset={handleResetError}>
      <ErrorBoundaryContext.Provider value={value}>{children}</ErrorBoundaryContext.Provider>
    </ErrorBoundary>
  );
};

/**
 * Hook to access error boundary context.
 * Must be used inside an ErrorBoundaryProvider.
 */
export const useErrorBoundaryContext = (): ErrorBoundaryContextType => {
  const context = React.useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundaryContext must be used within ErrorBoundaryProvider');
  }
  return context;
};

/**
 * Wrapper component for async errors.
 * Catches unhandled promise rejections and window error events on web.
 */
interface AsyncErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

export const AsyncErrorBoundary = ({ children, onError }: AsyncErrorBoundaryProps) => {
  const { setError } = useErrorBoundaryContext();

  const handleAsyncError = React.useCallback(
    (error: Error) => {
      if (__DEV__) logger.error('[AsyncErrorBoundary]', error);
      onError?.(error);
      setError(error);
    },
    [setError, onError]
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      handleAsyncError(event.reason);
    };
    const handleWindowError = (event: ErrorEvent) => {
      handleAsyncError(event.error);
    };

    window.addEventListener('unhandledrejection', handlePromiseRejection);
    window.addEventListener('error', handleWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, [handleAsyncError]);

  return <>{children}</>;
};

/**
 * Higher-order component to wrap any component with an ErrorBoundary.
 *
 * @example
 * export default withErrorBoundary(MyScreen, { name: 'MyScreen' });
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: (error: Error, reset: () => void) => React.ReactNode;
    name?: string;
    onReset?: () => void;
  }
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary
        fallback={options?.fallback}
        onReset={options?.onReset}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `WithErrorBoundary(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
}
