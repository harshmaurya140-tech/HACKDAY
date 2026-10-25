const assert=require('node:assert/strict');
const ai=require('../extension/private/local-ai.js');
(async()=>{
  const text='My birth date is 12 July 2005. Calculate my exact age.';
  const signals=[];
  let count=0;
  global.LanguageModel={availability:async()=> 'available',create:async()=>({
    async prompt(prompt,opts){
      signals.push(opts.signal);
      count++;
      if(opts.responseConstraint===ai.DETECTION_SCHEMA){
        return JSON.stringify({entities:[{value:'12 July 2005',type:'DOB',sensitive:true}]});
      }
      if(count===2)return '{"broken_json":true}';
      return JSON.stringify({assessments:[{value:'12 July 2005',type:'DOB',materially_required:true,reason:'exact calculation requires value'}]});
    },destroy(){}
  })};
  const result=await ai.analyze(text);
  assert.equal(count,3,'one structured-format retry permitted');
  assert(signals.every((x,i)=>signals.findIndex(y=>y===x)===i),'each prompt request must get its own AbortSignal');
  assert.equal(result.entities[0].necessary,true);
  count=0;
  global.LanguageModel={availability:async()=> 'available',create:async()=>({
    async prompt(_prompt,opts){
      count++;
      if(opts.responseConstraint===ai.DETECTION_SCHEMA)return JSON.stringify({entities:[{value:'12 July 2005',type:'DOB',sensitive:true}]});
      throw Error('Local model execution failed');
    },destroy(){}
  })};
  await assert.rejects(()=>ai.analyze(text),/sending is blocked/);
  assert.equal(count,2,'actual inference errors should not trigger a second expensive model request');
  assert.equal(ai.isNeverDisclosable('PAN_NUMBER'),true);
  assert.equal(ai.isNeverDisclosable('BANK_ACCT'),true);
  console.log('PASS: fresh retry abort signals, no retry on inference failure, credential alias excluded from necessity');
})().catch(e=>{console.error(e);process.exitCode=1});
