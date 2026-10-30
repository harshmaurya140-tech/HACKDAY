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
  await page.goto('https://fixture.invalid/?mode=response&messageId=test');
  await page.evaluate(()=>{
   window.result={text:'Hello Nora Vale.',unresolved:false};window.copied=[];window.denyCopy=false;
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
  await page.evaluate(()=>{window.result={text:'[PRIVATE_PERSON_1_AAAAAA]',unresolved:true};window.postMessage({type:'PRIVACY_SHIELD_SOURCE_UPDATED',messageId:'test'},'*');});
  await page.locator('#copy-restored').waitFor({state:'hidden'});
  assert.equal(await page.locator('#restored-text').textContent(),'');
  assert.equal(await page.evaluate(()=>window.copied.length),1);
  console.log('PASS private response copy, clipboard rejection and unresolved mapping exclusion (mocked bridge/clipboard)');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
