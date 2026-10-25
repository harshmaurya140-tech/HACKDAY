from pathlib import Path
from playwright.sync_api import sync_playwright
frame=(Path(__file__).parent.parent/'extension/private/frame.html').as_uri() + '?mode=composer&site=gemini&theme=dark&viewport=800&bridge=synthetic'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
    page=browser.new_page(viewport={'width':850,'height':650})
    page.add_init_script('''
        window.chrome = window.chrome || {};
        chrome.runtime = chrome.runtime || {};
        chrome.runtime.sendMessage = async (msg) => msg.type === 'RESIZE_FRAME' ? {ok:true,appliedHeight:390} : {ok:true};
    ''')
    from pathlib import Path
    html=Path(__file__).parent.parent.joinpath('extension/private/frame.html').read_text()
    from re import sub
    html=sub(r'<script[^>]*></script>','',html)
    html=sub(r'<link[^>]*stylesheet[^>]*>','',html)
    page.set_content(html)
    page.add_style_tag(content=Path(__file__).parent.parent.joinpath('extension/private/frame.css').read_text())
    page.add_script_tag(content=Path(__file__).parent.parent.joinpath('extension/private/frame.js').read_text())
    page.evaluate('''() => {
      document.documentElement.style.setProperty('--ps-frame-available-height','386px');
      document.getElementById('permission').hidden=false;
      document.getElementById('draft').value='A synthetic private draft';
      const choices=document.getElementById('choices');
      for(let i=0;i<16;i++) choices.append(makeChoice({id:'i'+i,type:'PERSON',text:'Fictional person '+i,reason:'Potentially required',necessary:true}));
    }''')
    page.wait_for_timeout(250)
    dims=page.evaluate('''() => {
      const r=id=>document.getElementById(id).getBoundingClientRect();
      const choices=document.getElementById('choices');
      return {composer:{top:r('composer').top,bottom:r('composer').bottom,height:r('composer').height},
        approve:{top:r('approve').top,bottom:r('approve').bottom},
        choices:{client:choices.clientHeight,scroll:choices.scrollHeight,top:r('choices').top,bottom:r('choices').bottom},
        scrollTop:choices.scrollTop};
    }''')
    assert dims['composer']['height'] <= 386, dims
    assert dims['approve']['bottom'] <= dims['composer']['bottom'], dims
    assert dims['approve']['top'] > dims['choices']['bottom'], dims
    assert dims['choices']['scroll'] > dims['choices']['client'] + 200, dims
    page.locator('#choices').evaluate('(el)=>el.scrollTop = el.scrollHeight')
    page.wait_for_timeout(100)
    dims2=page.evaluate('''() => ({scrollTop:document.getElementById('choices').scrollTop,approvalBottom:document.getElementById('approve').getBoundingClientRect().bottom,composerBottom:document.getElementById('composer').getBoundingClientRect().bottom})''')
    assert dims2['scrollTop']>100 and dims2['approvalBottom']<=dims2['composerBottom'],dims2
    page.screenshot(path='/mnt/data/gemini-consent-v062-smoke.png')
    print('PASS: real Chromium viewport consent panel',dims,dims2)
    browser.close()
