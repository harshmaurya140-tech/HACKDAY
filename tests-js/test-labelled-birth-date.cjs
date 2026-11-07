const assert=require('node:assert/strict');
const core=require('../extension/core/privacy-core.js');
for(const [label,value] of [['date of birth is','15 March 2002'],['DOB:','2002-03-15'],['D.O.B. =','15/03/2002'],['birth date:','March 15, 2002'],['birthdate is','15th March 2002']]){
 const text=`My ${label} ${value}. Report deadline: 28 October 2026.`;
 const entities=core.mergeDetected(text,[]);
 assert(entities.some(e=>e.type==='DOB'&&e.text===value),text);
 const session=core.newSession();const output=core.prepare(session,{text,entities}).sanitized_text;
 assert(!output.includes(value));assert(output.includes('28 October 2026'));
 assert.equal(core.restore(session,output).text,text);
}
assert.equal(core.mergeDetected('Calculate elapsed days from 15 March 2002 to 28 October 2026.',[]).length,0);
assert.equal(core.mergeDetected('Date of birth: unknown. Deadline is 28 October 2026.',[]).length,0);
const repeated='DOB: 15/03/2002. DOB: 15/03/2002.';
assert.equal(core.mergeDetected(repeated,[]).filter(e=>e.type==='DOB').length,2);
console.log('PASS labelled birth dates masked, exact offsets/round trips, repeated values and public dates preserved');
