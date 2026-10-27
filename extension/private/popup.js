const status=document.getElementById('status'),enable=document.getElementById('enable');
let active;
(async()=>{
  [active]=await chrome.tabs.query({active:true,currentWindow:true});
  const u=new URL(active?.url||'about:blank');
  document.getElementById('site').textContent=u.hostname||'Open an HTTPS chatbot';
  if(u.protocol!=='https:'){status.textContent='Open an HTTPS AI chat website first.';return;}
  enable.disabled=false;
  try{const result=await chrome.tabs.sendMessage(active.id,{type:'INCOGNIX_STATUS'});
    if(result?.installed){status.textContent='Protected composer active. Attach PDFs using its + button.';enable.textContent='Check integration';}
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
    status.textContent=state?.installed?'Protected composer ready. Use its + button to attach a PDF.':'No unambiguous supported chat input found. Open the chat input, then check again. This layout is not protected.';
  }catch(e){status.textContent=e.message;}
  finally{enable.disabled=false;}
});
