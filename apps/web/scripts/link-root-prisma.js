const fs = require('fs');
const path = require('path');

try {
  const rootDir = path.resolve(__dirname, '..', '..');
  const rootNodeModules = path.join(rootDir, 'node_modules');
  const webNodeModules = path.resolve(__dirname, '..', 'node_modules');
  const symType = process.platform === 'win32' ? 'junction' : 'dir';

  if (fs.existsSync(webNodeModules)) {
    if (!fs.existsSync(rootNodeModules)) {
      try {
        fs.symlinkSync(webNodeModules, rootNodeModules, symType);
      } catch (e) {
        // Fallback to directory creation
        fs.mkdirSync(rootNodeModules, { recursive: true });
      }
    }

    if (fs.existsSync(rootNodeModules)) {
      const items = ['.bin', 'prisma', '@prisma', 'typescript'];
      for (const item of items) {
        const src = path.join(webNodeModules, item);
        const dest = path.join(rootNodeModules, item);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          try {
            fs.symlinkSync(src, dest, symType);
          } catch (e) {
            try {
              fs.cpSync(src, dest, { recursive: true });
            } catch (err) {}
          }
        }
      }
    }
  }
} catch (err) {
  // Silent fallback
}
