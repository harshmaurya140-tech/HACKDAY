const assert=require('node:assert/strict');
const core=require('../extension/core/privacy-core.js');
for(const phrase of ['my bank account no. is 3678745','account number: 1234','a/c 1234567']){
 const matches=core.detectFormats(phrase).filter(e=>e.type==='ACCOUNT');
 assert.equal(matches.length,1,phrase);
 assert.equal(core.canAskForDisclosure(matches[0].type),false,'account identifiers never need disclosure');
}
assert.equal(core.detectFormats('The eligibility limit is 80000 and the ticket is 3678745').some(e=>e.type==='ACCOUNT'),false);
console.log('PASS explicitly labelled short account identifiers remain protected without treating arbitrary numbers as accounts');
