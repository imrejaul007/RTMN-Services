// Module declarations for untyped npm packages
// This file resolves all "Cannot find module" errors from missing type declarations

// React Native global
declare var __DEV__: boolean;

// ── react-native: bare declaration, all exports are 'any' ─────────────────────
// Using bare module declarations preserves compatibility with all usage patterns.
// Named type imports (ViewStyle, TextStyle, etc.) are resolved via standalone type aliases.
declare module 'react-native';

// Standalone type declarations for named imports from react-native
// These are referenced as: import { ViewStyle } from 'react-native'
declare type ViewStyle = Record<string, any>;
declare type TextStyle = Record<string, any>;
declare type ImageStyle = Record<string, any>;
declare type StyleProp<T> = T | undefined | null;
declare type PressableProps = Record<string, any>;
declare type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown';

// ── @tanstack/react-query ──────────────────────────────────────────────────────
declare module '@tanstack/react-query' {
  export interface DefaultOptions<TError = any> {
    queries?: QueryOptions<TError>;
    mutations?: MutationOptions<TError>;
  }
  export interface QueryOptions<TError = any> {
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean | 'always';
    refetchOnMount?: boolean | 'always';
    refetchOnReconnect?: boolean | 'always';
    retry?: boolean | number | ((failureCount: number, error: TError) => boolean);
    retryDelay?: number | ((attemptIndex: number) => number);
    enabled?: boolean;
    select?: (data: any) => any;
    initialData?: any;
  }
  export interface MutationOptions<TData = any, TError = any, TVariables = any, TContext = any> {
    mutationFn?: (variables: TVariables) => Promise<TData>;
    onMutate?: (variables: TVariables) => Promise<TContext> | TContext | void;
    onError?: (error: TError, variables: TVariables, context: TContext | undefined, mutation: any) => void | Promise<void>;
    onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined, mutation: any) => void | Promise<void>;
    onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext | undefined, mutation: any) => void | Promise<void>;
    retry?: boolean | number;
    retryDelay?: number | ((attemptIndex: number) => number);
  }
  export type UseMutationOptions<TError, TVariables, TContext> = MutationOptions<TError, TVariables, TContext>;
  export type UseQueryOptions<TError> = QueryOptions<TError>;
  export class QueryCache {
    constructor(config?: {
      onError?: (error: any, query: any) => void;
      onSuccess?: (data: any, query: any) => void;
      onSettled?: (data: any, error: any, query: any) => void;
    });
  }
  export class MutationCache {
    constructor(config?: {
      onError?: (error: any, variables: any, context: any, mutation: any) => void;
      onSuccess?: (data: any, variables: any, context: any, mutation: any) => void;
      onSettled?: (data: any, error: any, variables: any, context: any, mutation: any) => void;
    });
  }
  export class QueryClient {
    constructor(config?: {
      defaultOptions?: DefaultOptions;
      queryCache?: QueryCache;
      mutationCache?: MutationCache;
    });
    getDefaultOptions(): DefaultOptions;
    setDefaultOptions(options: DefaultOptions): void;
    clear(): void;
    cancelQueries(queryKey?: any): Promise<void>;
    invalidateQueries(queryKey?: any): Promise<void>;
    prefetchQueries(queryKey?: any): Promise<void>;
    resetQueries(queryKey?: any): Promise<void>;
    removeQueries(queryKey?: any): void;
    setQueryData(queryKey: any, data: any): void;
    getQueryData(queryKey: any): any;
  }
  export interface UseQueryResult<TData = unknown, TError = unknown> {
    data: TData | undefined;
    error: TError | null;
    status: 'pending' | 'error' | 'success';
    isLoading: boolean;
    isFetching: boolean;
    isSuccess: boolean;
    isError: boolean;
    isPending: boolean;
    isRefetching: boolean;
    isRefetchError: boolean;
    isStale: boolean;
    refetch: () => Promise<UseQueryResult<TData, TError>>;
    remove: () => void;
    failureCount: number;
    fetchedDataUpdatedAt: number;
    dataUpdatedAt: number;
  }
  export interface UseMutationResult<TData = unknown, TError = unknown, TVariables = unknown, TContext = unknown> {
    data: TData | undefined;
    error: TError | null;
    status: 'pending' | 'error' | 'success' | 'idle';
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    isIdle: boolean;
    mutate: (variables: TVariables, options?: any) => void;
    mutateAsync: (variables: TVariables, options?: any) => Promise<TData>;
    reset: () => void;
  }
  export interface InfiniteData<TData> {
    pages: TData[];
    pageParams: unknown[];
  }
  export function useQuery<TData = unknown, TError = unknown>(
    options: {
      queryKey: readonly any[];
      queryFn: () => Promise<TData>;
      enabled?: boolean;
      staleTime?: number;
      gcTime?: number;
      refetchOnWindowFocus?: boolean | 'always';
      refetchOnMount?: boolean | 'always';
      refetchOnReconnect?: boolean | 'always';
      retry?: boolean | number | ((failureCount: number, error: TError) => boolean);
      retryDelay?: number | ((attemptIndex: number) => number);
      select?: (data: TData) => any;
      initialData?: TData | (() => TData);
      placeholderData?: TData | (() => TData);
      onSuccess?: (data: TData) => void;
      onError?: (error: TError) => void;
      onSettled?: (data: TData | undefined, error: TError | null) => void;
      [key: string]: any;
    }
  ): UseQueryResult<TData, TError>;
  export function useMutation<TData = any, TError = any, TVariables = any, TContext = any>(options: any): any;
  export function useQueryClient(): QueryClient;
  export function useInfiniteQuery<TData = unknown, TError = unknown>(options: any): any;
  export function useSuspenseQuery<TData = unknown, TError = unknown>(options: any): any;
  export function useBaseQuery(options: any, queryClient?: QueryClient): any;
  export function useBaseMutation(options: any, mutationCache?: MutationCache, queryClient?: QueryClient): any;
  export const QueryClientProvider: React.ComponentType<{ client: QueryClient; children: React.ReactNode }>;
  export const HydrationBoundary: React.ComponentType<{ state?: any; children: React.ReactNode }>;
}

