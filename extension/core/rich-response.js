/* Format-preserving, fail-closed restoration of sanitized website messages.
 * NEVER send restored nodes/text back into an AI website's DOM. The result
 * must only be rendered inside the extension-origin protected response frame.
 * Site-provided HTML is reduced to an allowlisted inert tree. */
((root)=>{
  'use strict';
  const TAGS=new Set(['root','p','div','section','article','h1','h2','h3','h4','h5','h6',
    'ul','ol','li','strong','b','em','i','u','s','del','code','pre','blockquote',
    'br','hr','table','thead','tbody','tfoot','tr','td','th','a','span','sup','sub','dl','dt','dd']);
  const MAX_NODES=8000, MAX_TEXT=175000, MAX_DEPTH=45;
  function valid(tree){
    let nodes=0, characters=0;
    function visit(n,depth){
      if(!n || typeof n!=='object' || depth>MAX_DEPTH || ++nodes>MAX_NODES)return false;
      if(n.tag==='#text'){
        if(typeof n.text!=='string')return false;
        characters+=n.text.length;
        return characters<=MAX_TEXT;
      }
      if(!TAGS.has(n.tag)||!Array.isArray(n.children))return false;
      if(n.tag==='a'&&n.href!==undefined && (typeof n.href!=='string'||n.href.length>2048))return false;
      return n.children.every(child=>visit(child,depth+1));
    }
    return visit(tree,0) && tree.tag==='root';
  }
  function restore(session,tree,restoreText){
    if(!valid(tree))return null;
    const leaves=[];
    const leafByNode=new Map();
    let flattened='';
    function walk(n){
      if(n.tag==='#text'){
        const leaf={node:n,start:flattened.length,end:flattened.length+n.text.length};
        leaves.push(leaf);leafByNode.set(n,leaf);
        flattened+=n.text;
      }else for(const c of n.children)walk(c);
    }
    walk(tree);
    // Validate all token matches together: placeholders split across inline
    // formatting elements must still be restored correctly and only once.
    const check=restoreText(session,flattened);
    if(check.unresolved)return {tree:null,unresolved:true};
    const token=/\[PRIVATE_[A-Z]+_\d+_[A-F0-9]{6}\]/g;
    const edits=[...flattened.matchAll(token)].map(m=>({start:m.index,end:m.index+m[0].length,replacement:restoreText(session,m[0]).text}));
    const clone=n=>{
      if(n.tag!=='#text'){
        const out={tag:n.tag,children:n.children.map(clone)};
        if(n.tag==='a'&&n.href)out.href=n.href;
        return out;
      }
      const leaf=leafByNode.get(n);
      let cursor=leaf.start, result='';
      for(const e of edits){
        if(e.end<=leaf.start||e.start>=leaf.end)continue;
        const hitStart=Math.max(leaf.start,e.start),hitEnd=Math.min(leaf.end,e.end);
        if(hitStart>cursor)result+=flattened.slice(cursor,hitStart);
        if(e.start>=leaf.start && e.start<leaf.end)result+=e.replacement;
        cursor=Math.max(cursor,hitEnd);
      }
      result+=flattened.slice(cursor,leaf.end);
      return {tag:'#text',text:result};
    };
    return {tree:clone(tree),unresolved:false};
  }
  function render(doc,target,tree){
    if(!valid(tree))return false;
    const root=doc.createDocumentFragment();
    function append(parent,n){
      if(n.tag==='#text'){
        parent.appendChild(doc.createTextNode(n.text));return;
      }
      if(n.tag==='root'){
        for(const child of n.children)append(parent,child);
        return;
      }
      const el=doc.createElement(n.tag);
      // Preserve safe external hyperlinks, never attributes, inline styles,
      // event handlers, HTML strings, or images from the AI website.
      if(n.tag==='a'&&n.href){
        try{
          const url=new URL(n.href);
          if(url.protocol==='https:'||url.protocol==='http:'){
            el.setAttribute('href',url.toString());
            el.setAttribute('target','_blank');
            el.setAttribute('rel','noopener noreferrer');
          }
        }catch{}
      }
      for(const child of n.children)append(el,child);
      parent.appendChild(el);
    }
    append(root,tree);
    target.replaceChildren(root);
    return true;
  }
  const api={valid,restore,render,TAGS};
  root.PrivacyShieldRich=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
