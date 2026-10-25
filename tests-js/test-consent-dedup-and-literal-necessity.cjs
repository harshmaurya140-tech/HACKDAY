const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ai=require('../extension/private/local-ai.js');
const core=require('../extension/core/privacy-core.js');

const src=fs.readFileSync(path.join(__dirname,'../extension/private/frame.js'),'utf8');
const beginning=src.indexOf('function groupPermissionEntities(');
const end=src.indexOf('function showRecovery(',beginning);
assert(beginning>0&&end>beginning,'extract real grouping function');
const ctx={}; vm.createContext(ctx);
vm.runInContext(src.slice(beginning,end)+';globalThis.group=groupPermissionEntities',ctx);
const group=ctx.group([
 {id:'e1',text:'Aarav Kulkarni',type:'PERSON',necessary:true},
 {id:'e2',text:'Aarav Kulkarni',type:'PERSON',necessary:true},
 {id:'e3',text:'17 November 2005',type:'DOB',necessary:true},
 {id:'e4',text:'Aarav Kulkarni',type:'PERSON',necessary:false},
]);
assert.equal(group.length,2,'same value gets one popup choice');
assert.deepEqual(Array.from(group[0].ids),['e1','e2']);
assert.match(src,/for\(const id of JSON\.parse\(select\.dataset\.entityIds/, 'consent propagated to every exact occurrence');
assert.match(src,/if\(current && lastApprovedDecisions!==null\)await prepareAndSend\(lastApprovedDecisions\)/,'approved draft automatically retried after confirmed native clearing');

(async()=>{
 const prompt='My name is Aarav Kulkarni. Aarav Kulkarni needs a complaint, and my birthday is 17 November 2005. Calculate exact age on 25 October 2026 with an eligibility limit of ₹80,000.';
 const responseA={entities:[
  {value:'Aarav Kulkarni',type:'PERSON',sensitive:true,personally_sensitive:true},
  {value:'17 November 2005',type:'DOB',sensitive:true,personally_sensitive:true},
  {value:'25 October 2026',type:'OTHER',sensitive:true,personally_sensitive:false},
  {value:'₹80,000',type:'OTHER',sensitive:true,personally_sensitive:false}
 ]};
 const responseB={assessments:[
  {value:'Aarav Kulkarni',type:'PERSON',materially_required:true,requires_literal_value:false,personally_sensitive:true,reason:'Used for addressing the letter'},
  {value:'17 November 2005',type:'DOB',materially_required:true,requires_literal_value:true,personally_sensitive:true,reason:'Needed for exact age'}
 ]};
 global.LanguageModel={availability:async()=> 'available',create:async()=>({
   async prompt(p,options){return JSON.stringify(options.responseConstraint===ai.DETECTION_SCHEMA?responseA:responseB)},destroy(){}
 })};
 const result=await ai.analyze(prompt);
 assert.equal(result.entities.filter(e=>e.type==='PERSON').length,2);
 assert(result.entities.filter(e=>e.type==='PERSON').every(e=>!e.necessary),'name used only for document personalization is masked without popup');
 assert.equal(result.entities.filter(e=>e.type==='DOB').length,1);
 assert.equal(result.entities.find(e=>e.type==='DOB').necessary,true,'exact-age DOB asks permission');
 assert(!result.entities.some(e=>e.text==='₹80,000'), 'public hypothetical threshold is not masked');
 assert(!result.entities.some(e=>e.text==='25 October 2026'),'nonprivate calculation date is not masked');
 const merged=core.mergeDetected(prompt,result.entities);
 const output=core.prepare(core.newSession(),{text:prompt,entities:merged});
 assert.match(output.sanitized_text,/₹80,000/);
 assert.match(output.sanitized_text,/\[PRIVATE_PERSON_1_[A-F0-9]{6}\]/);
 assert(!/Aarav Kulkarni/.test(output.sanitized_text),'all copies of the person name are masked');
 console.log('PASS: semantic necessity, threshold classification, and duplicate value grouping');
})().catch(e=>{console.error(e);process.exitCode=1});
