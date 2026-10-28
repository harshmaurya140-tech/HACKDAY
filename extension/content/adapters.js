// Adapters must be verified against the logged-in website during browser testing.
// Changes to ChatGPT/Claude/Gemini markup can break selectors. Fail closed.
(() => {
  const defs={
    'chatgpt.com': {
      id:'chatgpt',
      composer:[
        // The Oct-2026 ChatGPT composer may be ProseMirror without #prompt-textarea.
        'div.ProseMirror[role="textbox"][contenteditable="true"]',
        '[data-composer-markdown][contenteditable="true"]',
        '#prompt-textarea',
        '[data-testid="composer-text-input"]',
        'textarea[name="prompt-textarea"]',
        'textarea[placeholder*="Message"]',
        'form [contenteditable="true"][role="textbox"]',
        'form div[contenteditable="true"]',
        'div#prompt-textarea[contenteditable="true"]',
        'textarea#mobile-composer-prompt'
      ],
      send:[
        'button#composer-submit-button',
        'button[data-testid="send-button"]',
        'button[aria-label="Send prompt"]',
        'button[aria-label="Send message"]',
        'form button[type="submit"]'
      ],
      assistant:['[data-message-author-role="assistant"]','[data-role="assistant"]','[data-message-author="assistant"]','[data-markdown-text-style="assistant-message"]'],
      user:['[data-message-author-role="user"]','[data-role="user"]','[data-message-author="user"]','[data-user-message-bubble="true"]']
    },
    'chat.openai.com': {
      id:'chatgpt',
      composer:[
        'div.ProseMirror[role="textbox"][contenteditable="true"]',
        '[data-composer-markdown][contenteditable="true"]',
        '#prompt-textarea',
        'textarea[name="prompt-textarea"]',
        'textarea[placeholder*="Message"]',
        'form [contenteditable="true"][role="textbox"]',
        'form div[contenteditable="true"]'
      ],
      send:[
        'button#composer-submit-button',
        'button[data-testid="send-button"]',
        'button[aria-label="Send prompt"]',
        'form button[type="submit"]'
      ],
      assistant:['[data-message-author-role="assistant"]','[data-role="assistant"]','[data-message-author="assistant"]','[data-markdown-text-style="assistant-message"]'],
      user:['[data-message-author-role="user"]','[data-role="user"]','[data-message-author="user"]','[data-user-message-bubble="true"]']
    },
    'claude.ai': {
      id:'claude',
      composer:['div.ProseMirror[contenteditable="true"]','[data-testid="chat-input"] [contenteditable="true"]','[role="textbox"][contenteditable="true"]'],
      send:['button[data-testid="chat-input-send"]','button[aria-label="Send message"]','button[aria-label="Send Message"]','button[data-testid="send-button"]','button[aria-label="Send"]','form button[type="submit"]'],
      assistant:['.font-claude-response','[data-testid="assistant-message"]','.font-claude-message'],
      user:['[data-testid="user-message"]']
    },
    'gemini.google.com': {
      id:'gemini',
      composer:['rich-textarea .ql-editor[contenteditable="true"]','rich-textarea [contenteditable="true"]','div.ql-editor[contenteditable="true"]','div[contenteditable="true"][data-placeholder]','[aria-label="Enter a prompt here"][contenteditable="true"]'],
      send:['button[aria-label="Send message"]','button.send-button','[data-test-id="send-button-container"] button','button[data-testid="send-button"]','.send-button-container button','button[aria-label="Send"]'],
      assistant:['model-response','.model-response','[data-test-id="model-response"]'],
      user:['user-query','[data-test-id="user-message"]','.user-query']
    }
  };
  const data=defs[location.hostname]||{
    id:'generic',
    composer:['textarea','[contenteditable="true"][role="textbox"]','[contenteditable="true"][data-placeholder]','[contenteditable="true"]'],
    send:['button[type="submit"]','button[aria-label*="Send" i]','button[data-testid*="send" i]'],
    assistant:['[data-message-author-role="assistant"]','[data-role="assistant"]','[data-message-author="assistant"]','.markdown','.prose'],
    user:['[data-message-author-role="user"]','[data-role="user"]','[data-message-author="user"]']
  };
  if(!data) return;
  data.query=(list,root=document)=>{
    for(const selector of list){try{const found=root.querySelector(selector);if(found)return found;}catch{}}
    return null;
  };
  data.queryAll=(list,root=document)=>{
    // Selectors are priority-based fallbacks, not a union. Collecting from all
    // selectors duplicates nested message containers and (on Claude) can pull
    // the accessible "Claude responded:" heading or thinking/status summaries
    // into the restored message instead of only the response body.
    for(const selector of list){
      try{
        const found=[...root.querySelectorAll(selector)];
        if(found.length){
          // Do not make overlays for both a parent and its nested match.
          return found.filter(node=>!found.some(other=>other!==node&&other.contains(node)));
        }
      }catch{}
    }
    return [];
  };
  data.findSend=(scope)=>{
    if(!scope?.querySelectorAll)return null;
    const buttons=[...scope.querySelectorAll('button')].filter(button=>{
      if(button.disabled||button.getAttribute('aria-disabled')==='true')return false;
      const label=[button.getAttribute('aria-label'),button.getAttribute('title'),button.getAttribute('data-testid')].filter(Boolean).join(' ');
      if(/stop|abort|cancel|record|microphone|voice|dictate/i.test(label))return false;
      const known=data.send.some(selector=>button.matches(selector));
      const named=/^(send|send message|send prompt|ask|submit)$/i.test((button.textContent||'').trim());
      return (known||named)&&button.getClientRects().length>0&&getComputedStyle(button).visibility!=='hidden';
    });
    return buttons.length===1?buttons[0]:null;
  };
  // Editors inside AI-generated writing canvases may also be ProseMirror.
  // Prefer the *conversation* input at the bottom of the viewport, not the
  // first arbitrary contenteditable node. Do not interact with stale/hidden
  // editors owned by the website's document editor.
  data.findComposer=(root=document)=>{
    if(data.selectedComposer?.isConnected)return data.selectedComposer;
    const candidates=[];
    const seen=new Set();
    for(const selector of data.composer){
      let matches=[];
      try{matches=[...root.querySelectorAll(selector)];}catch{}
      for(const node of matches){
        if(seen.has(node))continue;
        if(data.id==='generic'){
          const label=[node.getAttribute?.('aria-label'),node.getAttribute?.('placeholder'),node.getAttribute?.('data-placeholder'),node.id].filter(Boolean).join(' ');
          if(node.closest?.('form')?.querySelector('input[type="password"],input[autocomplete="cc-number"]'))continue;
          if(node.disabled||node.readOnly||/search|password|email|comment|address/i.test(label))continue;
          if(!/message|prompt|ask|chat|question/i.test(label))continue;

        }
        seen.add(node);
        if(node.closest?.('[data-private-shield="true"], [data-privacy-shield="true"]'))continue;
        const rect=node.getBoundingClientRect?.();
        if(rect && (rect.height===0||rect.width===0))continue;
        const form=node.closest?.('form');
        const ancestor=node.closest?.('[role="dialog"], [data-testid*="artifact"], [data-testid*="canvas"], [class*="document-editor"], [data-oai-writing-block-surface], .writing-block-editor');
        // Host sites create separate document/canvas editors. Those are not
        // the protected chat channel, regardless of which selector matched.
        if(ancestor&&!form)continue;
        const inComposer=Boolean(form || node.closest?.('rich-textarea, input-area-v2, [data-testid*="composer"], [data-testid="chat-input"]'));
        const score=(rect?.bottom||0)+(inComposer?2000:0)+(form?500:0)-(ancestor?2000:0);
        candidates.push({node,score});
      }
    }
    if(data.id==='generic'&&candidates.length!==1)return null;
    candidates.sort((a,b)=>b.score-a.score);
    return candidates[0]?.node||null;
  };
  // Only the AI response body is safe to restore; the parent message can
  // include user echoes, accessible "You said/Gemini said" captions and
  // action controls. If no body can be isolated, do not treat the whole
  // transcript as a reply.
  data.answerBody=(node)=>{
    if(data.id!=='gemini')return node;
    const selectors=['.markdown','[data-test-id="response-content"]','.model-response-text',
      '[class*="response-content"]','message-content'];
    for(const selector of selectors){
      try{
        const found=[...(node.matches?.(selector)?[node]:[]),...(node.querySelectorAll?.(selector)||[])];
        // Several Markdown sections of one response belong to one message.
        // The serializer below preserves line/paragraph boundaries for them.
        if(found.length)return found.filter(n=>!found.some(other=>other!==n&&other.contains?.(n)));
      }catch{}
    }
    return node;
  };
  // Read only rendered message content, preserving paragraph/list/table
  // boundaries in browsers where custom element .textContent loses newlines.
  // Never serialize site controls, the user's echo, or script/style content.
  data.readableText=(node)=>{
    if(!node)return '';
    if(typeof node.querySelectorAll!=='function')return String(node.innerText||node.textContent||'').trim();
    const excluded='button, [role="button"], [role="toolbar"], [role="status"], '+
      '[aria-hidden="true"], .sr-only, .cdk-visually-hidden, style, script, svg, user-query, '+
      '[data-test-id*="message-actions"], [data-test-id*="footer"]';
    const pieces=[];
    const read=(current)=>{
      if(current.nodeType===3){pieces.push(current.nodeValue||'');return;}
      if(current.nodeType!==1)return;
      if(current.matches?.(excluded))return;
      const tag=String(current.tagName||'').toUpperCase();
      if(tag==='BR'){pieces.push('\n');return;}
      const block=['P','DIV','SECTION','ARTICLE','H1','H2','H3','H4','LI','UL','OL','PRE','BLOCKQUOTE','TR'];
      const multi=block.includes(tag);
      if(multi)pieces.push('\n');
      if(tag==='LI')pieces.push('• ');
      for(const child of current.childNodes||[])read(child);
      if(tag==='TD'||tag==='TH')pieces.push('  ');
      if(multi)pieces.push('\n');
    };
    read(node);
    const extracted=pieces.join('').replace(/[ \t]*\n[ \t]*/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
    return extracted||String(node.innerText||'').trim();
  };
  // Read the *structure* of Gemini's actual sanitized Markdown response.
  // The previous plain-text serializer added synthetic bullet dots/newlines,
  // creating the blank bullet lines seen in Gemini. No host HTML/CSS or
  // untrusted attributes are transferred to the private extension frame.
  data.extractMessageRich=(node,role='assistant')=>{
    if(data.id!=='gemini'||role!=='assistant')return null;
    const bodies=data.answerBody(node);
    // An unknown transcript wrapper may include both user and assistant text.
    // Do not serialize it when no verified answer-body selector matched.
    if(bodies===node && node.matches?.('model-response, .model-response, [data-test-id="model-response"]'))return null;
    const roots=Array.isArray(bodies)?bodies:[bodies];
    const excluded='button, [role="button"], [role="toolbar"], [role="status"], ' +
      '[aria-hidden="true"], .sr-only, style, script, svg, user-query, ' +
      '[data-test-id*="message-actions"], [data-test-id*="footer"], mat-icon, ' +
      '.mat-icon, source-footnote, img, video, audio, canvas, iframe';
    const tags=new Set(['P','DIV','SECTION','ARTICLE','H1','H2','H3','H4','H5','H6',
      'UL','OL','LI','STRONG','B','EM','I','U','S','DEL','CODE','PRE','BLOCKQUOTE',
      'BR','HR','TABLE','THEAD','TBODY','TFOOT','TR','TD','TH','A','SPAN','SUP','SUB','DL','DT','DD']);
    let count=0,chars=0;
    function serialize(current,depth=0){
      if(++count>8000||depth>45)throw Error('Response structure exceeds local safe limits');
      if(current.nodeType===3){
        const text=String(current.nodeValue||'');
        chars+=text.length;
        if(chars>175000)throw Error('Response text exceeds local safe limits');
        return {tag:'#text',text};
      }
      if(current.nodeType!==1||current.matches?.(excluded))return null;
      const tag=String(current.tagName||'').toUpperCase();
      const children=[];
      for(const child of current.childNodes||[]){
        const entry=serialize(child,depth+1);
        if(entry)children.push(entry);
      }
      if(!tags.has(tag))return {tag:'span',children};
      const entry={tag:tag.toLowerCase(),children};
      if(tag==='A'){
        // Only HTTP(S) links; dangerous or unsupported schemes never leave
        // this sanitized DOM structure.
        const href=current.getAttribute?.('href');
        if(href){
          try{const u=new URL(href,location.href);if(['http:','https:'].includes(u.protocol))entry.href=u.href;}catch{}
        }
      }
      return entry;
    }
    try{
      const out={tag:'root',children:roots.map(n=>serialize(n)).filter(Boolean)};
      // An empty/placeholder-only loading node is not a complete assistant
      // response: keep the sanitized website view until it contains content.
      const hasReadableText=n=>n.tag==='#text'?Boolean(n.text.trim()):n.children.some(hasReadableText);
      return hasReadableText(out)?out:null;
    }catch{return null;}
  };
  data.messageAnchor=(node)=>{
    if(data.id==='chatgpt')return node.closest?.('[data-testid^="conversation-turn"], article[data-testid*="conversation"], [data-chatgpt-search-unit-key]')||node;
    if(data.id==='gemini')return node.closest?.('model-response, user-query')||node;
    return node;
  };
  data.hiddenOriginal=(node)=>{
    if(data.id==='gemini')return node.closest?.('model-response, user-query')||node;
    // ChatGPT's response wrapper can contain an artifact editor. Hide only
    // the assistant text/message, never its entire conversation feed.
    return node;
  };
  /**
   * Clean *page UI* from a sanitized Claude response, not AI-authored prose.
   * The site sometimes exposes a screen-reader preview like
   * "Claude responded: <truncated preview>…" alongside the actual answer,
   * and action/timestamp controls after it. Those aren't part of the answer.
   * Only sanitized source text enters this routine; never restored originals.
   */
  data.extractMessageText=(node,role='assistant')=>{
    let text=String(node?.innerText||node?.textContent||'').trim();
    if(data.id==='chatgpt')return data.readableText(node);
    if(data.id==='gemini'){
      if(role==='user'){
        const body=node.querySelector?.('.query-text');
        if(body)return data.readableText(body);
      }
      let actual=node;
      if(role==='assistant')actual=data.answerBody(node);
      if(Array.isArray(actual))return actual.map(data.readableText).filter(Boolean).join('\n\n').trim();
      if(actual!==node)return data.readableText(actual);
      // Never restore the transcript wrapper as if it were one AI answer.
      // On unknown layouts fail closed for response display only: the
      // sanitized native content remains visible until a clean body is found.
      if(node.querySelector?.('user-query, [data-test-id="user-message"]'))return '';
      // Take only directly supported response text, not user/assistant
      // accessibility labels or page action toolbar text.
      const child=node.querySelector?.('message-content, .response-text, [data-test-id="markdown-content"]');
      if(child)return data.readableText(child);
    }
    if(data.id!=='claude'||role!=='assistant'||!text)return text;
    const normalize=s=>String(s).replace(/\s+/g,' ').trim();
    const unwanted=new Set();
    const ariaPreview=[];
    // Only element-backed UI chrome is removed; don't strip normal prose.
    const candidates=[
      '.sr-only','[class~="sr-only"]','[data-testid*="message-actions"]',
      '[data-testid*="message-footer"]','[data-testid*="timestamp"]',
      '[role="status"]','[role="toolbar"]','button','[role="button"]','time'
    ];
    if(typeof node.querySelectorAll==='function')for(const selector of candidates){
      try{
        for(const ui of node.querySelectorAll(selector)){
          if(ui===node)continue;
          const value=normalize(ui.innerText||ui.textContent||'');
          if(!value)continue;
          if(selector.includes('sr-only'))ariaPreview.push(value);
          unwanted.add(value);
        }
      }catch{/* DOM is website-controlled; skip unsupported selectors. */}
    }
    for(const preview of ariaPreview){
      // An accessibility preview can be visually clipped but still included in innerText.
      // Only remove when it occurs at the beginning, not from the real body.
      const prefix=normalize(text.slice(0,preview.length+60));
      if(prefix.startsWith(preview))text=text.slice(text.indexOf(preview)+preview.length).trimStart();
    }
    // Claude may prepend a truncated accessibility summary adjacent to the
    // full answer, even when it isn't exposed by a stable DOM selector.
    // Repeated beginning after the ellipsis proves the initial segment was a
    // preview, not genuine answer content. Don't key off the person's name.
    const lead=text.match(/^Claude responded:\s*([\s\S]{12,900}?)…\s*([\s\S]+)$/i);
    if(lead){
      const canonical=s=>normalize(s).toLowerCase().replace(/[’‘`]/g,"'");
      const previewStart=canonical(lead[1]).slice(0,19);
      const bodyStart=canonical(lead[2]).slice(0,19);
      if(previewStart.length>=12 && previewStart===bodyStart)text=lead[2].trimStart();
    }
    // When there is no repeated preview, a standalone accessibility label
    // may still precede the actual answer on older Claude versions.
    text=text.replace(/^Claude responded:\s*(?=\S)/i,'');
    // Claude occasionally serializes an action chip as private-use icon
    // glyphs concatenated directly to the text, e.g. <glyph>Create a doc<glyph>.
    // Remove ONLY glyph-delimited site controls at the tail. The same words
    // in actual assistant prose without those wrapper glyphs are preserved.
    text=text.replace(/(?:[\uE000-\uF8FF][\s\uE000-\uF8FF]*)+(?:Create a doc|Create document|Copy response|Retry)(?:[\s\uE000-\uF8FF]*)+$/iu,'').trimEnd();
    // Remove actual page controls only if they are separate trailing elements;
    // don't remove the same words when they occur in the assistant's answer.
    for(let pass=0;pass<unwanted.size+1;pass++){
      let changed=false;
      for(const value of unwanted){
        const suffix=text.trimEnd();
        // Claude may render small SVG/control glyphs as trailing symbols after
        // the action label. Ignore only those trailing decorations here.
        const plain=suffix.replace(/[\s\p{S}]{0,12}$/u,'').trimEnd();
        if(!plain.endsWith(value))continue;
        const start=plain.length-value.length;
        if(start===0 || /[^\p{L}\p{N}]/u.test(plain[start-1])){
          text=plain.slice(0,start).trimEnd();changed=true;break;
        }
      }
      if(!changed)break;
    }
    return text.trim();
  };
  window.__privacyShieldAdapter=data;
})();
