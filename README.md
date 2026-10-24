# AI Privacy Shield — Chrome Extension Prototype

**Three-platform design:** ChatGPT, Claude, and Gemini adapters are included. This is a pre-release prototype. Its integrations are **not yet validated in the user's logged-in browser**; website UI changes may break one or more adapters.

## Core behavior

1. An extension-origin iframe sits over the normal composer on supported AI sites. Type **only in this protected composer**.
2. Clicking Send / pressing Enter runs local Python detection and a conservative necessity classifier.
3. Unnecessary detected details are replaced with session-specific placeholders **without showing a popup**.
4. If exact values appear relevant, the user chooses to hide, share a reduced value, or disclose exactly. No exact values are auto-released.
5. The approved text is inserted into the site's original composer and the site's normal Send control is activated.
6. Responses containing known placeholders are restored by a local Python service and displayed in **extension-origin iframe**, not in the AI site's DOM.

The local classifier **never answers the task**: ChatGPT, Claude, or Gemini does. The project deliberately **does not calculate age** or income tax locally. It might extract a DOB's birth year only if the user explicitly authorizes that reduced disclosure.

## Files

- `extension/manifest.json`: Chrome MV3, limited to three AI domains and localhost.
- `extension/content/adapters.js`: three platform-specific composer/response selectors.
- `extension/content/content.js`: page integration, sanitized submission, private overlays.
- `extension/private/`: extension-owned composer, review UI, and restored response UI.
- `extension/background.js`: trusted bridge to local Python engine.
- `backend/engine.py`: PII detection, conservative necessity classification, dictionaries and restoration.
- `backend/main.py`: authenticated local FastAPI service.
- `tests/`: regression tests using **synthetic** examples only.

## What access is needed

**No account passwords, session cookies, API keys, or real personal documents.** You install the unpacked extension yourself in Chrome and run Python locally. Test on your logged-in AI tabs using **synthetic** identifiers. The extension needs limited page access to the three sites to interact with the composers and visible responses.

## 1. Prepare Python

From the project root:

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
python -m backend.main
```

The service binds only to `127.0.0.1:8765` and prints a fresh **pairing code**. It will not work when running Python on a remote/cloud machine, since private text must remain local.

## 2. Install Chrome extension

1. Visit `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `extension/` folder.
4. Visit `https://chatgpt.com`, `https://claude.ai`, or `https://gemini.google.com` and reload.
5. Locate the **Privacy Shield** replacement composer. Enter the one-time pairing code printed by Python.
6. Use **synthetic** prompt data and test a round trip. If the composer does not appear, the website's DOM may have changed (see troubleshooting).

The local service's pairing state is in memory. After restarting Python, use the newly printed pairing code again.

## 3. Local AI enhancements

The base prototype includes regex and context-based detectors, enough for synthetic demo prompts containing explicit patterns and `my name is John Smith`. These alone do **not** provide reliable general-language name recognition.

**Optional offline-capable open-weight NER:**

```bash
pip install -r requirements-ml.txt
export ENABLE_GLINER=1
python -m backend.main
```

By default this attempts `fastino/gliner2-privacy-filter-PII-multi`; model weights must be downloaded once. The model's available languages do not establish Hindi/Marathi support. Due to model/framework versions, confirm span extraction manually against the installed GLiNER2 output before relying on it. The engine fails closed to regex detection if the model is unavailable; it does **not** claim the optional model is active merely because the environment variable was enabled.

**Optional local necessity model via Ollama:** install [Ollama](https://ollama.com), then:

```bash
ollama pull qwen3:1.7b
export ENABLE_OLLAMA=1
python -m backend.main
```

Ollama is called **only on `127.0.0.1`**; it returns suggested IDs of potentially necessary fields. Its suggestions cannot authorize disclosure. Deterministic rules continue to operate if Ollama is missing.

## 4. Run tests

```bash
python -m pytest tests -q
```

If pytest is unavailable: `pip install pytest`. JavaScript syntax checks: `node --check extension/background.js` and similar for other `.js` files.

## Current scope and limitations

- **Included adapters for all three platforms, not yet verified on logged-in sites.** We intentionally do not claim all adapters are operational until tested in Chrome. The selectors are maintained separately for quick fixes.
- **Text-only MVP.** Does not protect file attachments, voice input, camera data, browsing, AI tools, or private information already present in prior chat history.
- **Native shortcuts / site rerenders can bypass protection.** The replaced composer is protected only while the extension shows its own iframe and indicates that the local engine is active. If the site replaces the form, the extension may need to reconnect; stop typing until the protected composer reappears.
- A malicious/compromised website or extension may try to interfere with UI; cross-origin iframes make casual DOM reads harder but cannot promise complete security.
- Incorrect detections and contextual re-identification are possible. This product minimizes unnecessary exposure; it does not guarantee anonymity.
- Restored text is displayed as **plain text** in a protected iframe, not a perfect reconstruction of Markdown/artifacts. Initial response restoration occurs after the output appears stable, not guaranteed in realtime.
- Backend uses **in-memory dictionaries only** and cannot recover them after restart. Reset a chat or re-pair after restarting Python.
- The local engine needs to be started before using the extension. Native Messaging + installer is a later packaging milestone.
- Chrome and website behavior changes could prevent composer placement, programmatic sending, or message observation. Never blindly fall back to raw input.
- Product should not be presented as audited or ready for sensitive production data.

## Testing each platform

For each of ChatGPT, Claude and Gemini, verify:

1. The real account is logged in and a **protected** composer is visible.
2. On typing a synthetic original string, the host page DOM **does not** contain the original raw prompt.
3. Enter and Send initiate local analysis.
4. The host chat displays sanitized placeholders when the message is sent.
5. A synthetic assistant reply containing placeholders is restored inside the private response iframe.
6. DOB exact-age task prompts for disclosure; ordinary bank complaint does not.
7. Restarting Python or navigating to unsupported pages never sends raw data.
8. If site selectors fail, record the page's HTML element information **without sharing real private messages**, then update the relevant adapter.

## Security decisions

- No remote API keys or cloud PII detection.
- One-time terminal pairing code, random bearer token, `127.0.0.1` binding, origin checks, and session validation.
- Raw prompts are passed directly from extension-origin iframe to service worker to local Python. Content scripts see **only sanitized text**.
- Restoration returns to the extension-origin iframe; content scripts do not receive restored text.
- No telemetry or request-body logging in this prototype.
- `chrome.storage.local` contains only the local service bearer token; no original dictionaries.
- Pairing and authorization are a prototype control, not a formal security audit. On a production release prefer Chrome Native Messaging and signed packaging.
