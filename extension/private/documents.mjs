import * as pdfjs from './vendor/pdf/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf/pdf.worker.mjs',import.meta.url).href;
const MAX_BYTES=8*1024*1024,MAX_TEXT=60000,MAX_PAGES=25;
export async function readDocument(file){
 if(!file||file.size>MAX_BYTES)throw Error('Choose a file smaller than 8 MB.');
 const ext=file.name.split('.').pop().toLowerCase();
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(['txt','md','csv'].includes(ext)){
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(text.length>MAX_TEXT||text.includes('\0'))throw Error('UTF-8 text only; maximum 60,000 characters.');
  return {text,pages:1,notice:'Text content only. The original filename is never included.'};
 }
 if(ext!=='pdf')throw Error('Supported: text PDF, UTF-8 TXT, Markdown and CSV. Images, scans, DOCX, audio and archives are blocked.');
 if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Invalid PDF header.');
 const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,enableXfa:false,disableAutoFetch:true,disableStream:true,useSystemFonts:false,cMapUrl:new URL('./vendor/pdf/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdf/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/pdf/wasm/',import.meta.url).href,maxImageSize:16_000_000,verbosity:0});
 task.onPassword=()=>{task.destroy();};
 let timer;
 try{
  const document=await Promise.race([task.promise,new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('PDF parsing timed out.'));task.destroy();},20000);})]);
  if(document.numPages>MAX_PAGES)throw Error('PDF limit: 25 pages.');
  const pages=[];let chars=0;
  for(let n=1;n<=document.numPages;n++){
   const page=await document.getPage(n),content=await page.getTextContent();
   const text=content.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('').trim();
   if(!text)throw Error('Image-only or unreadable page detected. Scanned PDFs need OCR and are blocked.');
   chars+=text.length;if(chars>MAX_TEXT)throw Error('PDF text exceeds 60,000 characters.');
   pages.push(`[Page ${n}]\n${text}`);page.cleanup();
  }
  // We create new text, not an edited original. No original objects, pixels,
  // metadata, annotations, files, links or hidden attachments are exported.
  return {text:pages.join('\n\n'),pages:document.numPages,notice:'Text extract only: images, layout, links, forms, annotations and metadata are discarded. This is not a redacted copy of the original PDF.'};
 }catch(e){throw Error(e.message==='PDF parsing timed out.'?e.message:'PDF could not be safely extracted. Encrypted, scanned, malformed or over-limit files are blocked.');}
 finally{clearTimeout(timer);await task.destroy();}
}
export async function createTextPDF(text){
 if(!/^[\x09\x0A\x0D\x20-\x7E]*$/.test(text))throw Error('PDF text export currently supports Latin ASCII only. Use UTF-8 text export to preserve your language.');
 const doc=await PDFLib.PDFDocument.create();doc.setProducer('Incognix');doc.setCreator('Incognix');doc.setTitle('Reviewed text');
 const font=await doc.embedFont(PDFLib.StandardFonts.Helvetica);let page,y;
 const next=()=>{page=doc.addPage([595,842]);y=795;};next();
 for(const original of text.replace(/\t/g,'    ').split(/\r?\n/)){
  let line='';const lines=[];
  for(const ch of original){if(font.widthOfTextAtSize(line+ch,10)>495){lines.push(line);line='';}line+=ch;}
  lines.push(line);
  for(const row of lines){if(y<45)next();page.drawText(row,{x:50,y,size:10,font});y-=14;}
 }
 return doc.save({useObjectStreams:false});
}
export async function extractGeneratedPDF(bytes){
 const task=pdfjs.getDocument({data:bytes.slice(),isEvalSupported:false,verbosity:0});
 try{const doc=await task.promise,parts=[];for(let i=1;i<=doc.numPages;i++)parts.push((await(await doc.getPage(i)).getTextContent()).items.map(x=>x.str).join(' '));return parts.join('\n');}finally{await task.destroy();}

}
