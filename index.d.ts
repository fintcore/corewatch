// Minimal type declarations for CoreWatch.
// React-specific pieces are loosely typed to avoid a hard @types/react dep.

export type Level = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface Breadcrumb {
  category?: string;
  level?: Level | string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

export interface Transport {
  name: string;
  send: (event: CoreWatchEvent) => void;
  flush?: (useBeacon?: boolean) => void;
}

export interface CoreWatchEvent {
  eventId: string;
  level: string;
  message: string | null;
  exception: { type: string; value: string; stack: unknown[] } | null;
  mechanism: string;
  project: string | null;
  release: string | null;
  environment: string | null;
  context: Record<string, unknown>;
  user: unknown;
  tags: Record<string, unknown>;
  extra: Record<string, unknown>;
  breadcrumbs: Breadcrumb[];
  sdk: { name: string; version: string };
}

export interface InitConfig {
  dsn?: string;
  enabled?: boolean;
  debug?: boolean;
  /** Repo/app slug, e.g. 'core-panel'. Required to filter by project in the panel. */
  project?: string;
  environment?: string;
  release?: string | null;
  maxBreadcrumbs?: number;
  sampleRate?: number;
  ignoreErrors?: Array<string | RegExp>;
  denyKeys?: string[];
  sanitize?: boolean;
  beforeSend?: (event: CoreWatchEvent) => CoreWatchEvent | null;
  user?: unknown;
  transports?: Transport[];
  integrations?: {
    globalHandlers?: boolean;
    console?: boolean;
    fetch?: boolean;
    xhr?: boolean;
    dom?: boolean;
    history?: boolean;
  };
}

export function init(config?: InitConfig): unknown;
export function getClient(): unknown;
export function captureException(error: unknown, extra?: Record<string, unknown>): string | void;
export function captureMessage(message: string, level?: Level, extra?: Record<string, unknown>): string | void;
export function addBreadcrumb(crumb: Breadcrumb): void;
export function setUser(user: unknown): void;
export function setTag(key: string, value: unknown): void;
export function setExtra(key: string, value: unknown): void;

export const logger: {
  fatal: (message: string, extra?: Record<string, unknown>) => string | void;
  error: (message: string, extra?: Record<string, unknown>) => string | void;
  warn: (message: string, extra?: Record<string, unknown>) => string | void;
  info: (message: string, extra?: Record<string, unknown>) => string | void;
  debug: (message: string, extra?: Record<string, unknown>) => string | void;
};

export function createConsoleTransport(options?: { collapsed?: boolean }): Transport;
type Resolvable<T> = T | (() => T | null | undefined);

export function createHttpTransport(options?: {
  /** API base, e.g. process.env.REACT_APP_API_URL. Default https://front.dynamicore.io */
  baseUrl?: string;
  /** Default /private/thirds/corewatch_events */
  path?: string;
  /** Full endpoint; overrides baseUrl + path. */
  url?: string;
  /** Authorization header. Default: session token from localStorage (accessToken or Cognito). */
  authorization?: Resolvable<string>;
  /** `context` header, only sent when present (REACT_APP_API_CONTEXT / VITE_CONTEXT). */
  context?: Resolvable<string>;
  /** 'web' | 'ios' | 'android'. Default 'web'. */
  platform?: string;
  company?: Resolvable<number>;
  client?: Resolvable<number>;
  flushIntervalMs?: number;
  maxQueue?: number;
  maxRetries?: number;
  retryBaseMs?: number;
  debug?: boolean;
}): Transport;

export function createReduxEnhancer(options?: {
  actionBreadcrumbs?: boolean;
  attachState?: boolean;
  actionTransformer?: (action: unknown) => unknown;
  stateTransformer?: (state: unknown) => unknown;
}): (next: any) => (reducer: any, initialState?: any) => any;

export const ErrorBoundary: any;
export function withErrorBoundary<T = any>(Component: T, boundaryProps?: Record<string, unknown>): T;
export function useCaptureError(): {
  captureException: (error: unknown, extra?: Record<string, unknown>) => string | void;
  captureMessage: (message: string, level?: Level, extra?: Record<string, unknown>) => string | void;
  addBreadcrumb: (crumb: Breadcrumb) => void;
  wrapAsync: <F extends (...args: any[]) => Promise<any>>(fn: F, extra?: Record<string, unknown>) => F;
};
