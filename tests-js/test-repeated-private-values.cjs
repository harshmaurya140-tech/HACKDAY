const assert=require('node:assert/strict');
const ai=require('../extension/private/local-ai.js');
const core=require('../extension/core/privacy-core.js');
for(const count of [13,40,100]){
 const value='Orchid Harbor';
 const text=Array.from({length:count},(_,i)=>`Document ${i+1}: ${value}`).join('\n');
 const spans=ai.findSpans(text,{value,type:'OTHER',sensitive:true});
 assert.equal(spans.length,count,'no silent occurrence cutoff');
 const session=core.newSession();
 const prepared=core.prepare(session,{text,entities:core.mergeDetected(text,spans)});
 assert(!prepared.sanitized_text.includes(value),'every repeated private value is masked');
 assert.equal(core.restore(session,prepared.sanitized_text).text,text,'all occurrences restore exactly');
}
const text='XY '.repeat(2100);
const spans=ai.findSpans(text,{value:'XY',type:'OTHER',sensitive:true});
assert.equal(spans.length,2100);
assert.throws(()=>core.mergeDetected(text,spans),/invalid results/,'over-limit spans fail closed instead of truncating');
console.log('PASS repeated contextual values: full masking, exact restoration and fail-closed span budget');
