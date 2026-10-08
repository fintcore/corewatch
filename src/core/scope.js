/**
 * Mutable state shared across the app lifetime: user, tags, extra data and the
 * breadcrumb trail. One scope per client (Sentry-style global scope, minus the
 * hub/child-scope machinery — intentionally simple).
 */

export function createScope(maxBreadcrumbs = 50) {
  let user = null;
  const tags = {};
  const extra = {};
  const breadcrumbs = [];

  return {
    setUser(next) {
      user = next || null;
    },
    getUser() {
      return user;
    },
    setTag(key, value) {
      tags[key] = value;
    },
    setExtra(key, value) {
      extra[key] = value;
    },
    addBreadcrumb(crumb) {
      breadcrumbs.push({
        timestamp: new Date().toISOString(),
        category: 'default',
        level: 'info',
        ...crumb,
      });
      // Ring buffer: keep only the most recent N.
      while (breadcrumbs.length > maxBreadcrumbs) breadcrumbs.shift();
    },
    getBreadcrumbs() {
      return breadcrumbs.slice();
    },
    clearBreadcrumbs() {
      breadcrumbs.length = 0;
    },
    snapshot() {
      return {
        user,
        tags: {
          ...tags, 
        },
        extra: {
          ...extra, 
        },
        breadcrumbs: breadcrumbs.slice(),
      };
    },
  };
}
