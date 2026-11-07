// Minimal fixtures derived from signed-in DOM inspection on 2026-10-26.
// Actual model inference and provider behavior are separate live checks.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    for(const host of ['chatgpt.com','gemini.google.com']){
      await page.route(`https://${host}/**`,r=>r.fulfill({contentType:'text/html',body:host==='chatgpt.com'?`
        <div data-chatgpt-search-unit-key="turn:user"><div data-user-message-bubble="true">Hello [PRIVATE_PERSON_1_AABBCC]</div><button>Copy message</button></div>
        <div data-chatgpt-search-unit-key="turn:assistant"><div data-markdown-text-style="assistant-message"><div data-oai-writing-block-surface><button>Copy</button><div class="writing-block-editor"><div class="ProseMirror" role="textbox" contenteditable="true">Hello [PRIVATE_PERSON_1_AABBCC]</div></div></div></div></div>
        <form><div id="prompt-textarea" contenteditable="true" role="textbox">Chat composer</div></form>`:`
        <user-query><div class="query-text"><h5 class="cdk-visually-hidden">You said Hello [P…</h5><p>Hello [PRIVATE_PERSON_1_AABBCC]</p><p>Second line</p></div><button>Copy prompt</button></user-query>`}));
      await page.goto(`https://${host}/`);
      await page.addScriptTag({path:path.resolve('extension/content/adapters.js')});
      const result=await page.evaluate(()=>{
        const a=window.__privacyShieldAdapter,u=a.queryAll(a.user)[0],answer=a.queryAll(a.assistant)[0];
        return {user:a.extractMessageText(u,'user'),assistant:answer&&a.extractMessageText(answer),anchor:answer&&a.messageAnchor(answer).getAttribute('data-chatgpt-search-unit-key'),composer:a.findComposer()?.id};
      });
      if(host==='chatgpt.com'){
        assert.equal(result.user,'Hello [PRIVATE_PERSON_1_AABBCC]');
        assert.equal(result.assistant,'Hello [PRIVATE_PERSON_1_AABBCC]');
        assert.equal(result.anchor,'turn:assistant');
        assert.equal(result.composer,'prompt-textarea');
        await page.locator('form').evaluate(el=>el.remove());
        assert.equal(await page.evaluate(()=>window.__privacyShieldAdapter.findComposer()),null,'Writing editor must not become the composer when chat editor disappears');
      }else assert.equal(result.user,'Hello [PRIVATE_PERSON_1_AABBCC]\n\nSecond line');
    }
    console.log('PASS: observed ChatGPT message markup, Writing exclusion, and Gemini duplicate heading removal');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
