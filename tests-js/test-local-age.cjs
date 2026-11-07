const assert=require('node:assert/strict');
const core=require('../extension/core/privacy-core.js');
const prompt='My date of birth is 15 March 2002. Calculate my exact age as of 28 October 2026.';
assert.equal(core.localAge(prompt).text,'24 years, 7 months, 13 days');
assert.equal(core.localAge('My DOB is 2000-02-29. My age as of 2021-02-28').text,'21 years, 0 months, 0 days');
assert.equal(core.localAge('My DOB is 2000-02-30. My age as of 2021-02-28'),null);
assert.equal(core.localAge('My DOB is 2027-01-01. My age as of 2026-01-01'),null);
assert.equal(core.localAge(prompt+' My DOB is 2001-01-01.'),null);
assert.equal(core.localAge('My DOB is 03/04/2002. My age as of today'),null);
const session=core.newSession();
const prepared=core.prepare(session,{text:prompt,entities:[{type:'DOB',text:'15 March 2002',start:prompt.indexOf('15 March'),end:prompt.indexOf('15 March')+13}]});

assert(!prepared.sanitized_text.includes('15 March 2002'));
assert(!prepared.sanitized_text.includes('24 years'));
const token=prepared.sanitized_text.match(/\[PRIVATE_AGE_\d+_[A-F0-9]{6}\]/)[0];
assert.equal(core.restore(session,token).text,'24 years, 7 months, 13 days');
console.log('PASS local calendar age, invalid/ambiguous dates, private result token and restoration');
