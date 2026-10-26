# Live Chrome acceptance checkpoint — 2026-10-26–27

Signed-in smoke tests used the installed Incognix 0.8.0 development preview. The user confirmed it is loaded from `/Users/divytandon1813/Developer/HackDay/incognix/extension`. Tests were performed through native Chrome UI using fictional data. No real private information was submitted.

## Prompt and observations

Synthetic prompt: “Synthetic privacy test. Write a one-sentence greeting for Nora Bell. Her email is nora.bell@example.org. Keep any placeholder tokens exactly as written.”

| Check | Claude | Gemini | ChatGPT |
| --- | --- | --- | --- |
| Private composer renders | Pass | Pass | Pass |
| Actual local analysis completes | Pass | Pass | Pass |
| Preview masks fictional name and email | Pass | Pass | Pass |
| Confirmed provider message contains placeholders | Pass | Pass | Pass |
| Reply restored in extension-origin frame | Pass | Pass | Pass after selector fix (October 27) |
| OFF/ON retains private draft without copying it to native editor | Not checked this run | Pass | Not checked this run |

Claude and Gemini returned replies containing the fictional name and email after restoration. These were visible in extension-origin response frames. ChatGPT returned a Writing card with placeholders; clicking Refresh restored messages did not fix it. DOM inspection showed new `data-markdown-text-style="assistant-message"` and `data-user-message-bubble="true"` containers, absent from the previous adapter selectors. Added those fallbacks, an observed turn anchor, and explicit exclusion of Writing editors from composer detection.

Gemini restoration included its truncated “You said” accessibility heading. The fix isolates `.query-text` and excludes `.cdk-visually-hidden` from serialization. A real Chromium DOM regression covers both provider layouts, toolbar exclusion, and rejection of a Writing editor when the chat input disappears. The October 27 installed-extension retest passed: fresh masked submissions on ChatGPT and Gemini restored both user messages and replies in extension-origin frames. Gemini no longer included the duplicated heading. ChatGPT and Gemini restoration also survived normal page refreshes. Old tokens from the previous extension session remained unresolved, as expected when temporary mappings are unavailable.

## Scope and remaining checks

These are simple UI smoke checks, not a semantic accuracy benchmark or network-level leakage audit. The submitted provider-visible text was observed with placeholders. Complex necessity decisions, complex multi-turn behavior, cross-tab/restart persistence, cancellation, live documents, streaming variants, additional languages and broad platform coverage remain unverified.

The local-model status remained at “Downloading Chrome local AI model… 100%” before the preview appeared. Progress wording can be improved; it did not prevent these analyses from completing.

## Browser-control limitation

Native UI rendered the private frames normally. Claiming the same tabs through the browser connector exposed empty `srcdoc` frames; this effect was not seen before claiming. The cause is unconfirmed. No attribute was removed or browser restriction bypassed. DOM inspection through that connector was read-only and limited to the synthetic test messages.

The browser connector also blocks extension settings navigation. The user reloaded the extension, then native live retesting resumed with fresh synthetic submissions. A settings reload alone was not treated as a passing test.
