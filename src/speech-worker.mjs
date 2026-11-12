import {MAX_MEDIA_SECONDS,validateLanguage} from '../extension/private/media-options.mjs';
import {pipeline,env} from '@huggingface/transformers';
env.allowRemoteModels=false;env.allowLocalModels=true;env.useBrowserCache=false;env.useWasmCache=false;
env.localModelPath=new URL('../model/',import.meta.url).href;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.proxy=false;
env.backends.onnx.wasm.wasmPaths={mjs:new URL('./vendor/speech/ort-wasm-simd-threaded.mjs',import.meta.url).href,wasm:new URL('./vendor/speech/ort-wasm-simd-threaded.wasm',import.meta.url).href};
self.onmessage=async({data})=>{
 let transcriber;
 try{
  if(!(data.audio instanceof Float32Array)||data.audio.length>16000*MAX_MEDIA_SECONDS||!data.audio.length)throw Error('Audio exceeds the local media limit.');
  const language=validateLanguage(data.language);
  self.postMessage({stage:'Loading bundled speech model'});
  transcriber=await pipeline('automatic-speech-recognition','speech',{device:'wasm',dtype:'q8',local_files_only:true});
  self.postMessage({stage:'Transcribing locally'});
  const config=transcriber.model.generation_config;
  const decoder_input_ids=[config.decoder_start_token_id,config.lang_to_id['<|'+language+'|>'],config.task_to_id.transcribe,config.no_timestamps_token_id];
  if(decoder_input_ids.some(id=>!Number.isInteger(id)))throw Error('Bundled speech language configuration is invalid.');
  const result=await transcriber(data.audio,{decoder_input_ids,language,task:'transcribe',chunk_length_s:25,stride_length_s:3,max_new_tokens:440,return_timestamps:false});
  if(typeof result.text!=='string'||!result.text.trim()||result.text.length>12000)throw Error('No usable speech transcript.');
  self.postMessage({text:result.text.trim()});
 }catch(e){self.postMessage({error:'Local speech transcription failed: '+e.message});}
 finally{await transcriber?.dispose();}
};
