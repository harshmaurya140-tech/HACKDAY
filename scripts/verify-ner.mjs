import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const lock=JSON.parse(await readFile('docs/NER_ASSETS.json','utf8'));
for(const entry of lock.files){const data=await readFile('extension/model/ner/'+entry.file);if(data.length!==entry.bytes||createHash('sha256').update(data).digest('hex')!==entry.sha256)throw Error('Model checksum mismatch: '+entry.file);}
for(const file of ['extension/private/ner-worker.js','extension/private/vendor/ort/ort-wasm-simd-threaded.wasm','extension/private/vendor/pdf/pdf.mjs','extension/private/vendor/pdf/pdf.worker.mjs'])if((await readFile(file)).length<1000)throw Error('Runtime missing: '+file);
console.log('Pinned model hashes and packaged runtime assets verified.');
