const assert=require('node:assert/strict');
const detector=require('../extension/private/local-ai.js');
(async()=>{
  let availabilityArgs,createArgs;
  global.LanguageModel={
    availability:async options=>{availabilityArgs=options;return 'available';},
    create:async options=>{createArgs=options;return {prompt:async()=>'{"entities":[]}',destroy:()=>{}};}
  };
  assert.equal(await detector.availability(),'available');
  await detector.analyze('A placeholder-free test sentence.');
  for(const options of [availabilityArgs,createArgs]){
    assert.equal(options.outputLanguage,'en');
    assert.deepEqual(options.expectedOutputs,[{type:'text',languages:['en']}]);
  }
  assert.equal(typeof createArgs.monitor,'function');
  console.log('PASS: model language declared consistently on availability and create');
})().catch(e=>{console.error(e);process.exit(1)});
