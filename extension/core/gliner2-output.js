/* GLiNER2 ONNX output boundary for privacy-filter-pii-multi-onnx fixed labels.
 * IMPORTANT: This does NOT run ONNX or preprocess arbitrary prompts. It accepts
 * verified decoded spans from a browser-side GLiNER2 engine once ported.
 * Original text is never transmitted; rejects fabricated/unaligned spans.
 */
(function(root){
  'use strict';
  const LABEL_TYPES=Object.freeze({
    name:'PERSON',address:'ADDRESS',email:'EMAIL',phone_num:'PHONE',
    id_num:'ID',url:'OTHER',username:'USERNAME'
  });
  function normalize(text,decoded){
    if(typeof text!=='string'||!Array.isArray(decoded)||decoded.length>100)
      throw Error('Invalid GLiNER2 decoded result');
    const out=[];
    for(const span of decoded){
      if(!span||typeof span!=='object')throw Error('Invalid GLiNER2 span');
      const label=String(span.label||span.type||'').toLowerCase();
      if(!Object.prototype.hasOwnProperty.call(LABEL_TYPES,label))throw Error('Unexpected GLiNER2 label');
      const start=span.start, end=span.end;
      if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>text.length)
        throw Error('Invalid GLiNER2 offsets');
      if(typeof span.text!=='string'||text.slice(start,end)!==span.text)
        throw Error('GLiNER2 output is not aligned to user text');
      out.push({start,end,text:span.text,type:LABEL_TYPES[label],necessary:false,
        reason:'Detected by local GLiNER2 entity recognizer'});
    }
    return out;
  }
  const api={normalize,LABEL_TYPES};
  root.GLiNER2Output=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
