const fs = require('fs');
const path = require('path');

try {
  const rootDir = path.resolve(__dirname, '..', '..');
  const rootNodeModules = path.join(rootDir, 'node_modules');
  const rootBin = path.join(rootNodeModules, '.bin');
  const webNodeModules = path.resolve(__dirname, '..', 'node_modules');

  if (fs.existsSync(webNodeModules)) {
    fs.mkdirSync(rootBin, { recursive: true });

    for (const mod of ['prisma', '@prisma', 'typescript']) {
      const src = path.join(webNodeModules, mod);
      const dest = path.join(rootNodeModules, mod);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        try {
          fs.symlinkSync(src, dest, 'junction');
        } catch {
          try { fs.cpSync(src, dest, { recursive: true }); } catch {}
        }
      }
    }

    const webBin = path.join(webNodeModules, '.bin');
    if (fs.existsSync(webBin)) {
      for (const bin of fs.readdirSync(webBin)) {
        const src = path.join(webBin, bin);
        const dest = path.join(rootBin, bin);
        if (!fs.existsSync(dest)) {
          try {
            fs.symlinkSync(src, dest);
          } catch {
            try { fs.copyFileSync(src, dest); } catch {}
          }
        }
      }
    }
  }
} catch (err) {
  // Silent fallback
}
