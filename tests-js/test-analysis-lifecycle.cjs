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
   window.calls=[];window.runs=[];window.disposed=0;
   window.IncognixNER={dispose(){window.disposed++;}};
   window.LocalPrivacyAI={availability:async()=> 'available',analyze:(_text,opts)=>new Promise(resolve=>window.runs.push({opts,resolve}))};
   window.chrome={runtime:{sendMessage:async p=>{
    window.calls.push(p.type);
    if(p.type==='ANALYZE')return {ok:true,draft_id:'d',entities:[]};
    if(p.type==='PREVIEW')return {ok:true,previewId:'p',sanitized_text:'Masked synthetic text'};
    return {ok:true};
   }}};
  });
  await page.addScriptTag({path:path.join(__dirname,'../extension/private/frame.js')});
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Browser-local protection active');
  await page.locator('#draft').fill('Keep this private draft');
  await page.locator('#send').click();
  await page.locator('#cancel-analysis').click();
  assert.equal(await page.evaluate(()=>window.runs[0].opts.signal.aborted),true);
  await page.evaluate(()=>{window.runs[0].opts.onStatus('Late progress');window.runs[0].resolve({entities:[]});});
  await page.waitForFunction(()=>!document.querySelector('#send').disabled);
  assert.match(await page.locator('#status').textContent(),/Analysis cancelled/);
  assert.equal(await page.locator('#draft').inputValue(),'Keep this private draft');
  assert.equal(await page.evaluate(()=>window.calls.includes('ANALYZE')),false,'cancelled result cannot enter privacy preparation');
  assert.equal(await page.locator('#preview').isVisible(),false);
  await page.locator('#send').click();
  await page.evaluate(()=>{window.runs[0].opts.onStatus('Old run progress');window.runs[1].resolve({entities:[]});});
  await page.locator('#preview').waitFor({state:'visible'});
  const reviewed=await page.locator('#status').textContent();
  await page.evaluate(()=>{document.querySelector('#cancel-analysis').click();window.runs[1].opts.onStatus('Late completed progress');});
  assert.equal(await page.locator('#status').textContent(),reviewed,'late cancel/progress must not overwrite review');
  assert.equal(await page.evaluate(()=>window.runs[1].opts.signal.aborted),false,'completed model is not aborted');
  assert.equal(await page.evaluate(()=>window.disposed),1,'late click must not dispose another model');
  assert.equal(await page.locator('#outgoing').inputValue(),'Masked synthetic text');
  assert.equal(await page.evaluate(()=>window.calls.includes('PREPARE_AND_SEND')),false,'review is not submission');
  console.log('PASS analysis cancellation, late completion/progress suppression, draft retention and completed-review ownership');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
