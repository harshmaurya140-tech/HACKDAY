const assert=require('node:assert/strict');
const core=require('../extension/core/privacy-core.js');
const fixtures=[
 ['password: x','x'],
 ['My password is abc123','abc123'],
 ['passwd=1234','1234'],
 ['api_key: tiny','tiny'],
 ['access-token = short','short'],
 ['secret="two words, with punctuation; and spaces"','two words, with punctuation; and spaces'],
 [String.raw`{"password":"a\"b c","enabled":true}`,String.raw`a\"b c`],
 [String.raw`password='it\'s private'`,String.raw`it\'s private`],
 ['password="unterminated value\nPublic following line','unterminated value'],
 ['password='+ 'z'.repeat(750),'z'.repeat(750)],
 ['password="'+ 'q '.repeat(350)+'"','q '.repeat(350)],
 ['Authorization: Bearer synthetic.token/value+=','synthetic.token/value+='],
 ['{"Authorization": "Bearer example-token"}','example-token'],
 ["curl -H 'Authorization: Bearer sample-token'",'sample-token'],
 ['Proxy-Authorization: Basic dXNlcjpwYXNz','dXNlcjpwYXNz'],
 ['authorization=basic YTpi','YTpi'],
 ['Authorization: Bearer '+ 'k'.repeat(800),'k'.repeat(800)],
 ['API_KEY="秘密の値🔒"','秘密の値🔒']
];
for(const [text,value] of fixtures){
 const entities=core.mergeDetected(text,[]);
 const start=text.indexOf(value);
 assert(entities.some(e=>e.type==='SECRET'&&e.start<=start&&e.end>=start+value.length),`Unprotected credential in fixture: ${text.slice(0,60)}`);
 const session=core.newSession(),out=core.prepare(session,{text,entities}).sanitized_text;
 assert.equal(core.restore(session,out).text,text,'Exact round trip, including quotes/escapes');
 for(const e of entities.filter(e=>e.type==='SECRET')){
  assert(!e.necessary);
  assert.throws(()=>core.prepare(core.newSession(),{text,entities},{[e.id]:{mode:'EXACT'}}),/protected/);
 }
}
for(const text of ['Explain password hashing and bearer authentication.','The bearer of this letter is authorized.','password:\nPublic following line','password=""; enabled=true','passwordish=public','Authorization: Bearer\nPublic following line']){
 assert.equal(core.detectFormats(text).filter(e=>e.type==='SECRET').length,0,text);
}
const repeated=Array.from({length:30},()=> 'password: tiny').join('\n');
const e=core.mergeDetected(repeated,[]),s=core.newSession();
assert.equal(e.length,30);
const masked=core.prepare(s,{text:repeated,entities:e}).sanitized_text;
assert(!masked.includes('tiny'));assert.equal(core.restore(s,masked).text,repeated);
console.log('PASS short/quoted/escaped/long credentials, HTTP auth, exact restoration, no disclosure, repetition and prose counterexamples');
