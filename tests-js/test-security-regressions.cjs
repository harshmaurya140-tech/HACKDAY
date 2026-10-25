const assert = require('node:assert/strict');
const core = require('../extension/core/privacy-core.js');
function entity(text,value,type,necessary=false){
  const start=text.indexOf(value);
  return {type,text:value,start,end:start+value.length,necessary};
}
// An arbitrary model alias for a PAN must not downgrade to OTHER/allow consent.
const pan='My PAN is ABCDE1234F';
const panResult=core.mergeDetected(pan,[entity(pan,'ABCDE1234F','PAN_NUMBER',true)]);
assert.equal(panResult.length,1);
assert.equal(panResult[0].type,'PAN');
assert.equal(panResult[0].necessary,false);
assert.equal(core.canAskForDisclosure('PAN_NUMBER'),false);
assert.throws(()=>core.prepare(core.newSession(),{text:pan,entities:panResult},{e1:{mode:'EXACT'}}),/protected/);
// If model calls a bank identifier PERSON/OTHER, generic overlap rules must
// not allow disclosure of the overlapping protected identifier.
const overlapping='Reference: ABCDE1234F';
const model=[entity(overlapping,'Reference: ABCDE1234F','PERSON',true)];
const safe=core.mergeDetected(overlapping,model);
assert.equal(safe.length,1);
assert.equal(safe[0].necessary,false);
assert.equal(core.canAskForDisclosure(safe[0].type),false);
assert.doesNotMatch(core.prepare(core.newSession(),{text:overlapping,entities:safe}).sanitized_text,/ABCDE1234F/);
// An unseen contextual account number should be masked even when the local
// language model fails to identify it. No hardcoded account values in runtime.
const account='Please reference bank account number is 123456789012';
const detected=core.mergeDetected(account,[]);
assert(detected.some(e=>e.text==='123456789012'&&core.canAskForDisclosure(e.type)===false));
assert.doesNotMatch(core.prepare(core.newSession(),{text:account,entities:detected}).sanitized_text,/123456789012/);
// Preserve exact spelling for lossless restoration instead of merging values
// that only differ by case into a single pseudo-identity.
const distinct='Alex and alex are different exact source strings.';
const sameType=[entity(distinct,'Alex','PERSON'),entity(distinct,'alex','PERSON')];
const session=core.newSession();
const prepared=core.prepare(session,{text:distinct,entities:core.spansFor(distinct,sameType)});
assert.equal(Object.keys(session.dummyToReal).length,2);
assert.equal(core.restore(session,prepared.sanitized_text).text,distinct);
const params='The hypothetical threshold is 80000.';
assert.equal(core.detectFormats(params).length,0,'unrelated task parameters remain visible');
console.log('PASS: credential aliases, overlapping classifications, contextual accounts, exact restoration and task constants');
