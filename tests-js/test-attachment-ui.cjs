const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const html=fs.readFileSync(path.join(__dirname,'../extension/private/frame.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  await page.route('https://fixture.invalid/**',r=>r.fulfill({contentType:'text/html',body:html}));
  await page.goto('https://fixture.invalid/?mode=composer');
  await page.evaluate(()=>{
   window.calls=[];window.LocalPrivacyAI={availability:async()=> 'available',analyze:async text=>{window.analyzed=text;return {entities:[]};}};
   window.chrome={runtime:{sendMessage:async p=>{
    window.calls.push(p.type);
    if(p.type==='ANALYZE')return {ok:true,draft_id:'d',entities:[]};
    if(p.type==='PREVIEW')return {ok:true,previewId:'p',sanitized_text:'reviewed'};
    return {ok:true};
   }}};
  });
  await page.addScriptTag({path:path.join(__dirname,'../extension/private/attachment-batch.js')});
  await page.evaluate(()=>{
   const real=IncognixAttachments.readBatch;
   IncognixAttachments.readBatch=(files,existing,options)=>real(files,existing,{...options,read:async file=>{
    if(file.name==='slow.txt')await new Promise(resolve=>window.finishRead=resolve);
    if(file.name==='bad.txt')throw Error('Unreadable');
    return {text:await file.text(),pages:1};
   }});
  });
  await page.addScriptTag({path:path.join(__dirname,'../extension/private/frame.js')});
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Browser-local protection active');
  const file=(name,text)=>({name,mimeType:'text/plain',buffer:Buffer.from(text)});
  await page.locator('#attachment-file').setInputFiles(file('private.txt','Retained secret'));
  await page.locator('#attachment-info').filter({hasText:'1 file(s)'}).waitFor();
  await page.locator('#extracted-text').fill('Edited secret');
  await page.locator('#attachment-file').setInputFiles([file('slow.txt','Late secret'),file('next.txt','Never start')]);
  await page.waitForFunction(()=>Boolean(window.finishRead));
  assert.equal(await page.locator('#send').isDisabled(),true);
  assert.equal(await page.locator('#extracted-text').isDisabled(),true);
  await page.locator('#cancel-document').click();
  await page.evaluate(()=>window.finishRead());
  await page.locator('#status').filter({hasText:'Reading cancelled'}).waitFor();
  assert.equal(await page.locator('#attachment-select option').count(),1);
  assert.equal(await page.locator('#extracted-text').inputValue(),'Edited secret');
  assert.equal(await page.locator('#send').isEnabled(),true);
  await page.locator('#attachment-file').setInputFiles([file('good.txt','Uncommitted'),file('bad.txt','Bad')]);
  await page.locator('#status').filter({hasText:'Document not attached'}).waitFor();
  assert.equal(await page.locator('#attachment-select option').count(),1);
  await page.locator('#attachment-file').setInputFiles([file('second.txt','Second secret'),file('third.txt','Third secret')]);
  await page.locator('#attachment-info').filter({hasText:'3 file(s)'}).waitFor();
  await page.locator('#attachment-select').selectOption('2');await page.locator('#remove-attachment').click();
  await page.locator('#draft').fill('Task');await page.locator('#send').click();
  await page.locator('#preview').waitFor({state:'visible'});
  const analyzed=await page.evaluate(()=>window.analyzed);
  assert(analyzed.includes('Edited secret')&&analyzed.includes('Second secret'));
  assert(!analyzed.includes('Third secret')&&!analyzed.includes('Late secret')&&!analyzed.includes('private.txt'));
  assert.equal(await page.evaluate(()=>window.calls.includes('PREPARE_AND_SEND')),false);
  await page.locator('#preview-cancel').click();
  await page.locator('#attachment-file').setInputFiles(file('slow.txt','x'.repeat(2000)));
  await page.waitForFunction(()=>!document.querySelector('#cancel-document').hidden);
  await page.locator('#draft').fill('x'.repeat(11000));
  await page.evaluate(()=>window.finishRead());
  await page.locator('#status').filter({hasText:'12,000'}).waitFor();
  assert.equal(await page.locator('#attachment-select option').count(),2,'prompt edit during reading cannot commit over-limit files');
  console.log('PASS multi-attachment UI: late cancellation, atomic failure, retained edits, removal, review and draft-change budget');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
