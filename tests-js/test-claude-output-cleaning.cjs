const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../extension/content/adapters.js'),'utf8');
function adapter(site='claude.ai'){
  const s={window:{},location:{hostname:site},document:{}};
  vm.runInNewContext(code,s);return s.window.__privacyShieldAdapter;
}
const claude=adapter();
const body="Hi Mira, I’ve prepared the letter.\n\nDear Sir/Madam,\nPlease investigate the disputed transaction.\n\nRegards,\nMira";
const preview="Claude responded: Hi Mira, I've prepared the letter. Dear Sir/Madam, Please investigate the disputed trans…";
const node={
  innerText:`${preview}\n${body}\nCreate a doc\njust now`,
  querySelectorAll(selector){
    if(selector.includes('sr-only'))return [{innerText:preview}];
    if(selector==='button')return [{innerText:'Create a doc'}];
    if(selector==='time')return [{innerText:'just now'}];
    return [];
  }
};
assert.equal(claude.extractMessageText(node,'assistant'),body,'exclude sr preview and controls, preserve actual answer');
const noPreview={innerText:`${body}\nCreate a doc □□□ just now`,querySelectorAll(sel){
  if(sel==='button')return [{innerText:'Create a doc'}];
  if(sel==='time')return [{innerText:'just now'}];
  return [];
}};
assert.equal(claude.extractMessageText(noPreview,'assistant'),body,'exclude trailing footer labels with site icon characters');
assert.equal(claude.extractMessageText({innerText:body},'assistant'),body,'verbatim model response must not be rewritten');
assert.equal(claude.extractMessageText({innerText:'Please create a doc with a summary.'},'assistant'),'Please create a doc with a summary.','do not strip AI-authored document instructions');
assert.equal(claude.extractMessageText(node,'user'),node.innerText,'do not rewrite original submitted user text');
const gpt=adapter('chatgpt.com');
assert.equal(gpt.extractMessageText(node,'assistant'),node.innerText,'other websites unchanged');
console.log('PASS: Claude accessibility preview, footer controls removed; actual AI response preserved');
