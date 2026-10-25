const assert=require('node:assert/strict');
const ai=require('../extension/private/local-ai.js');
const core=require('../extension/core/privacy-core.js');
(async()=>{
 const text='Account 123456789012 and DOB 12 July 2005. Calculate exact age.';
 let necessityInstruction='',calls=0;
 global.LanguageModel={availability:async()=> 'available',create:async()=>({
   async prompt(prompt,opts){
     calls++;
     if(opts.responseConstraint===ai.DETECTION_SCHEMA){
       return JSON.stringify({entities:[{value:'123456789012',type:'BANK_ACCOUNT_NUMBER',sensitive:true},{value:'12 July 2005',type:'DOB',sensitive:true}]});
     }
     necessityInstruction=prompt;
     return JSON.stringify({assessments:[{value:'12 July 2005',type:'DOB',materially_required:true,reason:'Exact age requires this date'}]});
   },destroy(){}
 })};
 const result=await ai.analyze(text);
 assert.equal(calls,2);
 assert.equal(result.entities.length,2);
 const account=result.entities.find(x=>x.text==='123456789012');
 const dob=result.entities.find(x=>x.type==='DOB');
 assert.equal(account.necessary,false);
 assert.equal(dob.necessary,true);
 assert(!necessityInstruction.includes('"value":"123456789012"'),'Protected credentials are not considered for consent');
 const merged=core.mergeDetected(text,result.entities);
 assert.equal(merged.filter(x=>x.necessary).length,1);
 console.log('PASS: model assesses material necessity separately, account number remains hidden');
})().catch(e=>{console.error(e);process.exitCode=1});
