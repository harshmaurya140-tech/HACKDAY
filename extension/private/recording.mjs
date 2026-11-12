import {MAX_RECORDING_SECONDS} from './media-options.mjs';
// Explicit user gesture only. Capture bounded mono PCM; never use cloud speech.
export function wavFile(chunks,length,rate=16000){
 const b=new ArrayBuffer(44+length*2),v=new DataView(b);const ascii=(p,s)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));};
 ascii(0,'RIFF');v.setUint32(4,36+length*2,true);ascii(8,'WAVE');ascii(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);ascii(36,'data');v.setUint32(40,length*2,true);
 let i=0;for(const chunk of chunks)for(const x of chunk){if(i>=length)break;v.setInt16(44+i++*2,Math.round(Math.max(-1,Math.min(1,x))*32767),true);}
 return new File([b],'voice-recording.wav',{type:'audio/wav'});
}
export async function recordVoice({signal,onReady=()=>{},onProgress=()=>{}}={}){
 signal?.throwIfAborted();let stream,ctx,source,processor,gain,timer,finish,settled=false;
 const chunks=[];let length=0;
 const stopped=new Promise((resolve,reject)=>{finish=error=>{if(settled)return;settled=true;error?reject(error):resolve();};});
 const abort=()=>finish(new DOMException('Recording cancelled.','AbortError'));
 signal?.addEventListener('abort',abort,{once:true});
 // Register the rejection handler immediately while the permission prompt is open.
 stopped.catch(()=>{});
 try{
  const pending=navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true},video:false});
  pending.then(s=>{if(settled||signal?.aborted)s.getTracks().forEach(t=>t.stop());},()=>{});
  stream=await Promise.race([pending,stopped.then(()=>{throw new DOMException('Recording cancelled.','AbortError');})]);
  signal?.throwIfAborted();ctx=new AudioContext({sampleRate:16000});await ctx.resume();signal?.throwIfAborted();
  if(ctx.sampleRate!==16000)throw Error('This device does not support local 16 kHz recording. Attach an audio file instead.');
  source=ctx.createMediaStreamSource(stream);processor=ctx.createScriptProcessor(4096,1,1);gain=ctx.createGain();gain.gain.value=0;
  processor.onaudioprocess=e=>{
   if(settled)return;const data=e.inputBuffer.getChannelData(0),take=Math.min(data.length,MAX_RECORDING_SECONDS*16000-length);chunks.push(data.slice(0,take));length+=take;
   onProgress(Math.floor(length/16000));if(length>=MAX_RECORDING_SECONDS*16000)finish();
  };
  source.connect(processor);processor.connect(gain);gain.connect(ctx.destination);
  onReady(()=>finish());timer=setTimeout(()=>finish(),MAX_RECORDING_SECONDS*1000);
  await stopped;signal?.throwIfAborted();if(length<16000/4)throw Error('Recording too short. Record at least a short sentence.');
  return wavFile(chunks,length);
 }finally{settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(processor)processor.onaudioprocess=null;source?.disconnect();processor?.disconnect();gain?.disconnect();stream?.getTracks().forEach(t=>t.stop());if(ctx)await ctx.close().catch(()=>{});}
}
