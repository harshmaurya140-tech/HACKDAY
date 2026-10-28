const qs=new URLSearchParams(location.search);
const mode=qs.get('mode')||'composer';
const bridge=qs.get('bridge');
const messageId=qs.get('messageId')||'';
const theme=qs.get('theme')==='dark'?'dark':'light';
document.documentElement.setAttribute('data-privacy-theme',theme);
document.documentElement.setAttribute('data-privacy-site',qs.get('site')||'');
const parentViewport=Math.max(300,Math.min(1600,Number(qs.get('viewport'))||800));
document.documentElement.style.setProperty('--ps-parent-vh',parentViewport+'px');
document.documentElement.setAttribute('data-privacy-role',qs.get('role')||'');
// Style tokens are presentation-only, never raw prompts or private mappings.
// Computed CSS from the native composer is validated before being applied.
const safeColor=value=>/^(?:rgba?|hsla?)\([\d.\s,%/+-]+\)$/.test(value)?value:null;
const appearance={bg:'--ps-host-bg',text:'--ps-host-text',border:'--ps-host-border',field:'--ps-host-field',accent:'--ps-host-accent',accentText:'--ps-host-accent-text',muted:'--ps-host-muted'};
for(const [key,variable] of Object.entries(appearance)){
  const color=safeColor(qs.get(key)||'');
  if(color)document.documentElement.style.setProperty(variable,color);
}
const hostRadius=Number(qs.get('radius'));
if(Number.isFinite(hostRadius)&&hostRadius>=0&&hostRadius<=40)document.documentElement.style.setProperty('--ps-host-radius',hostRadius+'px');
const hostFont=qs.get('font')||'';
if(hostFont.length<=160 && /^[a-zA-Z0-9 ,_\-'"]+$/.test(hostFont))document.documentElement.style.setProperty('--ps-host-font',hostFont);

const $=id=>document.getElementById(id);
const message=async p=>{
  const res=await chrome.runtime.sendMessage({...p,bridge});
  if(res?.ok===false)throw Error(res.error||'Local protection unavailable');
  return res;
};
let responseReady=false;
let lastResize=-1;
let lastResizeReady=null;
async function resize(){
  const active=mode==='response'?$('response'):$('composer');
  if(!active || active.hidden)return;
  // Measure this main element, never document/body scrollHeight (which includes
  // the iframe viewport). Its overflow lets attachment/review panels expand.
  const height=Math.ceil(Math.max(active.getBoundingClientRect().height,active.scrollHeight))+5;
  if(height===lastResize && (mode!=='response' || responseReady===lastResizeReady))return;
  lastResize=height;
  lastResizeReady=responseReady;
  const result=await message({type:'RESIZE_FRAME',messageId,height,hideOriginal:responseReady,hideFrame:mode==='response'&&!responseReady}).catch(()=>null);
  if(mode==='composer' && Number.isFinite(result?.appliedHeight) && result.appliedHeight>0){
    const available=Math.max(80,Math.floor(result.appliedHeight)-4);
    const value=available+'px';
    if(document.documentElement.style.getPropertyValue('--ps-frame-available-height')!==value){
      document.documentElement.style.setProperty('--ps-frame-available-height',value);
    }
  }
}
// The parent content script can only ask the private composer to become
// protected again. It cannot request raw drafts or disable privacy.
if(mode==='composer')window.addEventListener('message',event=>{
  if(event.source===window.parent && event.data?.type==='PRIVACY_SHIELD_REACTIVATED'){
    updateProtectionUI(true);
  }
});
if(mode==='composer')window.addEventListener('message',event=>{
  if(event.source!==window.parent || event.data?.type!=='PRIVACY_SHIELD_FRAME_BUDGET')return;
  const available=Number(event.data.height);
  if(!Number.isFinite(available) || available<80 || available>20000)return;
  document.documentElement.style.setProperty('--ps-frame-available-height',Math.floor(available)+'px');
  lastResize=-1;
  resize();
});
if('ResizeObserver' in window){
  const watch=new ResizeObserver(()=>{resize();});
  watch.observe(mode==='response'?$('response'):$('composer'));
}
let current=null;
let revision=0;
let analysisController;
let previewId=null;
let busy=false;
let lastApprovedDecisions=null;
let protectionEnabled=true;
let attachment=null,documentLoading=false,documentController;
function invalidateDraft(){analysisController?.abort();revision++;current=null;previewId=null;$('preview').hidden=true;$('permission').hidden=true;message({type:'CANCEL_DRAFT'}).catch(()=>{});}
function fitDraft(){const d=$('draft');d.style.height='36px';d.style.height=Math.min(120,Math.max(36,d.scrollHeight))+'px';resize();}
function updateProtectionUI(enabled){
  protectionEnabled=Boolean(enabled);
  const button=$('protection-toggle');
  if(!button)return;
  button.setAttribute('aria-checked',String(protectionEnabled));
  button.setAttribute('aria-label',protectionEnabled?'Turn privacy protection off':'Turn privacy protection on');
  $('protection-state').textContent=protectionEnabled?'Incognix · on':'Incognix · off';
  $('composer').dataset.protection=protectionEnabled?'on':'off';
  $('send').disabled=!protectionEnabled||busy;
  $('approve').disabled=!protectionEnabled||busy;
  if(!protectionEnabled){
    $('permission').hidden=true;
    status('Website textbox is unprotected');
  }else{
    status('Browser-local protection active');
  }
  lastResize=-1;
  resize();
}
function status(text,error=false){const el=$('status');el.textContent=text;el.className='status '+(error?'error':'ok');}
function markBusy(on){for(const id of ['attach','remove-attachment','extracted-text','confirm-send','preview-cancel','clear','protection-toggle','discard-native'])if($(id))$(id).disabled=on;busy=on;$('send').disabled=on||!protectionEnabled;$('approve').disabled=on||!protectionEnabled;}
function makeChoice(e){
  const box=document.createElement('div');box.className='choice';
  const heading=document.createElement('div');heading.className='choice-header';
  const type=document.createElement('b');type.textContent=e.type;heading.append(type);
  const value=document.createElement('small');value.textContent=e.text;heading.append(value);
  box.append(heading);
  const reason=document.createElement('small');reason.textContent=e.reason;box.append(reason);
  const wrapper=document.createElement('div');wrapper.className='choice-controls';
  const label=document.createElement('label');label.textContent='Disclosure: ';
  const select=document.createElement('select');select.dataset.entityIds=JSON.stringify(e.ids||[e.id]);
  const options=[['HIDE','Keep hidden']];
  if(e.type==='DOB')options.push(['YEAR','Share only birth year']);
  if(e.type==='INCOME')options.push(['RANGE','Share a user-defined range']);
  options.push(['EXACT','Share exact value']);
  for(const [id,text] of options){const opt=document.createElement('option');opt.value=id;opt.textContent=text;select.append(opt);}
  wrapper.append(label,select);box.append(wrapper);
  const range=document.createElement('div');range.className='range';range.hidden=true;
  const lower=document.createElement('input');lower.type='number';lower.min='0';lower.placeholder='Lower INR';lower.className='range-lower';
  const upper=document.createElement('input');upper.type='number';upper.min='0';upper.placeholder='Upper INR';upper.className='range-upper';
  range.append(lower,upper);box.append(range);
  select.addEventListener('change',()=>{range.hidden=select.value!=='RANGE';resize();});
  return box;
}
function groupPermissionEntities(entities){
  // Multiple occurrences of a single private value have one consent choice;
  // the decision is applied to every exact occurrence in this draft.
  const groups=new Map();
  for(const e of entities.filter(x=>x.necessary)){
    const key=String(e.type)+'\u0000'+String(e.text).normalize('NFC');
    const existing=groups.get(key);
    if(existing)existing.ids.push(e.id);
    else groups.set(key,{...e,ids:[e.id]});
  }
  return [...groups.values()];
}
function showRecovery(error){
  const msg=String(error?.message||error||'');
  $('native-recovery').hidden=!/Native textbox contains an existing draft|Site send control unavailable|Submission was not confirmed/i.test(msg);
}
async function prepareAndSend(decisions={}){
  if(!current||!protectionEnabled)return;
  lastApprovedDecisions=decisions;
  const snapshot=revision;
  markBusy(true);
  try{
    const preview=await message({type:'PREVIEW',draftId:current.draft_id,decisions});
    if(snapshot!==revision)throw Error('Draft changed; review again.');
    previewId=preview.previewId;$('outgoing').value=preview.sanitized_text;
    $('preview').hidden=false;$('permission').hidden=true;status('Review exactly what will leave your browser');
    return;

  }catch(e){status(e.message,true);showRecovery(e);$('notice').textContent='Nothing unprotected was intentionally submitted.';}
  finally{markBusy(false);resize();}
}
async function doSend(){
  if(busy||documentLoading||!protectionEnabled)return;
  if(current && !$('permission').hidden){status('Choose disclosure settings and click Approve & send.',true);return;}
  const text=$('draft').value+(attachment?'\n\nDocument text (extracted locally):\n'+attachment.text:'');
  if(!text.trim())return;
  if(text.length>12000){status('Prompt and document exceed 12,000 characters. Use a shorter document or excerpt.',true);return;}
  current=null;previewId=null;$('preview').hidden=true;
  const started=revision;
  markBusy(true);
  try{
    status('Scanning locally…');
    analysisController=new AbortController();
    const local=await LocalPrivacyAI.analyze(text,{onStatus:msg=>status(msg),signal:analysisController.signal});
    if(started!==revision)throw Error('Draft changed. Review it again.');
    const analysed=await message({type:'ANALYZE',text,entities:local.entities});
    if(started!==revision){await message({type:'CANCEL_DRAFT'});throw Error('Draft changed. Review it again.');}
    current=analysed;
    $('native-recovery').hidden=true;
    const needed=groupPermissionEntities(analysed.entities);
    if(needed.length){
      $('choices').replaceChildren(...needed.map(makeChoice));
      $('permission').hidden=false;
      status('Your choice is required');
      await resize();
    }else{
      status(`Protected ${analysed.entities.length} detected field(s)…`);
      markBusy(false);
      await prepareAndSend({});
    }
  }catch(e){status(e.message,true); /* Fail closed: no Python or cloud fallback. */}
  finally{markBusy(false);resize();}
}
async function initComposer(){
  $('composer').hidden=false;
  $('composer').dataset.protection='on';
  $('draft').maxLength=12000;
  $('draft').addEventListener('input',fitDraft);
  document.querySelector('.tools').addEventListener('toggle',resize);
  $('attachment-review').addEventListener('toggle',resize);
  $('extracted-text').addEventListener('input',()=>{if(attachment){attachment.text=$('extracted-text').value;invalidateDraft();}});
  $('attach').addEventListener('click',()=>{if(!busy&&!documentLoading)$('attachment-file').click();});
  $('remove-attachment').addEventListener('click',()=>{
    documentController?.abort();documentLoading=false;attachment=null;$('attachment-file').value='';
    $('attachment-info').hidden=true;$('attachment-review').hidden=true;$('extracted-text').value='';$('remove-attachment').hidden=true;$('attach').disabled=false;
    invalidateDraft();status('Document removed');resize();
  });
  $('attachment-file').addEventListener('change',async()=>{
    const file=$('attachment-file').files[0];if(!file)return;
    $('attachment-review').hidden=true;$('extracted-text').value='';
    documentController?.abort();const controller=new AbortController();documentController=controller;
    invalidateDraft();attachment=null;documentLoading=true;$('attach').disabled=true;
    $('attachment-info').hidden=false;$('attachment-info').textContent='Reading document locally…';$('remove-attachment').hidden=false;resize();
    try{
      const {readDocument}=await import('./documents.mjs');
      const isImage=/\.(png|jpe?g)$/i.test(file.name);
      const result=isImage?await (await import('./image-text.mjs')).readImage(file,{signal:controller.signal,onProgress:p=>{if(!controller.signal.aborted)$('attachment-info').textContent=`Reading image locally… ${p}%`;}}):await readDocument(file,{signal:controller.signal});
      if(controller!==documentController||controller.signal.aborted)return;
      if(result.text.length+35+$('draft').value.length>12000)throw Error('Prompt and document exceed 12,000 characters. Choose a shorter PDF or excerpt.');
      attachment=result;$('attachment-review').hidden=false;$('attachment-review').open=Boolean(result.ocr);$('extracted-text').value=result.text;
      $('attachment-info').textContent=`${result.ocr?'Image text ready':'Document attached'} · ${result.pages} page(s) · original stays local. Review extracted text before sending.`;
      status('Document ready for private review');
    }catch(e){if(!controller.signal.aborted){attachment=null;$('attachment-info').textContent=e.message;status('Document not attached',true);}}
    finally{if(controller===documentController){documentLoading=false;$('attach').disabled=busy;$('attachment-file').value='';resize();}}
  });
  $('draft').addEventListener('input',()=>{analysisController?.abort();revision++;current=null;previewId=null;$('preview').hidden=true;$('permission').hidden=true;message({type:'CANCEL_DRAFT'}).catch(()=>{});message({type:'SAVE_EDITOR',text:$('draft').value}).catch(()=>{});});
  $('preview-cancel').addEventListener('click',()=>{if(busy)return;previewId=null;current=null;$('preview').hidden=true;message({type:'CANCEL_DRAFT'}).catch(()=>{});resize();});
  $('confirm-send').addEventListener('click',async()=>{
    if(busy||!current||!previewId)return;
    markBusy(true);$('draft').readOnly=true;
    try{
      const result=await message({type:'PREPARE_AND_SEND',draftId:current.draft_id,previewId});
      $('draft').value='';attachment=null;$('attachment-info').hidden=true;$('attachment-review').hidden=true;$('extracted-text').value='';$('remove-attachment').hidden=true;fitDraft();await message({type:'SAVE_EDITOR',text:''});current=null;previewId=null;$('preview').hidden=true;
      status('Sanitized prompt handed to the AI website');$('notice').textContent=`Protected ${result.replacements} field(s). Review the chat to confirm delivery.`;
    }catch(e){status(e.message,true);showRecovery(e);}
    finally{$('draft').readOnly=false;markBusy(false);resize();}
  });
  $('send').addEventListener('click',doSend);
  $('protection-toggle').addEventListener('click',async()=>{
    if(busy||documentLoading)return;
    $('protection-toggle').disabled=true;
    try{
      const next=!protectionEnabled;
      const response=await message({type:'SET_PROTECTION_ENABLED',enabled:next});
      if(!response?.ok)throw Error('Could not change protection state');
      // Leave any raw draft in the private extension textarea. Never copy it
      // into the website composer when the user turns protection off.
      revision++;previewId=null;$('preview').hidden=true;message({type:'CANCEL_DRAFT'}).catch(()=>{});if(next){current=null;lastApprovedDecisions=null;$('permission').hidden=true;}
      updateProtectionUI(next);
    }catch(e){status(e.message,true);}
    finally{$('protection-toggle').disabled=false;resize();}
  });
  $('draft').addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();doSend();}
  });
  // Pairing UI stays hidden for visual compatibility; no local server exists.
  $('approve').addEventListener('click',()=>{
    const decisions={};
    for(const ch of $('choices').children){
      const select=ch.querySelector('select');const mode=select.value;
      const d={mode};
      if(mode==='RANGE'){
        const l=ch.querySelector('.range-lower').value;
        const h=ch.querySelector('.range-upper').value;
        if(!l||!h){status('Enter both range bounds',true);return;}
        d.lower=Number(l);d.upper=Number(h);
      }
      for(const id of JSON.parse(select.dataset.entityIds||'[]'))decisions[id]=d;
    }
    prepareAndSend(decisions);
  });
  $('discard-native').addEventListener('click',async()=>{
    if(!confirm('Discard the current unsent website draft? This never sends it to the AI.'))return;
    try{
      await message({type:'RESET_NATIVE_DRAFT'});
      $('native-recovery').hidden=true;
      status('Website draft cleared. Retrying your approved protected message…');
      if(current && lastApprovedDecisions!==null)await prepareAndSend(lastApprovedDecisions);
      else status('Website draft cleared. You can send your protected message.');
    }
    catch(e){status(e.message,true);}
    resize();
  });
  $('cancel').addEventListener('click',()=>{current=null;lastApprovedDecisions=null;$('permission').hidden=true;status('Send cancelled');resize();});
  $('rescan').addEventListener('click',()=>message({type:'RESCAN'}).then(()=>status('Checked completed responses')).catch(e=>status(e.message,true)));
  $('clear').addEventListener('click',async()=>{
    if(!confirm('Clear the private mapping for this chat? Restoring earlier placeholders will no longer work.'))return;
    try{await message({type:'CLEAR_SESSION'});status('Mappings cleared');}catch(e){status(e.message,true);}
  });
  try{const saved=await message({type:'LOAD_EDITOR'});if(revision===0&&!$('draft').value)$('draft').value=saved.text||'';await message({type:'HEALTH'});
    const available=await LocalPrivacyAI.availability();
    if(available==='unavailable')status('On-device AI unavailable; sending blocked',true);
    else if(available==='downloadable'||available==='downloading')status('Local AI download may be needed on Send');
    else status('Browser-local protection active');
  }catch(e){status('Privacy engine unavailable; sending blocked',true);}
  resize();
}
function syncResponseToggle(){
  const text=$('restored-text');
  const toggle=$('response-toggle');
  const expanded=text.classList.contains('expanded');
  const overflow=text.scrollHeight>text.clientHeight+5;
  // Native websites already render their own Show more controls. Never add a
  // second competing toggle; the protected response scrolls within its cap.
  toggle.hidden=true;
  toggle.textContent=expanded?'Show less':'Show more';
}
async function initResponse(){
  $('response').hidden=false;
  // Never add extension commentary or a shield heading to the assistant answer.
  $('response-label').hidden=true;
  $('response-toggle').addEventListener('click',async()=>{
    $('restored-text').classList.toggle('expanded');
    syncResponseToggle();
    await resize();
  });
  $('restored-text').textContent='';
  let lastRendered=null;
  let refreshing=false;
  let refreshPending=false;
  async function refreshRestoration(){
    if(refreshing){refreshPending=true;return;}
    refreshing=true;
    try{
      const data=await message({type:'RESTORE_MESSAGE',messageId});
      // Only render the external AI's literal answer, with known placeholders
      // replaced by locally held originals. If a mapping is lost, retain the
      // website's own sanitized response rather than inject explanatory text.
      responseReady=!data.unresolved;
      const next=responseReady?data.text:'';
      // Gemini's answer is transferred as a *safe structural tree* so bullet
      // lists, paragraphs, headings, and code keep their intended formatting.
      // Never use innerHTML or render private values into the host site DOM.
      const signature=data.rich?JSON.stringify(data.rich):'';
      const renderingKey=next+'\u0000'+signature;
      if(renderingKey!==lastRendered){
        const area=$('restored-text');
        let rendered=false;
        if(responseReady&&data.rich&&window.PrivacyShieldRich){
          rendered=PrivacyShieldRich.render(document,area,data.rich);
        }
        if(!rendered)area.textContent=next;
        area.classList.toggle('rich',rendered);
        lastRendered=renderingKey;
        syncResponseToggle();
      }
      await resize();
    }catch(e){
      // Fail without altering the displayed AI response.
      $('restored-text').textContent='';
      responseReady=false;
      await resize();
    }finally{
      refreshing=false;
      if(refreshPending){
        refreshPending=false;
        setTimeout(refreshRestoration,100);
      }
    }
  }
  // A changed Claude/ChatGPT/Gemini *sanitized* response triggers an update.
  // The page may request refreshes, but it cannot read the restored values.
  let refreshTimer=null;
  window.addEventListener('message',event=>{
    if(event.source!==window.parent || event.data?.type!=='PRIVACY_SHIELD_SOURCE_UPDATED' || event.data.messageId!==messageId)return;
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(refreshRestoration,250);
  });
  await refreshRestoration();
  setTimeout(syncResponseToggle,100);
}
async function initOffToggle(){
  const off=$('off-toggle');
  off.hidden=false;
  const button=$('reenable-protection');
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
      await message({type:'SET_PROTECTION_ENABLED',enabled:true});
      // The content script restores the original private composer. This tiny
      // frame is removed only after the native text field has been hidden.
    }catch(e){
      button.disabled=false;
      button.title=e.message||'Unable to enable protection';
    }
  });
}
if(mode==='response')initResponse();
else if(mode==='off-toggle')initOffToggle();
else initComposer();
