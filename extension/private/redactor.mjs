import {imageDimensions,checkImageSize} from './image-limits.mjs';
import {recognize} from './ocr.mjs';
import * as pdfjs from './vendor/pdf/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf/pdf.worker.mjs',import.meta.url).href;
const $=id=>document.getElementById(id);let pages=[],generation=0,loading=null,render=null,url=null,isLoading=false,exporting=false,analysisController;
function clear(){generation++;analysisController?.abort();isLoading=false;exporting=false;render?.cancel();loading?.destroy();loading=null;render=null;for(const p of pages){p.original.width=p.original.height=p.canvas.width=p.canvas.height=0;}pages=[];$('pages').replaceChildren();$('export').disabled=true;$('suggest').disabled=true;if(url)URL.revokeObjectURL(url);url=null;}
function refresh(){$('suggest').disabled=isLoading||exporting||!pages.length; $('export').disabled=isLoading||exporting||!pages.length||!pages.every(p=>p.reviewed)||!pages.some(p=>p.rects.length); }
function draw(p){const c=p.canvas.getContext('2d');c.drawImage(p.original,0,0);c.fillStyle='#000';for(const r of p.rects)c.fillRect(r.x,r.y,r.w,r.h);}
function append(original){
 const index=pages.length,p={original,canvas:document.createElement('canvas'),rects:[],reviewed:false};p.canvas.width=original.width;p.canvas.height=original.height;
 const card=document.createElement('section');card.className='card';const title=document.createElement('h2');title.textContent=`Page ${index+1} — drag to redact`;
 const wrap=document.createElement('div');wrap.className='page';wrap.append(p.canvas);
 const undo=document.createElement('button');undo.textContent='Undo last region';
 const all=document.createElement('button');all.textContent='Redact entire page';
 const label=document.createElement('label');label.className='check';const check=document.createElement('input');check.type='checkbox';label.append(check,document.createTextNode('I reviewed this page and all visible details that will remain.'));
 const invalidate=()=>{generation++;p.reviewed=false;check.checked=false;refresh();};
 undo.onclick=()=>{if(isLoading||exporting)return;p.rects.pop();invalidate();draw(p);};all.onclick=()=>{if(isLoading||exporting)return;p.rects.push({x:0,y:0,w:p.canvas.width,h:p.canvas.height});invalidate();draw(p);};check.onchange=()=>{if(isLoading||exporting){check.checked=p.reviewed;return;}generation++;p.reviewed=check.checked;refresh();};
 let start=null;
 const point=e=>{const b=p.canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(p.canvas.width,(e.clientX-b.left)*p.canvas.width/b.width)),y:Math.max(0,Math.min(p.canvas.height,(e.clientY-b.top)*p.canvas.height/b.height))};};
 p.canvas.onpointerdown=e=>{if(isLoading||exporting)return;if(p.rects.length>=200){$('status').textContent='Region limit: 200 per page.';return;}start=point(e);p.canvas.setPointerCapture(e.pointerId);};
 p.canvas.onpointermove=e=>{if(!start)return;draw(p);const end=point(e),ctx=p.canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(Math.min(start.x,end.x),Math.min(start.y,end.y),Math.abs(end.x-start.x),Math.abs(end.y-start.y));};
 p.canvas.onpointerup=e=>{if(!start)return;const end=point(e);const r={x:Math.floor(Math.min(start.x,end.x)),y:Math.floor(Math.min(start.y,end.y)),w:Math.ceil(Math.abs(end.x-start.x))+2,h:Math.ceil(Math.abs(end.y-start.y))+2};start=null;if(r.w>3&&r.h>3)p.rects.push(r);invalidate();draw(p);};
 p.canvas.onpointercancel=()=>{start=null;draw(p);};
 card.append(title,wrap,undo,all,label);$('pages').append(card);pages.push(p);draw(p);return p;
}
$('reset').onclick=()=>{if(isLoading||exporting)return;clear();$('source').value='';$('status').textContent='Document cleared.';};
$('source').onchange=async()=>{
 clear();const run=generation,file=$('source').files[0];if(!file)return;
 if(file.size>8*1024*1024){$('status').textContent='File limit: 8 MB.';return;}
 isLoading=true;refresh();$('status').textContent='Rendering locally…';$('source').disabled=true;let timer;
 try{
  timer=setTimeout(()=>{render?.cancel();loading?.destroy();},30000);
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='pdf'){
   loading=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableXfa:false,verbosity:0,maxImageSize:16_000_000,cMapUrl:new URL('./vendor/pdf/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdf/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/pdf/wasm/',import.meta.url).href});
   loading.onPassword=()=>loading?.destroy();
   const doc=await loading.promise;if(doc.numPages>10)throw Error('PDF limit: 10 pages.');
   let pixels=0;
   for(let n=1;n<=doc.numPages;n++){
    if(generation!==run)return;
    $('status').textContent=`Rendering page ${n} of ${doc.numPages}…`;
    const page=await doc.getPage(n);const viewport=page.getViewport({scale:1.5});
    pixels+=viewport.width*viewport.height;if(pixels>20_000_000||viewport.width>5000||viewport.height>5000)throw Error('Document pixel budget exceeded.');
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    render=page.render({canvasContext:canvas.getContext('2d'),viewport,annotationMode:pdfjs.AnnotationMode.DISABLE,background:'white'});await render.promise;
    if(generation!==run)return;append(canvas);page.cleanup();
   }
  }else if(['png','jpg','jpeg'].includes(ext)){
   checkImageSize(imageDimensions(new Uint8Array(await file.slice(0,262144).arrayBuffer())));
   const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>16_000_000){bitmap.close();throw Error('Image limit: 16 megapixels.');}
   const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);bitmap.close();if(generation!==run)return;append(canvas);
  }else throw Error('Choose a PDF, PNG or JPEG.');
  $('status').textContent='Drag to remove private regions. Check every page. At least one region is required for export.';
 }catch(e){if(generation===run){clear();$('status').textContent='Unable to render safely. Encrypted, malformed or oversized files are blocked.';}}
 finally{clearTimeout(timer);await loading?.destroy();loading=null;render=null;isLoading=false;refresh();$('source').disabled=false;}
};
$('export').onclick=async()=>{
 if($('export').disabled)return;const run=generation;exporting=true;refresh();
 try{
  const doc=await PDFLib.PDFDocument.create();doc.setTitle('Redacted document');doc.setCreator('Incognix');doc.setProducer('Incognix');
  for(const p of pages){
   draw(p);
   // Encode only the composited pixels. Never copy original PDF pages,
   // annotations, attachments, text, metadata, original JPEGs or EXIF.
   const blob=await new Promise(resolve=>p.canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Image encoding failed');
   const image=await doc.embedPng(await blob.arrayBuffer());const width=595,height=width*p.canvas.height/p.canvas.width;
   doc.addPage([width,height]).drawImage(image,{x:0,y:0,width,height});
  }
  const bytes=await doc.save({useObjectStreams:false});if(generation!==run)return;
  const verification=pdfjs.getDocument({data:bytes.slice(),isEvalSupported:false,verbosity:0});
  try{const checked=await verification.promise;if(checked.numPages!==pages.length)throw Error('Page count mismatch');for(let i=1;i<=checked.numPages;i++){const text=await(await checked.getPage(i)).getTextContent();if(text.items.some(x=>x.str?.trim()))throw Error('Unexpected recoverable text');}if(await checked.getAttachments())throw Error('Unexpected attachment');}finally{await verification.destroy();}
  if(generation!==run)return;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download='incognix-redacted.pdf';a.click();$('status').textContent='New raster PDF exported. Selected pixels removed; no original PDF objects copied. Unselected content remains visible.';
 }catch{$('status').textContent='Export verification failed. No file was downloaded.';}
 finally{exporting=false;refresh();}
};
$('suggest').onclick=async()=>{
 if(isLoading||exporting||!pages.length)return;
 for(const p of pages)p.reviewed=false;for(const check of $('pages').querySelectorAll('input[type=checkbox]'))check.checked=false;
 const run=generation;isLoading=true;analysisController=new AbortController();refresh();
 try{
  const terms=String((await chrome.storage.local.get('incognixTerms')).incognixTerms||'').split('\n').map(s=>s.trim()).filter(Boolean);
  for(let i=0;i<pages.length;i++){
   const p=pages[i];
   const ocr=await recognize(p.original,{signal:analysisController.signal,onProgress:percent=>{$('status').textContent=`Page ${i+1}: local English OCR ${percent}%`;}});
   if(generation!==run)return;
   const local=await LocalPrivacyAI.analyze(ocr.text,{signal:analysisController.signal,onStatus:message=>{$('status').textContent=`Page ${i+1}: ${message}`;}});
   if(generation!==run)return;
   const entities=PrivacyCore.mergeDetected(ocr.text,[...local.entities,...PrivacyCore.confidentialTerms(ocr.text,terms)]);
   for(const word of ocr.words){if(word.confidence<80||entities.some(e=>e.start<word.end&&word.start<e.end)){const b=word.bbox;p.rects.push({x:Math.max(0,b.x0-3),y:Math.max(0,b.y0-3),w:b.x1-b.x0+6,h:b.y1-b.y0+6});}}
   p.reviewed=false;draw(p);
  }
  for(const check of $('pages').querySelectorAll('input[type=checkbox]'))check.checked=false;
  $('status').textContent='Suggestions applied; low-confidence OCR words also hidden. Inspect every page for missed text, faces, logos and other confidential details. Nothing exported.';
 }catch{if(generation===run)$('status').textContent='Local suggestions could not be verified. Use manual regions and inspect every page; nothing exported.';}
 finally{isLoading=false;refresh();}
};
window.addEventListener('pagehide',clear);
