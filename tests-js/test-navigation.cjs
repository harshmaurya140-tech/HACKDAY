const assert = require('node:assert/strict');
const {conversationKey,createSessionNavigation}=require('../extension/content/session-navigation.js');
const sites=[
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
