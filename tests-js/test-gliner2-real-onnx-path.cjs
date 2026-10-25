const assert=require('node:assert/strict');
const gl=require('../extension/core/gliner2-onnx.js');
assert.deepEqual(gl.SCHEMA_LABELS,['name','address','email','phone_num','id_num','url','username']);
const words=gl.splitWords('Hello Rahul\nABCDE1234F');
assert.deepEqual(words.map(w=>w.text),['hello','rahul','abcde1234f']);
assert.deepEqual(words.map(w=>w.start),[0,6,12]);
(async()=>{
  const input=[];
  function FakeTensor(type,data,dims){this.type=type;this.data=data;this.dims=dims;}
  const tokenizer=async word=>({input_ids:{data:Uint32Array.from([...word].map(c=>c.charCodeAt(0)))}});
  const session={async run(tensors){
    input.push(tensors);
    return {count_logits:{dims:[1,7],data:new Float32Array(7)},span_scores:{dims:[1,7,3],data:new Float32Array(21)}};
  }};
  const result=await gl.runONNX('Hello Rahul ABCDE1234F',{session,tokenizer,ort:{Tensor:FakeTensor}});
  assert.equal(input.length,1,'an actual ONNX session.run call must happen');
  assert.equal(input[0].input_ids.dims[0],1);
  assert.deepEqual(input[0].text_word_counts.dims,[1]);
  assert.equal(Number(input[0].text_word_counts.data[0]),3);
  assert.equal(result.wordOffsets[2].text,'abcde1234f');
  assert.deepEqual(gl.extractVerifiedSpans('Hello Rahul',[{start:6,end:11,text:'Rahul',label:'name'}]),[{start:6,end:11,text:'Rahul',label:'name'}]);
  assert.throws(()=>gl.extractVerifiedSpans('Hello Rahul',[{start:6,end:11,text:'Alice',label:'name'}]),/unaligned/);
  console.log('PASS: real ONNX run path, tokenizer offsets, fixed schema, fail-closed decoded spans');
})().catch(e=>{console.error(e);process.exitCode=1});
