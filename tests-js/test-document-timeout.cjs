const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
let source=fs.readFileSync('extension/private/documents.mjs','utf8').replace(/^import .*;\n/,'').replace(/^pdfjs.GlobalWorkerOptions.*;\n/m,'').replaceAll('export async function','async function').replaceAll('import.meta.url',"'https://extension.invalid/private/documents.mjs'");
source+='\nglobalThis.readDocument=readDocument;';
function harness(document){
 let fire,destroyed=0;
 const task={promise:Promise.resolve(document),destroy:async()=>{destroyed++;}};
 const context={pdfjs:{getDocument:()=>task},TextDecoder,Uint8Array,URL,setTimeout:fn=>{fire=fn;return 1;},clearTimeout:()=>{}};
 vm.createContext(context);vm.runInContext(source,context);
 return {read:context.readDocument,timeout:()=>fire(),password:()=>task.onPassword(),destroyed:()=>destroyed};
}
const file={name:'fixture.pdf',size:5,arrayBuffer:async()=>new TextEncoder().encode('%PDF-').buffer};
(async()=>{
 let started;const entered=new Promise(r=>started=r);
 const h=harness({numPages:1,getPage:async()=>({getTextContent:()=>{started();return new Promise(()=>{});}})});
 const pending=h.read(file);await entered;h.timeout();
 await assert.rejects(pending,/PDF parsing timed out/);assert.equal(h.destroyed(),1);
 const cancelled=harness(new Promise(()=>{}));const controller=new AbortController();const cancelling=cancelled.read(file,{signal:controller.signal});await new Promise(setImmediate);controller.abort();await assert.rejects(cancelling,/cancelled/);assert.equal(cancelled.destroyed(),1);
 const blank=harness({numPages:1,getPage:async()=>({getTextContent:async()=>({items:[]})})});
 await assert.rejects(blank.read(file),/could not be safely extracted/);assert.equal(blank.destroyed(),1);
 const oversized=harness({numPages:26});await assert.rejects(oversized.read(file),/could not be safely extracted/);assert.equal(oversized.destroyed(),1);
 const encrypted=harness(new Promise(()=>{}));const locked=encrypted.read(file);await new Promise(setImmediate);encrypted.password();await assert.rejects(locked,/could not be safely extracted/);assert.equal(encrypted.destroyed(),1);
 console.log('PASS PDF full-extraction deadline, blank/over-limit/encrypted rejection and worker cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
