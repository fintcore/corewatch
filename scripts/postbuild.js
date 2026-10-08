// Marks each output folder with its module format so Node resolves them
// correctly regardless of the root package.json "type".
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
fs.writeFileSync(path.join(dist, 'cjs', 'package.json'), `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`);
fs.writeFileSync(path.join(dist, 'esm', 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`);
