const assert=require('node:assert/strict');
const GL=require('../extension/core/gliner2-multi.js');
const sentence='Contact Priya Verma at priya@example.com';
const ws=GL.words(sentence);
assert(ws.some(w=>w.text==='priya@example.com'));
assert(ws.some(w=>w.text==='Priya'));
const lab=['person','email address'];
const fake=async token=>({input_ids:{data:[token.length+1]}});
(async()=>{
  const encoded=await GL.prepare(sentence,fake,lab);
  assert.equal(encoded.schemaPositions.length,3);
  assert.equal(encoded.positions.length,ws.length);
  const tensor={data:new Float32Array(lab.length*ws.length*8).fill(-10),dims:[1,lab.length,ws.length,8]};
  const ix=ws.findIndex(w=>w.text==='Priya');
  tensor.data[ix*8+1]=6; // 2-word person span (Priya Verma)
  const mail=ws.findIndex(w=>w.text==='priya@example.com');
  tensor.data[(ws.length+mail)*8]=7;
  const outputs={count_logits:{data:new Float32Array([0,10,...Array(18).fill(-10)])},span_logits:tensor};
  const a=GL.selectSpans(sentence,ws,lab,outputs);
  assert(a.some(v=>v.text==='Priya Verma'));
  assert(a.some(v=>v.text==='priya@example.com'));
  const calls=[];
  class Tensor{constructor(type,data,dims){this.type=type;this.data=data;this.dims=dims;}}
  const session={async run(feeds){calls.push(feeds);return outputs;}};
  const found=await GL.extract(sentence,{session,tokenizer:fake,ort:{Tensor},types:{PERSON:'person',EMAIL:'email address'}});
  assert.equal(calls.length,1);
  assert(found.some(v=>v.text==='Priya Verma'&&v.type==='PERSON'));
  assert(found.some(v=>v.type==='EMAIL'));
  console.log('PASS: browser GLiNER2 multi ONNX tensor inputs, multiword decoding, exact offsets');
})().catch(e=>{console.error(e);process.exitCode=1});
