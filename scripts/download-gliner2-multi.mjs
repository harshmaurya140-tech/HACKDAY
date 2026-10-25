// Developer-only asset download. The end user installs only the produced extension.
import {createWriteStream,existsSync,mkdirSync,statSync,renameSync,unlinkSync} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
const model='onnx-community/gliner2-multi-v1-agent-ONNX';
const base=`https://huggingface.co/${model}/resolve/main/`;
const files=['tokenizer.json','tokenizer_config.json','special_tokens_map.json','config.json','onnx/model_fp16.onnx','onnx/model_fp16.onnx_data'];
for(const file of files){
  const dest=path.join('extension/model',file);
  mkdirSync(path.dirname(dest),{recursive:true});
  if(existsSync(dest)&&statSync(dest).size>0){console.log('Present',file);continue;}
  const res=await fetch(base+file,{redirect:'follow'});
  if(!res.ok||!res.body)throw Error(`Download ${file} failed (${res.status})`);
  const part=dest+'.partial';
  try{
    await pipeline(Readable.fromWeb(res.body),createWriteStream(part));
    if(statSync(part).size===0)throw Error('Empty model file '+file);
    renameSync(part,dest);
    console.log(file,'downloaded');
  }catch(e){if(existsSync(part))unlinkSync(part);throw e;}
}
console.log('Multilingual GLiNER2 assets prepared. Verify model fidelity and browser execution before release.');
