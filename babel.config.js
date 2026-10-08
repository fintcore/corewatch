// Build config for CoreWatch.
// - Two outputs: CommonJS (dist/cjs) and ES modules (dist/esm, `--env-name esm`).
// - preset-env reads "browserslist" from package.json, so both outputs match the
//   browser targets of legacy host apps (CRA does not transpile node_modules).
// - preset-react uses the classic runtime with an explicit `import React`, so the
//   output works on React 16.8+ without react/jsx-runtime.
module.exports = (api) => {
  const esm = api.env('esm');
  return {
    presets: [
      ['@babel/preset-env', { modules: esm ? false : 'commonjs', loose: true }],
      ['@babel/preset-react', { runtime: 'classic' }],
    ],
  };
};
