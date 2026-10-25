const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../extension/content/adapters.js'), 'utf8');
function mockAdapter(hostname, results) {
  const doc = {
    querySelector(selector) { return (results[selector] || [])[0] || null; },
    querySelectorAll(selector) { return results[selector] || []; }
  };
  const ctx = { location: {hostname}, document: doc, window: {} };
  vm.runInNewContext(source, ctx);
  return ctx.window.__privacyShieldAdapter;
}
for (const host of ['chatgpt.com', 'chat.openai.com']) {
  const editor = { kind:'New ProseMirror editor', isContentEditable:true };
  const submit = { kind:'New send button', disabled:false };
  let a = mockAdapter(host, {
    'div.ProseMirror[role="textbox"][contenteditable="true"]':[editor],
    'button#composer-submit-button':[submit]
  });
  assert.equal(a.query(a.composer),editor, `find modern composer on ${host}`);
  assert.equal(a.query(a.send),submit, `find modern send button on ${host}`);
  // Legacy forms still work after adding the modern selectors.
  const oldEditor={kind:'Old composer'};
  const oldButton={kind:'Old send'};
  a=mockAdapter(host, {'#prompt-textarea':[oldEditor],'button[data-testid="send-button"]':[oldButton]});
  assert.equal(a.query(a.composer),oldEditor);
  assert.equal(a.query(a.send),oldButton);
  // New conversation layouts can provide a form-scoped role textbox,
  // even when no ProseMirror class or prompt-textarea id is present.
  const alternate={kind:'Form-scoped editor'};
  a=mockAdapter(host, {'form [contenteditable=\"true\"][role=\"textbox\"]':[alternate]});
  assert.equal(a.query(a.composer),alternate);
  const altAssistant={kind:'Assistant role fallback'};
  a=mockAdapter(host, {'[data-role=\"assistant\"]':[altAssistant]});
  assert.equal(a.queryAll(a.assistant)[0],altAssistant);
  // Unrelated textbox should not be selected as a composer.
  a=mockAdapter(host, {'[role="textbox"]':[{kind:'Unrelated search textbox'}]});
  assert.equal(a.query(a.composer),null);
}
console.log('PASS: ChatGPT new ProseMirror editor, send button, old selectors, and safe fallback');
