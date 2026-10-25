/* MV3 Chrome-only privacy bridge. No localhost, network access, cloud inference
 * or private data in page content scripts. The browser-local model runs in the
 * extension-origin private composer, not the host site's JavaScript context. */
importScripts('core/privacy-core.js','core/gliner2-output.js','core/rich-response.js');
const allowedHosts=new Set(['chatgpt.com','chat.openai.com','claude.ai','gemini.google.com']);
const KEY=bridge=>'ps-bridge:'+bridge;
const SESS=id=>'ps-session:'+id;
const DRAFT=id=>'ps-draft:'+id;
const INDEX=(tabId,conversation)=>`ps-conversation:${tabId}:${conversation}`;
function conversationKey(url){
  try{
    const u=new URL(url),path=u.pathname;
    if(u.hostname==='chatgpt.com'||u.hostname==='chat.openai.com'){
      const m=path.match(/^\/c\/([^/]+)/);return m?'chatgpt:'+m[1]:null;
    }
    if(u.hostname==='claude.ai'){
      const m=path.match(/^\/chat\/([^/]+)/);return m?'claude:'+m[1]:null;
    }
    if(u.hostname==='gemini.google.com'){
      const m=path.match(/^\/app\/([^/]+)/);return m?'gemini:'+m[1]:null;
    }
  }catch{}
  return null;
}
function allowed(url){try{const u=new URL(url);return u.protocol==='https:'&&allowedHosts.has(u.hostname);}catch{return false;}}
function privateFrame(sender){
  try{const u=new URL(sender.url);const own=new URL(chrome.runtime.getURL('/'));return u.protocol===own.protocol&&u.host===own.host && u.pathname==='/private/frame.html';}
  catch{return false;}
}
async function channel(bridge,sender){
  if(!/^[a-f0-9-]{36}$/.test(bridge||''))throw Error('Invalid private conversation channel');
  const entry=(await chrome.storage.session.get(KEY(bridge)))[KEY(bridge)];
  if(!entry||!Number.isInteger(entry.tabId))throw Error('Privacy session missing. Refresh the page.');
  if(sender.tab?.id!==entry.tabId)throw Error('Private frame does not belong to this tab');
  const tab=await chrome.tabs.get(entry.tabId);
  if(!allowed(tab.url))throw Error('Unsupported AI website');
  const from=new URL(sender.url);
  if(from.searchParams.get('bridge')!==bridge)throw Error('Private frame channel mismatch');
  return entry;
}
async function getSession(sessionId){return (await chrome.storage.session.get(SESS(sessionId)))[SESS(sessionId)]||PrivacyCore.newSession();}
async function putSession(sessionId,s){await chrome.storage.session.set({[SESS(sessionId)]:s});}
async function handle(msg,sender){
  if(!msg||typeof msg!=='object')throw Error('Invalid extension request');
  if(msg.type==='REGISTER_TAB'){
    if(!sender.tab||!allowed(sender.url||sender.tab.url))throw Error('Untrusted registration');
    if(!/^[a-f0-9-]{36}$/.test(msg.bridge||''))throw Error('Invalid channel');
    const current=(await chrome.storage.session.get(KEY(msg.bridge)))[KEY(msg.bridge)];
    if(current && current.tabId!==sender.tab.id)throw Error('Channel already belongs to another tab');
    // Reattach an existing local mapping when the same browser tab reloads an
    // established conversation. Only the extension content script can register;
    // the chat identifier is derived from Chrome's sender URL, not from a
    // webpage-supplied session ID. A new chat always starts isolated.
    const conversation=conversationKey(sender.url||sender.tab.url);
    const index=conversation?INDEX(sender.tab.id,conversation):null;
    const previous=index?(await chrome.storage.session.get(index))[index]:null;
    const sessionId=current?.sessionId||previous||`tab${sender.tab.id}_${msg.bridge}`;
    const updates={[KEY(msg.bridge)]:{tabId:sender.tab.id,sessionId}};
    if(index)updates[index]=sessionId;
    await chrome.storage.session.set(updates);
    return {ok:true};
  }
  if(!privateFrame(sender))throw Error('Only protected extension-origin frames can use private APIs');
  // All private requests other than HEALTH need an existing registered tab.
  if(msg.type==='HEALTH')return {ok:true,mode:'extension-only',detector:'Bundled BERT NER and Chrome contextual AI'};
  const entry=await channel(msg.bridge,sender);
  const sessionId=entry.sessionId;
  if(msg.type==='ANALYZE'){
    if(typeof msg.text!=='string'||msg.text.length>12000)throw Error('Draft is too long');
    if(!Array.isArray(msg.entities))throw Error('Model result missing; sending blocked');
    // Browser-local AI performed entity extraction and necessity assessment.
    // Validate every returned span before accepting; generic format validators
    // supplement extraction, never silently replace a failed local model.
    const settings=await chrome.storage.local?.get('incognixTerms');
    const terms=String(settings?.incognixTerms||'').split('\n').map(s=>s.trim()).filter(Boolean);
    const entities=PrivacyCore.mergeDetected(msg.text,[...msg.entities,...PrivacyCore.confidentialTerms(msg.text,terms)]);
    const draftId=crypto.randomUUID();
    const draft={text:msg.text,entities,created:Date.now()};
    await chrome.storage.session.set({[DRAFT(sessionId)]:{id:draftId,...draft}});
    return {ok:true,draft_id:draftId,entities,needs_permission:entities.some(x=>x.necessary)};
  }
  if(msg.type==='SAVE_EDITOR'||msg.type==='LOAD_EDITOR'){
    const tab=await chrome.tabs.get(entry.tabId);
    const route=conversationKey(tab.url)||new URL(tab.url).origin+new URL(tab.url).pathname;
    const key=`ps-editor:${entry.tabId}:${route}`;
    if(msg.type==='LOAD_EDITOR')return {ok:true,text:(await chrome.storage.session.get(key))[key]||''};
    if(typeof msg.text!=='string'||msg.text.length>12000)throw Error('Invalid private draft');
    if(msg.text)await chrome.storage.session.set({[key]:msg.text});else await chrome.storage.session.remove(key);
    return {ok:true};
  }
  if(msg.type==='CANCEL_DRAFT'){
    await chrome.storage.session.remove(DRAFT(sessionId));return {ok:true};
  }
  if(msg.type==='PREVIEW'){
    const stored=(await chrome.storage.session.get(DRAFT(sessionId)))[DRAFT(sessionId)];
    if(!stored||stored.id!==msg.draftId||Date.now()-stored.created>300000)throw Error('Draft expired; analyze again.');
    const session=await getSession(sessionId);
    const prepared=PrivacyCore.prepare(session,stored,msg.decisions||{});
    const previewId=crypto.randomUUID();
    await putSession(sessionId,session);
    await chrome.storage.session.set({[DRAFT(sessionId)]:{...stored,preview:{id:previewId,prepared}}});
    return {ok:true,previewId,...prepared};
  }
  if(msg.type==='PREPARE_AND_SEND'){
    const stored=(await chrome.storage.session.get(DRAFT(sessionId)))[DRAFT(sessionId)];
    if(!stored||stored.id!==msg.draftId||Date.now()-stored.created>5*60*1000)throw Error('Draft expired; analyze again.');
    if(!stored.preview||stored.preview.id!==msg.previewId)throw Error('Review outgoing text before sending.');
    const session=await getSession(sessionId);
    const prepared=stored.preview.prepared;
    if(!prepared.sanitized_text.trim())throw Error('Empty sanitized prompt blocked');
    // Keep mapping ready for early response restoration. Preserve the draft
    // until the adapter actually confirms submission; failed sends must not
    // destroy the user's pending approval state.
    await putSession(sessionId,session);
    let send;
    try{send=await chrome.tabs.sendMessage(entry.tabId,{type:'SEND_SANITIZED',bridge:msg.bridge,text:prepared.sanitized_text});}
    catch{throw Error('Could not reach the AI website. No raw text was submitted.');}
    if(!send?.ok)throw Error(send?.error||'The AI website did not confirm sanitized submission');
    await chrome.storage.session.remove(DRAFT(sessionId));
    return {ok:true,...prepared};
  }
  if(msg.type==='SET_PROTECTION_ENABLED'){
    if(typeof msg.enabled!=='boolean')throw Error('Invalid protection state');
    const result=await chrome.tabs.sendMessage(entry.tabId,{type:'SET_PROTECTION_ENABLED',bridge:msg.bridge,enabled:msg.enabled});
    if(!result?.ok)throw Error(result?.error||'Website privacy toggle unavailable');
    return {ok:true,enabled:msg.enabled};
  }
  if(msg.type==='RESET_NATIVE_DRAFT'){
    // Explicit user action only; no draft text passes through this bridge.
    const reset=await chrome.tabs.sendMessage(entry.tabId,{type:'RESET_NATIVE_DRAFT',bridge:msg.bridge});
    if(!reset?.ok)throw Error(reset?.error||'Unable to discard native draft');
    return {ok:true};
  }
  if(msg.type==='RESTORE_MESSAGE'){
    const sanitized=await chrome.tabs.sendMessage(entry.tabId,{type:'GET_SANITIZED_MESSAGE',bridge:msg.bridge,messageId:msg.messageId});
    if(!sanitized?.ok)throw Error('The sanitized response is unavailable');
    const session=await getSession(sessionId);
    const plain=PrivacyCore.restore(session,sanitized.text);
    // Rich formatting comes only from a restricted, sanitized structural
    // description of the AI answer. Original private values are restored
    // *here*, never in the AI page/content script.
    const rich=(!plain.unresolved && sanitized.rich)
      ? PrivacyShieldRich.restore(session,sanitized.rich,PrivacyCore.restore) : null;
    return {ok:true,...plain,rich:rich&&!rich.unresolved?rich.tree:null};
  }
  if(msg.type==='RESIZE_FRAME'||msg.type==='RESCAN'){
    const safe=msg.type==='RESCAN'?{type:msg.type,bridge:msg.bridge}:{type:'RESIZE_FRAME',bridge:msg.bridge,messageId:msg.messageId||'',height:msg.height,hideOriginal:msg.hideOriginal===true,hideFrame:msg.hideFrame===true};
    const result=await chrome.tabs.sendMessage(entry.tabId,safe);
    return result?.ok?{ok:true}:{ok:false,error:result?.error||'Page adapter unavailable'};
  }
  if(msg.type==='CLEAR_SESSION'){
    await chrome.storage.session.remove([SESS(sessionId),DRAFT(sessionId)]);
    const all=await chrome.storage.session.get(null);
    await chrome.storage.session.remove(Object.keys(all).filter(k=>k.startsWith(`ps-editor:${entry.tabId}:`)));
    return {ok:true};
  }
  throw Error('Unknown request');
}
const queues=new Map();
chrome.runtime.onMessage.addListener((m,sender,respond)=>{
  const key=String(sender.tab?.id)+':'+String(m?.bridge);
  const task=(queues.get(key)||Promise.resolve()).catch(()=>{}).then(()=>handle(m,sender));
  queues.set(key,task);
  task.finally(()=>{if(queues.get(key)===task)queues.delete(key);}).catch(()=>{});
  task.then(respond).catch(e=>respond({ok:false,error:e.message}));
  return true;
});

// Transient sensitive state belongs to a tab. Drop its mappings as soon as
// the tab closes, instead of retaining orphaned values in browser memory.
if(chrome.tabs?.onRemoved?.addListener){
  chrome.tabs.onRemoved.addListener(async tabId=>{
    try{
      const all=await chrome.storage.session.get(null);
      const sessions=new Set();
      const keys=[];
      for(const [key,value] of Object.entries(all)){
        if(key.startsWith(`ps-editor:${tabId}:`))keys.push(key);
        if(key.startsWith(`ps-conversation:${tabId}:`)){
          keys.push(key);if(typeof value==='string')sessions.add(value);
        }
        if(key.startsWith('ps-bridge:')&&value?.tabId===tabId){
          keys.push(key);if(typeof value.sessionId==='string')sessions.add(value.sessionId);
        }
      }
      for(const id of sessions)keys.push(SESS(id),DRAFT(id));
      if(keys.length)await chrome.storage.session.remove([...new Set(keys)]);
    }catch{/* No user data enters diagnostics. */}
  });
}

if(chrome.action?.onClicked)chrome.action.onClicked.addListener(()=>chrome.tabs.create({url:chrome.runtime.getURL('private/workspace.html')}));
