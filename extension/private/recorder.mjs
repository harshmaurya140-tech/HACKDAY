import {recordVoice} from './recording.mjs';
import {speechLanguage} from './media-options.mjs';
import {readMedia} from './media-text.mjs';
const $=id=>document.getElementById(id),token=new URLSearchParams(location.search).get('token');
let controller,stop;
const status=text=>{$('status').textContent=text;};
const send=async text=>{const r=await chrome.runtime.sendMessage({type:'RECORDER_FINISH',token,text});if(!r?.ok)throw Error(r?.error||'Could not return transcript.');status('Waiting for your private composer to accept the transcript. Keep this tab open until it closes.');};
$('record').onclick=async()=>{
 if(stop){stop();return;}if(controller)return;
 controller=new AbortController();$('speech-language').disabled=true;$('record').disabled=true;$('use').disabled=true;$('help').hidden=true;
 try{
  const language=await speechLanguage();
  const file=await recordVoice({signal:controller.signal,onReady:fn=>{stop=fn;$('record').disabled=false;$('record').textContent='Stop recording';},onProgress:n=>status('Recording locally · '+n+'s')});
  stop=null;$('record').disabled=true;status('Transcribing on your device…');
  const result=await readMedia(file,{signal:controller.signal,onProgress:status,language});
  $('transcript').value=result.text;status('Review the transcript, then add it to your private draft.');
 }catch(e){status(e.name==='AbortError'?'Recording cancelled.':e.message);$('help').hidden=!['NotAllowedError','SecurityError'].includes(e.name);}
 finally{$('speech-language').disabled=false;controller=null;stop=null;$('record').disabled=false;$('record').textContent='Record again';$('use').disabled=!$('transcript').value.trim();}
};
$('transcript').oninput=()=>{$('use').disabled=!!controller||!$('transcript').value.trim();};
$('use').onclick=async()=>{if(controller)return;$('use').disabled=true;try{await send($('transcript').value);}catch(e){status(e.message);$('use').disabled=false;}};
$('cancel').onclick=async()=>{controller?.abort();try{await send('');}catch(e){status(e.message);}};
window.addEventListener('pagehide',()=>controller?.abort());
