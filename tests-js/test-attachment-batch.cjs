const assert=require('node:assert/strict');
const {readBatch,compose}=require('../extension/private/attachment-batch.js');
(async()=>{
 const file=(name,size=10)=>({name,size});
 const existing=[{name:'PRIVATE_NAME.txt',size:10,text:'Keep edited text',pages:1}];
 const controller=new AbortController();
 let active=0,peak=0;
 const read=async f=>{active++;peak=Math.max(peak,active);await Promise.resolve();active--;return {text:f.name==='a.txt'?'First secret':'Second secret',pages:1};};
 const added=await readBatch([file('a.txt'),file('b.txt')],existing,{read,signal:controller.signal});
 assert.equal(peak,1);assert.equal(added.length,2);assert.equal(existing.length,1);
 const combined=compose('Task',[...existing,...added]);
 assert(combined.includes('Document text (extracted locally) 3:\nSecond secret'));
 assert(!combined.includes('PRIVATE_NAME')&&!combined.includes('a.txt'),'filenames never enter outgoing draft');
 let calls=0;const counted=async()=>{calls++;return {text:'ok'};};
 for(const files of [[file('x.txt',0)],[file('x.txt',9*1024*1024)],[file('x.exe')],Array.from({length:5},()=>file('x.txt')),Array.from({length:4},()=>file('x.txt',8*1024*1024))]){
  await assert.rejects(readBatch(files,existing,{read:counted,signal:controller.signal}));
 }
 assert.equal(calls,0,'limits checked before extraction');
 await assert.rejects(readBatch([file('a.txt')],existing,{read:async()=>({text:'   '}),signal:controller.signal}),/No readable text/);
 await assert.rejects(readBatch([file('a.txt')],existing,{read:async()=>({text:'x'.repeat(12000)}),signal:controller.signal}),/12,000/);
 let started=0;const cancelled=new AbortController();
 await assert.rejects(readBatch([file('a.txt'),file('b.txt')],existing,{signal:cancelled.signal,read:async()=>{started++;cancelled.abort();return {text:'late data'};}}));
 assert.equal(started,1,'abort prevents starting next file and rejects late result');
 await assert.rejects(readBatch([file('a.txt'),file('b.txt')],existing,{signal:controller.signal,read:async f=>{if(f.name==='b.txt')throw Error('malformed');return {text:'valid'};}}),/malformed/);
 assert.deepEqual(existing,[{name:'PRIVATE_NAME.txt',size:10,text:'Keep edited text',pages:1}],'failure never mutates existing selection');
 console.log('PASS attachment batch limits, sequential extraction, abort, atomic failure and private filenames');
})().catch(e=>{console.error(e);process.exitCode=1;});
