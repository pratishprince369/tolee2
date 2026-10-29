const path = require('path');
const createJiti = require('./node_modules/jiti');
const jiti = createJiti(__dirname, {
  alias: {
    '@': path.resolve(__dirname, 'src')
  }
});

jiti('./src/tests/v4-system-prompt-e2e.ts');
