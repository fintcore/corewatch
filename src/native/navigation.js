/**
 * React Navigation / Expo Router integration: records each screen change as a
 * `navigation` breadcrumb and keeps the current route in the event context.
 *
 *   // Expo Router (app/_layout.tsx)
 *   const ref = useNavigationContainerRef();
 *   useEffect(() => registerNavigationContainer(ref), [ref]);
 *
 *   // React Navigation
 *   const ref = createNavigationContainerRef();
 *   <NavigationContainer ref={ref} onReady={() => registerNavigationContainer(ref)}>
 *
 * Only route names are recorded: params can hold personal data.
 */

import { getClient } from '../core/hub.js';
import { setCurrentRoute } from './context.js';

function resolveContainer(ref) {
  if (!ref) return null;
  if (typeof ref.addListener === 'function') return ref;
  if (ref.current && typeof ref.current.addListener === 'function') return ref.current;
  return null;
}

function currentRoute(container) {
  try {
    const route = typeof container.getCurrentRoute === 'function' ? container.getCurrentRoute() : null;
    return route && route.name ? { name: String(route.name), key: route.key } : null;
  } catch (_) {
    return null;
  }
}

/**
 * Starts tracking a navigation container. Returns an unsubscribe function.
 * Safe to call before the container is ready: the first state change fills the route.
 */
export function registerNavigationContainer(ref) {
  const container = resolveContainer(ref);
  if (!container) return () => {};

  let previous = currentRoute(container);
  if (previous) setCurrentRoute(previous);

  let unsubscribe = () => {};
  try {
    unsubscribe = container.addListener('state', () => {
      try {
        const next = currentRoute(container);
        if (!next || (previous && next.key === previous.key && next.name === previous.name)) return;

        const client = getClient();
        if (client) {
          client.addBreadcrumb({
            category: 'navigation',
            level: 'info',
            message: previous ? `${previous.name} → ${next.name}` : next.name,
            data: { from: previous ? previous.name : undefined, to: next.name },
          });
        }
        setCurrentRoute(next);
        previous = next;
      } catch (_) {
        /* never break navigation */
      }
    }) || (() => {});
  } catch (_) {
    /* container without listeners */
  }

  return () => {
    try {
      unsubscribe();
    } catch (_) {
      /* noop */
    }
  };
}
