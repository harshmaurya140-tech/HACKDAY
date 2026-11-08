// Text-only OOXML reader. Never execute macros, formulas, relationships or XML entities.
const MAX_EXPANDED=24*1024*1024,MAX_XML=4*1024*1024,MAX_TEXT=12000;
const fail=()=>{throw Error('Invalid, encrypted, or over-limit Office archive. Use an unencrypted DOCX, XLSX or PPTX.');};
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
export async function openOfficeZip(bytes,signal){
 signal?.throwIfAborted();
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=p=>v.getUint16(p,true),u32=p=>v.getUint32(p,true);
 let end=-1;for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(u32(p)===0x06054b50&&p+22+u16(p+20)===bytes.length){end=p;break;}
 if(end<0||u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10))fail();
 const count=u16(end+10),size=u32(end+12),offset=u32(end+16);
 if(!count||count>1000||offset+size!==end)fail();
 const entries=new Map();let p=offset,total=0;
 for(let i=0;i<count;i++){
  if(p+46>end||u32(p)!==0x02014b50)fail();
  const flags=u16(p+8),method=u16(p+10),crc=u32(p+16),compressed=u32(p+20),expanded=u32(p+24),n=u16(p+28),extra=u16(p+30),comment=u16(p+32),local=u32(p+42);
  if(p+46+n+extra+comment>end||flags&1||![0,8].includes(method)||u16(p+34)||expanded>MAX_EXPANDED||compressed>bytes.length)fail();
  total+=expanded;if(total>MAX_EXPANDED)fail();
  const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(p+46,p+46+n));
  if(!name||name.includes('\\')||name.startsWith('/')||name.split('/').some(x=>x==='..'||x==='.')||entries.has(name))fail();
  if(local+30>offset||u32(local)!==0x04034b50||u16(local+6)!==flags||u16(local+8)!==method)fail();
  const ln=u16(local+26),le=u16(local+28),start=local+30+ln+le;
  if(start+compressed>offset||new TextDecoder().decode(bytes.subarray(local+30,local+30+ln))!==name)fail();
  entries.set(name,{start,compressed,expanded,method,crc});p+=46+n+extra+comment;
 }
 if(p!==end||!entries.has('[Content_Types].xml'))fail();
 // Embedded executable content isn't part of text extraction; reject macro packages.
 if([...entries.keys()].some(n=>/vbaProject|\/embeddings\//i.test(n)))throw Error('Office macros and embedded files are unsupported. Export a text-only copy first.');
 return {names:[...entries.keys()],async xml(name){
  signal?.throwIfAborted();const e=entries.get(name);if(!e||e.expanded>MAX_XML)fail();
  let data=bytes.subarray(e.start,e.start+e.compressed);
  if(e.method===8){
   const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();let length=0;const parts=[];
   const abort=()=>{reader.cancel().catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
   try{while(true){signal?.throwIfAborted();const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>e.expanded||length>MAX_XML){await reader.cancel();fail();}parts.push(value);}
    data=new Uint8Array(length);let at=0;for(const part of parts){data.set(part,at);at+=part.length;}
   }finally{signal?.removeEventListener('abort',abort);reader.releaseLock();}
  }
  signal?.throwIfAborted();if(data.length!==e.expanded||crc32(data)!==e.crc)fail();
  const text=new TextDecoder('utf-8',{fatal:true}).decode(data);if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Office XML entity declarations are blocked.');
  const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)fail();return doc;
 }};
}
const nodes=(n,name)=>[...n.getElementsByTagNameNS('*',name)];
const textOf=n=>nodes(n,'t').map(t=>t.textContent).join('');
function paragraphs(doc){return nodes(doc,'p').map(p=>{
 let out='';const walk=n=>{for(const c of n.children){if(c.localName==='t')out+=c.textContent;else if(c.localName==='tab')out+='\t';else if(['br','cr'].includes(c.localName))out+='\n';else walk(c);}};walk(p);return out;
}).join('\n');}
function target(base,value){if(!value||value.includes('\\')||/^[a-z]+:|^\//i.test(value))fail();const parts=base.split('/').slice(0,-1);for(const part of value.split('/')){if(part==='..'){if(!parts.length)fail();parts.pop();}else if(part&&part!=='.')parts.push(part);}return parts.join('/');}
async function relations(zip,base){const at=base.lastIndexOf('/'),name=base.slice(0,at+1)+'_rels/'+base.slice(at+1)+'.rels';const doc=await zip.xml(name),map=new Map();for(const r of nodes(doc,'Relationship'))if(r.getAttribute('TargetMode')!=='External')map.set(r.getAttribute('Id'),target(base,r.getAttribute('Target')));return map;}
const rid=n=>[...n.attributes].find(a=>a.localName==='id'&&a.prefix)?.value;
export async function readOffice(file,{signal,onProgress=()=>{}}={}){
 if(!file||file.size>8*1024*1024||! /\.(docx|xlsx|pptx)$/i.test(file.name))fail();
 signal?.throwIfAborted();const zip=await openOfficeZip(new Uint8Array(await file.arrayBuffer()),signal),ext=file.name.split('.').pop().toLowerCase();
 const parts=[];let chars=0,units=1;
 const add=s=>{chars+=s.length+2;if(chars>MAX_TEXT)throw Error('Office text exceeds 12,000 characters. Choose a smaller excerpt.');parts.push(s);};
 if(ext==='docx'){
  add(paragraphs(await zip.xml('word/document.xml')));
  for(const name of zip.names.filter(n=>/^word\/(?:header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/.test(n)).sort())add(paragraphs(await zip.xml(name)));
 }else if(ext==='xlsx'){
  const shared=zip.names.includes('xl/sharedStrings.xml')?nodes(await zip.xml('xl/sharedStrings.xml'),'si').map(textOf):[];
  const workbook=await zip.xml('xl/workbook.xml'),rels=await relations(zip,'xl/workbook.xml'),sheets=nodes(workbook,'sheet');units=sheets.length;if(sheets.length>50)throw Error('Spreadsheet limit: 50 sheets.');
  for(const [i,sheet] of sheets.entries()){
   const path=rels.get(rid(sheet));if(!path)fail();const doc=await zip.xml(path);add('[Sheet: '+sheet.getAttribute('name')+']');
   for(const row of nodes(doc,'row')){
    const cells=[];for(const cell of nodes(row,'c')){
     const type=cell.getAttribute('t'),value=nodes(cell,'v')[0]?.textContent||'';let text=value;
     if(type==='s'){if(!/^\d+$/.test(value)||Number(value)>=shared.length)fail();text=shared[Number(value)];}
     else if(type==='inlineStr')text=textOf(cell);
     else if(type==='b')text=value==='1'?'TRUE':'FALSE';
     if(nodes(cell,'f').length)text+=' [cached formula result; not recalculated]';
     if(text)cells.push((cell.getAttribute('r')||'cell')+': '+text);
    }
    if(cells.length)add(cells.join('\t'));
   }onProgress(Math.round((i+1)/sheets.length*100));
  }
 }else{
  const base='ppt/presentation.xml',doc=await zip.xml(base),rels=await relations(zip,base),slides=nodes(doc,'sldId');units=slides.length;if(slides.length>100)throw Error('Presentation limit: 100 slides.');
  for(const [i,s] of slides.entries()){const path=rels.get(rid(s));if(!path)fail();add('[Slide '+(i+1)+']\n'+paragraphs(await zip.xml(path)));onProgress(Math.round((i+1)/slides.length*100));}
 }
 signal?.throwIfAborted();const text=parts.join('\n\n').trim();if(!text)throw Error('No readable Office text found. Images and embedded objects are not extracted.');
 return {text,pages:units,notice:'Office text only. Review before sharing. Images, charts, layout and embedded objects are omitted; spreadsheet values are raw/cached, not recalculated. Original files stay local.'};
}
