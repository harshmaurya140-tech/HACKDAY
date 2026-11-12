# Incognix trust boundaries and implementation checkpoint

Baseline: main afdc1e0e8f82c2b63cb4ccffe057cdb863be03ad, manifest 0.7.1. All 44 baseline JS suites pass. They include mocks and static contracts, not authenticated provider acceptance.

Provider JavaScript, documents, model output and DOM structures are untrusted. Raw drafts, documents and mappings belong only in extension-origin pages or trusted extension storage. Only reviewed sanitized text may cross to a provider. File parsers must use bundled code, bounded inputs and no remote resources. Model classifications are fallible; category restrictions override their suggestions. User-selected disclosure is not permission to release credentials.

Risks found: no bundled model assets; stale draft race in frame; origin comparison alone on custom schemes; no exact outgoing preview; absent document processing; native attachment/voice paths not comprehensively gated. No universal adapter can safely infer all provider upload and submission contracts.

Dependencies: strict bridge + stale-draft cancellation -> exact preview -> document text pipeline -> review/export. Actual bundled NER -> semantic detection union -> necessity. Universal extension workspace is independent of automatic site adapters; sanitized copy/paste is explicit and response restoration is manual there.

A hostile site can conceal or imitate an injected UI. This extension is not a browser-wide network firewall. Data entered before activation, or while OFF, is already visible to that site. Audio, binary Office files and arbitrary native tools are not protected. PNG/JPEG and scanned PDFs can use local English text extraction in the private composer; original pixels are never uploaded by that flow. Visual redaction requires the separate editor and explicit region/page review; native uploads are not automatically sanitized. Native integrations need authenticated acceptance before public release.

## Office, microphone and media (0.11.0)

Office readers impose compressed/expanded/XML/text/count budgets, validate CRC and local/central ZIP metadata, reject entity declarations, macros and embedded packages, and never execute formulas or fetch external relationships. Extracted text may omit images, charts, layout and other unsupported objects. Cached spreadsheet values may be stale; the UI labels this. This is text extraction, not original-file redaction.

Media processing checks byte size and native duration before decode, then checks decoded duration/channels and silence. Supported audio tracks are converted to mono PCM for a task-owned, local-only speech worker. Abort/deadline terminates the worker; late decode results are ignored. Native codec allocation occurs before the post-decode size check, so malformed-codec robustness still depends on Chrome. Speech recognition can hallucinate or miss private facts; mandatory editable-text and outgoing-preview review remain essential.

Recording is initiated by a user click and browser microphone consent. PCM is bounded, the recording is visible, and tracks/context are closed on Stop/Cancel/error/timeout. The host can deny microphone policy delegation. No raw recording or video frame is sent through the content script. Closed shadow roots and cross-origin embedded editors remain inaccessible; do not weaken channel authorization to force an integration.
