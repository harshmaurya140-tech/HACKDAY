const {chromium}=require('playwright');
const {PDFDocument,StandardFonts}=require('pdf-lib');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const ext=process.env.INCOGNIX_EXTENSION||path.resolve('extension');
 fs.mkdirSync('artifacts',{recursive:true});
 fs.rmSync('artifacts/browser-evidence.json',{force:true});
 const context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
 try{
 const service=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const origin=service.url().split('/').slice(0,3).join('/');
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const external=[];page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
 page.on('pageerror',e=>console.error('PAGE ERROR',e.name,e.message,e.stack));
 await context.route(/^https?:/,route=>route.abort());
 await page.goto(origin+'/private/workspace.html');
 await page.locator('#analyze').waitFor();

 const rejectedDocuments=await page.evaluate(async()=>{
  const {readDocument}=await import('./documents.mjs');
  const blank=await PDFLib.PDFDocument.create();blank.addPage();
  const many=await PDFLib.PDFDocument.create();for(let i=0;i<26;i++)many.addPage();
  const fixtures=[new File([new Uint8Array([255])],'bad.txt'),new File(['a\0b'],'nul.csv'),new File(['%PDF-invalid'],'broken.pdf'),new File(['binary'],'private.docx'),new File([await blank.save()],'scan.pdf'),new File([await many.save()],'too-many.pdf')];
  let rejected=0;for(const file of fixtures){try{await readDocument(file);}catch{rejected++;}}
  return rejected;
 });
 assert.equal(rejectedDocuments,6,'unsupported/malformed documents must fail closed');
 console.log('PASS six real browser document rejection cases');
 const started=Date.now();
 const ner=await page.evaluate(()=>IncognixNER.extract('Sarah Johnson works at Microsoft in London.'));
 assert(ner.some(e=>e.type==='PERSON'&&e.text.includes('Sarah')),'real NER must identify unseen synthetic name');
 assert(ner.some(e=>e.text.includes('London')),'real NER must identify location');
 const nerStartupMs=Date.now()-started;
 console.log('PASS real bundled ONNX/WASM inference',nerStartupMs,'ms',ner.map(e=>e.type));
 const late=await page.evaluate(()=>{const text='This is an ordinary sentence. '.repeat(130)+'Emily Carter lives in Paris.';return IncognixNER.extract(text);});
 assert(late.some(e=>e.text.includes('Emily')),'no silent long-input truncation');
 const doc=await PDFDocument.create();const pdfpage=doc.addPage();const font=await doc.embedFont(StandardFonts.Helvetica);
 pdfpage.drawText('Employee Nora Vale. Contact canary@example.org',{x:40,y:700,font,size:12});doc.setTitle('PRIVATE_METADATA_CANARY');
 const bytes=await doc.save();
 await page.evaluate(()=>{window.originalFileRead=File.prototype.arrayBuffer;File.prototype.arrayBuffer=async function(){await new Promise(r=>setTimeout(r,250));return window.originalFileRead.call(this);};});
 await page.locator('#file').setInputFiles({name:'PRIVATE_FILENAME.pdf',mimeType:'application/pdf',buffer:Buffer.from(bytes)});
 await page.locator('#draft').fill('Typing while the document loads');
 await page.locator('#document-info').filter({hasText:'Text extract only'}).waitFor().catch(async e=>{throw Error((await page.locator('#document-info').textContent())+' '+e.message);});
 assert(!(await page.locator('#document-info').textContent()).includes('PRIVATE_FILENAME'));
 await page.evaluate(()=>{File.prototype.arrayBuffer=window.originalFileRead;delete window.originalFileRead;});
 // Chrome semantic inference is unavailable in this isolated profile. Mock only
 // that API for deterministic UI review; the worker above used actual weights.
 await page.evaluate(()=>{LocalPrivacyAI.analyze=async text=>({entities:[...text.matchAll(/Nora Vale|canary@example.org/g)].map(m=>({type:m[0].includes('@')?'EMAIL':'PERSON',start:m.index,end:m.index+m[0].length,text:m[0],necessary:false}))});});
 await page.locator('#draft').fill('Summarize this report.');await page.locator('#analyze').click();
 await page.locator('#outgoing').filter({visible:true}).waitFor();
 await page.waitForFunction(()=>document.querySelector('#outgoing').value.includes('[PRIVATE_'));
 const outgoing=await page.locator('#outgoing').inputValue();
 assert(!outgoing.includes('Nora Vale')&&!outgoing.includes('canary@example.org')&&!outgoing.includes('PRIVATE_METADATA_CANARY'));
 assert(await page.locator('#pdf').isDisabled());await page.locator('#reviewed').check();
 const downloadPromise=page.waitForEvent('download');await page.locator('#pdf').click();const download=await downloadPromise;
 const file=await download.path();const rebuilt=fs.readFileSync(file);
 const extracted=await page.evaluate(async bytes=>{const mod=await import('./documents.mjs');return mod.extractGeneratedPDF(new Uint8Array(bytes));},Array.from(rebuilt));
 assert(!extracted.includes('Nora Vale')&&!extracted.includes('canary@example.org'));
 const reopened=await PDFDocument.load(rebuilt);assert.equal(reopened.getTitle(),'Reviewed text');
 assert(!rebuilt.includes(Buffer.from('PRIVATE_METADATA_CANARY')));
 await page.locator('#answer').fill(outgoing);await page.locator('#restore').click();assert((await page.locator('#restored').textContent()).includes('Nora Vale'));
 await page.locator('#draft').fill('Changed draft');assert(await page.locator('#copy').isDisabled());assert.equal(await page.locator('#outgoing').inputValue(),'');
 assert.equal(external.length,0,'workspace and real NER make no external requests');
 await page.screenshot({path:'artifacts/workspace.png',fullPage:true});

 console.log('PASS PDF extraction, sanitized reconstruction, preview consent, local restoration, stale-preview invalidation and external network guard');
 const redactor=await context.newPage();redactor.setDefaultTimeout(20000);redactor.on('pageerror',e=>console.error('REDACTOR',e.message));
 const redactorExternal=[];redactor.on('request',r=>{if(/^https?:/.test(r.url()))redactorExternal.push(r.url());});
 await redactor.goto(origin+'/private/redactor.html');
 await redactor.locator('#source').setInputFiles({name:'private.pdf',mimeType:'application/pdf',buffer:Buffer.from(bytes)});
 await redactor.locator('#status').filter({hasText:'Drag to remove'}).waitFor();
 const canvas=redactor.locator('#pages canvas').first();
 const ocr=await redactor.evaluate(async()=>{const {recognize}=await import('./ocr.mjs');return recognize(document.querySelector('#pages canvas'));});
 assert(ocr.text.includes('Nora')&&ocr.words.length>3,'actual local OCR must read rasterized synthetic text');
 console.log('PASS real bundled English OCR',ocr.words.length,'words');
 await canvas.evaluate(e=>e.scrollIntoView({block:'start'}));
 const bounds=await canvas.boundingBox();
 await redactor.mouse.move(bounds.x+25,bounds.y+110);await redactor.mouse.down();await redactor.mouse.move(bounds.x+bounds.width-20,bounds.y+180);await redactor.mouse.up();
 // Verify a partial selection survives export while pixels outside it remain.
 await redactor.locator('#pages input[type=checkbox]').check();
 const partialPromise=redactor.waitForEvent('download');await redactor.locator('#export').click();
 const partialBytes=fs.readFileSync(await (await partialPromise).path());
 const partial=await redactor.evaluate(async array=>{
  const pdf=await import('./vendor/pdf/pdf.mjs');const task=pdf.getDocument({data:new Uint8Array(array),isEvalSupported:false});
  try{const doc=await task.promise,p=await doc.getPage(1),v=p.getViewport({scale:1.5}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;
   await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;
   const original=document.querySelector('#pages canvas'),b=original.getBoundingClientRect();
   const x=Math.round(50*original.width/b.width),y=Math.round(140*original.height/b.height);
   return {inside:[...c.getContext('2d').getImageData(x,y,1,1).data],outside:[...c.getContext('2d').getImageData(2,2,1,1).data],text:(await p.getTextContent()).items.map(x=>x.str).join('')};
  }finally{await task.destroy();}
 },Array.from(partialBytes));
 assert.deepEqual(partial.inside,[0,0,0,255]);assert.deepEqual(partial.outside,[255,255,255,255]);assert.equal(partial.text,'');
 console.log('PASS partial-region raster export preserves outside pixels and removes the text layer');
 // Also exercise a keyboard-operable full-page redaction path.
 await redactor.getByRole('button',{name:'Redact entire page'}).click();
 await redactor.locator('#pages input[type=checkbox]').check();
 const rasterDownloadPromise=redactor.waitForEvent('download');await redactor.locator('#export').click();const rasterDownload=await rasterDownloadPromise;
 const rasterBytes=fs.readFileSync(await rasterDownload.path());
 const rasterResult=await redactor.evaluate(async array=>{
  const pdf=await import('./vendor/pdf/pdf.mjs');const task=pdf.getDocument({data:new Uint8Array(array),isEvalSupported:false});
  try{const doc=await task.promise,page=await doc.getPage(1),text=(await page.getTextContent()).items.map(x=>x.str).join('');
   const view=page.getViewport({scale:1}),c=document.createElement('canvas');c.width=view.width;c.height=view.height;await page.render({canvasContext:c.getContext('2d'),viewport:view}).promise;
   return {text,pixel:[...c.getContext('2d').getImageData(100,100,1,1).data],attachments:await doc.getAttachments()};
  }finally{await task.destroy();}
 },Array.from(rasterBytes));
 assert.equal(rasterResult.text,'');assert.deepEqual(rasterResult.pixel,[0,0,0,255]);assert.equal(rasterResult.attachments,null);
 assert(!rasterBytes.includes(Buffer.from('PRIVATE_METADATA_CANARY')));assert.equal(redactorExternal.length,0);
 await redactor.screenshot({path:'artifacts/redactor.png',fullPage:true});await redactor.close();
 console.log('PASS raster PDF rebuild: flattened black pixels, no recoverable text/attachments, local OCR network guard');
 const sites=[
  {url:'https://chatgpt.com/c/fixture',editor:'<textarea id="prompt-textarea"></textarea>',button:'id="composer-submit-button"'},
  {url:'https://claude.ai/chat/fixture',editor:'<div class="ProseMirror" contenteditable="true" role="textbox"></div>',button:'aria-label="Send message"'},
  {url:'https://gemini.google.com/app/fixture',editor:'<rich-textarea><div class="ql-editor" contenteditable="true"></div></rich-textarea>',button:'class="send-button"'}
 ];
 for(const site of sites){
  const host=await context.newPage();host.setDefaultTimeout(15000);
  await host.route(site.url,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html><body><div style="max-width:700px;margin:80px auto"><section id="native-shell" style="border-radius:24px;padding:16px;background:#eee"><form>${site.editor}<button type="button" ${site.button}>Send</button></form><div id="native-tools">Attach · Voice</div></section></div><script>window.sent=[];document.querySelector('button').onclick=()=>{const e=document.querySelector('textarea,[contenteditable]');window.sent.push(e.value??e.innerText);if(e.tagName==='TEXTAREA')e.value='';else e.textContent='';};</script></body></html>`}));
  await host.goto(site.url);
  const frame=host.frameLocator('iframe[title="Protected AI composer"]');await frame.locator('#draft').waitFor();
  assert.equal(await host.locator('#native-shell').evaluate(e=>getComputedStyle(e).opacity),'0','whole composer shell including native toolbar must be hidden');
  const privateFrame=host.frames().find(f=>f.url().includes('mode=composer'));
  await privateFrame.evaluate(()=>{LocalPrivacyAI.analyze=async text=>{await new Promise(r=>setTimeout(r,100));return {entities:[]};};});
  await frame.locator('#draft').fill('Write to canary@example.org');
  assert(!(await host.locator('body').textContent()).includes('canary@example.org'));
  await frame.locator('#protection-toggle').click();
  await host.locator('iframe[title="Protected AI composer"]').waitFor({state:'hidden'});
  const native=host.locator('textarea,[contenteditable]').first();await native.fill('unrelated native draft');
  const off=host.frameLocator('iframe[title="Turn privacy protection back on"]');await off.locator('#reenable-protection').click();
  assert.equal(await native.evaluate(e=>e.value??e.innerText),'unrelated native draft');
  await native.fill('');await off.locator('#reenable-protection').click();
  await frame.locator('#draft').waitFor();assert.equal(await frame.locator('#draft').inputValue(),'Write to canary@example.org');
  await frame.locator('#send').click();await frame.locator('#preview').waitFor({state:'visible'});
  assert.equal((await host.evaluate(()=>window.sent)).length,0,'preview is mandatory');
  assert(!(await frame.locator('#outgoing').inputValue()).includes('canary@example.org'));
  await frame.locator('#confirm-send').click();
  await frame.locator('#status').filter({hasText:'Sanitized prompt handed'}).waitFor().catch(async e=>{throw Error((await frame.locator('#status').textContent())+'; native='+JSON.stringify(await native.evaluate(e=>e.value??e.innerText))+'; '+e.message);});
  assert.equal((await host.evaluate(()=>window.sent)).length,1);
  assert(!(await host.evaluate(()=>window.sent[0])).includes('canary@example.org'));
  await frame.locator('#draft').fill('Old draft');await frame.locator('#send').click();await frame.locator('#draft').fill('Revised draft');
  await frame.locator('#status').filter({hasText:'Draft changed'}).waitFor();
  assert.equal((await host.evaluate(()=>window.sent)).length,1,'stale analysis must not send');
  assert(!(await host.locator('body').textContent()).includes('canary@example.org'));
  console.log('PASS installed extension fixture: preview, send, OFF/ON, private draft isolation, stale analysis',new URL(site.url).host);
  // Attach directly inside the protected composer; original bytes/name stay private.
  await frame.locator('#draft').fill('Summarize the attached report.');
  await frame.locator('#attachment-file').setInputFiles({name:'PRIVATE_FILENAME.pdf',mimeType:'application/pdf',buffer:Buffer.from(bytes)});
  await frame.locator('#attachment-info').filter({hasText:'Document attached'}).waitFor();
  assert(!(await host.locator('body').textContent()).includes('canary@example.org'));
  await frame.locator('#send').click();await frame.locator('#preview').waitFor({state:'visible'});
  const pdfPreview=await frame.locator('#outgoing').inputValue();
  assert(pdfPreview.includes('Document text (extracted locally)'));
  assert(!pdfPreview.includes('canary@example.org')&&!pdfPreview.includes('PRIVATE_FILENAME'));
  await frame.locator('#confirm-send').click();await frame.locator('#status').filter({hasText:'Sanitized prompt handed'}).waitFor().catch(async e=>{throw Error((await frame.locator('#status').textContent())+'; native='+JSON.stringify(await native.evaluate(e=>e.value??e.innerText))+'; '+e.message);});
  assert.equal((await host.evaluate(()=>window.sent)).length,2);
  assert.equal(await frame.locator('#attachment-info').isVisible(),false);
  // Real image OCR inside the private attachment flow (semantic stage mocked).
  const imageData=await privateFrame.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=150;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,900,150);x.fillStyle='black';x.font='32px Arial';x.fillText('Contact: image.canary@example.org',25,80);return c.toDataURL('image/png').split(',')[1];});
  await frame.locator('#attachment-file').setInputFiles({name:'private-image.png',mimeType:'image/png',buffer:Buffer.from(imageData,'base64')});
  await frame.locator('#attachment-info').filter({hasText:'Image text ready'}).waitFor({timeout:90000});
  assert((await frame.locator('#extracted-text').inputValue()).includes('image.canary@example.org'));
  assert(!(await host.locator('body').textContent()).includes('image.canary@example.org'));
  await frame.locator('#send').click();await frame.locator('#preview').waitFor({state:'visible'});
  assert(!(await frame.locator('#outgoing').inputValue()).includes('image.canary@example.org'));
  await frame.locator('#preview-cancel').click();
  await frame.locator('#remove-attachment').click();
  // Idle editor should fit a short native-style input, rather than a dashboard.
  const bounds=await host.locator('iframe[title="Protected AI composer"]').boundingBox();
  assert(bounds.height<190,'idle protected composer must remain compact');
  await host.screenshot({path:'artifacts/composer-'+new URL(site.url).hostname+'.png'});
  await frame.locator('#attachment-file').setInputFiles({name:'broken.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-invalid')});
  await frame.locator('#status').filter({hasText:'Document not attached'}).waitFor();
  assert.equal((await host.evaluate(()=>window.sent)).length,2,'failed PDF must not auto-send');
  console.log('PASS image OCR/private preview, PDF review/send, invalid PDF rejection and full-shell compact layout',new URL(site.url).host);
  await host.setViewportSize({width:420,height:500});
  await host.evaluate(()=>{const f=document.querySelector('iframe[title="Protected AI composer"]');Object.assign(f.parentElement.style,{position:'fixed',bottom:'12px',left:'10px',width:'400px',margin:'0'});});
  await host.waitForTimeout(150);
  const compact=await host.locator('iframe[title="Protected AI composer"]').boundingBox();
  assert(compact.y>=0&&compact.y+compact.height<=500,'fixed-bottom input remains within a small viewport');
  await host.close();
 }

 fs.writeFileSync('artifacts/browser-evidence.json',JSON.stringify({browser:context.browser().version(),nerStartupMs,realNER:true,realEnglishOCR:true,semanticInference:'mocked for UI; live Chrome acceptance outstanding',pdf:'text reconstruction and raster output reopened and checked',providerFixtures:sites.map(s=>s.url),externalWorkspaceRequests:external.length,externalRedactorRequests:redactorExternal.length,completedAt:new Date().toISOString()},null,2));
 }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
