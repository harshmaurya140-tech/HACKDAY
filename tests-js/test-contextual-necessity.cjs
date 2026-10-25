const assert=require('node:assert/strict');
const ai=require('../extension/private/local-ai.js');
const core=require('../extension/core/privacy-core.js');
const text='Monthly salary 82500; hypothetical threshold 80000. DOB 17 November 2005; compare as of 25 October 2026. PAN ABCDE1234F.';
const sample=[
 {value:'82500',type:'INCOME',sensitive:true,necessary:true,reason:'Exact personal income needed for the comparison'},
 {value:'80000',type:'INCOME',sensitive:false,necessary:false,reason:'A public comparison threshold, not personal data'},
 {value:'17 November 2005',type:'DOB',sensitive:true,necessary:true,reason:'Exact DOB needed to calculate exact age'},
 {value:'25 October 2026',type:'OTHER',sensitive:false,necessary:false,reason:'Reference date is a task input'},
 {value:'ABCDE1234F',type:'PAN',sensitive:false,necessary:false,reason:'Deliberately incorrect classification; generic PAN validator must still protect'}
];
const spans=sample.flatMap(x=>ai.findSpans(text,x));
assert.deepEqual(spans.map(x=>x.text),['82500','17 November 2005','ABCDE1234F']);
const entities=core.mergeDetected(text,spans);
assert(entities.some(x=>x.type==='PAN'&&x.text==='ABCDE1234F'));
assert(entities.some(x=>x.type==='INCOME'&&x.necessary));
assert(!entities.some(x=>x.text==='80000'));
assert(!entities.some(x=>x.text==='25 October 2026'));
const prepared=core.prepare(core.newSession(),{text,entities},{});
assert(prepared.sanitized_text.includes('threshold 80000'));
assert(prepared.sanitized_text.includes('as of 25 October 2026'));
assert(!prepared.sanitized_text.includes('82500'));
assert(!prepared.sanitized_text.includes('ABCDE1234F'));
assert.equal(core.typeOf('transaction_amount'),'AMOUNT');
const amount='Disputed transaction amount: 18750';
const e={id:'e1',start:amount.indexOf('18750'),end:amount.indexOf('18750')+5,text:'18750',type:'AMOUNT',necessary:true};
assert.throws(()=>core.prepare(core.newSession(),{text:amount,entities:[e]},{e1:{mode:'RANGE',lower:10000,upper:20000}}),/Ranges only apply to incomes/);
console.log('PASS: model-labeled private facts protected, nonsensitive task constants retained, format validators remain active, transaction != income');
