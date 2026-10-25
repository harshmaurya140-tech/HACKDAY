const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const base=path.join(__dirname,'../extension');
const PrivacyCore=require(path.join(base,'core/privacy-core.js'));
const PrivacyShieldRich=require(path.join(base,'core/rich-response.js'));
const data=new Map();
let handler;
const bridge='99999999-9999-4999-8999-999999999999';
let outbound='';
const frame=`chrome-extension://fakeid/private/frame.html?mode=response&bridge=${bridge}`;
const chrome={
  runtime:{getURL:p=>'chrome-extension://fakeid/'+String(p).replace(/^\//,''),onMessage:{addListener:f=>handler=f}},
  storage:{session:{
    async get(keys){const a=keys===null?[...data.keys()]:Array.isArray(keys)?keys:[keys];return Object.fromEntries(a.map(k=>[k,data.get(k)]));},
    async set(next){for(const [k,v] of Object.entries(next))data.set(k,v);},
    async remove(keys){for(const k of (Array.isArray(keys)?keys:[keys]))data.delete(k);}
  }},
  tabs:{
    async get(){return {url:'https://gemini.google.com/app/42'};},
    async sendMessage(tab,msg){
      if(msg.type==='SEND_SANITIZED'){outbound=msg.text;return {ok:true};}
      if(msg.type==='GET_SANITIZED_MESSAGE'){
        const match=outbound.match(/\[PRIVATE_EMAIL_1_[0-9A-F]{6}\]/);
        assert(match,'sanitized placeholder must be present in outbound text');
        const token=match[0];
        return {ok:true,text:'Contact '+token+' for assistance.',rich:{tag:'root',children:[
          {tag:'p',children:[{tag:'#text',text:'Contact '},{tag:'strong',children:[{tag:'#text',text:token}]} ,{tag:'#text',text:' for assistance.'}]},
          {tag:'ul',children:[{tag:'li',children:[{tag:'#text',text:'First step'}]},{tag:'li',children:[{tag:'#text',text:'Second step'}]}]}
        ]}};
      }
      return {ok:true};
    }
  }
};
const src=fs.readFileSync(path.join(base,'background.js'),'utf8');
vm.runInNewContext(src,{chrome,URL,crypto:webcrypto,PrivacyCore,PrivacyShieldRich,importScripts:()=>{},console});
const call=(msg,sender)=>new Promise(resolve=>handler(msg,sender,resolve));
(async()=>{
  const trusted={tab:{id:44},url:frame};
  await call({type:'REGISTER_TAB',bridge},{tab:{id:44},url:'https://gemini.google.com/app/42'});
  const prompt='My email is user42@example.com. Draft an introduction.';
  const pos=prompt.indexOf('user42@example.com');
  const detection=await call({type:'ANALYZE',bridge,text:prompt,entities:[{type:'EMAIL',text:'user42@example.com',start:pos,end:pos+18,necessary:false}]},trusted);
  assert(detection.ok);
  assert((await call({type:'PREPARE_AND_SEND',bridge,draftId:detection.draft_id,decisions:{}},trusted)).ok);
  assert(!outbound.includes('user42@example.com'));
  const result=await call({type:'RESTORE_MESSAGE',bridge,messageId:'r'},trusted);
  assert(result.ok && result.rich);
  assert.equal(result.rich.children[0].children[1].children[0].text,'user42@example.com');
  assert.equal(result.rich.children[1].tag,'ul');
  assert.equal(result.rich.children[1].children.length,2);
  console.log('PASS: Gemini formatted response restored in extension-only worker; original email never sent to page');
})().catch(e=>{console.error(e);process.exit(1)});
