import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => vi.restoreAllMocks());

describe('console breadcrumbs', () => {
  it('records console.warn/error and keeps errors readable', async () => {
    vi.resetModules();
    const { installConsoleBreadcrumbs } = await import('../src/browser/breadcrumbs.js');
    const crumbs = [];
    const originalWarn = console.warn;
    const silent = vi.fn();
    console.warn = silent;
    installConsoleBreadcrumbs({ addBreadcrumb: (c) => crumbs.push(c) });

    console.warn('Possible unhandled promise rejection:', new TypeError('Pago rechazado'), { id: 3 });

    expect(silent).toHaveBeenCalledOnce();
    expect(crumbs[0]).toMatchObject({
      category: 'console',
      level: 'warning',
      message: 'Possible unhandled promise rejection: TypeError: Pago rechazado {"id":3}',
    });
    console.warn = originalWarn;
  });
});
