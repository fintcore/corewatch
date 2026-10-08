// Smoke test for the published package shape: every entry in "exports" must
// load through its public name in both ESM and CommonJS, and the type files
// listed in "exports" must exist. Run after `npm run build`.
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const require = createRequire(import.meta.url);
const expected = {
  '.': ['init', 'captureException', 'ErrorBoundary', 'createHttpTransport'],
  './react': ['ErrorBoundary', 'withErrorBoundary', 'useCaptureError'],
  './core': ['initClient', 'createClient', 'sanitize'],
};

let failed = false;
for (const [subpath, names] of Object.entries(expected)) {
  const id = subpath === '.' ? pkg.name : `${pkg.name}${subpath.slice(1)}`;
  const esm = await import(id);
  const cjs = require(id);
  const types = pkg.exports[subpath].types;

  for (const [format, mod] of [['esm', esm], ['cjs', cjs]]) {
    const missing = names.filter((n) => typeof mod[n] === 'undefined');
    if (missing.length) {
      failed = true;
      console.error(`✗ ${id} (${format}) is missing: ${missing.join(', ')}`);
    }
  }
  if (!existsSync(new URL(`../${types}`, import.meta.url))) {
    failed = true;
    console.error(`✗ ${id}: types file ${types} not found`);
  }
  if (!failed) console.log(`✓ ${id}`);
}

process.exit(failed ? 1 : 0);
