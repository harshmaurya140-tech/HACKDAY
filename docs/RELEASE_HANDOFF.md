# 0.11.1 update — November 9, 2026

The microphone-denial recovery is implemented and passed the full local JavaScript and browser suites. Site policy denial opens an extension-owned recording tab; browser/OS permission is still needed. The transcript is returned privately only to its originating composer, with acknowledgement before disposal. Tested with a microphone-denying Claude fixture and real synthetic-device capture, not the user's physical microphone.

Load/reload the same authoritative `extension` directory. The 0.11.0 evidence below remains historical; its ZIP hash does not identify 0.11.1. See `dist/SHA256SUMS` for the current package.

This patch does not change the English speech model, duration limits, or add video visual understanding. Universal custom-editor compatibility and Web Store publication remain unachieved; no claim that all requested work is complete is made.

---

# Incognix 0.11.0 handoff — November 9, 2026

## Install and use

Authoritative project: `/Users/divytandon1813/Developer/HackDay/incognix`, branch `codex/incognix-release`. Keep the current installation loaded from its `extension` folder. The user already reloaded 0.11.0; no further reload is needed for this documentation handoff.

For another computer, extract `dist/incognix-0.11.0-extension.zip` and Load unpacked the folder containing `manifest.json`. No Node, Python, API key, server or separate application is required by the user. Chrome's on-device contextual model must be available; Chrome manages that download. NER, OCR and speech assets are bundled and pinned.

Use the protected composer, attach files or record voice, inspect/edit extracted text, review the exact outgoing preview, then Send reviewed text. Additional HTTPS chatbots can be enabled per site or across HTTPS sites in the popup; the input picker handles ambiguous discovery. An unchanged native editor is not protected. Reviewed copy remains available where a site cannot be integrated.

## Delivered functionality

- Private composer, ON/OFF, local entity/credential protection, confirmed preview/send and private response restoration/copy.
- Five attachments, sequential extraction, per-file editing/removal, cancellation and atomic failed-batch retention.
- PDF/text/image extraction, local English OCR, text exports and a separate visual raster-redaction tool.
- DOCX text, XLSX shared/inline/raw cached cells and PPTX slide text in presentation order; bounded archives/XML, CRC validation, external relationships never fetched, macros/embedded packages rejected.
- Bundled local English speech transcription for supported audio and audio-bearing MP4/WebM clips; explicit-click microphone recording with Stop/Cancel and track cleanup.
- Open shadow-root input/reply discovery, nested generic send controls and streamed reply observation.
- Branded extension icons, privacy and model provenance documentation, and Chrome Web Store listing/disclosure copy in STORE_LISTING.md.

## Verification

Runtime code commit: `40b01f66c222b7e573272ef917a6bb01dcc49ae6`.

[Clean GitHub CI passed](https://github.com/harshmaurya140-tech/HACKDAY/actions/runs/42479483863): clean install, pinned assets, build, syntax, JavaScript suites, installed-extension/browser tests, detector evaluation, packaging and artifact upload.

The extracted extension ZIP passed the complete browser suite in a fresh Chromium profile, including real Office parsing, Whisper inference, synthetic-device microphone capture, WebM audio decoding, cancellation, and the existing NER/OCR/document/privacy checks. Provider fixtures mock contextual inference; these are not claims of live acceptance on every provider.

Extension ZIP SHA-256: `9ccd2002f531ec2394deefe72d4d97557abe1a9978dbbc5e5688cdbf55107c7b`.

Signed-in Claude acceptance on November 8: DOCX plus WAV attached through the private composer; Word text and speech transcript read correctly; the real Chrome contextual model produced a masked preview; confirmed send succeeded; name/email restored in prompt and reply; restored-copy/paste round trip passed. Synthetic clipboard-check text was cleared without resending. Screenshot: `artifacts/live-0.11.0-office-audio.png`.

The real model over-masked the harmless phrase “Synthetic Office”. This does not establish perfect recognition. Existing restricted BERT/rules evaluation still reports the known confidential-codename miss and public-heading over-mask.

## Exact support boundary

Five files, 8 MB each / 24 MB total, 12,000 combined composer characters. Media is English speech, up to two minutes, with a three-minute processing deadline and Chrome codec requirements. Video frames are not analyzed; Office images/charts/layout and embedded objects are omitted. Spreadsheet values are raw/cached, not recalculated. Microphone capture depends on Chrome permission and the embedding site's policy; file transcription is available when recording is denied.

Closed shadow roots, cross-origin embedded editors and arbitrary custom controls cannot be universally integrated. Generic activation is best effort, not a browser-wide firewall. Detection/transcription remain fallible. Attachments are memory-only and disappear on refresh; session mappings are not durable backups.

Chrome Web Store publication has not occurred. A publisher account, real support contact, hosted privacy-policy URL and Google review are external distribution steps. An independent security audit cannot be replaced by this implementation's own automated checks. No universal-compatibility, zero-bug or independent-audit claim is made.
