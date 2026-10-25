const assert=require('node:assert/strict');
const path=require('node:path');
const file=path.join(__dirname,'../extension/private/local-ai.js');
const text='Write a letter for Maya Sen, maya@example.org.';
let requests=[];
global.GLiNER2Browser={async extract(raw){
  assert.equal(raw,text);
  const s=text.indexOf('Maya Sen');
  return [{text:'Maya Sen',type:'PERSON',start:s,end:s+8,confidence:.95}];
}};
const model=require(file);
global.LanguageModel={
 async availability(){return 'available'},
 async create(){return {async prompt(raw,opts){
   requests.push(opts.responseConstraint);
   return JSON.stringify({assessments:[{value:'Maya Sen',type:'PERSON',materially_required:false,reason:'Local placeholder is sufficient'}]});
 },destroy(){}};}
};
(async()=>{
 const out=await model.analyze(text);
 assert.equal(out.detector,'gliner2-multi-v1-onnx');
 assert.equal(out.entities.length,1);
 assert.equal(out.entities[0].text,'Maya Sen');
 assert.equal(out.entities[0].necessary,false);
 assert.equal(requests.length,1,'GLiNER2 detection must skip general-purpose detection and only run local necessity');
 console.log('PASS: ONNX GLiNER2 detection selected, Chrome local model reserved for necessity');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{delete global.GLiNER2Browser;delete global.LanguageModel;});
