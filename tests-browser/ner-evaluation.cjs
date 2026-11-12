// Synthetic-only evaluation of bundled NER + deterministic privacy rules.
// Chrome contextual inference is deliberately excluded; this is not a full
// privacy-quality score. Reports misses/overmasking without hiding failures.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const cases=[
 {id:'image-heading',text:'Synthetic image privacy test. Write one short greeting using the name and email in the attached extracted text. Preserve every placeholder token exactly as written.\n\nDocument text (extracted locally):\nSYNTHETIC PRIVACY TEST Name: Nora Vale Email: nora.test@example.org',private:['Nora Vale','nora.test@example.org'],public:['SYNTHETIC']},
 {id:'sign-off',text:'Write a greeting for Nora Vale at nora.test@example.org, ending with Best regards.',private:['Nora Vale','nora.test@example.org'],public:['Best regards']},
 {id:'mobile',text:'My name is Nora Vale. My phone is +91 98765 43210.',private:['Nora Vale','+91 98765 43210'],public:[]},
 {id:'short-account',text:'My bank account number is 3678745. Draft a complaint.',private:['3678745'],public:['Draft a complaint']},
 {id:'identity',text:'My PAN is ABCDE1234F and my Aadhaar number is 2345 6789 0123.',private:['ABCDE1234F','2345 6789 0123'],public:[]},
 {id:'plain-task',text:'Explain binary search. Use three bullet points and end with Best regards.',private:[],public:['Explain binary search. Use three bullet points and end with Best regards.']},
 {id:'secret-codename',text:'Our confidential project code name is Best regards. Do not disclose it.',private:['Best regards'],public:[]},
 {id:'age-task',text:'My date of birth is 15 March 2002. Calculate my age as of 28 October 2026.',private:['15 March 2002'],public:['28 October 2026']},
 {id:'short-password',text:'Debug this configuration: password=abc123',private:['abc123'],public:[],required:true},
 {id:'quoted-secret',text:'api_key="two words, with punctuation; and spaces"',private:['two words, with punctuation; and spaces'],public:[],required:true},
 {id:'http-bearer',text:'Authorization: Bearer synthetic.token/part+=',private:['synthetic.token/part+='],public:[],required:true},
 {id:'http-basic',text:'Proxy-Authorization: Basic dXNlcjpwYXNz',private:['dXNlcjpwYXNz'],public:[],required:true},
 {id:'long-secret',text:'access_token='+ 'z'.repeat(750),private:['z'.repeat(750)],public:[],required:true},
 {id:'credential-instructions',text:'Explain password hashing and bearer authentication.',private:[],public:['Explain password hashing and bearer authentication.']}
];
(async()=>{
 const ext=path.resolve(process.env.INCOGNIX_EXTENSION||'extension');
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
 try{
  await ctx.route(/^https?:/,r=>r.abort());
  const service=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
  const p=await ctx.newPage();
  await p.goto(service.url().split('/').slice(0,3).join('/')+'/private/workspace.html');
  const results=[];
  for(const fixture of cases){
   for(const value of [...fixture.private,...fixture.public])assert(fixture.text.includes(value),`${fixture.id}: invalid expected span`);
   const result=await p.evaluate(async f=>{
    const ner=await IncognixNER.extract(f.text),entities=PrivacyCore.mergeDetected(f.text,ner);
    const session=PrivacyCore.newSession();
    const outgoing=PrivacyCore.prepare(session,{text:f.text,entities}).sanitized_text;
    const ranges=value=>[...f.text.matchAll(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))].map(m=>[m.index,m.index+value.length]);
    const covered=(a,b)=>{for(let i=a;i<b;i++)if(!entities.some(e=>e.start<=i&&e.end>i))return false;return true;};
    return {id:f.id,remainingPrivateValuesInPreparedText:f.private.filter(v=>outgoing.includes(v)),ner:ner.map(e=>({text:e.text,type:e.type})),missed:f.private.filter(v=>!ranges(v).every(([a,b])=>covered(a,b))),overmasked:f.public.filter(v=>ranges(v).some(([a,b])=>entities.some(e=>e.start<b&&e.end>a))),roundTrip:PrivacyCore.restore(session,outgoing).text.split('\n\n[Incognix local calculation]')[0]===f.text};
   },fixture);
   assert(result.roundTrip,`${fixture.id}: masking must restore the exact original`);
   if(fixture.required){
    assert.deepEqual(result.missed,[],`${fixture.id}: credential detection regression`);
    assert.deepEqual(result.remainingPrivateValuesInPreparedText,[],`${fixture.id}: raw credential remains`);
   }
   results.push(result);
  }
  const report={scope:'Bundled BERT NER plus deterministic rules; Chrome contextual model excluded',version:JSON.parse(fs.readFileSync(path.join(ext,'manifest.json'))).version,cases:results.length,missedDetectionFields:results.reduce((n,r)=>n+r.missed.length,0),overmaskedPublicSegments:results.reduce((n,r)=>n+r.overmasked.length,0),results};
  fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/ner-evaluation.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
