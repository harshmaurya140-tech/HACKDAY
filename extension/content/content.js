(() => {
  function runtimeAvailable(){
    try{return Boolean(chrome?.runtime?.id);}catch{return false;}
  }
  if(!runtimeAvailable())return;
  const adapter=window.__privacyShieldAdapter;
  if(!adapter || window.__privacyShieldStarted) return;
  window.__privacyShieldStarted=true;
  const navigation=window.__privacyShieldSessionNavigation.createSessionNavigation(adapter.id,location.href);
  let bridge=navigation.bridge;
  let lastLocation=location.href;
  let privateComposer=null;
  let reenableFrame=null;
  let hiddenComposer=null;
  let nativeEditor=null;
  const texts=new Map();
  const richTexts=new Map();
  const richSignatures=new Map();
  const frames=new Map();
  const originals=new Map();
  let sendBusy=false;
  let protectionEnabled=true;
  const nativeDraft=window.__privacyShieldNativeDraft.create();
  const hiddenStyles=new WeakMap();
  let scanTimer=null;
  let pollTimer=null;
  let mutation=null;
  let stopped=false;
  function stopAfterInvalidation(){
    if(stopped)return;
    stopped=true;
    clearTimeout(scanTimer);
    if(pollTimer!==null)clearInterval(pollTimer);
    mutation?.disconnect();
    // Do not expose the native composer: it has no local privacy protection.
    // The dead extension iframe may still contain unsent private text, so leave
    // it in place until the user has had an opportunity to copy their draft.
    if(!document.getElementById('privacy-shield-refresh-warning')){
      const banner=document.createElement('div');
      banner.id='privacy-shield-refresh-warning';
      banner.setAttribute('role','alert');
      banner.textContent='Incognix was reloaded. Copy any unsent draft, then refresh this AI tab to restore protection.';
      banner.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);max-width:min(92vw,650px);padding:12px 16px;background:#722c25;color:#fff;border:2px solid #fff;border-radius:10px;font:600 14px/1.4 system-ui,sans-serif;z-index:2147483647;box-shadow:0 4px 22px #0008;';
      document.documentElement.appendChild(banner);
    }
  }
  function checkRuntime(){
    if(stopped)return false;
    if(runtimeAvailable())return true;
    stopAfterInvalidation();
    return false;
  }

  function detectedTheme(){
    const root=document.documentElement;
    const body=document.body;
    const explicit=(root?.getAttribute('data-theme')||body?.getAttribute('data-theme')||'').toLowerCase();
    if(explicit==='dark'||root?.classList.contains('dark')||body?.classList.contains('dark'))return 'dark';
    if(explicit==='light'||root?.classList.contains('light')||body?.classList.contains('light'))return 'light';
    for(const element of [body,root]){
      if(!element)continue;
      const css=getComputedStyle(element);
      if(css.colorScheme?.split(/\s+/).includes('dark')&&!css.colorScheme?.includes('light'))return 'dark';
      const rgb=css.backgroundColor.match(/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)(?:[, /]+([\d.]+))?\s*\)$/);
      if(rgb && (rgb[4]===undefined || Number(rgb[4])>0.5)){
        const lum=0.2126*Number(rgb[1])+0.7152*Number(rgb[2])+0.0722*Number(rgb[3]);
        return lum<120?'dark':'light';
      }
    }
    if(body){
      const rgb=getComputedStyle(body).color.match(/\d+/g);
      if(rgb && rgb.length>=3){
        const lum=0.2126*Number(rgb[0])+0.7152*Number(rgb[1])+0.0722*Number(rgb[2]);
        if(lum>170)return 'dark';
      }
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  }
  function isOpaqueColor(value){
    const match=String(value||'').match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+))?\s*\)$/);
    return !!match && (match[4]===undefined||Number(match[4])>.35);
  }
  function sampleComposerAppearance(native,container){
    if(!native||!container)return {};
    const inputStyle=getComputedStyle(native);
    const baseStyle=getComputedStyle(container);
    let background='';
    for(let el=container,depth=0;el&&depth<6;el=el.parentElement,depth++){
      const candidate=getComputedStyle(el).backgroundColor;
      if(isOpaqueColor(candidate)){background=candidate;break;}
    }
    const findColor=(element,key)=>{
      const candidate=element?.[key]||'';
      return /^(?:rgba?|hsla?)\([\d.\s,%/+-]+\)$/.test(candidate)?candidate:'';
    };
    const sendButton=adapter.query(adapter.send,container)||adapter.query(adapter.send,container.parentElement||document);
    const buttonStyle=sendButton?getComputedStyle(sendButton):null;
    const radius=Math.max(0,Math.min(40,parseFloat(baseStyle.borderTopLeftRadius)||16));
    return {
      bg:findColor({value:background},'value'),
      text:findColor(inputStyle,'color'),
      field:findColor(inputStyle,'backgroundColor'),
      border:findColor(baseStyle,'borderTopColor'),
      accent:findColor(buttonStyle,'backgroundColor'),
      accentText:findColor(buttonStyle,'color'),
      muted:findColor(baseStyle,'color'),
      font:String(inputStyle.fontFamily||'').slice(0,160),
      radius:String(radius)
    };
  }
  function mkFrame(mode,messageId='',role='assistant',appearance={}){
    if(!checkRuntime())return null;
    const f=document.createElement('iframe');
    const qs=new URLSearchParams({mode,bridge,messageId,site:adapter.id,theme:detectedTheme(),role,viewport:String(window.innerHeight),...appearance});
    try{f.src=chrome.runtime.getURL('private/frame.html')+'?'+qs.toString();}
    catch(e){if(!runtimeAvailable())stopAfterInvalidation();return null;}
    f.setAttribute('title',mode==='composer'?'Protected AI composer':mode==='off-toggle'?'Turn privacy protection back on':'Private restored message');
    // Required for Chrome Prompt API in a cross-origin extension iframe.
    // An AI site's Permissions-Policy header may still disallow delegation.
    f.allow='language-model';
    f.style.cssText='display:block;box-sizing:border-box;flex:0 0 auto;min-width:0;max-width:100%;width:100%;height:'+ (mode==='composer'? '140px':'75px')+';border:0;background:transparent;position:relative;z-index:1;overflow:hidden;clear:both;margin:0 auto;';
    return f;
  }
  // OFF mode has no overlaid private composer. A separate, minimal,
  // extension-origin switch sits *outside* the normal website textbox,
  // so users can type directly into the real editor without obstruction.
  function positionReenableFrame(){
    if(!reenableFrame?.isConnected || !hiddenComposer?.isConnected)return;
    const rect=hiddenComposer.getBoundingClientRect();
    const width=158, height=40;
    const left=Math.max(8,Math.min(window.innerWidth-width-8,rect.right-width));
    // Put the re-enable control above the native textbox, not over its input.
    const top=Math.max(8,Math.min(window.innerHeight-height-8,rect.top-height-6));
    reenableFrame.style.left=Math.round(left)+'px';
    reenableFrame.style.top=Math.round(top)+'px';
  }
  function removeReenableFrame(){
    reenableFrame?.remove();
    reenableFrame=null;
  }
  function showReenableFrame(){
    if(!hiddenComposer?.isConnected)return;
    if(!reenableFrame?.isConnected){
      reenableFrame=mkFrame('off-toggle','','assistant',sampleComposerAppearance(nativeEditor,hiddenComposer));
      if(!reenableFrame)return;
      reenableFrame.style.cssText='display:block;position:fixed;box-sizing:border-box;width:158px;height:40px;border:0;background:transparent;z-index:2147483000;overflow:hidden;margin:0;padding:0;';
      document.documentElement.appendChild(reenableFrame);
    }
    positionReenableFrame();
  }
  function showPrivateComposer(){
    removeReenableFrame();
    if(!privateComposer?.isConnected)return;
    privateComposer.style.display='block';
    // This message only re-enables the extension's internal controls;
    // no private draft or mapping is sent through window.postMessage.
    try{privateComposer.contentWindow?.postMessage({type:'PRIVACY_SHIELD_REACTIVATED'},chrome.runtime.getURL('/').slice(0,-1));}catch{}
  }
  async function register(){
    if(!checkRuntime())return;
    try{await chrome.runtime.sendMessage({type:'REGISTER_TAB',bridge});}
    catch{if(!runtimeAvailable())stopAfterInvalidation();}
  }
  function findNative(){return adapter.findComposer?adapter.findComposer?.():adapter.query(adapter.composer);}
  function containerFor(native){
    // Replace the whole bounded composer shell, including its attachment row.
    // Avoid turning a page-sized form or transcript into the hidden container.
    if(typeof getComputedStyle==='function'){
      const base=native.getBoundingClientRect();
      for(let n=native.parentElement,depth=0;n&&depth<6;n=n.parentElement,depth++){
        const r=n.getBoundingClientRect(),css=getComputedStyle(n);
        if(r.width>Math.max(1100,base.width*1.8)||r.height>360)break;
        if(parseFloat(css.borderTopLeftRadius)>=12&&r.width>=base.width&&r.height>=base.height+20)return n;
      }
    }
    if(adapter.id==='generic')return native.closest('form')||native.closest('[data-testid*="composer"], [class*="composer"], [class*="chat-input"]')||native.parentElement;
    if(adapter.id==='chatgpt')return native.closest('form') || native.parentElement?.parentElement;
    if(adapter.id==='gemini')return native.closest('form')||native.closest('input-area-v2')||native.closest('[class*="input-area-container"]')||native.closest('rich-textarea')?.parentElement||native.parentElement?.parentElement;
    return native.closest('form')||native.closest('[data-testid="chat-input"]')||native.parentElement?.parentElement;
  }
  function hideNativeContainer(el){
    if(!hiddenStyles.has(el))hiddenStyles.set(el,el.getAttribute('style'));
    // display:none makes ProseMirror un-focusable and often prevents its native
    // input handlers from updating; keep ONLY the sanitized editor operational.
    const props={position:'fixed',width:'min(700px, 95vw)',height:'120px',opacity:'0',overflow:'hidden',
      'pointer-events':'none','clip-path':'inset(50%)',left:'0px',top:'0px'};
    for(const [key,value] of Object.entries(props))el.style.setProperty(key,value,'important');
  }
  function restoreNativeContainer(el){
    if(!el||!hiddenStyles.has(el))return;
    const prior=hiddenStyles.get(el);
    if(prior===null)el.removeAttribute('style');
    else el.setAttribute('style',prior);
    hiddenStyles.delete(el);
  }
  function installComposer(){
    if(!checkRuntime())return;
    // The editor already owned by our protected composer remains authoritative
    // while it exists. Once hidden, its layout can change; re-scanning could
    // wrongly select a newly opened Writing/document editor instead.
    if(privateComposer?.isConnected && nativeEditor?.isConnected && hiddenComposer?.contains(nativeEditor))return;
    const native=findNative();if(!native)return;
    if(privateComposer?.isConnected){privateComposer.remove();privateComposer=null;}
    if(hiddenComposer?.isConnected)restoreNativeContainer(hiddenComposer);
    nativeDraft.reset();
    nativeEditor=null;
    const original=containerFor(native);if(!original||!original.parentElement)return;
    // A generic editor may sit directly under body or inside a transcript form.
    // Never hide the entire page/transcript to replace a single input.
    if(original===document.body||original===document.documentElement)return;
    if(adapter.id==='generic' && original.getBoundingClientRect?.().height>600)return;
    // The native site form remains in the DOM for sanitized submission only.
    privateComposer=mkFrame('composer','','assistant',sampleComposerAppearance(native,original));
    if(!privateComposer)return;
    original.parentElement.insertBefore(privateComposer,original);
    if(protectionEnabled)hideNativeContainer(original);
    hiddenComposer=original;
    nativeEditor=native;
    if(!protectionEnabled){privateComposer.style.display='none';showReenableFrame();}
    else removeReenableFrame();
    register();
  }
  function resetForNavigation(nextBridge){
    bridge=nextBridge;
    protectionEnabled=true;
    removeReenableFrame();
    texts.clear();
    richTexts.clear();richSignatures.clear();
    for(const [id,frame] of frames){
      frame.remove();
      const original=originals.get(id);
      if(original){
        original.style.removeProperty('display');
        delete original.dataset.privacyShieldDone;
      }
      originals.delete(id);
    }
    frames.clear();
    privateComposer?.remove();privateComposer=null;
    if(hiddenComposer)restoreNativeContainer(hiddenComposer);
    nativeDraft.reset();
    hiddenComposer=null;
    nativeEditor=null;
    register();
  }
  function updateTextInput(el,value){
    if(el.isContentEditable){
      el.focus();
      // Input events are used for React/ProseMirror-style editors. Never inject HTML.
      const sel=window.getSelection();
      if(sel){const range=document.createRange();range.selectNodeContents(el);sel.removeAllRanges();sel.addRange(range);}
      try{document.execCommand('insertText',false,value);}catch{}
      if((el.innerText||'').trim()!==value.trim()){
        // Preserve extracted PDF paragraph boundaries even on editors whose
        // CSS collapses whitespace. Only sanitized strings become text nodes.
        const nodes=[];
        value.split('\n').forEach((line,index)=>{if(index)nodes.push(document.createElement('br'));nodes.push(document.createTextNode(line));});
        el.replaceChildren(...nodes);
      }
      el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:value}));
    }else{
      const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
      if(setter)setter.call(el,value);else el.value=value;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }
  function currentValue(el){return el.isContentEditable?(el.innerText||el.textContent||'').trim():(el.value||'').trim();}
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function sendSanitized(text){
    if(typeof protectionEnabled!=='undefined' && !protectionEnabled)throw Error('Protection is switched off. Use the website textbox or turn protection on.');
    if(!checkRuntime())throw Error('Extension was reloaded. Refresh this tab before sending.');
    if(sendBusy)throw Error('Send already in progress');
    sendBusy=true;
    try{
      const input=(typeof nativeEditor!=='undefined' && nativeEditor?.isConnected)?nativeEditor:findNative();
      if(!input||!hiddenComposer?.isConnected||!hiddenComposer.contains(input))
        throw Error('Site composer changed; reload and retry.');
      const previous=currentValue(input);
      // Never erase a genuine website draft. Extension-owned failed submissions
      // may be replaced, but ONLY while the same editor/channel remains active.
      if(!nativeDraft.mayReplace(input,bridge,previous,text))
        throw Error('Native textbox contains an existing draft. Use “Discard website draft” to clear it before retrying.');
      updateTextInput(input,text);
      nativeDraft.note(input,bridge,text);
      if(!nativeDraft.same(currentValue(input),text))throw Error('Could not verify sanitized input.');
      // React/Quill/ProseMirror enable their send control asynchronously after
      // the input event, especially on Gemini and Claude. Never click a voice,
      // Stop, or unrelated button merely because it was the first match.
      if(!checkRuntime())throw Error('Extension was reloaded. Refresh this tab before sending.');
      const beforeCount=adapter.queryAll(adapter.user).length;
      const form=input.closest('form');
      const isSendButton=(button)=>{
        if(!button || button.disabled || button.getAttribute?.('aria-disabled')==='true')return false;
        const label=[button.getAttribute?.('aria-label'),button.getAttribute?.('title'),button.getAttribute?.('data-testid')].filter(Boolean).join(' ').toLowerCase();
        if(/stop|abort|cancel|record|microphone|voice|dictate/.test(label))return false;
        return true;
      };
      const findEnabledSend=(scope)=>{
        if(adapter.id==='generic'&&scope?.querySelectorAll){
          const buttons=new Set();
          for(const selector of adapter.send)for(const button of scope.querySelectorAll(selector)){
            if(isSendButton(button))buttons.add(button);
          }
          return buttons.size===1?[...buttons][0]:null;
        }
        if(scope?.querySelectorAll){
          for(const selector of adapter.send){
            try{
              for(const candidate of scope.querySelectorAll(selector)){
                if(isSendButton(candidate) && !candidate.closest?.('[data-private-shield="true"]'))return candidate;
              }
            }catch{/* Website DOM can change; continue to known fallbacks. */}
          }
          return null;
        }
        // Minimal adapter mocks used by developer regression tests.
        const one=adapter.query(adapter.send,scope);
        return isSendButton(one)?one:null;
      };
      let button=null;
      for(let attempt=0;attempt<17;attempt++){
        await delay(200);
        if(!checkRuntime())throw Error('Extension was reloaded. Refresh this tab before sending.');
        // Select only enabled, known Send controls; a stale disabled control
        // must not hide an enabled replacement after a framework rerender.
        button=findEnabledSend(hiddenComposer) ||
               (adapter.id!=='generic' && (
               findEnabledSend(hiddenComposer?.parentElement) ||
               findEnabledSend(typeof document!=="undefined"?document:null)));
        if(button)break;
      }
      if(button){
        navigation.markSendAttempt();button.click();
      }else if(adapter.id!=='generic' && form && typeof form.requestSubmit==='function' &&
               !form.querySelector('button[type="submit"][disabled],button[type="submit"][aria-disabled="true"]')){
        // A uniquely bound native form is a safer fallback than pressing keys
        // on a web-controlled page. No fallback submits an unsanitized prompt.
        navigation.markSendAttempt();form.requestSubmit();
      }else{
        // We know we staged this content. Removing it is safe, and avoids a
        // stale invisible textbox blocking the next protected send.
        if(nativeDraft.owns(input,bridge,currentValue(input)))updateTextInput(input,'');
        nativeDraft.reset();
        throw Error('Site send control unavailable. Protected draft retained; try refreshing the page.');
      }
      // Only call success when the native editor clears or a new user message
      // appears. We never blindly send the same prompt twice on a timeout.
      for(let i=0;i<18;i++){
        await delay(250);
        if(!input.isConnected || !currentValue(input) || adapter.queryAll(adapter.user).length>beforeCount){
          nativeDraft.reset();
          return {ok:true};
        }
      }
      throw Error('Submission was not confirmed. The sanitized website draft is retained; you can retry safely.');
    }finally{sendBusy=false;}
  }
  async function resetNativeDraft(){
    if(!checkRuntime())throw Error('Extension was reloaded. Refresh the tab.');
    if(sendBusy)throw Error('Wait for the current submission to finish.');
    const input=(typeof nativeEditor!=='undefined' && nativeEditor?.isConnected)?nativeEditor:findNative();
    if(!input||!hiddenComposer?.contains(input))throw Error('Site composer changed; refresh the page.');
    // Only invoked after the user explicitly approves deleting the hidden
    // website draft. Never submit any of its contents.
    // The user expressly authorized deletion. Rich text editors can briefly
    // restore a stale React state after an input event. Verify that the state
    // stays empty; retry clearing during the same authorized operation only.
    for(let attempt=0;attempt<3;attempt++){
      updateTextInput(input,'');
      await delay(170);
      if(!currentValue(input)){
        await delay(120);
        if(!currentValue(input))break;
      }
    }
    if(currentValue(input))throw Error('Could not clear site draft. Refresh and retry.');
    nativeDraft.reset();
    return {ok:true};
  }
  // Best-effort UI gating, not a network firewall. Originals are accepted only
  // in the extension workspace. A provider can still transmit data it already owns.
  function blockMedia(event){
    if(!protectionEnabled)return;
    const fileEvent=(event.type==='drop'&&event.dataTransfer?.files?.length)||
      (event.type==='paste'&&[...(event.clipboardData?.items||[])].some(x=>x.kind==='file'));
    const target=event.target?.closest?.('input[type="file"],button,[role="button"],label');
    const label=target?[target.getAttribute('aria-label'),target.getAttribute('title'),target.getAttribute('data-testid'),target.textContent].filter(Boolean).join(' '):'';
    const mediaClick=event.type==='click'&&(target?.matches('input[type="file"]')||/attach|upload|microphone|dictat|voice|screen shar|camera/i.test(label));
    if(fileEvent||mediaClick){event.preventDefault();event.stopImmediatePropagation();
      alert('Protected mode blocks native files and voice. Open Incognix from the extension toolbar to review a supported document locally.');
    }
  }
  if(typeof document!=='undefined')for(const type of ['click','drop','paste'])document.addEventListener?.(type,blockMedia,true);
  function observerScan(){
    if(!checkRuntime())return;
    installComposer();
    if(!privateComposer?.isConnected)return;
    // Single-role, priority-based selector lists prevent duplicate overlays.
    const nodes=[...adapter.queryAll(adapter.assistant),...adapter.queryAll(adapter.user)];
    // Claude/other sites stream into an existing response. Refresh the local
    // rendering when the *sanitized* source changes; never transmit originals.
    for(const [id,frame] of frames){
      if(!frame.isConnected){frames.delete(id);texts.delete(id);richTexts.delete(id);richSignatures.delete(id);originals.delete(id);}
    }
    for(const node of nodes){
      if(!node.isConnected||node.closest('[data-private-shield="true"]'))continue;
      const role=adapter.queryAll(adapter.user).includes(node)?'user':'assistant';
      const text=adapter.extractMessageText(node,role);
      const rich=adapter.extractMessageRich?.(node,role)||null;
      const signature=rich?JSON.stringify(rich):'';
      const priorId=node.dataset.privacyShieldDone;
      if(priorId){
        if(frames.has(priorId)&&texts.has(priorId)&&
          (text!==texts.get(priorId)||signature!==(richSignatures.get(priorId)||''))&&text.length<=150000){
          texts.set(priorId,text);
          if(rich)richTexts.set(priorId,rich);else richTexts.delete(priorId);
          richSignatures.set(priorId,signature);
          const frame=frames.get(priorId);
          try{
            const origin=new URL(chrome.runtime.getURL('private/frame.html')).origin;
            frame.contentWindow?.postMessage({type:'PRIVACY_SHIELD_SOURCE_UPDATED',messageId:priorId},origin);
          }catch{}
        }
        continue;
      }
      if(!/\[PRIVATE_[A-Z]+_\d+_[0-9A-F]{6}\]/.test(text))continue;
      if(text.length>150000)continue;
      const id=crypto.randomUUID();
      node.dataset.privacyShieldDone=id;
      texts.set(id,text);
      if(rich)richTexts.set(id,rich);
      richSignatures.set(id,signature);
      const frame=mkFrame('response',id,role);
      if(!frame)return;
      frame.dataset.privateShield='true';
      // Place the restored response *after the entire conversation turn* on
      // ChatGPT, not inside Writing/Document editors; on Gemini, after its
      // model-response wrapper, not inside the accessible transcript header.
      const anchor=adapter.messageAnchor?.(node)||node;
      if(!anchor.parentElement)continue;
      anchor.insertAdjacentElement('afterend',frame);
      // Never position an assistant answer inside a rich document card.
      // Keep each private answer in the surrounding conversation flow.
      if(adapter.id==='chatgpt'){
        frame.style.maxWidth=role==='assistant'?'min(100%, 760px)':'min(100%, 650px)';
        frame.style.margin=role==='assistant'?'8px auto 22px':'8px 0 20px auto';
      }else if(adapter.id==='gemini'){
        frame.style.maxWidth=role==='user'?'min(78%, 650px)':'min(100%, 760px)';
        frame.style.margin=role==='user'?'12px 0 24px auto':'12px auto 24px';
      }
      if(adapter.id!=='chatgpt'&&adapter.id!=='gemini'){frame.style.maxWidth=role==='user'?'min(78%, 650px)':'min(100%, 760px)';frame.style.margin=role==='user'?'12px 0 24px auto':'12px auto 24px';}
      const original=adapter.hiddenOriginal?.(node)||node;
      originals.set(id,original);
      frames.set(id,frame);
      // Keep original visible until private rendering is ready; then hide it.
      // Frame content is internally scrollable: no page-sized overlay.
    }
    // Claude and similar sites pin their composer to the bottom of the
    // viewport. Reserve space after the final assistant response so the
    // last lines can be scrolled above that composer instead of behind it.
    for(const f of frames.values())f.style.marginBottom='0px';
    const assistants=adapter.queryAll(adapter.assistant);
    const lastAssistant=assistants[assistants.length-1];
    const lastId=lastAssistant?.dataset?.privacyShieldDone;
    if(lastId&&frames.has(lastId)){
      frames.get(lastId).style.marginBottom=Math.max(140,Math.min(440,(privateComposer?.getBoundingClientRect()?.height||170)+75))+'px';
    }
  }
  function scheduleScan(){
    if(!checkRuntime())return;
    clearTimeout(scanTimer);
    scanTimer=setTimeout(observerScan,1200);
  }
  let stopPicker=null;
  function pickComposer(){
    stopPicker?.();
    const tip=document.createElement('div');tip.textContent='Incognix: click the AI message input to protect it. Press Escape to cancel.';
    tip.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#253d68;color:white;padding:12px 20px;border-radius:14px;z-index:2147483647;font:14px system-ui;box-shadow:0 4px 24px #0005';document.documentElement.append(tip);
    const stop=()=>{tip.remove();document.removeEventListener('click',choose,true);document.removeEventListener('keydown',key,true);stopPicker=null;};
    const key=e=>{if(e.key==='Escape')stop();};
    const choose=e=>{
      const target=e.composedPath().find(n=>n?.matches?.('textarea,[contenteditable="true"]'));
      if(!target||target.closest?.('form')?.querySelector('input[type="password"]'))return;
      e.preventDefault();e.stopImmediatePropagation();
      adapter.selectedComposer=target;stop();installComposer();
    };
    stopPicker=stop;document.addEventListener('click',choose,true);document.addEventListener('keydown',key,true);
  }
  chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
    if(!checkRuntime())return;
    if(msg.type==='PICK_COMPOSER'){if(!privateComposer?.isConnected)pickComposer();respond({ok:true});return;}
    if(msg.type==='INCOGNIX_STATUS'){respond({ok:true,installed:Boolean(privateComposer?.isConnected),site:adapter.id});return;}
    if(msg.bridge!==bridge){respond({ok:false,error:'Wrong conversation'});return;}
    if(msg.type==='SET_PROTECTION_ENABLED'){
      if(typeof msg.enabled!=='boolean'){respond({ok:false,error:'Invalid toggle state'});return;}
      if(sendBusy){respond({ok:false,error:'Submission in progress'});return;}
      if(!privateComposer?.isConnected||!nativeEditor?.isConnected||!hiddenComposer?.contains(nativeEditor)){
        respond({ok:false,error:'Website composer changed. Refresh the tab.'});return;
      }
      if(!msg.enabled){
        // Do not unhide a stale extension-owned sanitized draft. Do not touch
        // unrelated website drafts or ever send a private draft to the page.
        const value=currentValue(nativeEditor);
        if(value && nativeDraft.owns(nativeEditor,bridge,value)){
          updateTextInput(nativeEditor,'');
          if(currentValue(nativeEditor)){
            respond({ok:false,error:'Cannot safely clear the previous sanitized website draft. Refresh the tab.'});return;
          }
          nativeDraft.reset();
        }else if(value){
          respond({ok:false,error:'Existing website draft detected. Clear it before switching modes.'});return;
        }
        protectionEnabled=false;
        restoreNativeContainer(hiddenComposer);
        // Full removal of the extension composer is necessary: leaving a
        // collapsed iframe in the native search field hides typed text.
        privateComposer.style.display='none';
        showReenableFrame();
      }else{
        if(currentValue(nativeEditor)){
          respond({ok:false,error:'Clear the website draft before enabling protection. Existing website text is not private.'});return;
        }
        protectionEnabled=true;
        hideNativeContainer(hiddenComposer);
        showPrivateComposer();
      }
      respond({ok:true,enabled:protectionEnabled});return;
    }
    if(msg.type==='SEND_SANITIZED'){
      sendSanitized(msg.text).then(respond).catch(e=>respond({ok:false,error:e.message}));
      return true;
    }
    if(msg.type==='RESET_NATIVE_DRAFT'){
      resetNativeDraft().then(respond).catch(e=>respond({ok:false,error:e.message}));
      return true;
    }
    if(msg.type==='GET_SANITIZED_MESSAGE'){
      respond(texts.has(msg.messageId)?{ok:true,text:texts.get(msg.messageId),rich:richTexts.get(msg.messageId)||null}:{ok:false});
      return;
    }
    if(msg.type==='RESIZE_FRAME'){
      // Restored answers must participate in normal page scrolling. A small
      // fixed-height iframe clips writing panes and produces nested scrolling;
      // measure trusted extension content and size the frame to fit it.
      const maxResponseHeight=24000;
      // Review expands within the viewport and shifts upward when a host
      // anchors its composer near the bottom of the screen.
      const composerMax=Math.min(520,Math.max(80,window.innerHeight-45));
      const height=Math.max(50,Math.min(msg.messageId?maxResponseHeight:composerMax,Number(msg.height)||120));
      if(msg.messageId){
        const f=frames.get(msg.messageId);
        if(f){f.style.height=height+'px';
          f.style.display=msg.hideFrame===true?'none':'block';
          const original=originals.get(msg.messageId);
          if(original){
            if(msg.hideOriginal===true)original.style.setProperty('display','none','important');
            else original.style.removeProperty('display');
          }
        }
      }else if(privateComposer){
        privateComposer.style.height=height+'px';
        privateComposer.style.transform='';
        const box=privateComposer.getBoundingClientRect();
        if(box.bottom>window.innerHeight-12&&box.top>0)privateComposer.style.transform='translateY(-'+Math.min(box.top,box.bottom-window.innerHeight+12)+'px)';
      }
      respond(msg.messageId?{ok:true}:{ok:true,appliedHeight:height});return;
    }
    if(msg.type==='RESCAN'){
      observerScan();respond({ok:true});return;
    }
  });
  mutation=new MutationObserver(()=>scheduleScan());
  mutation.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  pollTimer=setInterval(()=>{
    if(!checkRuntime())return;
    if(location.href!==lastLocation){
      lastLocation=location.href;
      const change=navigation.next(location.href);
      if(change.changed){
        if(change.preserved)register(); // Bind the new URL to the same mapping.
        else resetForNavigation(change.bridge);
      }
    }
    installComposer();
    if(!protectionEnabled)positionReenableFrame();
  },1800);
  if(typeof window.addEventListener==='function')window.addEventListener('resize',()=>{
    if(!protectionEnabled){positionReenableFrame();return;}
    if(!privateComposer?.isConnected)return;
    const rect=privateComposer.getBoundingClientRect();
    const room=Math.max(80,Math.floor(window.innerHeight-rect.top-14));
    const cap=Math.min(730,room);
    const current=Number.parseFloat(privateComposer.style.height)||140;
    if(current>cap)privateComposer.style.height=cap+'px';
    privateComposer.contentWindow?.postMessage({type:'PRIVACY_SHIELD_FRAME_BUDGET',height:Math.min(current,cap)-4},'*');
  });
  if(typeof window.addEventListener==='function')window.addEventListener('scroll',()=>{if(!protectionEnabled)positionReenableFrame();},true);
  installComposer();
  scheduleScan();
})();
