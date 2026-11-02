const assert=require('node:assert/strict');
const core=require('../extension/core/privacy-core.js');
const person=(text,value)=>({start:text.indexOf(value),end:text.indexOf(value)+value.length,text:value,type:'PERSON'});
for(const [raw,expected] of [
 ['Nora Vale.','Nora Vale'],['Nora Vale,','Nora Vale'],['“Nora Vale”,','Nora Vale'],
 ['(Nora Vale)','Nora Vale'],['Nora J.','Nora J.'],['J.R.','J.R.'],
 ['Nora Vale Jr.','Nora Vale Jr.'],["Anne-Marie O’Neill.",'Anne-Marie O’Neill'],
 ['José García.','José García'],["D'Arcy.","D'Arcy"],['李 明。','李 明。']
]){
 const text='Contact '+raw+' Please reply.';
 const entities=core.spansFor(text,[person(text,raw)]);
 assert.equal(entities[0].text,expected);
 assert.equal(text.slice(entities[0].start,entities[0].end),expected);
 const session=core.newSession(),masked=core.prepare(session,{text,entities}).sanitized_text;
 assert(!masked.includes(expected));
 assert.equal(core.restore(session,masked).text,text,'exact original draft must round trip');
 const token=Object.keys(session.dummyToReal)[0];
 assert.equal(core.restore(session,'Hello '+token+', welcome!').text,'Hello '+expected+', welcome!');
}
const credential='ABCDE1234F.';
const collision=core.spansFor(credential,[person(credential,credential),{start:0,end:10,text:credential.slice(0,10),type:'PAN'}]);
assert.equal(collision[0].type,'PAN');assert.equal(collision[0].text,credential);assert.equal(collision[0].necessary,false);
for(const value of ['+91 98765 43210','+91-98765-43210','98765 43210','09876543210','+919876543210','9876543210','+91\u00a098765\u00a043210']){
 const text='Call '+value+'.';
 const detected=core.detectFormats(text).filter(e=>e.type==='PHONE');
 assert.equal(detected.length,1,value);assert.equal(detected[0].text,value);
 const entities=core.mergeDetected(text,[]),session=core.newSession();
 const masked=core.prepare(session,{text,entities}).sanitized_text;
 assert(!masked.includes('98765'));assert.equal(core.restore(session,masked).text,text);
}
for(const text of ['987654321','98765432101','x9876543210','9876543210x','_9876543210','9876543210_','98765\n43210']){
 assert.equal(core.detectFormats(text).filter(e=>e.type==='PHONE').length,0,text);
}
console.log('PASS person punctuation, initials, credential collision and spaced mobile round trips');
