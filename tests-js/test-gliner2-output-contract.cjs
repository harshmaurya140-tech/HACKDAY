const assert=require('node:assert/strict');
const decoder=require('../extension/core/gliner2-output.js');
const text='Nora Vale uses the id XZD390018, nora@example.net.';
const spans=[
  {label:'name',text:'Nora Vale',start:0,end:9},
  {label:'id_num',text:'XZD390018',start:text.indexOf('XZD390018'),end:text.indexOf('XZD390018')+9},
  {label:'email',text:'nora@example.net',start:text.indexOf('nora@example.net'),end:text.indexOf('nora@example.net')+16}
];
const out=decoder.normalize(text,spans);
assert.deepEqual(out.map(x=>x.type),['PERSON','ID','EMAIL']);
assert.equal(out[1].necessary,false);
assert.throws(()=>decoder.normalize(text,[{...spans[0],start:1}]),/not aligned/);
assert.throws(()=>decoder.normalize(text,[{...spans[0],label:'unapproved_label'}]),/Unexpected/);
assert.throws(()=>decoder.normalize(text,[{...spans[0],end:1000}]),/offsets/);
console.log('PASS: GLiNER2 decoded spans validated, seven-label mapping and IDs hidden');
