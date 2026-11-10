#!/usr/bin/env node
const { fork } = require('child_process');
const path = require('path');
const prismaPath = path.resolve(__dirname, 'apps', 'web', 'node_modules', 'prisma', 'build', 'index.js');
const args = process.argv.slice(2);
const isInfo = args.some(arg => ['-v', '--version', '-h', '--help'].includes(arg));
if (!isInfo && !args.some(arg => arg.startsWith('--schema'))) {
  args.push(`--schema=${path.resolve(__dirname, 'apps', 'web', 'prisma', 'schema.prisma')}`);
}
const child = fork(prismaPath, args, { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code || 0));
