/**
 * Browser platform adapter for the hub (see core/hub.js).
 */

import { createConsoleTransport } from '../transports/consoleTransport';
import { getRuntimeContext } from './context';
import { installGlobalHandlers } from './globalHandlers';
import { installBreadcrumbs } from './breadcrumbs';

export const browserPlatform = {
  name: 'browser',
  getContext: getRuntimeContext,
  defaultTransports: () => [createConsoleTransport()],
  setup(client, config) {
    const integrations = config.integrations || {};
    if (integrations.globalHandlers !== false) installGlobalHandlers(client);
    installBreadcrumbs(client, integrations);
  },
};
