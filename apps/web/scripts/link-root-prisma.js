const fs = require('fs');
const path = require('path');

try {
  const rootDir = path.resolve(__dirname, '..', '..', '..');
  const rootNodeModules = path.join(rootDir, 'node_modules');
  const webNodeModules = path.resolve(__dirname, '..', 'node_modules');
  const symType = process.platform === 'win32' ? 'junction' : 'dir';

  // Ensure root prisma directory links to apps/web/prisma
  const rootPrisma = path.join(rootDir, 'prisma');
  const webPrisma = path.resolve(__dirname, '..', 'prisma');
  if (fs.existsSync(webPrisma) && !fs.existsSync(rootPrisma)) {
    try {
      fs.symlinkSync(webPrisma, rootPrisma, symType);
    } catch (e) {
      try { fs.cpSync(webPrisma, rootPrisma, { recursive: true }); } catch (err) {}
    }
  }

  if (fs.existsSync(webNodeModules)) {
    if (!fs.existsSync(rootNodeModules)) {
      try {
        fs.symlinkSync(webNodeModules, rootNodeModules, symType);
      } catch (e) {}
    }

    const rootBin = path.join(rootNodeModules, '.bin');
    fs.mkdirSync(rootBin, { recursive: true });

    // Link modules
    for (const mod of ['prisma', '@prisma', 'typescript']) {
      const src = path.join(webNodeModules, mod);
      const dest = path.join(rootNodeModules, mod);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        try {
          fs.symlinkSync(src, dest, symType);
        } catch (e) {
          try { fs.cpSync(src, dest, { recursive: true }); } catch (err) {}
        }
      }
    }

    // Link binaries
    const webBin = path.join(webNodeModules, '.bin');
    if (fs.existsSync(webBin)) {
      for (const bin of fs.readdirSync(webBin)) {
        const src = path.join(webBin, bin);
        const dest = path.join(rootBin, bin);
        if (!fs.existsSync(dest)) {
          try {
            fs.symlinkSync(src, dest, 'file');
          } catch (e) {
            try { fs.copyFileSync(src, dest); } catch (err) {}
          }
        }
      }
    }

    // Ensure tsc script is present in rootBin
    const tscBin = path.join(rootBin, 'tsc');
    if (!fs.existsSync(tscBin)) {
      try {
        fs.writeFileSync(tscBin, '#!/usr/bin/env node\nrequire("../typescript/bin/tsc");\n', { mode: 0o755 });
      } catch (e) {}
    }
  }
} catch (err) {
  // Silent fallback
}
