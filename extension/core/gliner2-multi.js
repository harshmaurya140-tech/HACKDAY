/*
 * GLiNER2 multi-v1 browser ONNX runner.
 * Model: onnx-community/gliner2-multi-v1-agent-ONNX (Apache-2.0).
 * Outputs: count_logits [1,20], span_logits [1,labels,words,8].
 *
 * No remote inference: an ONNX Runtime Web session and tokenizer must be
 * supplied by a bundled, trusted extension module. Model weights are large;
 * bundling/downloading them is a separate release-build step.
 * This is not the PII-specialized Fastino fine-tune. It is the multilingual
 * general-purpose GLiNER2 checkpoint with schema-driven entity types.
 */
(function(root){
 'use strict';
 const MAX_WIDTH=8;
 const TYPES=Object.freeze({
   PERSON:'person',ADDRESS:'street address',EMAIL:'email address',PHONE:'phone number',
   ACCOUNT:'bank account number',PAN:'tax identification number',AADHAAR:'national identity number',
   DOB:'date of birth',INCOME:'salary or personal income',SECRET:'secret password or credential',
   ID:'personal identification number'
 });
 function words(text){
   // WordSplitter compatible segmentation: preserve URLs, emails, mentions,
   // hyphenated words, and punctuation as individual tokens.
   const pattern=/(?:https?:\/\/[^\s]+|www\.[^\s]+)|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|@[a-z0-9_]+|[\p{L}\p{N}_]+(?:[-_][\p{L}\p{N}_]+)*|\S/giu;
   return [...text.matchAll(pattern)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length}));
 }
 function schema(labels){
   const tokens=['(','[P]','entities','('];
   for(const label of labels)tokens.push('[E]',label);
   return [...tokens,')',')','[SEP_TEXT]'];
 }
 function idsFrom(out){
   const input=out?.input_ids?.data??out?.input_ids;
   if(input==null)throw Error('GLiNER2 tokenizer returned no input_ids');
   const a=Array.from(input).flat(Infinity).map(Number);
   if(a.length===0||a.some(v=>!Number.isSafeInteger(v)||v<0))throw Error('Invalid GLiNER2 tokenizer IDs');
   return a;
 }
 async function prepare(text,tokenizer,labels=Object.values(TYPES)){
   if(typeof text!=='string'||!text.trim()||text.length>12000)throw Error('Invalid GLiNER2 input');
   if(typeof tokenizer!=='function')throw Error('Bundled tokenizer unavailable');
   const ws=words(text);
   if(!ws.length||ws.length>384)throw Error('GLiNER2 text exceeds supported length');
   const input=[], positions=[],schemaPositions=[];
   const prefix=schema(labels);
   for(const token of prefix){
     if(token==='[P]'||token==='[E]')schemaPositions.push(input.length);
     input.push(...idsFrom(await tokenizer(token,{add_special_tokens:false})));
   }
   for(const w of ws){
     positions.push(input.length);
     input.push(...idsFrom(await tokenizer(w.text.toLowerCase(),{add_special_tokens:false})));
   }
   if(input.length>2048)throw Error('GLiNER2 sequence too long');
   return {input,positions,schemaPositions,ws,labels};
 }
 function selectSpans(text,words,labels,outputs,threshold=0.62){
   const count=outputs.count_logits?.data;
   const scores=outputs.span_logits?.data;
   const shape=outputs.span_logits?.dims;
   if(!count||!scores||!shape||shape.length!==4||shape[1]!==labels.length||shape[2]!==words.length||shape[3]!==MAX_WIDTH)
     throw Error('GLiNER2 ONNX output dimensions do not match');
   let best=0;for(let i=1;i<count.length;i++)if(count[i]>count[best])best=i;
   if(best===0)return [];
   const candidates=[];
   for(let li=0;li<labels.length;li++){
     for(let start=0;start<words.length;start++){
       for(let width=1;width<=MAX_WIDTH&&start+width<=words.length;width++){
         const idx=((li*words.length+start)*MAX_WIDTH)+(width-1);
         const score=1/(1+Math.exp(-scores[idx]));
         if(score<threshold)continue;
         const begin=words[start].start,end=words[start+width-1].end;
         candidates.push({label:labels[li],text:text.slice(begin,end),start:begin,end,confidence:score});
       }
     }
   }
   // Deterministic greedy suppression of conflicting spans; do not invent text.
   candidates.sort((a,b)=>b.confidence-a.confidence||b.end-b.start-a.end+a.start||a.start-b.start);
   const result=[];
   for(const span of candidates){
     if(result.some(x=>span.start<x.end&&x.start<span.end))continue;
     result.push(span);
   }
   return result.sort((a,b)=>a.start-b.start);
 }
 async function extract(text,{session,tokenizer,ort,threshold=0.62,types=TYPES}={}){
   if(!session?.run||!ort?.Tensor)throw Error('GLiNER2 runtime is not bundled/initialized');
   const labels=Object.values(types);
   const prepared=await prepare(text,tokenizer,labels);
   const t=(array,shape)=>new ort.Tensor('int64',BigInt64Array.from(array,BigInt),shape);
   const feeds={
     input_ids:t(prepared.input,[1,prepared.input.length]),
     attention_mask:t(prepared.input.map(()=>1),[1,prepared.input.length]),
     word_positions:t(prepared.positions,[1,prepared.positions.length]),
     schema_positions:t(prepared.schemaPositions,[1,prepared.schemaPositions.length])
   };
   const outputs=await session.run(feeds);
   const hits=selectSpans(text,prepared.ws,prepared.labels,outputs,threshold);
   const reverse=new Map(Object.entries(types).map(([type,label])=>[label,type]));
   return hits.map(h=>({text:h.text,start:h.start,end:h.end,type:reverse.get(h.label)||'OTHER',confidence:h.confidence}));
 }
 const api={TYPES,MAX_WIDTH,words,schema,prepare,selectSpans,extract};
 root.GLiNER2Multi=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