// ── @react-native-community/netinfo ───────────────────────────────────────────
declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    isConnected: boolean | null;
    type: 'wifi' | 'cellular' | 'unknown' | 'none' | 'bluetooth' | 'ethernet' | 'wimax' | 'vpn' | 'other';
    isInternetReachable: boolean | null;
    details: NetInfoConnectedDetails | NetInfoDisconnectedDetails | null;
  }
  export interface NetInfoConnectedDetails {
    isConnectionExpensive?: boolean;
    ssid?: string | null;
    bssid?: string | null;
    strength?: number | null;
    ipAddress?: string | null;
    subnet?: string | null;
    cellularGeneration?: string | null;
    carrier?: string | null;
  }
  export interface NetInfoDisconnectedDetails {
    isConnectionExpensive?: boolean;
  }
  const NetInfo: {
    fetch(): Promise<NetInfoState>;
    refresh(): Promise<NetInfoState>;
    addEventListener(handler: (state: NetInfoState) => void): () => void;
    useNetInfo(): NetInfoState;
    configure(options?: any): void;
  };
  export default NetInfo;
}

// ── expo-image ────────────────────────────────────────────────────────────────
declare module 'expo-image' {
  export type ImageStyle = Record<string, any>;
  export interface ImageProps {
    source?: any;
    contentFit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' | 'none' | 'scale-down';
    transition?: number;
    fadeDuration?: number;
    onLoadStart?: () => void;
    onLoad?: (event: { source: { width: number; height: number } }) => void;
    onError?: (error: Error) => void;
    onLoadEnd?: () => void;
    style?: any;
    placeholder?: string | { blurhash: string } | null;
    cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
    priority?: 'low' | 'normal' | 'high';
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
    tintColor?: string;
    accessibilityLabel?: string;
    testID?: string;
    recyclingKey?: string;
    [key: string]: any;
  }
  export const Image: React.ComponentType<ImageProps> & {
    prefetch(url: string | string[], options?: any): Promise<boolean>;
    clearCache(options?: any): Promise<void>;
  };
  export { ImageStyle };
}

// ── expo-router ───────────────────────────────────────────────────────────────
declare module 'expo-router' {
  export interface ExpoRootProps {
    context: any;
  }
  export class ExpoRoot extends React.Component<ExpoRootProps> {}

  // Screen is accessed as Stack.Screen, Tabs.Screen, etc.
  // Stack, Tabs, Drawer must be intersection types so .Screen property exists.
  export const Stack: React.ComponentType<any> & {
    Screen: React.ComponentType<any>;
  };
  export const Tabs: React.ComponentType<any> & {
    Screen: React.ComponentType<any>;
  };
  export const Drawer: React.ComponentType<any> & {
    Screen: React.ComponentType<any>;
  };
  export const Slot: React.ComponentType<any>;
  export const ErrorBoundary: React.ComponentType<any>;

  // Link and Redirect
  export const Link: React.ComponentType<any>;
  export const Redirect: React.ComponentType<{ href: string }>;

