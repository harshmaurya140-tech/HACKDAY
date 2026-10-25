const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const rich=require('../extension/core/rich-response.js');
const core=require('../extension/core/privacy-core.js');
const dir=path.join(__dirname,'../extension');
const code=fs.readFileSync(path.join(dir,'content/adapters.js'),'utf8');
const win={};
vm.runInNewContext(code,{window:win,location:{hostname:'gemini.google.com',href:'https://gemini.google.com/app'},document:{}});
const gem=win.__privacyShieldAdapter;
const txt=t=>({nodeType:3,nodeValue:t});
const el=(tag,children=[],attrs={})=>({
  nodeType:1,tagName:tag,childNodes:children,
  matches(){return false;},getAttribute(n){return attrs[n]||null;}
});
const body=el('DIV',[
  el('H2',[txt('Bank complaint')]),
  el('P',[txt('Dear '),el('STRONG',[txt('[PRIVATE_PERSON_1_AABBCC]')]),txt(',')]),
  el('UL',[
    el('LI',[el('P',[txt('Investigate the transaction promptly.')])]),
    el('LI',[el('P',[txt('Provide written confirmation.')])])
  ]),
  el('OL',[el('LI',[txt('One')]),el('LI',[txt('Two')])]),
  el('PRE',[el('CODE',[txt('print("hello")\nprint("world")')])]),
  el('A',[txt('read more')],{href:'javascript:alert(1)'})
]);
const response={
  nodeType:1,tagName:'MODEL-RESPONSE',
  matches(selector){return selector==='model-response';},
  querySelectorAll(selector){return selector==='.markdown'?[body]:[];}
};
const structure=gem.extractMessageRich(response,'assistant');
assert.equal(structure.tag,'root');
assert(rich.valid(structure));
const div=structure.children[0];
assert.equal(div.children[0].tag,'h2');
assert.equal(div.children[2].tag,'ul');
assert.equal(div.children[2].children[0].tag,'li');
assert.equal(div.children[3].tag,'ol');
assert.equal(div.children[4].tag,'pre');
assert.equal(div.children[5].href,undefined,'javascript links must be removed');
const session=core.newSession();
session.dummyToReal['[PRIVATE_PERSON_1_AABBCC]']='Aarav Kulkarni';
const restored=rich.restore(session,structure,core.restore);
assert(!restored.unresolved);
assert.equal(restored.tree.children[0].children[1].children[1].children[0].text,'Aarav Kulkarni');
// Simulate inert DOM to ensure no HTML injection; preserve list hierarchy.
const doc={
  createDocumentFragment(){return node('fragment');},
  createElement(tag){return node(tag);},
  createTextNode(value){return node('#text',value);}
};
function node(tag,value=''){
  return {tag,value,children:[],attrs:{},appendChild(child){this.children.push(child);},
    setAttribute(k,v){this.attrs[k]=v;},replaceChildren(...children){this.children=children;}};
}
const target=node('target');
assert(rich.render(doc,target,restored.tree));
const formatted=target.children[0].children[0];
assert.equal(formatted.children[2].tag,'ul');
assert.equal(formatted.children[2].children.length,2);
assert.equal(formatted.children[4].tag,'pre');
assert.equal(formatted.children[5].attrs.href,undefined);
// Placeholder may be split by inline emphasis; restore across leaf boundaries.
const split={tag:'root',children:[{tag:'p',children:[
  {tag:'#text',text:'Dear [PRIVATE_PER'},
  {tag:'strong',children:[{tag:'#text',text:'SON_1_AABBCC]'}]}
]}]};
assert(rich.valid(split));
const splitRestored=rich.restore(session,split,core.restore);
assert.equal(splitRestored.tree.children[0].children[0].text,'Dear Aarav Kulkarni');
assert.equal(splitRestored.tree.children[0].children[1].children[0].text,'');
// Fail closed when the mapped session cannot resolve a token.
const unknown=rich.restore(core.newSession(),structure,core.restore);
assert.equal(unknown.unresolved,true);
assert.equal(unknown.tree,null);
assert.equal(rich.valid({tag:'root',children:[{tag:'script',children:[]}]}),false);
console.log('PASS: Gemini uses safe structured formatting, preserves bullet/list/code DOM, restores privately, rejects unsafe content');
