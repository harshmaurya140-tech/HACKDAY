const status=document.getElementById('status'),enable=document.getElementById('enable');
let active;
(async()=>{
  [active]=await chrome.tabs.query({active:true,currentWindow:true});
  const u=new URL(active?.url||'about:blank');
  document.getElementById('site').textContent=u.hostname||'Open an HTTPS chatbot';
  if(u.protocol!=='https:'){status.textContent='Open an HTTPS AI chat website first.';return;}
  enable.disabled=false;
  try{const result=await chrome.tabs.sendMessage(active.id,{type:'INCOGNIX_STATUS'});
    if(result?.installed){status.textContent=result.enabled?'Protected composer active. Attach, paste or drop an image or PDF.':'Protection is OFF. Use the switch beside the website input to turn it on.';enable.textContent='Check integration';}
    else status.textContent='No supported input detected. Use Choose the AI input on this page.';
  }catch{status.textContent='Enable the private composer for this site.';}
})().catch(e=>status.textContent=e.message);
enable.addEventListener('click',async()=>{
  if(!active)return;
  enable.disabled=true;
  try{
    const origin=new URL(active.url).origin+'/*';
    const granted=await chrome.permissions.request({origins:[origin]});
    if(!granted)throw Error('Permission not granted. This site is unchanged.');
    const result=await chrome.runtime.sendMessage({type:'ENABLE_SITE',tabId:active.id});
    if(!result?.ok)throw Error(result?.error||'Could not enable protection');
    const state=await chrome.tabs.sendMessage(active.id,{type:'INCOGNIX_STATUS'});
    status.textContent=state?.installed?(state.enabled?'Protected composer ready. Attach, paste or drop an image or PDF.':'Protection is OFF. Use the switch beside the website input to turn it on.'):'No unambiguous supported chat input found. Open the chat input, then check again. This layout is not protected.';
  }catch(e){status.textContent=e.message;}
  finally{enable.disabled=false;}
});

document.getElementById('pick').addEventListener('click',async()=>{
 try{
  if(!active||new URL(active.url).protocol!=='https:')throw Error('Open an HTTPS chatbot first.');
  if(!await chrome.permissions.request({origins:[new URL(active.url).origin+'/*']}))throw Error('Permission not granted');
  const r=await chrome.runtime.sendMessage({type:'ENABLE_SITE',tabId:active.id});if(!r?.ok)throw Error(r?.error);
  await chrome.tabs.sendMessage(active.id,{type:'PICK_COMPOSER'});window.close();
 }catch(e){status.textContent=e.message;}
});
document.getElementById('all').addEventListener('click',async()=>{
 try{
  if(!await chrome.permissions.request({origins:['https://*/*']}))throw Error('All-sites permission not granted.');
  const r=await chrome.runtime.sendMessage({type:'ENABLE_ALL'});if(!r?.ok)throw Error(r?.error);
  status.textContent='Automatic detection enabled on HTTPS sites. Refresh existing tabs. Use Choose input when detection cannot identify a chat box.';
 }catch(e){status.textContent=e.message;}
});
