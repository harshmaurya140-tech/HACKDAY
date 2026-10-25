const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const src=fs.readFileSync(path.join(__dirname,'../scripts/verify-gliner2-assets.mjs'),'utf8');
assert(src.includes('model_fp16.onnx_data'));
assert(src.includes('tokenizer.json'));
const run=spawnSync(process.execPath,['scripts/verify-gliner2-assets.mjs'],{cwd:path.join(__dirname,'..'),encoding:'utf8'});
// Without model assets this development archive must not pass as a fully
// activated GLiNER2 release. The model weights belong to a release build.
assert.notEqual(run.status,0);
assert(run.stderr.includes('Cannot call this a GLiNER2'));
console.log('PASS: missing ONNX/runtime assets cannot masquerade as a working GLiNER2 release');
