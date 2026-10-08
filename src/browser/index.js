/**
 * Browser platform adapter for the hub (see core/hub.js).
 */

import { createConsoleTransport } from '../transports/consoleTransport.js';
import { getRuntimeContext } from './context.js';
import { installGlobalHandlers } from './globalHandlers.js';
import { installBreadcrumbs } from './breadcrumbs.js';

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
