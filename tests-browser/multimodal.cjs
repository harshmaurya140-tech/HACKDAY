const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
(async()=>{
 const dir=path.resolve('artifacts/office-fixtures');fs.mkdirSync(dir,{recursive:true});
 execFileSync('python3',['-c',String.raw`
import zipfile, pathlib,sys
p=pathlib.Path(sys.argv[1])
def make(name,files):
 with zipfile.ZipFile(p/name,'w',compression=zipfile.ZIP_DEFLATED) as z:
  z.writestr('[Content_Types].xml','<Types/>')
  for k,v in files.items():z.writestr(k,v)
make('sample.docx',{'word/document.xml':'<w:document xmlns:w="urn:w"><w:p><w:r><w:t>Name: Nora Vale</w:t></w:r></w:p><w:p><w:r><w:t>Email: nora@example.org</w:t></w:r></w:p></w:document>','word/header1.xml':'<w:hdr xmlns:w="urn:w"><w:p><w:r><w:t>Private heading</w:t></w:r></w:p></w:hdr>'})
make('sample.xlsx',{'xl/workbook.xml':'<workbook xmlns:r="urn:r"><sheets><sheet name="People" r:id="r1"/></sheets></workbook>','xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>','xl/sharedStrings.xml':'<sst><si><t>Nora Vale</t></si></sst>','xl/worksheets/sheet1.xml':'<worksheet><row><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>nora@example.org</t></is></c><c r="C1"><f>1+1</f><v>2</v></c></row></worksheet>'})
make('sample.pptx',{'ppt/presentation.xml':'<p:presentation xmlns:p="urn:p" xmlns:r="urn:r"><p:sldIdLst><p:sldId r:id="r2"/><p:sldId r:id="r1"/></p:sldIdLst></p:presentation>','ppt/_rels/presentation.xml.rels':'<Relationships><Relationship Id="r1" Target="slides/slide1.xml"/><Relationship Id="r2" Target="slides/slide2.xml"/></Relationships>','ppt/slides/slide1.xml':'<a:p xmlns:a="urn:a"><a:r><a:t>Second: nora@example.org</a:t></a:r></a:p>','ppt/slides/slide2.xml':'<a:p xmlns:a="urn:a"><a:r><a:t>First: Nora Vale</a:t></a:r></a:p>'})
make('dtd.docx',{'word/document.xml':'<!DOCTYPE x [<!ENTITY x SYSTEM "https://example.invalid/private">]><x>&x;</x>'})
make('macro.docx',{'word/document.xml':'<x/>','word/vbaProject.bin':'bad'})
make('large.docx',{'word/document.xml':'<x>'+('a'*5000000)+'</x>'})
make('external.xlsx',{'xl/workbook.xml':'<workbook xmlns:r="urn:r"><sheet name="External" r:id="r1"/></workbook>','xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="r1" TargetMode="External" Target="https://example.invalid/private"/></Relationships>'})
make('traversal.docx',{'../word/document.xml':'<x/>'})
`,dir]);
 const ext=path.resolve(process.env.INCOGNIX_EXTENSION||'extension');
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required',`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
 const external=[];
 try{
  await ctx.route(/^https?:/,r=>{external.push(r.request().url());return r.abort();});
  const service=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'),p=await ctx.newPage();
  await p.goto(service.url().split('/').slice(0,3).join('/')+'/private/workspace.html');
  p.on('console',m=>{if(m.type()==='error')console.log('Browser:',m.text());});
  const read=async(name)=>p.evaluate(async({name,bytes})=>{const {readOffice}=await import('./office.mjs');return readOffice(new File([new Uint8Array(bytes)],name));},{name,bytes:[...fs.readFileSync(path.join(dir,name))]});
  for(const ext of ['docx','xlsx','pptx']){
   const result=await read('sample.'+ext);assert(result.text.includes('Nora Vale')&&result.text.includes('nora@example.org'));
   if(ext==='docx')assert(result.text.includes('Private heading'));
   if(ext==='xlsx')assert(result.text.includes('cached formula result'));
   if(ext==='pptx')assert(result.text.indexOf('First:')<result.text.indexOf('Second:'));
  }
  for(const file of ['dtd.docx','macro.docx','large.docx','external.xlsx','traversal.docx'])await assert.rejects(read(file));
  const cancel=await p.evaluate(async()=>{const {readOffice}=await import('./office.mjs');const c=new AbortController();c.abort();try{await readOffice(new File(['x'],'a.docx'),{signal:c.signal});return false;}catch{return true;}});assert(cancel);
  console.log('PASS actual DOCX/XLSX/PPTX extraction, ordering, header/cached values, hostile archives and cancellation');
  const rejectedMedia=await p.evaluate(async()=>{
   const {readMedia}=await import('./media-text.mjs'),{wavFile}=await import('./recording.mjs');let count=0;
   const silent=wavFile([new Float32Array(16000)],16000),long=wavFile([new Float32Array(121*16000)],121*16000);
   for(const file of [silent,long,new File(['not audio'],'broken.mp3')])try{await readMedia(file);}catch{count++;}
   return count;
  });assert.equal(rejectedMedia,3,'silent, over-duration and malformed media rejected');
  const bytes=[...fs.readFileSync(path.join(__dirname,'fixtures/speech.wav'))];
  const speech=await p.evaluate(async bytes=>{const {readMedia}=await import('./media-text.mjs');return readMedia(new File([new Uint8Array(bytes)],'voice.wav'));},bytes);
  console.log('Actual speech result:',speech.text);assert(/privacy|private/i.test(speech.text)&&/test/i.test(speech.text),'Actual bundled speech must transcribe the synthetic fixture');
  const cancelled=await p.evaluate(async bytes=>{const {readMedia}=await import('./media-text.mjs');const c=new AbortController();setTimeout(()=>c.abort(),100);try{await readMedia(new File([new Uint8Array(bytes)],'voice.wav'),{signal:c.signal});return false;}catch(e){return e.name==='AbortError';}},bytes);assert(cancelled);
  const recorded=await p.evaluate(async()=>{const {recordVoice}=await import('./recording.mjs');const f=await recordVoice({onReady:stop=>setTimeout(stop,900)});const b=new Uint8Array(await f.arrayBuffer());return {name:f.name,size:f.size,header:new TextDecoder().decode(b.slice(0,4))};});
  assert(recorded.size>10000&&recorded.name==='voice-recording.wav'&&recorded.header==='RIFF');
  const videoBytes=await p.evaluate(async bytes=>{
   const ctx=new AudioContext();await ctx.resume();const audio=await ctx.decodeAudioData(new Uint8Array(bytes).buffer),source=ctx.createBufferSource(),destination=ctx.createMediaStreamDestination();source.buffer=audio;source.connect(destination);
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const x=canvas.getContext('2d');x.fillStyle='navy';x.fillRect(0,0,320,180);
   const video=canvas.captureStream(10),stream=new MediaStream([...video.getVideoTracks(),...destination.stream.getAudioTracks()]),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8,opus'}),parts=[];
   const done=new Promise(resolve=>{recorder.ondataavailable=e=>parts.push(e.data);recorder.onstop=resolve;});recorder.start();source.start();source.onended=()=>recorder.stop();const timer=setInterval(()=>x.fillRect(0,0,320,180),100);await done;clearInterval(timer);stream.getTracks().forEach(t=>t.stop());await ctx.close();return [...new Uint8Array(await new Blob(parts,{type:'video/webm'}).arrayBuffer())];
  },bytes);
  const videoResult=await p.evaluate(async bytes=>{const {readMedia}=await import('./media-text.mjs');return readMedia(new File([new Uint8Array(bytes)],'clip.webm',{type:'video/webm'}));},videoBytes);
  assert(/privacy|private/i.test(videoResult.text)&&/test/i.test(videoResult.text));
  console.log('PASS real microphone capture (synthetic device), WAV encoding and audio-bearing WebM video transcription');
  assert.equal(external.length,0,'Office and speech must not make external requests');
  console.log('PASS actual bundled speech, active cancellation and external network guard');
  const host=await ctx.newPage();
  await host.route('https://chatgpt.com/c/media-fixture',r=>r.fulfill({contentType:'text/html',body:'<form style="width:600px;margin:40px"><textarea id="prompt-textarea" style="width:500px;height:70px"></textarea><button type="button" id="composer-submit-button">Send</button></form><script>document.querySelector("button").onclick=()=>{window.delivered=document.querySelector("textarea").value;document.querySelector("textarea").value="";};</script>'}));
  await host.goto('https://chatgpt.com/c/media-fixture');
  const frame=host.frameLocator('iframe[title="Protected AI composer"]');await frame.locator('#draft').waitFor();
  await host.frames().find(f=>f.url().includes('mode=composer')).evaluate(()=>{LocalPrivacyAI.analyze=async()=>({entities:[]});});
  await frame.locator('#draft').fill('Keep my draft while recording.');await frame.locator('#record-voice').click();
  await frame.locator('#record-voice').filter({hasText:'Stop recording'}).waitFor();await frame.locator('#cancel-document').click();await frame.locator('#status').filter({hasText:'Recording cancelled'}).waitFor();
  assert.equal(await frame.locator('#draft').inputValue(),'Keep my draft while recording.');
  await frame.locator('#attachment-file').setInputFiles([path.join(dir,'sample.docx'),path.join(__dirname,'fixtures/speech.wav')]);
  await frame.locator('#attachment-select option').nth(1).waitFor({state:'attached',timeout:180000});
  await frame.locator('#draft').fill('Summarize these files.');await frame.locator('#send').click();await frame.locator('#preview').waitFor({state:'visible'});
  const outgoing=await frame.locator('#outgoing').inputValue();assert(!outgoing.includes('nora@example.org'));assert(/privacy|private/i.test(outgoing));assert(!outgoing.includes('sample.docx')&&!outgoing.includes('speech.wav'));
  assert.equal(await host.evaluate(()=>window.delivered),undefined);await frame.locator('#confirm-send').click();await host.waitForFunction(()=>window.delivered);assert(!(await host.evaluate(()=>window.delivered)).includes('nora@example.org'));
  assert(!(await host.locator('body').textContent()).includes('nora@example.org'));await host.close();
  console.log('PASS actual composer microphone cancellation, combined Office/audio extraction, consent and masked handoff (contextual inference mocked)');
  const blockedHost=await ctx.newPage();
  await blockedHost.route('https://claude.ai/new',r=>r.fulfill({contentType:'text/html',headers:{'Permissions-Policy':'microphone=()'},body:'<form style="width:600px;margin:40px"><div class="ProseMirror" contenteditable="true" role="textbox" data-placeholder="Reply to Claude" style="height:90px"></div><button aria-label="Send message">Send</button></form>'}));
  await blockedHost.goto('https://claude.ai/new');
  const blocked=blockedHost.frameLocator('iframe[title="Protected AI composer"]');await blocked.locator('#draft').waitFor();
  await blocked.locator('#draft').fill('Keep this private draft.');
  const recorderPage=ctx.waitForEvent('page');await blocked.locator('#record-voice').click();const rec=await recorderPage;await rec.waitForLoadState();
  assert(rec.url().includes('/private/recorder.html?token='),'policy denial opens extension recorder');
  await rec.locator('#record').click();await rec.locator('#record').filter({hasText:'Stop recording'}).waitFor();
  // Stop actual synthetic-device capture via cancellation; submit an edited transcript
  // to test the authenticated return path separately from real ASR above.
  await rec.evaluate(()=>{document.querySelector('#transcript').value='Synthetic returned voice transcript.';});
  await rec.locator('#cancel').click();
  await blocked.locator('#status').filter({hasText:'Recording cancelled'}).waitFor();
  assert.equal(await blocked.locator('#draft').inputValue(),'Keep this private draft.');
  const nextPage=ctx.waitForEvent('page');await blocked.locator('#record-voice').click();const rec2=await nextPage;await rec2.waitForLoadState();
  await rec2.locator('#transcript').fill('Synthetic returned voice transcript.');await rec2.locator('#use').click();
  await blocked.locator('#status').filter({hasText:'Documents ready'}).waitFor();
  assert.equal(await blocked.locator('#draft').inputValue(),'Keep this private draft.');
  assert.equal(await blocked.locator('#extracted-text').inputValue(),'Synthetic returned voice transcript.');
  assert(!(await blockedHost.locator('body').textContent()).includes('Synthetic returned voice transcript.'));
  await blockedHost.close();
  console.log('PASS microphone-denying host fallback, actual recorder capture, cancellation and private transcript return without page disclosure');


 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
