#!/usr/bin/env node
const { fork } = require('child_process');
const path = require('path');
const tscPath = path.resolve(__dirname, 'apps', 'web', 'node_modules', 'typescript', 'bin', 'tsc');
const child = fork(tscPath, process.argv.slice(2), { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code || 0));
