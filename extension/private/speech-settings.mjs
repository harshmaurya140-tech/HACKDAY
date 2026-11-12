import {SPEECH_LANGUAGES,speechLanguage} from './media-options.mjs';
const select=document.getElementById('speech-language');
if(select){
 const names=new Intl.DisplayNames(['en'],{type:'language'});
 for(const code of [...SPEECH_LANGUAGES].sort((a,b)=>names.of(a).localeCompare(names.of(b)))){
  const option=document.createElement('option');option.value=code;option.textContent=names.of(code);select.append(option);
 }
 select.value=await speechLanguage().catch(()=>'en');
 select.addEventListener('change',async()=>{try{await chrome.storage.local.set({incognixSpeechLanguage:select.value});select.title='Used for the next recording or audio file.';}catch{select.title='Could not save language. Try again.';}});
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.incognixSpeechLanguage)select.value=changes.incognixSpeechLanguage.newValue||'en';});
}
