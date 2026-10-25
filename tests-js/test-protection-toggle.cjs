'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const base=path.join(__dirname,'../extension');
const html=fs.readFileSync(path.join(base,'private/frame.html'),'utf8');
const css=fs.readFileSync(path.join(base,'private/frame.css'),'utf8');
const frame=fs.readFileSync(path.join(base,'private/frame.js'),'utf8');
const page=fs.readFileSync(path.join(base,'content/content.js'),'utf8');
const bg=fs.readFileSync(path.join(base,'background.js'),'utf8');
// Toggle is visibly part of the private composer, rather than the Chrome toolbar.
assert.match(html, /id="protection-toggle"[^>]*role="switch"[^>]*aria-checked="true"/);
assert.match(html, /id="protection-state">Protection on</);
assert.doesNotMatch(html, /class="shield"|<b>Privacy Shield<\/b>|◈ Restored privately/);
assert.match(css, /#composer\[data-protection="off"\] textarea,/);
assert.match(css, /--ps-host-bg/);
assert.match(frame, /type:'SET_PROTECTION_ENABLED',enabled:next/);
assert.match(frame, /Leave any raw draft in the private extension textarea/);
assert.match(page, /restoreNativeContainer\(hiddenComposer\)/);
assert.match(page, /hideNativeContainer\(hiddenComposer\)/);
assert.match(page, /Clear the website draft before enabling protection/);
assert.match(page, /protectionEnabled[^\n]*switched off/);
assert.doesNotMatch(bg.slice(bg.indexOf("if(msg.type==='SET_PROTECTION_ENABLED')"),bg.indexOf("if(msg.type==='RESET_NATIVE_DRAFT')")),/msg\.text/);
// The privilege-bearing toggle API only accepts calls from the registered
// extension-origin private frame belonging to the current browser tab.
const calls=[];const storage=new Map();let listener=null;
const chrome={
 runtime:{getURL:p=>'chrome-extension://fakeid/'+String(p).replace(/^\//,''),onMessage:{addListener:fn=>listener=fn}},
 storage:{session:{
  async get(k){if(k===null)return Object.fromEntries(storage);const names=Array.isArray(k)?k:[k];return Object.fromEntries(names.map(x=>[x,storage.get(x)]));},
  async set(o){for(const [k,v]of Object.entries(o))storage.set(k,v);},
  async remove(ks){for(const k of Array.isArray(ks)?ks:[ks])storage.delete(k);}
 }},
 tabs:{async get(){return {url:'https://gemini.google.com/app/123'};},async sendMessage(_id,obj){calls.push(obj);return {ok:true};},onRemoved:{addListener:()=>{}}}
};
vm.runInNewContext(bg,{chrome,crypto:webcrypto,URL,PrivacyCore:require(path.join(base,'core/privacy-core.js')),importScripts:()=>{},console});
const bridge='00000000-0000-4000-8000-000000000011';
const trusted={tab:{id:7},url:`chrome-extension://fakeid/private/frame.html?mode=composer&bridge=${bridge}`};
const external={tab:{id:7},url:'https://gemini.google.com/app/123'};
async function ask(obj,from){return await new Promise(r=>listener(obj,from,r));}
(async()=>{
 assert.equal((await ask({type:'REGISTER_TAB',bridge},external)).ok,true);
 for(const enabled of [false,true]){
  const response=await ask({type:'SET_PROTECTION_ENABLED',bridge,enabled},trusted);
  assert.equal(response.ok,true);
  assert.equal(response.enabled,enabled);
 }
 assert.deepEqual(calls.map(x=>x.enabled),[false,true]);
 assert.equal(calls.every(x=>x.type==='SET_PROTECTION_ENABLED'&&x.bridge===bridge),true);
 assert.equal((await ask({type:'SET_PROTECTION_ENABLED',bridge,enabled:false},external)).ok,false);
 assert.equal((await ask({type:'SET_PROTECTION_ENABLED',bridge,enabled:'false'},trusted)).ok,false);
 assert.equal(calls.length,2,'rejected requests cannot toggle the website');
 console.log('PASS: reversible UI toggle, no raw-draft copy, host styling, and origin-authorized privacy bridge');
})().catch(e=>{console.error(e);process.exit(1)});
