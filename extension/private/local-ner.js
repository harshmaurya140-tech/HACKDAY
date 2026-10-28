/* Original text only traverses extension-owned worker messages. */
(()=>{
 let worker,id=0;const pending=new Map();
 function dispose(){worker?.terminate();worker=null;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Local model cancelled'));}pending.clear();}
 function extract(text){
  if(!worker){worker=new Worker(chrome.runtime.getURL('private/ner-worker.js'),{type:'module'});worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;clearTimeout(p.timer);pending.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data.entities);};worker.onerror=dispose;}
  return new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(dispose,120000);pending.set(key,{resolve,reject,timer});worker.postMessage({id:key,text});});
 }
 window.IncognixNER={extract,dispose};window.addEventListener('pagehide',dispose);
})();
