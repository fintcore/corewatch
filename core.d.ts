// Types for '@dynamicore/corewatch/core' — the platform-agnostic core used to build adapters.
import type { Breadcrumb, Client, CoreWatchEvent, ExceptionInfo, InitConfig, StackFrame, Transport } from './index';

export type {
  Breadcrumb, Client, CoreWatchEvent, ExceptionInfo, InitConfig, Level, Mechanism, StackFrame, Transport,
} from './index';
export {
  getClient, flush, captureException, captureMessage, addBreadcrumb, setUser, setTag, setExtra, logger, DEFAULT_DENY_KEYS,
} from './index';

/** A platform adapter: what makes the core work on a given runtime. */
export interface Platform {
  /** e.g. 'browser', 'react-native', 'node'. */
  name?: string;
  /** Runtime snapshot attached to every event as `event.context`. */
  getContext?: () => Record<string, unknown>;
  /** Transports used when `config.transports` is not provided. */
  defaultTransports?: () => Transport[];
  /** Installs global handlers / breadcrumbs. Called once, inside initClient(). */
  setup?: (client: Client, config: InitConfig) => void;
}

/** Creates the singleton client for a platform. Idempotent. */
export function initClient(config?: InitConfig, platform?: Platform): Client;

export function createClient(
  config?: InitConfig,
  transports?: Transport[],
  options?: { getContext?: () => Record<string, unknown> },
): Client & { capture(raw: Record<string, unknown>, extra?: Record<string, unknown>): string | null };

export const DEFAULT_CONFIG: Readonly<InitConfig>;
export function sanitize<T>(input: T, denyKeys?: string[]): T;
export function parseStack(stack?: string): StackFrame[];
export function normalizeError(error: unknown): ExceptionInfo;
export const SDK: { name: string; version: string };
