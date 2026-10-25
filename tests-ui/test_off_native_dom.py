from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).parents[1]/'extension'
mock='''<!doctype html><html data-theme="dark"><head><style>body{background:#191919;color:white;font:14px system-ui;height:100vh;margin:0}.wrap{position:fixed;bottom:45px;left:25%;width:50%;background:#303033;border-radius:20px;padding:12px}form{background:#303033;border:1px solid #515155;border-radius:18px;padding:12px}.ProseMirror{min-height:45px;color:white;outline:0}</style></head><body><div class="wrap"><form id="native"><div class="ProseMirror" contenteditable="true" role="textbox"></div><button type="button" aria-label="Send message">Send</button></form></div></body></html>'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1350,'height':800})
 page.set_content(mock)
 page.evaluate('''() => {
   window.chrome=window.chrome||{};
   if(!crypto.randomUUID)crypto.randomUUID=()=> '00000000-0000-4000-8000-000000000123';
   chrome.runtime={id:'fakeid',getURL:path=>'chrome-extension://fakeid/'+String(path).replace(/^\\//,''),sendMessage:async()=>({ok:true}),onMessage:{addListener:fn=>window.__bridgeListener=fn}};
   window.__privacyShieldAdapter={id:'claude',findComposer:()=>document.querySelector('.ProseMirror'),query:(sels,root=document)=>sels.map(s=>root.querySelector(s)).find(Boolean),queryAll:()=>[],composer:['.ProseMirror'],send:['button[aria-label="Send message"]'],user:[],assistant:[]};
 }''')
 for name in ['session-navigation.js','native-draft.js','content.js']:
  page.add_script_tag(content=(root/'content'/name).read_text())
 page.wait_for_timeout(450)
 private=page.locator('iframe[title="Protected AI composer"]')
 assert private.count()==1,'private composer not installed'
 form=page.locator('#native')
 assert page.evaluate("getComputedStyle(document.querySelector('#native')).opacity")=='0', 'native input should be hidden ON'
 def set_enabled(state):
  return page.evaluate('''async enabled => {
   const frame=document.querySelector('iframe[title="Protected AI composer"]');
   const bridge=new URL(frame.src).searchParams.get('bridge');
   return await new Promise(resolve=>window.__bridgeListener({type:'SET_PROTECTION_ENABLED',enabled,bridge},null,resolve));
  }''',state)
 assert set_enabled(False)['ok']
 assert private.evaluate('(x)=>getComputedStyle(x).display')=='none','private frame must be fully hidden'
 assert form.evaluate('(x)=>getComputedStyle(x).opacity')=='1','normal website composer should be visible'
 mini=page.locator('iframe[title="Turn privacy protection back on"]')
 assert mini.count()==1
 bounds=mini.bounding_box();fb=form.bounding_box()
 assert bounds and fb and bounds['y']+bounds['height']<=fb['y']+3,(bounds,fb)
 page.locator('.ProseMirror').fill('Native editor works when protection is off')
 assert 'Native editor works' in page.locator('.ProseMirror').inner_text()
 assert not set_enabled(True)['ok'],'must not override website text when enabling protection'
 page.locator('.ProseMirror').fill('')
 assert set_enabled(True)['ok']
 assert private.evaluate('(x)=>getComputedStyle(x).display')!='none','private composer should be restored ON'
 assert mini.count()==0
 assert form.evaluate('(x)=>getComputedStyle(x).opacity')=='0','native website editor must be hidden ON'
 print('PASS: Chromium DOM integration: OFF restores normal input and hides extension UI, mini switch above textbox; ON reverses; nonempty native draft protected.')
 browser.close()
