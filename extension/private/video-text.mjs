import {recognize} from './ocr.mjs';
import {checkImageSize} from './image-limits.mjs';
import {MAX_MEDIA_SECONDS} from './media-options.mjs';
// Original pixels stay private. Sampling is disclosed, never called full-video redaction.
export function sampleTimes(duration){
 if(!Number.isFinite(duration)||duration<=0||duration>MAX_MEDIA_SECONDS)throw Error('Video must have a readable duration of at most ten minutes.');
 const count=Math.min(24,Math.max(1,Math.ceil(duration/5)));
 return Array.from({length:count},(_,i)=>count===1?Math.min(.05,duration/2):Math.max(0,Math.min(duration-.05,i*duration/(count-1))));
}
export async function readVideoFrames(file,{signal,onProgress=()=>{}}={}){
 if(!file||file.size>8*1024*1024)throw Error('Video limit: 8 MB.');
 signal?.throwIfAborted();const controller=new AbortController(),abort=()=>controller.abort(signal?.reason);
 signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(new Error('Video visual-text reading timed out.')),180000);
 const video=document.createElement('video'),canvas=document.createElement('canvas'),url=URL.createObjectURL(file);
 const wait=event=>new Promise((resolve,reject)=>{
  const cleanup=()=>{video.removeEventListener(event,done);video.removeEventListener('error',fail);controller.signal.removeEventListener('abort',cancel);};
  const done=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(Error('Video could not be decoded by Chrome.'));},cancel=()=>{cleanup();reject(controller.signal.reason||new DOMException('Cancelled','AbortError'));};
  if(controller.signal.aborted){cancel();return;}
  video.addEventListener(event,done,{once:true});video.addEventListener('error',fail,{once:true});controller.signal.addEventListener('abort',cancel,{once:true});
 });
 try{
  video.preload='auto';video.muted=true;const ready=wait('loadeddata');video.src=url;await ready;
  if(video.duration===Infinity){const seek=wait('seeked');video.currentTime=Number.MAX_SAFE_INTEGER;await seek;}
  if(!video.videoWidth&&!video.videoHeight){const error=Error('Audio-only container');error.code='NO_VIDEO_TRACK';throw error;}
  const times=sampleTimes(video.duration);checkImageSize({width:video.videoWidth,height:video.videoHeight});
  const scale=Math.min(1,1600/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
  const context=canvas.getContext('2d'),lines=[],seen=new Set();
  for(let i=0;i<times.length;i++){
   controller.signal.throwIfAborted();onProgress(`Reading video frame ${i+1} of ${times.length} locally`);
   if(Math.abs(video.currentTime-times[i])>.001){const seek=wait('seeked');video.currentTime=times[i];await seek;}
   context.drawImage(video,0,0,canvas.width,canvas.height);
   try{
    const result=await recognize(canvas,{signal:controller.signal});const text=result.text.trim(),key=text.replace(/\s+/g,' ').toLowerCase();
    if(text&&!seen.has(key)){seen.add(key);lines.push(`[${times[i].toFixed(1)}s] ${text}`);}
   }catch(e){controller.signal.throwIfAborted();if(e.message!=='No readable text detected.')throw e;}
   if(lines.join('\n').length>12000)throw Error('Video text exceeds 12,000 characters. Choose a shorter clip.');
  }
  return {text:lines.join('\n'),pages:times.length,notice:`Visual text sampled from ${times.length} frames using English OCR. Fast changes, non-English text, faces and scenes may be missed; this is not full visual understanding or a redacted video.`};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort();video.pause();video.removeAttribute('src');video.load();canvas.width=canvas.height=0;URL.revokeObjectURL(url);}
}
export async function readVideo(file,options={}){
 let frames;
 try{frames=await readVideoFrames(file,options);}catch(e){options.signal?.throwIfAborted();if(e.code==='NO_VIDEO_TRACK')return (await import('./media-text.mjs')).readMedia(file,options);throw e;}
 options.signal?.throwIfAborted();
 let speech,audioError;
 try{speech=await (await import('./media-text.mjs')).readMedia(file,options);}catch(e){options.signal?.throwIfAborted();audioError=e.message;}
 const text=[speech?.text&&'Spoken transcript:\n'+speech.text,frames.text&&'Visible text (sampled frames):\n'+frames.text].filter(Boolean).join('\n\n');
 if(!text)throw Error('No readable speech or visual text in this video. '+(audioError||''));
 if(text.length>12000)throw Error('Combined video transcript and visual text exceed 12,000 characters.');
 return {text,pages:frames.pages,notice:frames.notice+(audioError?' Audio was not extracted: '+audioError:' '+speech.notice)};
}
