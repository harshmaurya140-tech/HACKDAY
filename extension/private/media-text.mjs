import {MAX_MEDIA_SECONDS,MEDIA_DEADLINE_MS,speechLanguage,validateLanguage} from './media-options.mjs';
// Original audio/video never enters the provider page. Review the transcript.
export async function readMedia(file,{signal,onProgress=()=>{},language}={}){
 if(!file||file.size>8*1024*1024||! /\.(wav|mp3|m4a|ogg|flac|webm|mp4)$/i.test(file.name))throw Error('Use audio/video up to 8 MB and ten minutes.');
 language=validateLanguage(language||await speechLanguage());
 signal?.throwIfAborted();
 const inputSignal=signal,controller=new AbortController();signal=controller.signal;
 let worker,ctx,media,url,timer;
 let rejectStop;
 const stopped=new Promise((_,reject)=>{rejectStop=reject;});
 const abort=()=>{controller.abort();worker?.terminate();rejectStop(new DOMException('Media reading cancelled.','AbortError'));};
 inputSignal?.addEventListener('abort',abort,{once:true});
 try{
  timer=setTimeout(()=>{controller.abort();worker?.terminate();rejectStop(Error('Local media reading timed out. Try a shorter clip.'));},MEDIA_DEADLINE_MS);
  const work=(async()=>{
   url=URL.createObjectURL(file);media=document.createElement('audio');media.preload='metadata';media.src=url;
   await new Promise((resolve,reject)=>{media.onloadedmetadata=resolve;media.onerror=()=>reject(Error('Unsupported or malformed media. Export WAV, MP3, or an audio-bearing MP4/WebM clip.'));});
   // MediaRecorder WebM often omits a duration field. Let the native demuxer
   // seek to the end before decoding rather than rejecting valid recordings.
   if(media.duration===Infinity&&/\.webm$/i.test(file.name)){
    await new Promise((resolve,reject)=>{media.onseeked=resolve;media.onerror=()=>reject(Error('Unreadable WebM timeline.'));media.currentTime=Number.MAX_SAFE_INTEGER;});
   }
   if(!Number.isFinite(media.duration)||media.duration<=0||media.duration>MAX_MEDIA_SECONDS)throw Error('Audio/video limit: ten minutes, with a readable duration.');
   signal?.throwIfAborted();onProgress('Decoding audio');signal?.throwIfAborted();
   ctx=new AudioContext({sampleRate:16000});
   const decoded=await ctx.decodeAudioData(await file.arrayBuffer());
   signal?.throwIfAborted();if(decoded.duration>MAX_MEDIA_SECONDS||decoded.numberOfChannels>8||decoded.sampleRate!==16000)throw Error('Decoded audio exceeds supported limits.');
   const audio=new Float32Array(decoded.length);
   for(let c=0;c<decoded.numberOfChannels;c++){const channel=decoded.getChannelData(c);for(let i=0;i<audio.length;i++)audio[i]+=channel[i]/decoded.numberOfChannels;}
   let energy=0;for(const x of audio)energy+=x*x;
   if(!Number.isFinite(energy)||energy/audio.length<1e-8)throw Error('No audible speech detected. Silent media is not transcribed.');
   await ctx.close();ctx=null;signal?.throwIfAborted();
   const text=await new Promise((resolve,reject)=>{
    worker=new Worker(new URL('./speech-worker.js',import.meta.url),{type:'module'});
    worker.onerror=()=>reject(Error('Bundled speech worker unavailable. Check extension assets.'));
    worker.onmessage=({data})=>{if(signal?.aborted)return;if(data.error)reject(Error(data.error));else if(data.text)resolve(data.text);else if(data.stage)onProgress(data.stage);};
    worker.postMessage({audio,language},[audio.buffer]);
   });
   return {text,language,pages:1,notice:'Local '+new Intl.DisplayNames(['en'],{type:'language'}).of(language)+' speech transcript. Correct recognition errors before sharing. Original media stays local.'};
  })();
  return await Promise.race([work,stopped]);
 }finally{clearTimeout(timer);inputSignal?.removeEventListener('abort',abort);controller.abort();worker?.terminate();if(ctx)await ctx.close().catch(()=>{});if(media){media.removeAttribute('src');media.load();}if(url)URL.revokeObjectURL(url);}
}
