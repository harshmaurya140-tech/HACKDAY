import {imageDimensions,checkImageSize} from './image-limits.mjs';
import {recognize} from './ocr.mjs';
// Image pixels never enter the host page. Only reviewed OCR text can be sent.
export async function readImage(file,{signal,onProgress=()=>{}}={}){
 if(!file||file.size>8*1024*1024)throw Error('Image limit: 8 MB.');
 if(!/\.(png|jpe?g)$/i.test(file.name))throw Error('Choose a PNG or JPEG image.');
 signal?.throwIfAborted();
 const bytes=new Uint8Array(await file.arrayBuffer());checkImageSize(imageDimensions(bytes));
 let bitmap;
 try{
  bitmap=await createImageBitmap(new Blob([bytes]));signal?.throwIfAborted();checkImageSize(bitmap);
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);
  const result=await recognize(canvas,{signal,onProgress});signal?.throwIfAborted();
  return {text:result.text.trim(),pages:1,ocr:true,notice:'Review recognized text. OCR can miss words. Only text is shared; image pixels stay local.'};
 }finally{bitmap?.close();}
}
