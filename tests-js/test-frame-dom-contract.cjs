const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../extension/private/frame.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '../extension/private/frame.js'), 'utf8');
const ids = new Set([...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(m => m[1]));
const lookups = new Set([...script.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(m => m[1]));
const missing = [...lookups].filter(id => !ids.has(id));
assert.deepEqual(missing, [], `frame.js references missing HTML IDs: ${missing.join(', ')}`);
assert.ok(ids.has('response-label'), 'The private response label must have an actual id, not only a class');
console.log(`PASS: ${lookups.size} private frame DOM selectors resolve to HTML IDs`);
