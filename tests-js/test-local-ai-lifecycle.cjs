const assert=require('node:assert/strict');
const detector=require('../extension/private/local-ai.js');
(async()=>{
  let attempts=0;
  global.LanguageModel={availability:async()=> 'unavailable',create:()=>{attempts++;throw Error('Should not run')}};
  await assert.rejects(detector.analyze('Name of anonymous user'),/unavailable/);
  assert.equal(attempts,0);
  const statuses=[];
  let prompts=[],destroyed=false;
  global.LanguageModel={
    availability:async()=> 'downloadable',
    create:async({monitor})=>{
      monitor({addEventListener:(type,cb)=>{if(type==='downloadprogress')cb({loaded:0.54});}});
      return {prompt:async(s,opts)=>{
        prompts.push(s);
        if(opts.responseConstraint===detector.DETECTION_SCHEMA)
          return '{"entities":[{"value":"Nora Vale","type":"PERSON","sensitive":true}]}';
        return '{"assessments":[{"value":"Nora Vale","type":"PERSON","materially_required":false,"reason":"Can restore name locally"}]}';
      },destroy:()=>{destroyed=true;}};
    }
  };
  const res=await detector.analyze('Hello Nora Vale.',{onStatus:s=>statuses.push(s)});
  assert.equal(res.entities.length,1);
  assert(statuses.some(x=>x.includes('54%')));
  assert(statuses.some(x=>x.includes('Detecting sensitive data')));
  assert(statuses.some(x=>x.includes('disclosure is necessary')));
  assert.equal(prompts.length,2);
  assert.equal(destroyed,true);
  global.LanguageModel={availability:async()=> 'mystery',create:()=>{attempts++;throw Error('Should not run')}};
  await assert.rejects(detector.analyze('Hello Nora Vale.'),/Unknown Chrome local AI state/);
  console.log('PASS: unavailable, download progress, two local inference passes and fail-closed states');
})().catch(e=>{console.error(e);process.exit(1)});
