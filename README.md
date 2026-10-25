# Incognix v0.7.1

**Private prompting for ChatGPT, Claude, and Gemini — directly in your browser.**

Incognix is an experimental Chrome extension designed to reduce unnecessary disclosure of personal information in AI conversations. It offers a private, extension-controlled composer, analyzes text with Chrome's on-device AI where supported, replaces selected sensitive values with consistent placeholders, and locally restores known placeholders in AI responses.

> **Release status:** **Development beta.** Incognix v0.7.1 is **not security-audited or published on the Chrome Web Store**. Use **fictional data only** for testing. Sensitive-data detection and live website compatibility are not guaranteed.

## Features

| Feature | Behavior in v0.7.1 |
| --- | --- |
| **Protection ON/OFF switch** | Protection starts **ON**. Switching **OFF** hides the entire private composer and reveals the original AI website textbox. A small **Protection off** switch remains above the native textbox so protection can be re-enabled. |
| **Private draft isolation** | Turning protection off never copies an unsent private draft into the website's textbox. Switching back on does not silently overwrite a nonempty website draft. |
| **Adaptive composer styling** | Reads the current website's computed colors, typography, border and button styling instead of using fixed visual themes for ChatGPT, Claude and Gemini. |
| **Minimal in-chat UI** | No product-name heading or diamond icon inside the composer. |
| **Browser-local sensitive-data detection** | Uses Chrome's on-device LanguageModel / Prompt API where available, plus generic structured-format checks. |
| **Contextual necessity assessment** | A separate local assessment checks whether an exact sensitive value is materially needed for the task. |
| **Selective disclosure** | Unnecessary detected values are masked. Eligible values considered necessary require explicit user approval before disclosure. High-risk identifiers have stricter safeguards. |
| **Conversation-scoped placeholders** | Stable pseudonymous tokens are mapped locally to original values for supported conversations. |
| **Private answer restoration** | Recognized placeholders in assistant replies are restored within extension-origin frames rather than writing original private values back into the AI website's DOM. |
| **Three website adapters** | Contains integration code for ChatGPT, Claude and Google Gemini, subject to changing website structures. |

## How it works

```text
User types in Incognix's private composer
                    |
                    v
      Local sensitive-data detection
                    |
                    v
         Local necessity assessment
                    |
                    v
  Automatic masking or user disclosure review
                    |
                    v
          Sanitized/approved prompt
                    |
                    v
           ChatGPT / Claude / Gemini
                    |
                    v
          External AI generates reply
                    |
                    v
   Local restoration of known placeholders
       inside an extension-owned frame
```

The **external AI answers the user's request**; the local model is used for privacy classification. Placeholder replacement is **pseudonymization**, not encryption or a guarantee of anonymity.

### Protection toggle

- **ON (default):** The protected composer replaces the site's native input. Incognix performs available local analysis and sanitization before submitting a message.
- **OFF:** The private composer disappears entirely. The website's ordinary input reappears; anything typed or sent there is **not protected by Incognix**.
- **Back ON:** Click the compact **Protection off** switch above the normal textbox. If the native textbox contains an unsent draft, clear or send it first; Incognix won't silently erase it.
- **New chat / refresh:** Protection returns to ON by default. A draft or temporary placeholder mapping may be lost when the extension reloads.

## Requirements and supported websites

- **Google Chrome 138 or newer**, with the necessary on-device AI API and compatible hardware/configuration.
- Supported site adapters: [ChatGPT](https://chatgpt.com), [Claude](https://claude.ai), and [Gemini](https://gemini.google.com).
- **No Python, pip, Ollama, local server, companion application or cloud API key** is required for an end user.
- Chrome may need to initialize or download its built-in AI model. If required local analysis is unavailable, protected submission is designed to block rather than send an unprocessed prompt.

**Compatibility warning:** Automated tests cover the adapters, but the current build has **not** been comprehensively verified in authenticated live sessions on all three sites.

## Installation

1. Clone or download and extract this repository to a permanent folder.
2. Open **`chrome://extensions`** in Google Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository's **`extension/`** directory (the folder containing `manifest.json`).
6. Confirm the extension appears as **Incognix** and is enabled.
7. Open or refresh ChatGPT, Claude, or Gemini.
8. Check that **Protection on** is displayed before trying a **fictional** test prompt.

After changing extension files, click **Reload** on its card in `chrome://extensions` and refresh the AI website tabs. Avoid loading multiple copies from different folders.

For more installation details, see [INSTALLATION.md](INSTALLATION.md).

## Project layout

```text
extension/
  manifest.json              # Chrome Manifest V3 configuration
  background.js              # Service worker / extension message bridge
  content/                   # Site adapters, native-input integration and navigation
  core/                      # Privacy rules, placeholder and response utilities
  private/                   # Private composer, local AI and restored-response frames
scripts/                     # Experimental GLiNER2 build and verification utilities
tests-js/                    # JavaScript regression tests
tests-ui/                    # Synthetic Chromium UI/layout tests
INSTALLATION.md              # User installation and toggle instructions
RELEASE_NOTES.md             # v0.7.1 release behavior and limitations
package.json                 # Developer commands
```

## Developer testing

End users do **not** need Node.js. Developers can execute the regression tests from the repository root:

```bash
npm test
```

The v0.7.1 release recorded **44 passing JavaScript regression suites**, plus synthetic Chromium checks of protection OFF → native typing → protection ON and the small re-enable switch.

These checks do **not** establish real-world detection accuracy or prove that confidential information cannot reach the provider on a live logged-in website.

### GLiNER2 asset check

```bash
npm run verify:model
```

This check is **expected to fail for the distributed v0.7.1 build**: the required model assets are not included.

## GLiNER2 integration status

GLiNER2 ONNX-related source modules and build tooling are present, but v0.7.1 **does not bundle operational GLiNER2 model weights, tokenizer assets or the complete inference runtime**. Actual browser GLiNER2 inference has not been verified against real inputs.

The current extension instead relies on **Chrome's on-device AI**, when available, together with structured-format checks. **Do not describe GLiNER2 as active in this release.**

## Security boundaries and known limitations

- Incognix attempts to **reduce unnecessary exposure**; it cannot guarantee anonymity, perfect PII recognition or zero leakage.
- Missed sensitive entities, surrounding context, or incorrect necessity classifications could still disclose information.
- **Protection OFF** exposes the ordinary website input to that AI service with no Incognix sanitization.
- Only supported **text-chat workflows** are in scope. Do not assume files, images, voice, external tools or other submission paths are protected.
- Changes to ChatGPT, Claude, or Gemini's interface may break input selection, sanitized submission, or response restoration.
- Not every complex response format or special AI artifact can be restored perfectly.
- Full authenticated multi-platform end-to-end checks, a network-leakage audit, and model accuracy/performance benchmarking are still outstanding.
- Incognix v0.7.1 is an unpublished development build, not a certified or security-reviewed product.

**For now, use synthetic information instead of genuine personal data, financial details or credentials.**

## License

See [LICENSE](LICENSE).
