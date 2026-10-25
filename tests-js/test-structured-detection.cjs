const assert=require('node:assert/strict');
const ai=require('../extension/private/local-ai.js');
assert.deepEqual(ai.parseDetectionResult('{"entities":[]}'),[]);
assert.throws(()=>ai.parseDetectionResult('[]'),/Invalid local AI detection output/);
assert.throws(()=>ai.parseDetectionResult('{"other":[]}'),/Invalid local AI detection output/);
assert.throws(()=>ai.parseDetectionResult('{"entities":[{"type":"PERSON"}]}'),/Invalid local AI detection entity/);
assert.throws(()=>ai.parseNecessityResult('{"assessments":[{"value":"A","type":"PERSON"}]}'),/Invalid local AI necessity assessment/);
assert.equal(ai.DETECTION_SCHEMA.properties.entities.type,'array');
assert.equal(ai.NECESSITY_SCHEMA.properties.assessments.type,'array');
(async()=>{
  let runs=0,destroyed=0,detectionRequests=0,necessityRequests=0;
  global.LanguageModel={
    availability:async()=> 'available',
    create:async()=>({
      prompt:async(_,opts)=>{
        runs++;
        if(opts.responseConstraint===ai.DETECTION_SCHEMA){
          detectionRequests++;
          if(detectionRequests===1)return '{"names":["Maya Sethi"]}';
          return '{"entities":[{"value":"Maya Sethi","type":"PERSON","sensitive":true}]}';
        }
        assert.equal(opts.responseConstraint,ai.NECESSITY_SCHEMA);
        necessityRequests++;
        return '{"assessments":[{"value":"Maya Sethi","type":"PERSON","materially_required":false,"reason":"Can restore"}]}';
      },
      destroy:()=>{destroyed++}
    })
  };
  const statuses=[];
  const result=await ai.analyze('Write a greeting for Maya Sethi.',{onStatus:t=>statuses.push(t)});
  assert.equal(result.entities.length,1);
  assert.equal(result.entities[0].necessary,false);
  assert.equal(runs,3);
  assert.equal(detectionRequests,2);
  assert.equal(necessityRequests,1);
  assert(statuses.some(x=>x.includes('Validating local model output')));
  assert.equal(destroyed,2);
  let attempts=0;
  global.LanguageModel={availability:async()=> 'available',create:async()=>({prompt:async()=>{attempts++;return '{"wrong":true}'},destroy:()=>{}})};
  await assert.rejects(ai.analyze('Please contact Maya Sethi.'),/Invalid local AI output; sending is blocked/);
  assert.equal(attempts,2);
  console.log('PASS: separate JSON Schema contracts and fail-closed malformed output');
})().catch(e=>{console.error(e);process.exitCode=1});
