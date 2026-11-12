# Model provenance

NER: Xenova/bert-base-NER, quantized ONNX conversion of dslim/bert-base-NER, trained on CoNLL-2003; model cards label Apache-2.0. Exact conversion revision and asset hashes: docs/NER_ASSETS.json in the source repository. https://huggingface.co/Xenova/bert-base-NER and https://huggingface.co/dslim/bert-base-NER . Entity recognition is English-oriented and no accuracy guarantee is made.

OCR: tesseract-ocr/tessdata_fast English traineddata, Apache-2.0; pinned revision and hash in docs/OCR_ASSETS.json. License text is included alongside this notice. Runtime library notices are distributed in this directory and in packaged vendor files.

Speech: Xenova/whisper-small, quantized ONNX conversion of OpenAI Whisper small. The conversion card labels Apache-2.0; upstream Whisper code/weights use MIT. Exact conversion revision, sizes and hashes: docs/SPEECH_ASSETS.json. Multilingual speech transcription with explicit language selection; not speaker identification or scene understanding. https://huggingface.co/Xenova/whisper-small and https://github.com/openai/whisper .
