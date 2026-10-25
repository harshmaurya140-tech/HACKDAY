const assert=require('node:assert/strict');
const ai=require('../extension/private/local-ai.js');
(async()=>{
  let sessions=0, destroyed=0, calls=[];
  global.LanguageModel={
    availability:async()=> 'available',
    create:async()=>{
      const own=++sessions;
      return {
        async prompt(_text,{responseConstraint}){
          calls.push({own,kind:responseConstraint===ai.DETECTION_SCHEMA?'detect':'necessity'});
          if(own===1) throw new Error('kErrorUnknown');
          if(responseConstraint===ai.DETECTION_SCHEMA) return JSON.stringify({entities:[{value:'Nora Vale',type:'PERSON',sensitive:true}]});
          return JSON.stringify({assessments:[{value:'Nora Vale',type:'PERSON',materially_required:false,reason:'Name can be restored'}]});
        },
        destroy(){destroyed++}
      };
    }
  };
  let result=await ai.analyze('Please write an introduction for Nora Vale.');
  assert.equal(result.entities[0].text,'Nora Vale');
  assert.equal(sessions,3,'a transient failure reinitializes one session and necessity uses its own session');
  assert.equal(destroyed,3);
  assert.deepEqual(calls,[{own:1,kind:'detect'},{own:2,kind:'detect'},{own:3,kind:'necessity'}]);
  sessions=0; destroyed=0;
  global.LanguageModel={
    availability:async()=> 'available',
    create:async()=>{sessions++;return {prompt:async()=>{throw new Error('kErrorUnknown')},destroy(){destroyed++}};}
  };
  await assert.rejects(()=>ai.analyze('Do something with Nora Vale.'),/kErrorUnknown again.*sending is blocked/);
  assert.equal(sessions,2,'exactly one restart permitted');
  assert.equal(destroyed,2,'all sessions are cleaned up');
  console.log('PASS: kErrorUnknown fresh-session recovery, bounded retry, fail closed');
})().catch(e=>{console.error(e);process.exitCode=1});
