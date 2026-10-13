// Smoke test for the published package shape: every entry in "exports" must
// load through its public name in both ESM and CommonJS, and the type files
// listed in "exports" must exist. Run after `npm run build`.
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const require = createRequire(import.meta.url);
const expected = {
  '.': ['init', 'flush', 'captureException', 'ErrorBoundary', 'createHttpTransport', 'DEFAULT_DENY_KEYS'],
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
  // Bundlers that ignore "exports" (webpack 4 / CRA 4) resolve subpaths through <subpath>/package.json.
  if (subpath !== '.') {
    const legacy = new URL(`..${subpath.slice(1)}/package.json`, import.meta.url);
    if (!existsSync(legacy)) {
      failed = true;
      console.error(`✗ ${id}: missing ${subpath.slice(2)}/package.json for bundlers without "exports" support`);
    } else {
      const fields = JSON.parse(readFileSync(legacy, 'utf8'));
      for (const field of ['main', 'module', 'types']) {
        if (!existsSync(new URL(fields[field], legacy))) {
          failed = true;
          console.error(`✗ ${id}: ${subpath.slice(2)}/package.json "${field}" points to a missing file`);
        }
      }
    }
  }
  if (!failed) console.log(`✓ ${id}`);
}

// React Native entry: it imports react-native, so it cannot load in Node. Check its shape instead.
const nativeFiles = [
  pkg['react-native'],
  pkg.exports['.']['react-native'].default,
  pkg.exports['.']['react-native'].types,
  pkg.exports['./native'].require,
  pkg.exports['./native'].types,
  'native/package.json',
];
const missing = nativeFiles.filter((file) => !file || !existsSync(new URL(`../${file}`, import.meta.url)));
const firstCondition = Object.keys(pkg.exports['.'])[0];
if (missing.length) {
  failed = true;
  console.error(`✗ ${pkg.name} (react-native): missing ${missing.join(', ')}`);
} else if (firstCondition !== 'react-native') {
  failed = true;
  console.error(`✗ ${pkg.name}: "react-native" must be the first condition of exports["."] (got "${firstCondition}")`);
} else {
  console.log(`✓ ${pkg.name} (react-native) and ${pkg.name}/native`);
}

process.exit(failed ? 1 : 0);
