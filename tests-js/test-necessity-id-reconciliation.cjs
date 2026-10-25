'use strict';
const assert=require('node:assert/strict');
const ai=require('../extension/private/local-ai.js');
(async()=>{
  const text='My name is Mira Das, my date of birth is 12 June 2005, and bank account 123456789012 should not be published. Calculate my age.';
  let calls=0;
  global.LanguageModel={
    availability:async()=> 'available',
    create:async()=>({
      async prompt(prompt,options){
        calls++;
        if(options.responseConstraint===ai.DETECTION_SCHEMA){
          return JSON.stringify({entities:[
            {value:'Mira Das',type:'PERSON',sensitive:true,personally_sensitive:true},
            {value:'12 June 2005',type:'DOB',sensitive:true,personally_sensitive:true},
            {value:'123456789012',type:'ACCOUNT',sensitive:true,personally_sensitive:true}
          ]});
        }
        assert.match(prompt,/"id":0/);
        assert.match(prompt,/"id":1/);
        assert(!prompt.includes('"value":"123456789012"'),'never-disclose identifier not assessed for disclosure');
        // Local model gives out-of-order indexed results; no need to echo exact PII.
        return JSON.stringify({assessments:[
          {id:1,materially_required:true,requires_literal_value:true,personally_sensitive:true,reason:'Exact age depends on full date'},
          {id:0,materially_required:true,requires_literal_value:false,personally_sensitive:true,reason:'Name as salutation only'}
        ]});
      },destroy(){}
    })
  };
  let result=await ai.analyze(text);
  assert.equal(calls,2);
  assert.equal(result.entities.find(e=>e.type==='DOB').necessary,true);
  assert.equal(result.entities.find(e=>e.type==='PERSON').necessary,false);
  assert.equal(result.entities.find(e=>e.type==='ACCOUNT').necessary,false);
  // Contradictory / duplicated / unsupported model indices do not cause a popup or disclosure.
  const desc=[{id:0,value:'X',type:'PERSON'},{id:1,value:'Y',type:'DOB'}];
  const bad=ai.reconcileNecessity([
    {id:1,materially_required:true,reason:'x'},
    {id:1,materially_required:true,reason:'x'},
    {id:88,materially_required:true,reason:'x'}
  ],desc);
  assert.equal(bad.size,0);
  // A missing result cannot trigger an unwanted popup.
  global.LanguageModel.create=async()=>({
    async prompt(prompt,opts){
      if(opts.responseConstraint===ai.DETECTION_SCHEMA)return JSON.stringify({entities:[{value:'12 June 2005',type:'DOB',sensitive:true,personally_sensitive:true}]});
      return JSON.stringify({assessments:[]});
    },destroy(){}
  });
  result=await ai.analyze(text);
  assert.equal(result.entities.find(e=>e.type==='DOB').necessary,false);
  console.log('PASS: stable indexed necessity decisions, duplicates/missing classified as hidden, no accidental credential permission');
})().catch(e=>{console.error(e);process.exitCode=1});
