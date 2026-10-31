const assert = require('node:assert/strict');
const {conversationKey,createSessionNavigation}=require('../extension/content/session-navigation.js');
const sites=[
 ['generic','https://chat.deepseek.com/','https://chat.deepseek.com/a/chat/s/8bc80ee5-0a9d-4d5f-95bf-52267f639b7e','https://chat.deepseek.com/a/chat/s/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'],
 ['claude','https://claude.ai/new','https://claude.ai/chat/489cb58c-7137-4f88-b6c0-99687507b28b','https://claude.ai/chat/a-different-chat'],
 ['chatgpt','https://chatgpt.com/','https://chatgpt.com/c/12345','https://chatgpt.com/c/other-chat'],
 ['gemini','https://gemini.google.com/app','https://gemini.google.com/app/abc123','https://gemini.google.com/app/def456']
];
for(const [site,newUrl,conversationUrl,otherUrl] of sites){
 let n=0;
 const session=createSessionNavigation(site,newUrl,()=>`bridge_${++n}`);
 const original=session.bridge;
 session.markSendAttempt();
 const moved=session.next(conversationUrl);
 assert.equal(moved.preserved,true,`${site}: first send should preserve mappings`);
 assert.equal(session.bridge,original);
 assert.equal(session.next(conversationUrl+'?share=true').changed,false);
 const next=session.next(otherUrl);
 assert.equal(next.preserved,false,`${site}: another chat must isolate mappings`);
 assert.notEqual(session.bridge,original);
 assert.equal(session.next(conversationUrl).bridge,original,`${site}: returning to old chat should reuse mappings`);
 assert.equal(conversationKey(conversationUrl,site),conversationKey(conversationUrl+'?foo=bar',site));
}
for(const [site,newUrl,conversationUrl] of sites){
 let n=0;
 const session=createSessionNavigation(site,newUrl,()=>`bridge_${++n}`);
 assert.equal(session.next(conversationUrl).preserved,false,`${site}: do not share mappings on an unrelated navigation`);
}
console.log('PASS: new-chat session preservation, chat isolation, revisit, URL stability for 3 platforms');

const temporary='https://chatgpt.com/c/local-chatgpt%3A8917b658-9a05-41cd-b618-cf3630346b7d';
const canonical='https://chatgpt.com/c/6ae25d17-0040-83ec-9e65-0398c1af2cdb';
const another='https://chatgpt.com/c/6ae25929-f0c4-83e8-8165-61207f1deca6';
let serial=0;
const make=()=>createSessionNavigation('chatgpt','https://chatgpt.com/',()=>`bridge_${++serial}`);
const flow=make(),original=flow.bridge;
flow.markSendAttempt();assert(flow.next(temporary).preserved);
assert(flow.next(canonical).preserved);assert.equal(flow.bridge,original);
assert.equal(flow.next(another).preserved,false);
assert.equal(flow.next(canonical).bridge,original);
const direct=make();assert.equal(direct.next(temporary).preserved,false);
assert.equal(direct.next(canonical).preserved,false);
const interrupted=make();interrupted.markSendAttempt();interrupted.next(temporary);
interrupted.next('https://chatgpt.com/');assert.equal(interrupted.next(canonical).preserved,false);
const expired=make();expired.markSendAttempt();expired.next(temporary);
const now=Date.now;Date.now=()=>now()+61000;
try{assert.equal(expired.next(canonical).preserved,false);}finally{Date.now=now;}
const known=make();known.next(canonical);known.next('https://chatgpt.com/');
known.markSendAttempt();known.next(temporary);assert.equal(known.next(canonical).preserved,false);
console.log('PASS bounded ChatGPT temporary-to-canonical transition; expiry, revisit and unrelated navigation isolation');
