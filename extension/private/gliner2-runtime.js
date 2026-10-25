/* Browser-local GLiNER2 multi-v1 model provider. No cloud inference.
 * A release build must contain the vendored runtime and model assets.
 * If they are absent, this provider is unavailable and the current Chrome
 * Prompt-API detector can still be used. Never claim GLiNER2 is active merely
 * because this file exists.
 */
(function(root){
  'use strict';
  let initialized=null;
  async function create(){
    const lib=root.PrivacyShieldML;
    if(!lib?.ort?.InferenceSession?.create||!lib?.AutoTokenizer||!root.GLiNER2Multi) return null;
    const modelURL=chrome.runtime.getURL('model/onnx/model_fp16.onnx');
    const externalURL=chrome.runtime.getURL('model/onnx/model_fp16.onnx_data');
    // A release artifact can intentionally opt out if its model weights were
    // not bundled. Do not trigger massive downloads from the user-prompt path.
    const status=await fetch(modelURL,{method:'HEAD'}).catch(()=>null);
    if(!status?.ok)return null;
    lib.env.allowRemoteModels=false;
    lib.env.allowLocalModels=true;
    lib.env.localModelPath=chrome.runtime.getURL('');
    const tokenizer=await lib.AutoTokenizer.from_pretrained('model',{local_files_only:true});
    if(!tokenizer)throw Error('GLiNER2 tokenizer missing from packaged model');
    if(lib.ort.env?.wasm)lib.ort.env.wasm.wasmPaths=chrome.runtime.getURL('private/');
    const session=await lib.ort.InferenceSession.create(modelURL,{
      executionProviders:['webgpu','wasm'],
      externalData:[{path:'model_fp16.onnx_data',data:externalURL}]
    });
    return {ort:lib.ort,tokenizer,session};
  }
  async function load(){
    if(!initialized)initialized=create().catch(e=>{initialized=null;throw e;});
    return initialized;
  }
  async function extract(text){
    const ctx=await load();
    if(!ctx)return null;
    return root.GLiNER2Multi.extract(text,ctx);
  }
  root.GLiNER2Browser={extract,load};
})(typeof self!=='undefined'?self:globalThis);
