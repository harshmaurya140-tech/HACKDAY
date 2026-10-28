# Install Incognix

1. Extract `incognix-0.8.2-extension.zip` into a permanent folder.
2. Open `chrome://extensions`, enable Developer mode, click Load unpacked, and choose the extracted folder containing `manifest.json`.
3. Pin Incognix. Clicking its icon opens a compact popup. On other HTTPS AI sites, choose Enable on this site and approve Chrome’s access prompt, or opt into Enable across HTTPS sites and refresh the chatbot tab. If detection cannot identify its editor, choose the AI input using the popup picker. A protected composer appears only when a supported input is detected.
4. On ChatGPT, Claude or Gemini, refresh the page to activate the private composer. ON means use the protected editor; OFF exposes the provider's normal editor. Switching OFF does not copy your private draft to the site.
5. Use the + inside the protected composer to attach a PNG/JPEG image or text PDF/TXT/MD/CSV. Image text is recognized locally; review and correct the OCR text before analysis. Review its extracted content with your prompt; only reviewed text is sent, not the original PDF. Attachments are held in frame memory and disappear on refresh.
6. Review the exact outgoing text, then confirm sending or copying. Approve disclosure only when appropriate. Never assume detection found every sensitive fact.

Chrome 138+ is required, but version alone does not guarantee Chrome's on-device language model is supported. Hardware, platform, storage and model availability determine whether semantic analysis can run. Chrome may download its own model on first use; Incognix does not require a separate application. See [Chrome Prompt API requirements](https://developer.chrome.com/docs/ai/prompt-api).

If analysis fails, the extension blocks sending. Manual visual region redaction remains available through the workspace. Do not bypass a failure by placing unreviewed private content into the native editor.

Before reloading/updating an unpacked extension, preserve any draft you need in a trusted local location: extension reloads may invalidate active frames. Integrated drafts are stored in session storage, not durable backups. Workspace drafts and mappings are held in page memory and are lost when that tab closes or reloads.

The GitHub source checkout needs the build steps in README. A release extension ZIP is ready to load without Node, Python or a backend.
