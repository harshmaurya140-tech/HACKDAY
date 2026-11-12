# Architecture

The content script detects supported provider composers and mounts an extension-origin iframe. Provider JavaScript sees only sanitized submissions and placeholder-bearing responses. The private frame sends authenticated bridge messages to the MV3 service worker; the worker scopes mappings and draft state to tab/conversation. PREVIEW stores the exact prepared payload and a nonce; confirmed sends consume that preview once through a serialized bridge queue. Edits abort local inference and invalidate pending review.

`private/local-ai.js` runs Chrome's language model for context and necessity, unions real `local-ner.js` results, and rejects invalid/incomplete stages. `src/ner-worker.mjs` uses a bundled tokenizer and ONNX Runtime WASM with overlapping windows. `core/privacy-core.js` combines entities, credential constraints and local terms, then assigns reversible session tokens. Models cannot authorize disclosure of credential categories.

`private/workspace.mjs` provides an independent extension-only review surface for arbitrary chatbot copy/paste. `documents.mjs` extracts bounded PDF/text content and constructs fresh text PDFs. `redactor.mjs` renders bounded pages/images, stores user-selected rectangles, optionally uses `ocr.mjs` plus local analysis for suggestions, and exports only masked PNG pixels inside a new PDF. Every original page is rebuilt; original PDF objects are never imported into the output.

Build tools download immutable pinned model revisions and verify SHA-256. esbuild bundles the NER worker; PDF, ONNX and OCR libraries are copied from locked dependencies. Runtime asset paths point into the extension. The package command verifies model assets before producing deterministic ZIP entries and checksum files.

`read-attachment.mjs` routes the composer and workspace through the same local readers. `office.mjs` validates ZIP central/local metadata, expansion budgets and CRC before parsing selected OOXML with entity declarations rejected. It reads presentation relationship order and raw/cached spreadsheet values without executing formulas or opening external links.

`recording.mjs` requests microphone access on a click, captures at most four minutes of mono PCM, and creates a local WAV. `media-text.mjs` validates duration/size, decodes supported audio tracks at 16 kHz, rejects silence, and starts one task-owned `speech-worker.js`. The bundled Whisper pipeline has remote-model and WASM caching disabled, local runtime URLs, a deadline and worker termination on cancellation. No recording or original media is relayed through page content scripts.

Adapter traversal discovers bounded open shadow roots (up to 128 roots / 20,000 visited elements) and observes them for streamed updates. Closed roots and cross-origin frames are not pierced. Selection ambiguity remains a fail-closed condition; reviewed copy is the recovery path.

`media-options.mjs` shares 600-second file / 240-second recording budgets and validates spoken language. Whisper small is pinned, bundled and uses explicit language/task decoder prefix tokens. `video-text.mjs` samples at most 24 local frames for English OCR, adds timestamps and deduplicates text; audio-only containers retain their speech path. No visual original is sent. Read notices identify omitted audio and sampling limitations.
