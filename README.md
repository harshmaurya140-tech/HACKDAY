# Incognix v0.7.1 — browser-only development build

**Product rename:** Previously known as AI Privacy Shield. The project now ships under the name **Incognix**. GitHub repository ownership/name (`harshmaurya140-tech/HACKDAY`) is unchanged.


For end-user installation steps and the **Protection on/off** toggle, see [INSTALLATION.md](INSTALLATION.md). OFF now completely hides the extension composer and reveals the real AI input, leaving just a small extension-owned re-enable switch above it. ON restores the protected composer. The private composer matches current host-site styling using computed CSS tokens, and no longer displays the Incognix heading or diamond. The GLiNER2 runtime code is present but not active without the model/compiled runtime assets; Chrome on-device AI remains the working interim model on eligible devices. This is not yet a security-audited production release.

# Incognix 0.6.3

**Chrome-only test build:** fixes Gemini disclosure panel scrolling and keeps approval buttons visible. Users do not need Python/Ollama. Model inference and all-platform privacy guarantees are not fully validated. Only test with fictional data.

## Installation

1. Extract the extension-only ZIP.
2. Open `chrome://extensions`, enable Developer mode, and load the extracted `incognix/extension/` folder. For upgrades, replace your previously installed `extension` folder and press Reload.
3. Refresh ChatGPT, Gemini, and Claude. Start a **new chat** to test.
4. On Gemini, when disclosures are listed, scroll *inside the choice list*. The **Approve & send** and **Cancel** buttons remain below it.

## Validation

Run `npm test` from the source root to run the JavaScript suites. Developers with Playwright's Python package and Chromium installed can run `python tests-ui/test_gemini_consent_viewport.py` for a local synthetic UI layout check.

## Status and limitations

The GLiNER2 browser code remains incomplete as a runtime product: no large model weights/tokenizer/runtime are bundled, and arbitrary-text accuracy has not been verified. Chrome's on-device AI is still used where available. Never use this alpha to process authentic private data. A visual rendering test does **not** establish that raw identifiers stay off the network in live websites.

---

# Incognix v0.6.1 — Cross-platform response layout test build

A browser-only Chrome Manifest V3 extension that **aims** to reduce disclosure of private identifiers when sending prompts to ChatGPT, Claude and Gemini. It uses an extension-origin private composer, browser-local AI classification, per-conversation placeholders, optional user consent for materially necessary fields, and local restoration in extension-owned response frames.

**Privacy note:** This is **not a verified security product**. It can miss identifying information; models and changing website interfaces can fail. Use synthetic test data only.

## Install (end-user runtime)
Extract the package, open `chrome://extensions`, enable Developer Mode, choose **Load unpacked**, and select the `extension` directory. It does not need Python, pip, Ollama, a desktop helper, a local server, or a cloud API key. Chrome's on-device Prompt API is required and may download its model on first use; eligible Chrome/hardware configuration is required. If it cannot run, protected Send blocks.

## What actually runs
- **PII detection:** Chrome on-device Prompt API with generic format-validation safeguards.
- **Necessity assessment:** a separate Chrome on-device Prompt API step with stable integer candidate IDs. This classifier never answers the task. Missing or contradictory decisions default to hiding the corresponding field.
- **Identifier protection:** standard account/credential families are not exposed via the disclosure UI. Other values are disclosed only with user approval when necessity is strongly indicated.
- **Pseudonymization:** JavaScript Maps serialized into extension-only `chrome.storage.session` and scoped to a conversation/browser tab.
- **Display:** a separate extension-origin iframe restores exact known placeholder tokens without writing the originals back into host-controlled DOM.

## What's fixed in v0.6.1
- ChatGPT: select the real conversation composer rather than an interactive Writing/document editor. Keep the protected editor attached as document editors appear and disappear during streaming.
- ChatGPT: mount restored answers *after the conversation turn*, outside embedded Writing cards, with appropriate content width.
- Gemini: select `model-response` messages but extract only their Markdown/response-body subtrees, excluding "You said", "Gemini said", controls and echoed user text.
- Gemini: preserve line breaks, lists, and paragraphs from the sanitized response DOM while reconstructing the private answer.
- All sites: restore assistant content in a naturally sized frame so long answers scroll with the webpage instead of being cut off behind the native composer.
- New GLiNER2 asset gate: `npm run verify:model` fails unless the model, tokenizer and compiled ONNX runtime are truly present.

## GLiNER2 status
GLiNER2 browser ONNX pipeline scaffolding and mock-tested decoding live in `extension/core` and `extension/private/gliner2-runtime.js`, but the actual model weights, tokenizer and WASM/WebGPU inference runtime are **not included**. `extension/private/vendor.bundle.js` is an explicit placeholder. This means **GLiNER2 is not active and this is not the finished product**. A complete tested packaging procedure, including Web Store policy review, remains a required release gate.

## Developer tests (not required for users)
```
node --version
npm test
```
39 mock/regression suites passed for v0.6.1. Testing on the real logged-in sites, privacy network inspection, and model accuracy benchmarking are pending.

## Threat boundary
Original values are visible to your local Chrome browser and trusted extension code. Pseudonymization does not guarantee anonymity. Never use this test release for banking, medical, legal or other confidential content.

See `RELEASE_NOTES.md` for the implemented fixes and outstanding limitations.

## Release blocker (must not be ignored)
The GLiNER2 weights (~614 MB), tokenizer, ONNX Runtime Web bundle and WASM runtime are **not** in these development ZIPs; network access from the build container was unavailable. Thus **GLiNER2 is NOT ACTIVE** in this package. The project provides a browser inference path and a developer-side build procedure, but its exact ONNX model output has not yet been tested against real local inputs. The existing Chrome Prompt API remains the interim detector. Do not call this a production release or use real personal identifiers in testing.

The **developer**, not the end user, must run `npm install`, `npm run build:model:complete` with internet access, then verify actual inference/parity in Chrome before shipping a model-equipped extension. The user installs **only** the resulting extension, with model resources already included. The model asset check checks size/existence, not model accuracy.

Current authorized target models: ChatGPT, Claude, Gemini. Their logged-in production DOM compatibility still requires live verification after this fix.

## Gemini formatted response restoration (v0.6.3)

Gemini reply formatting is preserved by serializing its **sanitized** assistant Markdown body into a limited structural tree (headings, paragraphs, lists, emphasis, code, tables, and safe links). The MV3 service worker substitutes only known private placeholder tokens inside that tree; the extension-origin frame then recreates inert DOM elements via `createElement` and `createTextNode`. The website receives no restored originals. Untrusted site HTML, CSS, event handlers and arbitrary attributes are never copied into the extension.

This addresses the previous plain-text rendering bug that produced stray bullet dots, uneven spacing, flattened code, and lost headings. The fallback for changed Gemini DOM markup remains a plain-text view. Changes require live verification in Chrome on `gemini.google.com` before release.

This remains a browser-local development build: **GLiNER2 model weights/runtime are not bundled or verified as active**, and privacy leakage testing on authenticated AI sites is not complete. Use synthetic inputs.
