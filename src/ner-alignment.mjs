// Keep tokenizer normalization and punctuation handling together. Each subtoken
// conservatively covers its original non-whitespace word, including punctuation.
// Never infer offsets from decoded text (normalization can change its length).
export function alignedTokens(tokenizer,text){
 const ids=[],offsets=[];
 for(const match of text.matchAll(/\S+/gu)){
  const encoded=tokenizer.encode(match[0],{add_special_tokens:false}).ids;
  for(const id of encoded){ids.push(id);offsets.push([match.index,match.index+match[0].length]);}
 }
 const full=tokenizer.encode(text).ids;
 // Fail closed if a different tokenizer/config cannot preserve this mapping.
 if(full.length!==ids.length+2||ids.some((id,i)=>id!==full[i+1]))throw Error('NER tokenizer alignment unavailable for this input');
 return {ids,offsets,full};
}
