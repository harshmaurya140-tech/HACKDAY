const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
assert(fs.readFileSync(path.join(__dirname,'../extension/content/content.js'),'utf8').includes("f.allow='language-model; clipboard-write'"),'embedded copy needs write-only clipboard delegation');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const html=fs.readFileSync(path.join(__dirname,'../extension/private/frame.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  await page.route('https://fixture.invalid/**',r=>r.fulfill({contentType:'text/html',body:html}));
  await page.goto('https://fixture.invalid/?mode=response&messageId=test');
  await page.evaluate(()=>{
   window.result={text:'Hello Nora Vale.',unresolved:false};window.copied=[];window.denyCopy=false;window.legacyCopy=false;
   window.realExecCommand=document.execCommand.bind(document);window.realClipboard=navigator.clipboard;
   document.execCommand=command=>{if(!window.legacyCopy)return false;if(command==='copy')window.copied.push(document.activeElement.value);return true;};
   window.chrome={runtime:{sendMessage:async p=>p.type==='RESTORE_MESSAGE'?window.result:{ok:true}}};
   Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(window.denyCopy)throw Error('denied');window.copied.push(text);}}});
  });
  await page.addScriptTag({path:path.join(__dirname,'../extension/private/frame.js')});
  await page.locator('#copy-restored').click();
  assert.deepEqual(await page.evaluate(()=>window.copied),['Hello Nora Vale.']);
  assert.equal(await page.locator('#copy-status').textContent(),'Copied');
  await page.evaluate(()=>{window.denyCopy=true;});
  await page.locator('#copy-restored').click();
  assert.match(await page.locator('#copy-status').textContent(),/Copy unavailable/);
  await page.evaluate(()=>{window.legacyCopy=true;});
  await page.locator('#copy-restored').click();
  assert.equal(await page.locator('#copy-status').textContent(),'Copied');
  assert.deepEqual(await page.evaluate(()=>window.copied),['Hello Nora Vale.','Hello Nora Vale.']);
  assert.equal(await page.locator('textarea[aria-hidden=true]').count(),0);
  await page.context().grantPermissions(['clipboard-read'],{origin:'https://fixture.invalid'});
  await page.evaluate(()=>{document.execCommand=window.realExecCommand;});
  await page.locator('#copy-restored').click();
  assert.equal(await page.evaluate(()=>window.realClipboard.readText()),'Hello Nora Vale.','real browser clipboard contains the restored text');
  console.log('PASS real Chromium copy-command clipboard round trip');
  // Real response-header policy, not a mocked policy object. Both failure and
  // successful legacy-copy paths must avoid the forbidden async API entirely.
  const blocked=await browser.newPage();const policyErrors=[];
  blocked.on('console',m=>{if(/permissions policy violation/i.test(m.text()))policyErrors.push(m.text());});
  await blocked.route('https://blocked.invalid/**',r=>r.fulfill({contentType:'text/html',headers:{'Permissions-Policy':'clipboard-write=()'},body:html}));
  await blocked.goto('https://blocked.invalid/?mode=response&messageId=test');
  await blocked.evaluate(()=>{
    window.asyncCalls=0;window.legacyCopy=false;
    document.execCommand=()=>window.legacyCopy;
    window.chrome={runtime:{sendMessage:async p=>p.type==='RESTORE_MESSAGE'?{text:'Private synthetic answer',unresolved:false}:{ok:true}}};
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{window.asyncCalls++;throw Error('must not be called');}}});
  });
  await blocked.addScriptTag({path:path.join(__dirname,'../extension/private/frame.js')});
  await blocked.locator('#copy-restored').click();
  assert.match(await blocked.locator('#copy-status').textContent(),/Copy unavailable/);
  assert.equal(await blocked.evaluate(()=>window.asyncCalls),0);
  assert.equal(await blocked.locator('textarea[aria-hidden=true]').count(),0);
  await blocked.evaluate(()=>{window.legacyCopy=true;});
  await blocked.locator('#copy-restored').click();
  assert.equal(await blocked.locator('#copy-status').textContent(),'Copied');
  assert.equal(await blocked.evaluate(()=>window.asyncCalls),0);
  assert.deepEqual(policyErrors,[]);
  await blocked.close();
  console.log('PASS real clipboard-denying policy skips async API without violation logs');

  await page.evaluate(()=>{window.result={text:'[PRIVATE_PERSON_1_AAAAAA]',unresolved:true};window.postMessage({type:'PRIVACY_SHIELD_SOURCE_UPDATED',messageId:'test'},'*');});
  await page.locator('#copy-restored').waitFor({state:'hidden'});
  assert.equal(await page.locator('#restored-text').textContent(),'');
  assert.equal(await page.evaluate(()=>window.copied.length),2);
  console.log('PASS private response copy, clipboard rejection and unresolved mapping exclusion (mocked bridge/clipboard)');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
