const assert=require('node:assert/strict');
const model=require('../extension/private/local-ai.js');
const text='Please draft a note for Maya Sen, maya@example.org.';
let detectionPrompt='',necessityPrompt='',destroyed=false,requests=0;
global.LanguageModel={
 async availability(){return 'available'},
 async create(){return {
   async prompt(v,opts){
     requests++;
     if(opts.responseConstraint===model.DETECTION_SCHEMA){
       detectionPrompt=v;
       return JSON.stringify({entities:[
         {value:'Maya Sen',type:'PERSON',sensitive:true},
         {value:'maya@example.org',type:'EMAIL',sensitive:true},
         {value:'imagined@example.org',type:'EMAIL',sensitive:true}
       ]});
     }
     assert.equal(opts.responseConstraint,model.NECESSITY_SCHEMA);
     necessityPrompt=v;
     return JSON.stringify({assessments:[
       {value:'Maya Sen',type:'PERSON',materially_required:false,reason:'Placeholder can be restored'},
       {value:'maya@example.org',type:'EMAIL',materially_required:false,reason:'Placeholder can be restored'}
     ]});
   },
   destroy(){destroyed=true;}
 };}
};
(async()=>{
 assert.equal(await model.availability(),'available');
 const result=await model.analyze(text);
 assert.equal(result.entities.length,2,'discard hallucinated spans');
 assert.equal(result.entities[0].text,'Maya Sen');
 assert.equal(result.entities[1].text,'maya@example.org');
 assert.equal(result.entities.every(e=>e.necessary===false),true);
 assert.equal(requests,2,'separate local detection and necessity analysis');
 assert(detectionPrompt.includes(text)&&necessityPrompt.includes(text));
 assert.match(necessityPrompt,/MATERIALLY WORSE/);
 assert.equal(destroyed,true);
 console.log('PASS: independent local sensitivity and necessity inference, no task-answer generation');
})().catch(e=>{console.error(e);process.exit(1)});
