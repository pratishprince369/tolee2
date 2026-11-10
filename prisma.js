#!/usr/bin/env node
const { fork } = require('child_process');
const path = require('path');
const prismaPath = path.resolve(__dirname, 'apps', 'web', 'node_modules', 'prisma', 'build', 'index.js');
const child = fork(prismaPath, process.argv.slice(2), { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code || 0));
