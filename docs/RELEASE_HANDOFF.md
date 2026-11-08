# Incognix 0.10.1 handoff — November 8, 2026

## Use the tested build

The authoritative checkout is `/Users/divytandon1813/Developer/HackDay/incognix`, branch `codex/incognix-release`. Existing installations should keep loading its `extension` folder. The old iCloud copy is not the release source.

For another computer, extract `dist/incognix-0.10.1-extension.zip` into a permanent folder and Load unpacked the folder containing manifest.json. No Node, Python, API key, server or separate desktop application is needed by the user. Chrome's on-device model must be available; Chrome may download it. Follow INSTALLATION.md.

Use the protected textbox, add supported files, review extracted text and the exact outgoing preview, then Send reviewed text. On other HTTPS chatbots, use the toolbar popup to enable the site and choose its input if needed. If no supported editor/send control is found, use explicit reviewed copy; do not assume an unchanged native textbox is protected.

## Completed in 0.10.1

- Short labelled passwords and API keys are protected, as are full quoted secrets with spaces/escaped quotes and long credentials beyond the former 500-character cutoff.
- Bearer/Basic authorization headers are recognized. Exact credential disclosure remains blocked.
- Five mandatory credential regressions added to the actual NER/rules evaluation (14 total cases). All pass; prior contextual misses/over-masking remain.
- Syntax, complete JavaScript, installed-extension browser and actual NER evaluation checks passed. No new signed-in test of 0.10.1 is claimed.

## Completed in 0.10.0

- Up to five attachments, sequential local processing, 8 MB per file / 24 MB total.
- Editable extraction per file, individual removal and cancellation.
- Atomic new batches: failure/cancellation preserves existing attachments and edits.
- Combined 12,000-character prompt/extraction budget checked again after concurrent prompt edits.
- Every occurrence of a contextually detected private value is matched; no twelve-occurrence cutoff.
- Image decode-buffer cleanup, corrected installation/build instructions and visible popup version.

## Prior 0.10.0 verification

Code commit: `4e4ed9778dd597b1eddab7022298e06a53b10b92`.

Clean CI: https://github.com/harshmaurya140-tech/HACKDAY/actions/runs/42372971182 — passed installation, pinned assets, build, syntax, JavaScript tests, browser tests, detector evaluation and packaging.

Final extracted extension ZIP passed the full browser suite in a fresh Chromium profile. SHA-256: `3b0483b2b8db1d282e76614b4f0c25e9018284ce0590053a6168eba73aaea3c1`. Actual NER, English OCR and document processing run in these checks; provider fixtures mock contextual inference. Signed-in Claude two-file extraction, reviewed masked send, prompt/reply restoration and actual clipboard round trip passed November 7. The model also over-masked a harmless meeting topic. Detailed results are recorded in LIVE_TEST_CHECKPOINT.md.

## 0.10.1 verification and package

Final code commit: `9a3d82cab686199f92681f2f7b08981b95bc8502`.
[Clean GitHub CI passed](https://github.com/harshmaurya140-tech/HACKDAY/actions/runs/42455105759) including browser tests, real NER/rules evaluation, packaging and artifact upload. The final extracted ZIP also passed the complete browser suite in a fresh local Chromium profile. Provider fixtures mock contextual inference; NER/OCR/document processing use actual bundled assets.

The final guard additionally protects private values containing placeholder-shaped substrings; only standalone placeholders are exempt from repeat tokenization.


Extension SHA-256: `b60e36ba550ccaf60e1a11a6137854945d9e738dbfb66ed6d80954fbf5e568ef`.

## Honest release boundary

This is an installable development prerelease, not a zero-bug or universal-compatibility promise. Core text workflows have selected live evidence; generic websites remain best effort. Known detector misses/over-masking are documented in DETECTION_EVALUATION.md. OCR extracts English text, not arbitrary visual meaning. Office files, voice/video, multilingual OCR and universal native-upload interception are not implemented. Attachments remain in frame memory and disappear on refresh; drafts/mappings are session-scoped, not durable backups.

Independent security assessment and Chrome Web Store submission/approval remain separate release gates. No store listing, public release or merge was performed. See RELEASE_READINESS.md for the full boundary.
