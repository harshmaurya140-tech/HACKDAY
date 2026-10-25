const assert=require('node:assert/strict');
const ai=require('../extension/private/local-ai.js');
const core=require('../extension/core/privacy-core.js');
assert.equal(core.canAskForDisclosure('ACCOUNT'),false);
assert.equal(core.canAskForDisclosure('BANK_ACCOUNT_NUMBER'),false);
assert.equal(core.canAskForDisclosure('PAN'),false);
assert.equal(core.canAskForDisclosure('CARD'),false);
assert.equal(core.canAskForDisclosure('DOB'),true);
const text='My account is 123456789012 and my birthday is 12 July 2005';
const entries=[
  {type:'BANK_ACCOUNT_NUMBER',text:'123456789012',start:text.indexOf('123456789012'),end:text.indexOf('123456789012')+12,necessary:true},
  {type:'DOB',text:'12 July 2005',start:text.indexOf('12 July 2005'),end:text.indexOf('12 July 2005')+12,necessary:true}
];
const recognized=core.mergeDetected(text,entries);
assert.equal(recognized[0].type,'ACCOUNT');
assert.equal(recognized[0].necessary,false,'credential never triggers popup');
assert.equal(recognized[1].type,'DOB');
assert.equal(recognized[1].necessary,true,'meaningful DOB may trigger popup');
assert.throws(()=>core.prepare(core.newSession(),{text,entities:entries.map((e,i)=>({...e,id:'e'+i}))},{e0:{mode:'EXACT'}}),/protected and cannot be disclosed/);
assert.equal(ai.isNeverDisclosable('bank_account_number'),true);
(async()=>{
  const prompt='My DOB is 12 July 2005. Please determine my exact age.';
  global.LanguageModel={availability:async()=> 'available',create:async()=>({
    prompt:async(_,opts)=>opts.responseConstraint===ai.DETECTION_SCHEMA
      ?JSON.stringify({entities:[{value:'12 July 2005',type:'DOB',sensitive:true}]})
      :JSON.stringify({assessments:[{value:'12 July 2005',type:'DOB',materially_required:true,reason:'Exact calculation depends on date'}]}),
    destroy(){}
  })};
  const result=await ai.analyze(prompt);
  assert.equal(result.entities.length,1);
  assert.equal(result.entities[0].necessary,true);
  global.LanguageModel={availability:async()=> 'available',create:async()=>({
    prompt:async(_,opts)=>opts.responseConstraint===ai.DETECTION_SCHEMA
      ?JSON.stringify({entities:[{value:'12 July 2005',type:'DOB',sensitive:true}]})
      :JSON.stringify({assessments:[{value:'12 July 2005',type:'DOB',materially_required:false,reason:'No material harm from masking'}]}),
    destroy(){}
  })};
  const second=await ai.analyze('My DOB is 12 July 2005. Explain abstraction.');
  assert.equal(second.entities[0].necessary,false);
  console.log('PASS: invariant credential protection and context-dependent disclosure decided by local model');
})().catch(e=>{console.error(e);process.exitCode=1});
