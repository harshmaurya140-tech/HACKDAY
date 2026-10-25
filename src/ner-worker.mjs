import * as ort from 'onnxruntime-web/wasm';
import {Tokenizer} from '@huggingface/tokenizers';
let loaded;
async function load(){
 if(!loaded)loaded=(async()=>{
  ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=new URL('./vendor/ort/',import.meta.url).href;
  const base=new URL('../model/ner/',import.meta.url);
  const [json,config,modelConfig]=await Promise.all(['tokenizer.json','tokenizer_config.json','config.json'].map(async f=>{const r=await fetch(new URL(f,base));if(!r.ok)throw Error('Model asset missing');return r.json();}));
  const tokenizer=new Tokenizer(json,config);
  const session=await ort.InferenceSession.create(new URL('onnx/model_quantized.onnx',base).href,{executionProviders:['wasm']});
  return {tokenizer,session,labels:modelConfig.id2label};
 })().catch(e=>{loaded=null;throw e;});
 return loaded;
}
async function extract(text){
 if(typeof text!=='string'||text.length>12000)throw Error('NER input limit');
 const {tokenizer,session,labels}=await load();
 const pieces=[...text.matchAll(/[\p{L}\p{M}\p{N}_]+|[^\s]/gu)];
 const ids=[],offsets=[];
 for(const m of pieces){
  const encoded=tokenizer.encode(m[0],{add_special_tokens:false}).ids;
  for(const id of encoded){ids.push(id);offsets.push([m.index,m.index+m[0].length]);}
 }
 const full=tokenizer.encode(text).ids;
 if(full.length!==ids.length+2||ids.some((id,i)=>id!==full[i+1]))throw Error('NER tokenizer alignment unavailable for this input');
 const spans=[];
 for(let start=0;start<ids.length;start+=192){
  const end=Math.min(start+256,ids.length),input=[full[0],...ids.slice(start,end),full.at(-1)],dims=[1,input.length];
  const tensor=values=>new ort.Tensor('int64',BigInt64Array.from(values.map(BigInt)),dims);
  const feeds={input_ids:tensor(input),attention_mask:tensor(input.map(()=>1))};
  if(session.inputNames.includes('token_type_ids'))feeds.token_type_ids=tensor(input.map(()=>0));
  const result=await session.run(feeds),logits=result.logits;
  if(logits?.dims[1]!==input.length||logits.dims[2]!==Object.keys(labels).length)throw Error('NER output shape mismatch');
  let active=null;
  for(let i=1;i<input.length-1;i++){
   let best=0;for(let j=1;j<logits.dims[2];j++)if(logits.data[i*logits.dims[2]+j]>logits.data[i*logits.dims[2]+best])best=j;
   const label=labels[best],type={PER:'PERSON',ORG:'OTHER',LOC:'ADDRESS',MISC:'OTHER'}[label?.slice(2)];
   if(!type){active=null;continue;}
   const [a,b]=offsets[start+i-1];
   if(active&&active.type===type&&(label.startsWith('I-')||a===active.start)&&a<=active.end+2){active.end=b;active.text=text.slice(active.start,b);}
   else {active={start:a,end:b,text:text.slice(a,b),type,necessary:false,reason:'Detected by local BERT NER'};spans.push(active);}
  }
  if(end===ids.length)break;
 }
 return [...new Map(spans.map(e=>[e.type+':'+e.start+':'+e.end,e])).values()];
}
self.onmessage=async({data})=>{try{const entities=await extract(data.text);self.postMessage({id:data.id,entities});}catch{self.postMessage({id:data.id,error:'Bundled local NER failed. Sending is blocked; check model assets and input limits.'});}};
