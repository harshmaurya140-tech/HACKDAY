from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).parents[1]/'extension/private'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--allow-file-access-from-files'])
 page=browser.new_page(viewport={'width':158,'height':40})
 from re import sub
 html=(root/'frame.html').read_text()
 html=sub(r'<script[^>]*></script>','',html)
 html=sub(r'<link[^>]*stylesheet[^>]*>','',html)
 page.set_content(html)
 page.add_style_tag(content=(root/'frame.css').read_text())
 page.evaluate('''() => {window.chrome={runtime:{sendMessage:async x=>{window.sent=x;return {ok:true}}}};}''')
 framejs=(root/'frame.js').read_text().replace('new URLSearchParams(location.search)',"new URLSearchParams('?mode=off-toggle&bridge=00000000-0000-4000-8000-000000000123&theme=dark&site=claude')")
 page.add_script_tag(content=framejs)

 button=page.locator('#reenable-protection');button.wait_for()
 assert button.is_visible()
 assert page.locator('#composer').is_hidden()
 box=button.bounding_box(); assert box and box['height']<40 and box['width']<=158,box
 page.screenshot(path='/mnt/data/incognix-v071/off-toggle-pill.png')
 button.click()
 assert page.evaluate("window.sent?.type")=='SET_PROTECTION_ENABLED'
 assert page.evaluate('window.sent?.enabled') is True
 print('PASS: standalone extension-origin OFF switch renders in 158x40, requests protected ON state, no native draft in frame.')
 browser.close()
