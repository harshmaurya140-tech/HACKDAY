const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const core=require('../extension/core/privacy-core.js');
const store=new Map();
let handler,onRemoved,sendFails=true,tabURL='https://claude.ai/new';
const bridge1='00000000-0000-4000-8000-000000000011';
const bridge2='00000000-0000-4000-8000-000000000022';
const chrome={
  runtime:{getURL:p=>'chrome-extension://id/'+String(p).replace(/^\//,''),onMessage:{addListener:h=>handler=h}},
  storage:{session:{
    async get(keys){if(keys===null)return Object.fromEntries(store);return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,store.get(k)]));},
    async set(obj){for(const [k,v]of Object.entries(obj))store.set(k,v)},
    async remove(keys){for(const k of(Array.isArray(keys)?keys:[keys]))store.delete(k)}
  }},
  tabs:{
    async get(){return {url:tabURL}},
    async sendMessage(id,msg){
      if(msg.type==='SEND_SANITIZED')return sendFails?{ok:false,error:'Adapter not ready'}:{ok:true};
      if(msg.type==='GET_SANITIZED_MESSAGE')return {ok:true,text:'Dear [PRIVATE_PERSON_1_ABCDEF]'};
      return {ok:true};
    },
    onRemoved:{addListener:cb=>onRemoved=cb}
  }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/background.js'),'utf8'),{chrome,crypto:webcrypto,URL,PrivacyCore:core,importScripts:()=>{}});
const sender=(bridge)=>({tab:{id:8},url:`chrome-extension://id/private/frame.html?bridge=${bridge}`});
const register=(bridge)=>new Promise(resolve=>handler({type:'REGISTER_TAB',bridge},{tab:{id:8},url:tabURL},resolve));
const call=(type,bridge,data={})=>new Promise(resolve=>handler({type,bridge,...data},sender(bridge),resolve));
(async()=>{
 assert.equal((await register(bridge1)).ok,true);
 const text='My name is Morgan Lee.';
 const start=text.indexOf('Morgan Lee');
 const d=await call('ANALYZE',bridge1,{text,entities:[{type:'PERSON',text:'Morgan Lee',start,end:start+10}]});
 assert.equal(d.ok,true);
 const preview=await call('PREVIEW',bridge1,{draftId:d.draft_id,decisions:{}});
 const failed=await call('PREPARE_AND_SEND',bridge1,{draftId:d.draft_id,decisions:{},previewId:preview.previewId});
 assert.equal(failed.ok,false);
 assert(store.has([...store.keys()].find(k=>k.startsWith('ps-draft:'))),'failed send must retain pending draft');
 sendFails=false;
 const ok=await call('PREPARE_AND_SEND',bridge1,{draftId:d.draft_id,decisions:{},previewId:preview.previewId});
 assert.equal(ok.ok,true);
 assert(![...store.keys()].some(k=>k.startsWith('ps-draft:')),'confirmed send clears draft');
 tabURL='https://claude.ai/chat/conversation-123';
 assert.equal((await register(bridge1)).ok,true,'navigation associates the same mapping with the established chat URL');
 assert.equal((await register(bridge2)).ok,true,'reload with a fresh channel can reattach the mapping');
 const old=store.get('ps-bridge:'+bridge1),fresh=store.get('ps-bridge:'+bridge2);
 assert.equal(old.sessionId,fresh.sessionId,'mapping must survive same-tab reload');
 assert.equal(Object.keys(store.get('ps-session:'+fresh.sessionId).dummyToReal).length,1);
 await onRemoved(8);
 assert(![...store.keys()].some(k=>k.startsWith('ps-')),'closing tab destroys all related mappings');
 console.log('PASS: draft retry on adapter failure, same-tab conversation reattachment and secure tab cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
