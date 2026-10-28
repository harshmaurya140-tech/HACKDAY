# Incognix trust boundaries and implementation checkpoint

Baseline: main afdc1e0e8f82c2b63cb4ccffe057cdb863be03ad, manifest 0.7.1. All 44 baseline JS suites pass. They include mocks and static contracts, not authenticated provider acceptance.

Provider JavaScript, documents, model output and DOM structures are untrusted. Raw drafts, documents and mappings belong only in extension-origin pages or trusted extension storage. Only reviewed sanitized text may cross to a provider. File parsers must use bundled code, bounded inputs and no remote resources. Model classifications are fallible; category restrictions override their suggestions. User-selected disclosure is not permission to release credentials.

Risks found: no bundled model assets; stale draft race in frame; origin comparison alone on custom schemes; no exact outgoing preview; absent document processing; native attachment/voice paths not comprehensively gated. No universal adapter can safely infer all provider upload and submission contracts.

Dependencies: strict bridge + stale-draft cancellation -> exact preview -> document text pipeline -> review/export. Actual bundled NER -> semantic detection union -> necessity. Universal extension workspace is independent of automatic site adapters; sanitized copy/paste is explicit and response restoration is manual there.

A hostile site can conceal or imitate an injected UI. This extension is not a browser-wide network firewall. Data entered before activation, or while OFF, is already visible to that site. Audio, binary Office files and arbitrary native tools are not protected. Images and scans require the separate visual editor and explicit region/page review; native uploads are not automatically sanitized. Native integrations need authenticated acceptance before public release.
