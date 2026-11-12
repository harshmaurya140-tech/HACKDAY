const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const ext=path.resolve(process.env.INCOGNIX_EXTENSION||'extension');
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--autoplay-policy=no-user-gesture-required',`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
 try{
  const external=[];await ctx.route(/^https?:/,r=>{external.push(r.request().url());return r.abort();});
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');const page=await ctx.newPage();
  await page.goto(worker.url().split('/').slice(0,3).join('/')+'/private/workspace.html');
  const result=await page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=300;const x=canvas.getContext('2d');
   const draw=()=>{x.fillStyle='white';x.fillRect(0,0,1000,300);x.fillStyle='black';x.font='40px Arial';x.fillText('Name: Nora Vale',40,100);x.fillText('Email: nora@example.org',40,170);};draw();
   const stream=canvas.captureStream(10),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),parts=[];
   const done=new Promise(resolve=>{recorder.ondataavailable=e=>parts.push(e.data);recorder.onstop=resolve;});
   recorder.start();const interval=setInterval(draw,100);setTimeout(()=>recorder.stop(),1100);await done;clearInterval(interval);stream.getTracks().forEach(t=>t.stop());
   const file=new File(parts,'silent-video.webm',{type:'video/webm'});
   const {readAttachment}=await import('./read-attachment.mjs');
   const result=await readAttachment(file);
   const {sampleTimes,readVideoFrames}=await import('./video-text.mjs');
   const times=sampleTimes(600);let invalid=0;for(const d of [0,601,Infinity,NaN])try{sampleTimes(d);}catch{invalid++;}
   const c=new AbortController();c.abort();let cancelled=false;try{await readVideoFrames(file,{signal:c.signal});}catch{cancelled=true;}
   const active=new AbortController();setTimeout(()=>active.abort(),50);let activeCancelled=false;try{await readVideoFrames(file,{signal:active.signal});}catch{activeCancelled=active.signal.aborted;}
   return {result,times,invalid,cancelled,activeCancelled};
  });
  const audioOnly=await page.evaluate(async bytes=>{
   const context=new AudioContext();await context.resume();const buffer=await context.decodeAudioData(new Uint8Array(bytes).buffer);
   const source=context.createBufferSource(),destination=context.createMediaStreamDestination();source.buffer=buffer;source.connect(destination);
   const recorder=new MediaRecorder(destination.stream,{mimeType:'audio/webm;codecs=opus'}),parts=[];
   const done=new Promise(resolve=>{recorder.ondataavailable=e=>parts.push(e.data);recorder.onstop=resolve;});recorder.start();source.start();source.onended=()=>recorder.stop();await done;destination.stream.getTracks().forEach(t=>t.stop());await context.close();
   const {readAttachment}=await import('./read-attachment.mjs');return readAttachment(new File(parts,'audio-only.webm',{type:'audio/webm'}));
  },[...fs.readFileSync(path.join(__dirname,'fixtures/speech.wav'))]);
  assert.match(audioOnly.text,/privacy|private/i);
  assert.match(result.result.text,/Nora Vale/);assert.match(result.result.text,/nora@example\.org/);assert.match(result.result.text,/\[0\.\d+s\]/);assert.match(result.result.notice,/Audio was not extracted/);
  assert.equal(result.times.length,24);assert(result.times.at(-1)<600);assert.equal(result.invalid,4);assert(result.cancelled&&result.activeCancelled);assert.equal(external.length,0);
  console.log('PASS actual audio-only WebM and silent video visual OCR, timestamps, attachment routing, bounded sampling, cancellation and no external requests');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
