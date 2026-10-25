# Install Incognix v0.7.1 — Chrome-only development build

This is an **unpublished, experimental extension**. The installation needs **Google Chrome only**; it does not need Python, pip, Ollama, Node.js, a local service, or any API key. The browser-local inference API still requires a supported Chrome/device. The GLiNER2 model artifacts are **not bundled or active** in this package.

## First-time installation

1. Unzip `Incognix-v0.7.1-Extension-Only.zip` to a permanent location; do not try to upload the ZIP directly to Chrome.
2. Open Chrome and enter `chrome://extensions`.
3. Enable **Developer mode** at the top right.
4. Click **Load unpacked**.
5. Select the extracted **`extension`** directory (it must contain `manifest.json` directly).
6. Verify that **Incognix** appears in the extension list and is enabled.
7. Open or reload `https://chatgpt.com`, `https://claude.ai` or `https://gemini.google.com`.
8. Verify that **Protection on** appears on the composer before entering any test prompt.

## Upgrading an existing local installation

1. Back up your current `extension` folder if desired.
2. Replace its files with the new `extension` contents **in the same filesystem location**.
3. Click **Reload** on the extension's card at `chrome://extensions`.
4. Reload every open AI website tab. Start fresh test conversations; old in-memory private mappings may be lost across extension reloads.
5. If you installed the new release in a different location instead, remove/disable the old unpacked copy first to prevent duplicate injection.

## Toggle protection without disabling the extension

- **Protection on (default):** Only the extension-owned private textbox accepts a protected draft. Local detection and necessity assessment run before a sanitized prompt is inserted into the AI website.
- **Protection off:** The regular website textbox reappears. Any new text typed there is **not protected** by this extension and is visible to that website. The private draft is never copied into that textbox. The full extension composer **disappears completely**, allowing you to see and type in the normal AI website textbox. A small **Protection off** switch appears just above that textbox so you can re-enable protection.
- **Back on:** The website's composer must be empty. The extension will not delete an ordinary website draft when switching modes; clear it yourself first.
- **Page reload or new chat:** Protection defaults on again. A temporary protected draft can be lost on reload.

## Important release limitations

- This is **not** a Chrome Web Store release. General-public one-click installation requires publishing, store review and privacy disclosures.
- This version uses Chrome's built-in on-device AI for detection/necessity plus format validators. The GLiNER2 ONNX runtime is scaffolded but its model files are missing; **do not describe it as active**.
- Local AI availability varies by Chrome version and computer capabilities; no cloud fallback is provided.
- Live, logged-in three-platform testing and a comprehensive raw-data network leakage audit are outstanding. Test with fictional information, not actual credentials or personal records.
- Extension-based privacy reduces unnecessary disclosure but cannot guarantee anonymity or perfect detection.
