const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'../extension/content/adapters.js'),'utf8');
const ctx={window:{},location:{hostname:'claude.ai'}};vm.createContext(ctx);vm.runInContext(script,ctx);
const adapter=ctx.window.__privacyShieldAdapter;
const aiLine='Phone number was not provided, so I left it out of the letter. Please review the document.';
assert.equal(adapter.extractMessageText({innerText:aiLine+'\uE06CCreate a doc\uE056'},'assistant'),aiLine);
assert.equal(adapter.extractMessageText({innerText:aiLine+'\nCreate a doc'},'assistant'),aiLine+'\nCreate a doc','without structural proof do not strip possible AI prose');
assert.equal(adapter.extractMessageText({innerText:'Please create a doc with the summary.'},'assistant'),'Please create a doc with the summary.');
console.log('PASS: private-use Claude action controls removed without changing AI-written sentences');

// Real DOM: innerText includes aria-hidden icon-font characters.
(async()=>{
 const {chromium}=require('playwright');const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.route('https://claude.ai/**',r=>r.fulfill({contentType:'text/html',body:'<main id="answer"></main>'}));
  await page.goto('https://claude.ai/');await page.addScriptTag({content:script});
  const cases=await page.evaluate(()=>{
   const node=document.querySelector('#answer'),a=window.__privacyShieldAdapter;
   const extract=(body,role='assistant')=>{node.innerHTML=body;return a.extractMessageText(node,role);};
   const icon='<span data-cds="Icon" aria-hidden="true">\uE056</span>';
   return {
    plain:extract('<p>Best regards</p>'+icon),
    leading:extract(icon+'<p>Literal symbol: \uE056</p>'),
    literal:extract('<p>Literal symbol: \uE056</p>'),
    both:extract('<p>Literal symbol: \uE056</p>'+icon),
    other:extract('<p>Best regards</p><span aria-hidden="true">\uE056</span>'),
    user:extract('<p>User symbol \uE056</p>','user'),
    prose:extract('<p>Create a doc</p>'+icon),
    streaming:extract('<p>Hello [PRIVATE_PERSON_1_AAAAAA]</p>'+icon)
   };
  });
  assert.equal(cases.plain,'Best regards');
  assert(cases.leading.endsWith('Literal symbol: \uE056'));
  assert.equal(cases.literal,'Literal symbol: \uE056');
  assert.equal(cases.both,'Literal symbol: \uE056');
  assert(cases.other.endsWith('\uE056'));
  assert.equal(cases.user,'User symbol \uE056');
  assert.equal(cases.prose,'Create a doc');
  assert.equal(cases.streaming,'Hello [PRIVATE_PERSON_1_AAAAAA]');
  console.log('PASS real Claude DOM hidden icon removal, literal symbols and user text preserved');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
