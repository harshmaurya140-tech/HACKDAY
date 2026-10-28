# Incognix 0.8.3 — development prerelease

Incognix reviews sensitive text locally before you share it with an AI chatbot. It combines bundled BERT named-entity recognition, deterministic credential checks, and Chrome's on-device language model for contextual detection and necessity decisions. Users need no Python service, account, API key or separately installed model server.

**This is a tested development build, not a production-ready privacy guarantee.** Chrome's local language model must be supported and available on the device; Chrome may download it on first use. If contextual analysis is unavailable, text submission stays blocked. Bundled NER is real, but cannot replace the semantic model's decision stage.

## Install

Use the packaged extension ZIP, extract it, then choose the extracted folder containing `manifest.json` in Chrome → Extensions → Developer mode → Load unpacked. Pin Incognix and click its icon for site activation and document tools. See [installation](INSTALLATION.md). GitHub's source ZIP is not the packaged extension; developers must build it first.

## What works

- Compact graphite/blue composer with ON/OFF control for ChatGPT, Claude and Gemini; exact outgoing preview and explicit send confirmation.
- Other HTTPS AI sites: enable access per site or opt into automatic detection across HTTPS sites from the toolbar popup. Choose the AI input manually when detection is ambiguous. A generic adapter supports unambiguous, labelled textarea/contenteditable chat inputs; unknown or ambiguous layouts are left unchanged. This is compatibility support, not a guarantee for every platform. The manual workspace remains available.
- Attach, paste or drop PNG/JPEG images directly: bundled English OCR extracts text inside the private composer, with an editable recognition preview before privacy analysis. Only reviewed text is shared; original pixels stay local. Image limits: 8 MB and 16 megapixels.
- Attach text PDFs directly with the composer’s + button. Extracted content enters the same local analysis, disclosure and preview flow as typed text; the original file is never uploaded. Combined prompt/document limit: 12,000 characters, 8 MB and 25 PDF pages. Scanned pages use local English OCR in the composer, limited to 10 PDF pages and 20 million rendered pixels total. Encrypted PDFs remain blocked. The separate workspace remains text-PDF only.
- Bundled quantized BERT NER and English Tesseract OCR; no runtime CDN dependency. Chrome's local model adds context and necessity assessment. Credentials remain masked regardless of model suggestions.
- Session-scoped mappings, stale-draft cancellation, serialized send confirmation and session-only draft recovery on integrated sites.
- Local confidential terms, international credential checks, manual restoration, and explicit disclosure choices for eligible facts.
- Text-based PDF/TXT/MD/CSV extraction with reviewed TXT or newly constructed text-PDF export.
- PDF/PNG/JPEG visual redaction: mark regions, optionally suggest regions with local OCR and AI, inspect every page, and export a newly rasterized PDF. Selected pixels are replaced and original PDF objects are not copied.

Read [capabilities and limits](docs/CAPABILITIES.md), [privacy](PRIVACY.md), [threat model](docs/THREAT_MODEL.md), and [test evidence](docs/TEST_EVIDENCE.md) before using sensitive material.

## Developer build

Node 22+ and Python 3 are build tools only. Model preparation downloads pinned public assets; ordinary privacy processing stays local.

```sh
npm ci
npm run prepare:model
npm run build
npm run verify:model
npm run check
npm test
npx playwright install chromium
npm run test:browser
npm run package
```

Load `extension/` after building. Packages and SHA-256 checksums are written to `dist/`. The extension ZIP contains models and runtime libraries. Model hashes and revisions are in `docs/NER_ASSETS.json` and `docs/OCR_ASSETS.json`; third-party licenses are in `extension/licenses/`.

## Release status

Based on main `afdc1e0e8f82c2b63cb4ccffe057cdb863be03ad` (v0.7.1). Current automated tests use synthetic data and isolated browser fixtures. A signed-in synthetic smoke test completed real local analysis and masked sends on all three providers; all three restored replies; ChatGPT and Gemini display fixes passed live retesting. Broad provider acceptance and semantic-model quality evaluation remain outstanding; see [live evidence](docs/LIVE_TEST_CHECKPOINT.md). DOCX, audio transcription, managed enterprise policy and universal automatic file-upload protection are not implemented. See [release notes](RELEASE_NOTES.md).
