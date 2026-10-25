// Build-time gate. End users install ONLY the prepared Chrome extension.
// Never label a ZIP GLiNER2-enabled when it contains the placeholder runtime.
import {existsSync,statSync,readFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve('extension');
const required={
  'model/tokenizer.json':1_000_000,
  'model/tokenizer_config.json':100,
  'model/config.json':100,
  'model/onnx/model_fp16.onnx':1024,
  'model/onnx/model_fp16.onnx_data':100_000_000,
  'private/vendor.bundle.js':10_000
};
let errors=[];
for(const [name,min] of Object.entries(required)){
  const filepath=path.join(root,name);
  if(!existsSync(filepath)||statSync(filepath).size<min)errors.push(`${name} missing or too small`);
}
const vendor=path.join(root,'private/vendor.bundle.js');
if(existsSync(vendor)&&readFileSync(vendor,'utf8').includes('Developer build output placeholder'))errors.push('runtime is still the stub');
if(!existsSync(path.join(root,'private/ort-wasm-simd-threaded.wasm'))&&
   !existsSync(path.join(root,'private/ort-wasm-simd.wasm'))){
  errors.push('ONNX Runtime Web WASM dependency missing');
}
if(errors.length){
  console.error('Cannot call this a GLiNER2 model-enabled release:\n'+errors.map(e=>' - '+e).join('\n'));
  process.exitCode=1;
}else{
  console.log('Model and runtime asset checks passed (this does not prove inference accuracy).');
}
