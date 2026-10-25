import Tesseract from './vendor/ocr/tesseract.esm.min.js';
export async function recognize(canvas,{onProgress=()=>{},signal}={}){
 let worker,timer,expired=false;
 const abort=()=>worker?.terminate();signal?.throwIfAborted();signal?.addEventListener('abort',abort,{once:true});
 try{
  const work=(async()=>{
   worker=await Tesseract.createWorker('eng',1,{workerPath:new URL('./vendor/ocr/worker.min.js',import.meta.url).href,corePath:new URL('./vendor/ocr/',import.meta.url).href,langPath:new URL('../model/ocr/',import.meta.url).href,gzip:false,workerBlobURL:false,cacheMethod:'none',logger:m=>onProgress(Math.round((m.progress||0)*100))});
   if(expired || signal?.aborted){await worker.terminate();throw Error("OCR cancelled.");}
   signal?.throwIfAborted();
   const result=await worker.recognize(canvas,{}, {text:true,blocks:true});
   const words=[];let text='';
   for(const block of result.data.blocks||[])for(const para of block.paragraphs||[])for(const line of para.lines||[])for(const word of line.words||[]){
    if(!word.text?.trim())continue;
    const start=text.length;text+=word.text+' ';words.push({text:word.text,start,end:start+word.text.length,confidence:word.confidence,bbox:word.bbox});
   }
   if(!words.length||text.length>12000)throw Error('OCR text unavailable or over limit.');
   return {text,words,confidence:result.data.confidence};
  })();
  return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error('Local OCR timed out.'));abort();},90000);})]);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);await worker?.terminate();}
}
