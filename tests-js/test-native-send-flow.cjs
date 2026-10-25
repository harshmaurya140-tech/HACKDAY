const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {create}=require('../extension/content/native-draft.js');
const source=fs.readFileSync(path.join(__dirname,'../extension/content/content.js'),'utf8');
const fn=source.slice(source.indexOf('  function currentValue(el)'),source.indexOf('  function observerScan()'));
function setup({native='unrelated',buttonDisabled=false,accepted=true}={}){
  let marked=0;
  const input={value:native,isContentEditable:false,isConnected:true,closest(){return null}};
  const button={disabled:buttonDisabled,getAttribute(){return null},click(){if(accepted)input.value=''}};
  const draft=create();
  const context={
    chrome:{},input,sendBusy:false,bridge:'conversation-one',nativeDraft:draft,
    checkRuntime:()=>true,findNative:()=>input,
    hiddenComposer:{isConnected:true,contains:el=>el===input},
    updateTextInput:(el,v)=>{el.value=v},
    adapter:{query:()=>button,queryAll:()=>[]},
    navigation:{markSendAttempt(){marked++}},
    setTimeout(fn){fn()},
    Error,Promise
  };
  vm.createContext(context);
  vm.runInContext(fn+'\n;globalThis.sandboxSend={sendSanitized,resetNativeDraft}',context);
  return {context,input,draft,marked:()=>marked,...context.sandboxSend};
}
(async()=>{
  const a=setup({native:'unrelated customer draft'});
  await assert.rejects(a.sendSanitized('New [PRIVATE_PERSON_1_ABCDEF]'),/existing draft/);
  assert.equal(a.input.value,'unrelated customer draft','never replace a native website draft');
  assert.equal(a.marked(),0,'never click Send on a conflicting draft');
  assert.deepEqual(JSON.parse(JSON.stringify(await a.resetNativeDraft())),{ok:true});
  assert.equal(a.input.value,'');
  assert.equal((await a.sendSanitized('New [PRIVATE_PERSON_1_ABCDEF]')).ok,true);
  assert.equal(a.marked(),1);
  const b=setup({native:'',accepted:false});
  await assert.rejects(b.sendSanitized('First protected prompt'),/not confirmed/);
  assert.equal(b.input.value,'First protected prompt');
  assert.equal(b.draft.owns(b.input,'conversation-one',b.input.value),true);
  b.context.adapter.query=()=>({disabled:false,getAttribute(){return null},click(){b.input.value=''}});
  assert.equal((await b.sendSanitized('Revised protected prompt')).ok,true,'retry can replace extension-owned staged content');
  const c=setup({native:'',buttonDisabled:true});
  await assert.rejects(c.sendSanitized('Staged prompt'),/send control unavailable/);
  assert.equal(c.input.value,'','unsent injected value removed if site has no send control');
  console.log('PASS: real sanitized-send function blocks unrelated drafts, recovers by consent, retries owned staged text and handles disabled send');
})().catch(e=>{console.error(e);process.exitCode=1});
