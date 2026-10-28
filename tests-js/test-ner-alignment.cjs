const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const {Tokenizer}=await import('@huggingface/tokenizers');
 const {alignedTokens}=await import('../src/ner-alignment.mjs');
 const tokenizer=new Tokenizer(JSON.parse(fs.readFileSync('extension/model/ner/tokenizer.json')),JSON.parse(fs.readFileSync('extension/model/ner/tokenizer_config.json')));
 for(const text of [
  'Yesterday, ₹1,25,000 was withdrawn without permission.',
  'My name is Nora Vale. Email nora@example.org; phone +91 98765 43210.',
  'DOB 15 March 2002. PAN ABCDE1234F. Account 123456789012, IFSC PUNB0123456.',
  '中文 日本語 👩‍💻 café é [MASK] a\u0000b',
  'Multiple\nlines\tand  spaces. $500 €300 £200 _underscore_',
  '', 'ordinary words '.repeat(700)
 ]){
  const {ids,offsets,full}=alignedTokens(tokenizer,text);
  assert.deepEqual(ids,full.slice(1,-1));assert.equal(ids.length,offsets.length);
  for(const [a,b] of offsets)assert(a>=0&&b>a&&b<=text.length);
 }
 assert.throws(()=>alignedTokens({encode:(s,o)=>({ids:o?[1]:[2,3,4]})},'x'),/alignment/);
 console.log('PASS real tokenizer currency, Unicode, special tokens and conservative source offsets');
})().catch(e=>{console.error(e);process.exitCode=1;});
