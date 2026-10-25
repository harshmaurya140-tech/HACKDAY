// Only retry or overwrite native website content we can prove this content
// script injected during the current conversation. No private originals here.
(function(root){
  function create(){
    let owner=null,channel=null,staged='';
    const normalize=s=>String(s||'').replace(/\r\n/g,'\n').replace(/\u00a0/g,' ').trim();
    return {
      same(a,b){return normalize(a)===normalize(b)},
      mayReplace(input,bridge,previous,next){
        if(!normalize(previous)||normalize(previous)===normalize(next))return true;
        return owner===input && channel===bridge && normalize(previous)===normalize(staged);
      },
      note(input,bridge,text){owner=input;channel=bridge;staged=String(text)},
      owns(input,bridge,previous){return owner===input&&channel===bridge&&normalize(previous)===normalize(staged)},
      reset(){owner=null;channel=null;staged=''}
    };
  }
  root.__privacyShieldNativeDraft={create};
  if(typeof module==='object'&&module.exports)module.exports={create};
})(typeof window!=='undefined'?window:globalThis);
