import { describe, expect, it } from 'vitest';
import { createScope } from '../src/core/scope.js';

describe('createScope', () => {
  it('stores user, tags and extra', () => {
    const scope = createScope();
    scope.setUser({ id: '1' });
    scope.setTag('feature', 'beta');
    scope.setExtra('cart', { items: 2 });

    expect(scope.snapshot()).toMatchObject({
      user: { id: '1' },
      tags: { feature: 'beta' },
      extra: { cart: { items: 2 } },
    });
  });

  it('clears the user with a falsy value', () => {
    const scope = createScope();
    scope.setUser({ id: '1' });
    scope.setUser(undefined);
    expect(scope.getUser()).toBeNull();
  });

  it('fills breadcrumb defaults', () => {
    const scope = createScope();
    scope.addBreadcrumb({ message: 'clicked' });
    const [crumb] = scope.getBreadcrumbs();

    expect(crumb).toMatchObject({ category: 'default', level: 'info', message: 'clicked' });
    expect(Date.parse(crumb.timestamp)).not.toBeNaN();
  });

  it('keeps only the most recent maxBreadcrumbs entries', () => {
    const scope = createScope(3);
    for (let i = 1; i <= 5; i += 1) scope.addBreadcrumb({ message: String(i) });

    expect(scope.getBreadcrumbs().map((c) => c.message)).toEqual(['3', '4', '5']);
  });

  it('returns snapshots that do not change with later updates', () => {
    const scope = createScope();
    scope.setTag('a', 1);
    const snap = scope.snapshot();
    scope.setTag('a', 2);
    scope.addBreadcrumb({ message: 'later' });

    expect(snap.tags.a).toBe(1);
    expect(snap.breadcrumbs).toHaveLength(0);
  });
});
