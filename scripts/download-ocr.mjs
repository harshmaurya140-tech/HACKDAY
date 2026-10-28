import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const lock=JSON.parse(await readFile('docs/OCR_ASSETS.json','utf8'));
for(const entry of lock.files){
 const path='extension/model/ocr/'+entry.file;let bytes;
 try{bytes=await readFile(path);}catch(e){
  if(process.argv.includes('--verify'))throw e;
  const response=await fetch(`https://raw.githubusercontent.com/${lock.repository}/${lock.revision}/${entry.file}`);
  if(!response.ok)throw Error('OCR asset unavailable');bytes=Buffer.from(await response.arrayBuffer());
 }
 if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('OCR asset checksum mismatch');
 if(!process.argv.includes('--verify')){await mkdir('extension/model/ocr',{recursive:true});await writeFile(path,bytes);}
 console.log('Pinned English OCR asset verified.');
}
