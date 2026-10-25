const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const store=new Map();
const sent=[];
let handler;
const bridge='00000000-0000-4000-8000-000000000001';
const privateUrl=`chrome-extension://fakeid/private/frame.html?mode=composer&bridge=${bridge}`;
const contents=fs.readFileSync(path.join(__dirname,'../extension/background.js'),'utf8');
const core=require('../extension/core/privacy-core.js');
const chrome={
 runtime:{getURL:path=>'chrome-extension://fakeid/'+String(path).replace(/^\//,''),onMessage:{addListener:cb=>handler=cb}},
 storage:{session:{
  async get(keys){const list=Array.isArray(keys)?keys:[keys];return Object.fromEntries(list.map(k=>[k,store.get(k)]));},
  async set(obj){for(const [k,v] of Object.entries(obj))store.set(k,v);},
  async remove(keys){for(const k of Array.isArray(keys)?keys:[keys])store.delete(k);}
 }},
 tabs:{
  async get(){return {url:'https://claude.ai/chat/123'};},
  async sendMessage(id,p){sent.push(p);if(p.type==='SEND_SANITIZED')return {ok:true};if(p.type==='GET_SANITIZED_MESSAGE')return {ok:true,text:sent.find(x=>x.type==='SEND_SANITIZED').text};return {ok:true};}
 }
};
vm.runInNewContext(contents,{chrome,crypto:webcrypto,URL,PrivacyCore:core,importScripts:()=>{},console});
async function call(m,from){return new Promise(resolve=>handler(m,from,resolve));}
(async()=>{
 const trusted={tab:{id:43},url:privateUrl};
 const reg=await call({type:'REGISTER_TAB',bridge},{tab:{id:43},url:'https://claude.ai/chat/123'});
 assert.equal(reg.ok,true);
 const prompt='My email is testing@example.com. Draft an introduction.';
 const start=prompt.indexOf('testing@example.com');
 const a=await call({type:'ANALYZE',bridge,text:prompt,entities:[{type:'EMAIL',text:'testing@example.com',start,end:start+19,necessary:false}]},trusted);
 assert.equal(a.ok,true);
 const sentReply=await call({type:'PREPARE_AND_SEND',bridge,draftId:a.draft_id,decisions:{}},trusted);
 assert.equal(sentReply.ok,true);
 assert(!sent[0].text.includes('testing@example.com'),'no original values sent to page adapter');
 assert.match(sent[0].text,/\[PRIVATE_EMAIL_1_[0-9A-F]{6}\]/);
 const restored=await call({type:'RESTORE_MESSAGE',bridge,messageId:'response_1'},trusted);
 assert.equal(restored.ok,true);
 assert.equal(restored.text,prompt);
 const blocked=await call({type:'ANALYZE',bridge,text:prompt,entities:[]},{tab:{id:43},url:'https://claude.ai/chat/123'});
 assert.equal(blocked.ok,false,'host page must not invoke private analysis');
 const blocked2=await call({type:'ANALYZE',bridge,text:prompt,entities:[]},{tab:{id:44},url:privateUrl});
 assert.equal(blocked2.ok,false,'another tab must not use channel');
 await call({type:'CLEAR_SESSION',bridge},trusted);
 const after=await call({type:'RESTORE_MESSAGE',bridge,messageId:'response_1'},trusted);
 assert.equal(after.unresolved,true,'cleared secret mapping cannot restore tokens');
 console.log('PASS: browser-only service worker authorized flow, anonymized send, restoration, isolation and clearing');
})().catch(e=>{console.error(e);process.exit(1)});
