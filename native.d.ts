// Types for the React Native entry ('@dynamicore/corewatch' under Metro, or '@dynamicore/corewatch/native').
import type { Client, InitConfig as BaseInitConfig, Transport } from './index';

export type {
  Breadcrumb, Client, CoreWatchEvent, ExceptionInfo, Level, Mechanism, StackFrame, Transport,
} from './index';
export {
  getClient, flush, captureException, captureMessage, addBreadcrumb, setUser, setTag, setExtra, logger,
  DEFAULT_DENY_KEYS, createReduxEnhancer, useCaptureError,
} from './index';

export interface NativeInitConfig extends Omit<BaseInitConfig, 'integrations'> {
  /** App identity; overrides what expo-application / expo-constants report. */
  app?: { name?: string; id?: string; version?: string; build?: string };
  /** How long a fatal crash waits for queued events to be sent before the app closes. Default 2000. */
  fatalFlushTimeoutMs?: number;
  integrations?: {
    /** ErrorUtils global handler + unhandled promise rejections. */
    globalHandlers?: boolean;
    console?: boolean;
    fetch?: boolean;
    xhr?: boolean;
    /** Lifecycle breadcrumbs and flush when the app goes to the background. */
    appState?: boolean;
  };
}

/** Initializes the SDK on React Native. Idempotent. */
export function init(config?: NativeInitConfig): Client;

/** Plain text, one line per event by default (Metro does not show console groups). */
export function createConsoleTransport(options?: { collapsed?: boolean; styled?: boolean; grouped?: boolean }): Transport;

type Resolvable<T> = T | (() => T | null | undefined);

/** HTTP transport for the DynamiCore API. React Native has no localStorage session: pass `authorization`. */
export function createHttpTransport(options: {
  authorization: Resolvable<string>;
  baseUrl?: string;
  path?: string;
  url?: string;
  context?: Resolvable<string>;
  /** Defaults to Platform.OS ('ios' | 'android'). */
  platform?: string;
  company?: Resolvable<number>;
  client?: Resolvable<number>;
  flushIntervalMs?: number;
  maxQueue?: number;
  maxRetries?: number;
  retryBaseMs?: number;
  debug?: boolean;
}): Transport;

interface FallbackArgs {
  error: unknown;
  eventId: string | null;
  reset: () => void;
}

export interface ErrorBoundaryProps {
  children?: any;
  /** Defaults to a minimal View/Text/Pressable screen. */
  fallback?: any | ((args: FallbackArgs) => any);
  onError?: (error: unknown, info: unknown, eventId: string | null) => void;
  onReset?: () => void;
}

/** ErrorBoundary with a native default fallback (View/Text/Pressable). */
export function ErrorBoundary(props: ErrorBoundaryProps): any;
export function withErrorBoundary<T = any>(Component: T, boundaryProps?: ErrorBoundaryProps): T;

/** Wraps the root component with touch breadcrumbs and an ErrorBoundary. */
export function wrap<T = any>(RootComponent: T, options?: { touchBreadcrumbs?: boolean; errorBoundary?: ErrorBoundaryProps }): T;

/**
 * Records screen changes as breadcrumbs and keeps the current route in the event context.
 * Accepts a React Navigation container ref (or `useNavigationContainerRef()` from expo-router).
 * Returns an unsubscribe function.
 */
export function registerNavigationContainer(ref: unknown): () => void;
