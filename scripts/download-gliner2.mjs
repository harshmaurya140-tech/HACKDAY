// DEVELOPER BUILD STEP ONLY — end users do not run this.
// Fetches model artifacts into the eventual Chrome extension package. This is
// not invoked by the runtime and never uploads user text.
import {createWriteStream, existsSync, mkdirSync, statSync, renameSync, unlinkSync} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import path from 'node:path';
const source='https://huggingface.co/okasi/gliner2-privacy-filter-pii-multi-onnx/resolve/main/';
const target=path.resolve('extension/model');
const files=['model_q4.onnx','model_q4.onnx.data','model_q4_metadata.json','entity_labels.json','tokenizer.json','tokenizer_config.json','config.json','onnx_export_metadata.json'];
mkdirSync(target,{recursive:true});
for(const file of files){
  const dest=path.join(target,file);
  if(existsSync(dest)&&statSync(dest).size>0){console.log('Existing',file);continue;}
  const url=source+encodeURIComponent(file).replaceAll('%2F','/');
  const response=await fetch(url,{redirect:'follow'});
  if(!response.ok||!response.body)throw Error(`Cannot download ${file}: HTTP ${response.status}`);
  const partial=dest+'.partial';
  try{
    await pipeline(Readable.fromWeb(response.body),createWriteStream(partial));
    if(statSync(partial).size===0)throw Error('Empty model asset '+file);
    renameSync(partial,dest);
    console.log('Downloaded',file,statSync(dest).size,'bytes');
  }catch(e){if(existsSync(partial))unlinkSync(partial);throw e;}
}
console.log('GLiNER2 model assets retrieved. Do not mark the pipeline production-ready until preprocessing and decoder parity are validated.');
