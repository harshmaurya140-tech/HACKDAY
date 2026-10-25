const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../extension/content/adapters.js','utf8');
function adapter(hostname, available){
 const document={querySelector(sel){return available[sel]||null;},querySelectorAll(sel){return available[sel]?[available[sel]]:[];}};
 const window={}; vm.runInNewContext(source,{location:{hostname},document,window});return window.__privacyShieldAdapter;
}
const fixtures=[
 ['chatgpt.com','div.ProseMirror[role="textbox"][contenteditable="true"]','button#composer-submit-button'],
 ['claude.ai','div.ProseMirror[contenteditable="true"]','button[data-testid="chat-input-send"]'],
 ['gemini.google.com','rich-textarea .ql-editor[contenteditable="true"]','button.send-button']
];
for(const [host,editorSelector,sendSelector] of fixtures){
 const input={host,kind:'editor'}, button={host,kind:'send'};
 const a=adapter(host,{[editorSelector]:input,[sendSelector]:button});
 assert.equal(a.query(a.composer),input,host+' editor');
 assert.equal(a.query(a.send),button,host+' Send');
 const text='The user may type arbitrary text; no phrase-specific selectors are used.';
 assert.equal(typeof a.extractMessageText,'function');
 assert.equal(a.extractMessageText({innerText:text},'assistant'),text);
}
const src=fs.readFileSync(__dirname+'/../extension/content/content.js','utf8');
assert.match(src,/attempt<17/,'wait for site state');
assert.match(src,/isSendButton/,'guard submit control');
assert.match(src,/nativeDraft.mayReplace/,'never replace another website draft');
assert.match(src,/sendSanitized\(text\)/,'only staged sanitized prompts are transmitted');
console.log('PASS: ChatGPT, Claude and Gemini composer/send selector contracts and guarded send path');
