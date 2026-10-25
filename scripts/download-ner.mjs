import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const revision='8e892123e8b7c2c0c2bd1dcb598b7d244c4e53aa';
const files=['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','vocab.txt','onnx/model_quantized.onnx'];
const expected=JSON.parse(await readFile('docs/NER_ASSETS.json','utf8'));
const entries=[];
for(const file of files){
 const dest='extension/model/ner/'+file;await mkdir(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});
 let data;try{data=await readFile(dest);}catch{const r=await fetch(`https://huggingface.co/Xenova/bert-base-NER/resolve/${revision}/${file}`);if(!r.ok)throw Error('Asset download failed '+r.status);data=Buffer.from(await r.arrayBuffer());await writeFile(dest,data);}
 const sha256=createHash('sha256').update(data).digest('hex');const pinned=expected.files.find(x=>x.file===file);if(!pinned||pinned.bytes!==data.length||pinned.sha256!==sha256)throw Error('Pinned model verification failed: '+file);
 entries.push({file,bytes:data.length,sha256});console.log(file,data.length);
}
console.log('All assets match the pinned manifest.');
