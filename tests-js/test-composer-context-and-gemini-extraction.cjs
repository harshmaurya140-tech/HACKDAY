const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../extension/content/adapters.js','utf8');
function make(host,selectorSets){
  const doc={querySelector(s){return selectorSets[s]?.[0]||null;},querySelectorAll(s){return selectorSets[s]||[];}};
  const win={};vm.runInNewContext(source,{window:win,document:doc,location:{hostname:host}});
  return win.__privacyShieldAdapter;
}
const candidate=(bottom,{form=false,documentEditor=false}={})=>({
  getBoundingClientRect(){return {bottom,height:50,width:300};},
  closest(selector){
    if(selector==='form')return form?{}:null;
    if(selector.includes('artifact'))return documentEditor?{}:null;
    return null;
  }
});
const richDoc=candidate(680,{documentEditor:true});
const realChat=candidate(900,{form:true});
const chat=make('chatgpt.com',{
  'div.ProseMirror[role="textbox"][contenteditable="true"]':[richDoc,realChat]
});
assert.equal(chat.findComposer(),realChat,'ChatGPT must never attach shield to Writing/Document editor');
const gem=make('gemini.google.com',{});
const textNode=value=>({nodeType:3,nodeValue:value});
const element=(tag,kids=[])=>({nodeType:1,tagName:tag,childNodes:kids,matches(){return false;},querySelectorAll(){return [];}});
const body=element('DIV',[
  element('P',[textNode('1. Bank complaint letter')]),
  element('P',[textNode('Account holder: [PRIVATE_PERSON_1_AABBCC]')]),
  element('UL',[element('LI',[textNode('Keep records privately')])]),
  element('P',[textNode('Regards')])
]);
assert.match(gem.readableText(body),/1\. Bank complaint letter\n\nAccount holder:/);
assert.match(gem.readableText(body),/• Keep records privately/);
const modelResponse={
  innerText:'You said Private input Gemini said Assistant reply',
  textContent:'You said Private input Gemini said Assistant reply',
  querySelectorAll(selector){return selector==='.markdown'?[body]:[];},
  querySelector(){return null;},
  matches(){return false;},
  closest(selector){return selector.includes('model-response')?this:null;}
};
const clean=gem.extractMessageText(modelResponse,'assistant');
assert(clean.includes('1. Bank complaint letter'));
assert(!clean.includes('You said'));
assert(!clean.includes('Gemini said'));
assert.equal(gem.messageAnchor(modelResponse),modelResponse);
const contents=fs.readFileSync(__dirname+'/../extension/content/content.js','utf8');
assert.match(contents,/adapter\.findComposer\?\.\(\)/);
assert.match(contents,/adapter\.messageAnchor\?\.\(node\)/);
assert.match(contents,/anchor\.insertAdjacentElement\('afterend',frame\)/);
assert.match(contents,/frame\.style\.maxWidth=role==='assistant'/);
console.log('PASS: chat composer excludes Writing editor; Gemini restores assistant only with formatted paragraphs');
