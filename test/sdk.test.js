import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SDK } from '../src/core/sdk.js';

describe('SDK', () => {
  it('reports the same version as package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(SDK.version).toBe(pkg.version);
  });
});
