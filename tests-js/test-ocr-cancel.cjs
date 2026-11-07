const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('extension/private/ocr.mjs','utf8').replace(/^import .*;\n/,'').replace('export async function','async function').replaceAll('import.meta.url',"'https://extension.invalid/private/ocr.mjs'")+'\nglobalThis.run=recognize;';
(async()=>{
 let ready,terminated=0;
 const created=new Promise(r=>ready=r);
 const worker={recognize:()=>new Promise(()=>{}),terminate:async()=>{terminated++;}};
 const context={Tesseract:{createWorker:()=>created},URL,setTimeout,clearTimeout};vm.createContext(context);vm.runInContext(source,context);
 const controller=new AbortController();const task=context.run({}, {signal:controller.signal});controller.abort();
 await assert.rejects(Promise.race([task,new Promise((_,reject)=>setTimeout(()=>reject(Error('Cancellation hung')),300))]),/OCR cancelled/);
 ready(worker);await new Promise(setImmediate);assert(terminated>0,'worker created after cancellation must be terminated');
 console.log('PASS OCR cancellation settles immediately and terminates a late-created worker');
})().catch(e=>{console.error(e);process.exitCode=1;});
