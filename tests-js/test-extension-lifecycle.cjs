const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Synthetic Chrome API / page. Reproduces extension runtime invalidation
// between content-script installation and the next SPA polling cycle.
const source = fs.readFileSync(path.join(__dirname, '../extension/content/content.js'), 'utf8');
let runtimeId = 'synthetic-extension-id';
let polling;
let clearedInterval = false;
let disconnected = false;
let warning = null;
let isComposerHidden = true;
const document = {
  documentElement: {
    appendChild(node) { warning = node; },
    getAttribute() { return null; },
    classList: { contains() { return false; } },
  },
  body: { getAttribute() { return null; }, classList: { contains() { return false; } } },
  getElementById() { return null; },
  createElement() {
    return {setAttribute(){}, style:{cssText:''}, textContent:'', id:''};
  },
};
class MutationObserver {
  constructor(cb) { this.cb=cb; }
  observe() {}
  disconnect() { disconnected = true; }
}
const sandbox = {
  window: {
    __privacyShieldAdapter: {
      id: 'claude',
      composer: ['.fake'],
      user: ['.fake-user'], assistant: ['.fake-assistant'],
      query() { return null; }, queryAll() { return []; },
    },
    __privacyShieldSessionNavigation: {
      createSessionNavigation() {return {bridge:'00000000-0000-4000-8000-000000000000',next(){return {changed:false}}};},
    },
  },
  location: {href:'https://claude.ai/new'},
  chrome: {runtime: {get id() { return runtimeId; },onMessage:{addListener(){}}}},
  document,
  MutationObserver,
  crypto: {randomUUID:()=> '00000000-0000-4000-8000-000000000000'},
  setInterval(fn) {polling=fn; return 1;},
  clearInterval(id) {if(id===1)clearedInterval=true;},
  setTimeout() {return 2;},
  clearTimeout(){},
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../extension/content/native-draft.js'), 'utf8'), sandbox);
vm.runInNewContext(source, sandbox);
assert.equal(typeof polling, 'function', 'content script starts polling');
assert.equal(warning, null, 'no warning before invalidation');
runtimeId = undefined;
polling();
assert.equal(clearedInterval,true, 'stale timer stopped');
assert.equal(disconnected,true, 'stale mutation observer disconnected');
assert.match(warning.textContent, /refresh this AI tab/i);
assert.equal(isComposerHidden,true);
console.log('PASS: stale content script stops safely after a Chrome extension reload');
