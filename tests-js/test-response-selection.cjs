const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../extension/content/adapters.js'),'utf8');

function createAdapter(selectorResults){
  const doc={
    querySelector(selector){return (selectorResults[selector]||[])[0]||null;},
    querySelectorAll(selector){return selectorResults[selector]||[];},
  };
  const sandbox={location:{hostname:'claude.ai'},document:doc,window:{}};
  vm.runInNewContext(source,sandbox);
  return sandbox.window.__privacyShieldAdapter;
}

// A broader old fallback might contain an accessible 'Claude responded:'
// heading and separate thinking statuses, while the response body is clean.
const body={name:'clean response body',contains(){return false;}};
const wrapper={name:'wrapper with status and answer',contains(x){return x===body;}};
let a=createAdapter({
  '.font-claude-response':[body],
  '[data-testid="assistant-message"]':[wrapper],
  '.font-claude-message':[wrapper],
});
assert.equal(a.queryAll(a.assistant).length,1);
assert.equal(a.queryAll(a.assistant)[0],body,'select response body, not the enclosing Claude turn');

// Fallback works if the preferred selector disappears.
a=createAdapter({'[data-testid="assistant-message"]':[wrapper]});
assert.equal(a.queryAll(a.assistant)[0],wrapper,'use fallback when primary is absent');

// Repeated nested matches must not produce duplicate overlays.
const parent={contains(x){return x===child;}};
const child={contains(){return false;}};
a=createAdapter({'.font-claude-response':[parent,child]});
assert.equal(a.queryAll(a.assistant).length,1,'avoid duplicate overlays for nested matched nodes');
assert.equal(a.queryAll(a.assistant)[0],parent);
console.log('PASS: Claude response-body priority, fallbacks, nested overlay de-duplication');
