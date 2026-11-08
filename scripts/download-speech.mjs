import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('docs/SPEECH_ASSETS.json','utf8'));
for(const entry of manifest.files){
 const dest='extension/model/speech/'+entry.file;let data;
 try{data=await readFile(dest);}catch{
  if(process.argv.includes('--verify'))throw Error('Speech model missing: '+entry.file);
  const r=await fetch(`https://huggingface.co/${manifest.repository}/resolve/${manifest.revision}/${entry.file}`);if(!r.ok)throw Error('Speech asset download failed '+r.status);data=Buffer.from(await r.arrayBuffer());
 }
 if(data.length!==entry.bytes||createHash('sha256').update(data).digest('hex')!==entry.sha256)throw Error('Speech asset integrity failure: '+entry.file);
 await mkdir(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});await writeFile(dest,data);
}
console.log('Pinned bundled speech model verified.');
