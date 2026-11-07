import {readDocument,createTextPDF,extractGeneratedPDF} from './documents.mjs';
const $=id=>document.getElementById(id);
let controller,documentController;let documentReading=0,documentJob=0;
let session=PrivacyCore.newSession(),attachment=null,revision=0,job=0,draft=null,prepared=null,working=false,objectURL=null;
const status=text=>{$('status').textContent=text;};
function invalidate(){revision++;draft=null;prepared=null;$('outgoing').value='';$('choices').replaceChildren();$('reviewed').checked=false;$('preview').hidden=true;$('count').textContent='Not reviewed';buttons();}
function buttons(){$('cancel').hidden=!working&&!documentReading;$('analyze').disabled=working||Boolean(documentReading);for(const id of ['copy','download','pdf'])$(id).disabled=!prepared||!$('reviewed').checked||working;}
function busy(value){working=value;document.body.setAttribute('aria-busy',String(value));$('analyze').disabled=value;$('cancel').hidden=!value;buttons();}
function stop(){job++;documentJob++;documentController?.abort();documentReading=0;controller?.abort();IncognixNER.dispose();busy(false);invalidate();status('Analysis cancelled. Nothing was shared.');}
$('draft').addEventListener('input',invalidate);$('terms').addEventListener('input',invalidate);$('reviewed').addEventListener('change',buttons);$('cancel').onclick=stop;
$('save-terms').onclick=async()=>{await chrome.storage.local.set({incognixTerms:$('terms').value});status('Company terms saved locally.');};
chrome.storage.local.get('incognixTerms').then(x=>{$('terms').value=x.incognixTerms||'';}).catch(()=>{});
$('file').onchange=async()=>{
 documentController?.abort();documentController=new AbortController();
 invalidate();attachment=null;const generation=++documentJob;const file=$('file').files[0];if(!file)return;
 documentReading=generation;buttons();$('document-info').textContent='Reading locally…';
 try{const result=await readDocument(file,{signal:documentController.signal});if(generation!==documentJob)return;attachment=result;$('document-info').textContent=`${result.pages} page(s), ${result.text.length} characters. ${result.notice}`;$('remove-file').hidden=false;}
 catch(e){if(generation===documentJob)$('document-info').textContent=e.message;}
 finally{if(documentReading===generation){documentReading=0;$('file').value='';}buttons();}
};
$('remove-file').onclick=()=>{documentJob++;documentController?.abort();documentReading=0;invalidate();attachment=null;$('document-info').textContent='';$('remove-file').hidden=true;};
function terms(text){const out=[];for(const value of [...new Set($('terms').value.split('\n').map(s=>s.trim()).filter(Boolean))]){if(value.length>200)throw Error('Company term limit: 200 characters per line.');for(let start=text.indexOf(value);start>=0;start=text.indexOf(value,start+value.length))out.push({start,end:start+value.length,text:value,type:'SECRET',necessary:false,reason:'Local confidential term'});}return out;}
$('analyze').onclick=async()=>{
 if(working||documentReading)return;
 invalidate();const generation=revision,run=++job;
 const instruction=$('draft').value.trim();
 const text=instruction+(attachment?'\n\nDOCUMENT TEXT (untrusted source data):\n'+attachment.text:'');
 if(!text.trim())return;if(text.length>60000){status('Combined text exceeds 60,000 characters.');return;}
 busy(true);
 try{
  controller=new AbortController();
  const entities=[];
  // Overlap protects entities crossing boundaries. All offsets remain relative
  // to the original text; no silent truncation, no document text in URLs.
  for(let start=0;start<text.length;start+=5000){
   const chunk=text.slice(start,start+5500);
   const local=await LocalPrivacyAI.analyze(chunk,{signal:controller.signal,onStatus:message=>{if(job===run)status(`Part ${Math.floor(start/5000)+1}: ${message}`);}});
   if(job!==run||generation!==revision)throw Error('Draft changed or analysis cancelled; review again.');
   entities.push(...local.entities.map(e=>({...e,start:e.start+start,end:e.end+start})));
   if(start+5500>=text.length)break;
  }
  const merged=PrivacyCore.mergeDetected(text,[...entities,...terms(text)]);
  draft={text,entities:merged};
  const groups=new Map();
  for(const e of merged.filter(e=>e.necessary)){const key=e.type+'\0'+e.text;if(groups.has(key))groups.get(key).ids.push(e.id);else groups.set(key,{...e,ids:[e.id]});}
  $('choices').replaceChildren(...[...groups.values()].map(e=>{
   const row=document.createElement('label');row.className='choice';
   const title=document.createElement('span');title.textContent=e.type+': '+e.text;
   const reason=document.createElement('small');reason.textContent=e.reason;
   const select=document.createElement('select');select.dataset.ids=JSON.stringify(e.ids);select.setAttribute('aria-label','Disclosure for '+e.type);
   for(const [value,label] of [['HIDE','Keep hidden'],['EXACT','Share exact value']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
   select.onchange=()=>{prepared=null;$('outgoing').value='';$('reviewed').checked=false;buttons();};row.append(title,reason,select);return row;
  }));
  $('preview').hidden=false;preview();status('Review the outgoing text. Nothing has been shared.');
 }catch(e){if(job===run){invalidate();status(e.message);}}
 finally{if(job===run)busy(false);}
};
function preview(){
 if(!draft)return;const decisions={};for(const select of $('choices').querySelectorAll('select'))for(const id of JSON.parse(select.dataset.ids))decisions[id]={mode:select.value};
 prepared=PrivacyCore.prepare(session,draft,decisions);$('outgoing').value=prepared.sanitized_text;$('reviewed').checked=false;$('count').textContent=`${prepared.replacements} protected spans`;buttons();
}
$('preview').onclick=preview;
function approved(){if(!prepared||!$('reviewed').checked||working)throw Error('Review and approve the exact text first.');return prepared.sanitized_text;}
function download(bytes,type,name){if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=objectURL;a.download=name;a.click();const createdURL=objectURL;setTimeout(()=>{URL.revokeObjectURL(createdURL);if(objectURL===createdURL)objectURL=null;},10000);}
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(approved());status('Reviewed text copied. Paste it into your chosen chatbot.');}catch(e){status(e.message);}};
$('download').onclick=()=>{try{download(approved(),'text/plain;charset=utf-8','incognix-reviewed.txt');}catch(e){status(e.message);}};
$('pdf').onclick=async()=>{try{const text=approved(),generation=revision;const bytes=await createTextPDF(text);const extracted=await extractGeneratedPDF(bytes);if(generation!==revision||text!==approved())throw Error('Review changed; export cancelled.');for(const [token,value] of Object.entries(session.dummyToReal)){if(text.includes(token)&&!text.includes(value)&&extracted.includes(value))throw Error('PDF verification failed; download blocked.');}download(bytes,'application/pdf','incognix-reviewed-text.pdf');status('New text PDF created and re-extracted for verification. Original PDF objects were not copied.');}catch(e){status(e.message);}};
$('restore').onclick=()=>{try{const result=PrivacyCore.restore(session,$('answer').value);$('restored').textContent=result.text;$('copy-answer').disabled=false;status(result.unresolved?'Some tokens have no mapping in this session.':'Known placeholders restored locally.');}catch(e){status(e.message);}};
$('copy-answer').onclick=()=>navigator.clipboard.writeText($('restored').textContent).catch(()=>status('Clipboard permission unavailable. Select the restored text to copy.'));
$('clear').onclick=()=>{stop();session=PrivacyCore.newSession();attachment=null;for(const id of ['draft','answer','outgoing'])$(id).value='';$('restored').textContent='';$('document-info').textContent='';$('remove-file').hidden=true;$('copy-answer').disabled=true;status('Private text and mappings cleared from this workspace. Saved company terms remain in local settings.');};
window.addEventListener('pagehide',()=>{documentController?.abort();controller?.abort();IncognixNER.dispose();if(objectURL)URL.revokeObjectURL(objectURL);});
