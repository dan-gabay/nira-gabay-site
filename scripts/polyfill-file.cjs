// Node 18 lacks the global `File` class that Node 20+ provides; cheerio's
// bundled undici assumes it exists and crashes on load without it. Vercel's
// build runs on Node 20+ so this is a no-op there - purely a local-dev shim
// until this machine's Node is upgraded (see CLAUDE.md / package.json engines).
if (typeof globalThis.File === 'undefined') {
  globalThis.File = require('undici').File;
}
