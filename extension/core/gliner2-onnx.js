/*
 * Browser-side GLiNER2 ONNX core integration (experimental).
 * Source architecture: fastino/GLiNER2 SchemaTransformer, fixed-label ONNX
 * export: okasi/gliner2-privacy-filter-pii-multi-onnx.
 *
 * This code performs REAL ONNX Runtime inference when passed a locally loaded
 * ONNX session, tokenizer, and ort runtime. It does not use Chrome Prompt API
 * or any cloud inferencing. For a privacy product, do not enable this engine
 * as the sole detector until its decoded spans match a pinned Python reference
 * on arbitrary-text test sets; the export publisher explicitly documents a
 * missing browser-native preprocessing/decoding parity path.
 */
(function(root){
  'use strict';
  const SCHEMA_LABELS=Object.freeze(['name','address','email','phone_num','id_num','url','username']);
  const TOKENS=Object.freeze({sepText:'[SEP_TEXT]',markPrompt:'[P]',markEntity:'[E]'});
  const assert=(ok,msg)=>{if(!ok)throw new Error('GLiNER2 '+msg);};
  function splitWords(text){
    // Approximate upstream whitespace word-splitting; precise parity still
    // needs a version-pinned tokenizer/word-splitter golden dataset.
    const words=[];
    for(const match of text.matchAll(/\S+/gu)){
      const value=match[0];
      words.push({text:value.toLowerCase(),start:match.index,end:match.index+value.length});
    }
    return words;
  }
  function tokenizeSchema(labels=SCHEMA_LABELS){
    assert(labels.length===SCHEMA_LABELS.length && labels.every((s,i)=>s===SCHEMA_LABELS[i]),'requires the exported fixed seven-label schema');
    const schema=['(',TOKENS.markPrompt,'entities','('];
    for(const name of labels)schema.push(TOKENS.markEntity,name);
    schema.push(')',')',TOKENS.sepText);
    return schema;
  }
  function idsFrom(out){
    const ids=out.input_ids;
    if(!ids)throw Error('Tokenizer omitted input_ids');
    const array=Array.from(ids?.data??ids).flat(Infinity).map(x=>Number(x));
    assert(array.every(n=>Number.isSafeInteger(n) && n>=0),'invalid tokenizer ids');
    return array;
  }
  async function encode(text,tokenizer){
    assert(typeof text==='string' && text.trim().length>0 && text.length<=10000,'invalid text');
    assert(typeof tokenizer==='function','needs a bundled tokenizer');
    const words=splitWords(text);
    assert(words.length>0 && words.length<=512,'input exceeds word limit');
    const schema=tokenizeSchema();
    const ids=[],wordPositions=[];
    for(const token of schema){
      const out=await tokenizer(token,{add_special_tokens:false});
      ids.push(...idsFrom(out));
    }
    for(const word of words){
      wordPositions.push(ids.length);
      const out=await tokenizer(word.text,{add_special_tokens:false});
      const subwords=idsFrom(out);
      assert(subwords.length>0,'unrecognized empty subword token');
      ids.push(...subwords);
    }
    assert(ids.length<=2048,'encoded input exceeds model limit');
    return {ids,wordPositions,words,labels:SCHEMA_LABELS};
  }
  async function runONNX(text,{session,tokenizer,ort}){
    assert(session&&typeof session.run==='function','ONNX session not initialized');
    assert(ort?.Tensor,'ONNX Runtime Web not loaded');
    const p=await encode(text,tokenizer);
    const ints=a=>BigInt64Array.from(a,BigInt);
    const feeds={
      input_ids:new ort.Tensor('int64',ints(p.ids),[1,p.ids.length]),
      attention_mask:new ort.Tensor('int64',ints(p.ids.map(()=>1)),[1,p.ids.length]),
      text_word_indices:new ort.Tensor('int64',ints(p.wordPositions),[1,p.words.length]),
      text_word_counts:new ort.Tensor('int64',ints([p.words.length]),[1])
    };
    const logits=await session.run(feeds);
    assert(logits?.count_logits && logits?.span_scores,'ONNX graph output missing expected GLiNER2 tensors');
    return {logits,wordOffsets:p.words,labels:p.labels};
  }
  // Decode method is intentionally separate. This prevents sending unverified
  // or fabricated entity offsets based on an incorrect word-score heuristic.
  function extractVerifiedSpans(text, decoded){
    assert(Array.isArray(decoded),'requires validated decoded spans');
    const spans=[];
    for(const item of decoded){
      assert(item&&SCHEMA_LABELS.includes(item.label),'unexpected decoded label');
      assert(Number.isInteger(item.start)&&Number.isInteger(item.end)&&item.start>=0&&item.start<item.end&&item.end<=text.length,'invalid span offsets');
      assert(text.slice(item.start,item.end)===item.text,'unaligned model span');
      spans.push({...item});
    }
    return spans;
  }
  const api={SCHEMA_LABELS,splitWords,tokenizeSchema,encode,runONNX,extractVerifiedSpans};
  root.GLiNER2ONNX=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
