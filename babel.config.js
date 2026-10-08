// Build config for the CoreWatch package.
// preset-env reads the "browserslist" field from package.json, so the output
// matches the same browser targets as the host apps (incl. their legacy needs).
// preset-react uses the classic runtime + explicit `import React`, so the build
// works even on older React 16.x without react/jsx-runtime.
module.exports = {
  presets: [
    ['@babel/preset-env', { modules: 'commonjs', loose: true }],
    ['@babel/preset-react', { runtime: 'classic' }],
  ],
};
