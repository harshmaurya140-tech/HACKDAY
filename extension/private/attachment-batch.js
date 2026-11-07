/* Bounded local extraction. A batch commits only when every file is readable. */
(function(root){
  const MAX_FILES=5,MAX_BYTES=24*1024*1024,MAX_FILE_BYTES=8*1024*1024,MAX_TEXT=12000;
  function compose(draft,items){
    return draft+items.map((item,i)=>'\n\nDocument text (extracted locally)'+(items.length>1?' '+(i+1):'')+':\n'+item.text).join('');
  }
  async function readBatch(files,existing,{read,signal,draft='',onProgress=()=>{}}){
    if(existing.length+files.length>MAX_FILES)throw Error('Attach up to 5 files. Existing attachments are unchanged.');
    if(files.some(f=>!f.size||f.size>MAX_FILE_BYTES))throw Error('Each file must be nonempty and at most 8 MB.');
    if([...existing,...files].reduce((n,f)=>n+f.size,0)>MAX_BYTES)throw Error('Combined attachment limit: 24 MB.');
    if(files.some(f=>! /\.(pdf|txt|md|csv|png|jpe?g)$/i.test(f.name)))throw Error('Choose PDF, TXT, Markdown, CSV, PNG or JPEG files.');
    const added=[];
    for(let i=0;i<files.length;i++){
      signal.throwIfAborted();
      const file=files[i];
      onProgress(i,files.length,null);
      const result=await read(file,{signal,onProgress:p=>{if(!signal.aborted)onProgress(i,files.length,p);}});
      signal.throwIfAborted();
      if(!result.text?.trim())throw Error('No readable text in file '+(i+1)+'. Choose a clearer image or a text document.');
      added.push({...result,name:file.name,size:file.size});
      if(compose(draft,[...existing,...added]).length>MAX_TEXT)throw Error('Prompt and attachments exceed 12,000 characters. Choose shorter documents or excerpts.');
    }
    return added;
  }
  const api={compose,readBatch,MAX_FILES,MAX_BYTES,MAX_TEXT};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.IncognixAttachments=api;
})(typeof globalThis==='object'?globalThis:this);
