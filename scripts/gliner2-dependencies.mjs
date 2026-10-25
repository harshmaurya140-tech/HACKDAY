import * as ort from 'onnxruntime-web';
import {AutoTokenizer,env} from '@huggingface/transformers';
window.PrivacyShieldML={ort,AutoTokenizer,env};