  // Hooks
  export const useRouter: () => any;
  export const useLocalSearchParams: <T = any>() => T;
  export const useGlobalSearchParams: () => any;
  export const useSegments: () => string[];
  export const usePathname: () => string;
  export const useSearchParams: () => any;
  export const useFocusEffect: (effect: () => void | (() => void)) => void;
  export const useNavigation: () => any;
  export const useRoute: () => any;
  export const router: any;
}
declare module '@expo/vector-icons';
declare module 'react-native-safe-area-context';
declare module 'date-fns';
declare module 'expo-status-bar';
declare module 'expo-linear-gradient';
declare module 'expo-constants';
declare module 'expo-font';
declare module 'expo-haptics';
declare module 'expo-notifications';
declare module 'expo-secure-store';
declare module 'expo-updates';
declare module 'expo-updates/build/UpdatesEmitter';
declare module 'expo-image-picker';
declare module 'expo-linking';
declare module 'expo-device';
declare module 'expo-application';
declare module 'expo-crypto';
declare module 'expo-clipboard';
declare module 'expo-sharing';
declare module 'expo-blur';
declare module 'expo-brightness';
declare module 'expo-media-library';
declare module 'expo-local-authentication';
declare module 'expo-store-review';
declare module 'expo-document-picker';
declare module 'expo-image-manipulator';
declare module 'expo-web-browser';
declare module 'expo-keep-awake';
declare module 'expo-splash-screen';
declare module 'expo-task-manager';
declare module 'expo-location';
declare module 'expo-av';
declare module 'expo-file-system';
declare module 'expo-barcode-scanner';
declare module 'expo-camera';
declare module 'expo-calendar';
declare module 'expo-contacts';
declare module 'expo-face-detector';
declare module 'expo-facebook';
declare module 'expo-gl';
declare module 'expo-google-app-auth';
declare module 'expo-google-sign-in';
declare module 'expo-in-app-purchases';
declare module 'expo-module-core';
declare module 'expo-modules-core';
declare module 'expo-payments-stripe';
declare module 'expo-print';
declare module 'expo-random';
declare module 'expo-sms';
declare module 'expo-video-thumbnails';
declare module 'expo-linear-gradient';
declare module 'lottie-react-native';
declare module 'react-native-maps';
declare module 'react-native-pager-view';
declare module 'react-native-paper';
declare module 'react-native-screens';
declare module 'react-native-svg';
declare module 'react-native-webview';
declare module 'react-native-gesture-handler';
declare module 'react-native-reanimated';
declare module '@sentry/react-native';
declare module '@react-navigation/native';
declare module 'uuid';
declare module '@react-native-async-storage/async-storage';
declare module '@react-native-community/datetimepicker';
declare module '@react-native-community/picker';
declare module '@react-native-community/slider';
declare module '@react-native-community/toolbar-android';
declare module '@react-native-community/viewpager';
declare module '@react-navigation/stack';
declare module '@react-navigation/bottom-tabs';
declare module '@react-navigation/drawer';
declare module 'react-native-push-notification';
declare module 'react-native-vector-icons';
declare module '@expo-google-fonts/poppins';
declare module '@expo-google-fonts/inter';

// date-fns subpaths
declare module 'date-fns/format';
declare module 'date-fns/parse';
declare module 'date-fns/formatDistance';
declare module 'date-fns/formatRelative';
declare module 'date-fns/differenceInDays';
declare module 'date-fns/differenceInHours';
declare module 'date-fns/differenceInMinutes';
declare module 'date-fns/differenceInSeconds';
declare module 'date-fns/differenceInMonths';
declare module 'date-fns/differenceInYears';
declare module 'date-fns/addDays';
declare module 'date-fns/addHours';
declare module 'date-fns/addMinutes';
declare module 'date-fns/subDays';
declare module 'date-fns/subHours';
declare module 'date-fns/subMinutes';
declare module 'date-fns/startOfDay';
declare module 'date-fns/endOfDay';
declare module 'date-fns/startOfWeek';
declare module 'date-fns/startOfMonth';
declare module 'date-fns/endOfMonth';
declare module 'date-fns/isToday';
declare module 'date-fns/isTomorrow';
declare module 'date-fns/isYesterday';
declare module 'date-fns/isSameDay';
declare module 'date-fns/isSameWeek';
declare module 'date-fns/isSameMonth';
declare module 'date-fns/isSameYear';
declare module 'date-fns/parseISO';
declare module 'date-fns/formatISO';
declare module 'date-fns/toDate';
declare module 'date-fns/fromUnixTime';
declare module 'date-fns/getUnixTime';
declare module 'date-fns/set';
declare module 'date-fns/eachDayOfInterval';
declare module 'date-fns/eachWeekOfInterval';
declare module 'date-fns/eachMonthOfInterval';
declare module 'date-fns/intervalToDuration';
declare module 'date-fns/durationToMilliseconds';
declare module 'date-fns/millisecondsToDuration';
declare module 'date-fns/fp';
