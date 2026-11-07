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

## 0.8.1 follow-up

The user reloaded and enabled 0.8.1. The native Chrome toolbar reported Incognix available on the synthetic ChatGPT tab, but the tab subsequently exposed no page accessibility content and screenshot capture returned black. A toolbar-popup check was interrupted by concurrent user interaction. No successful live PDF-send or visual-layout result is claimed for this revision. Automated fixture evidence is in TEST_EVIDENCE.md; the prior 0.8.0 signed-in results do not establish acceptance of the new features.


## October 28 — 0.8.2

Chrome UI showed Incognix 0.8.2 enabled. A fresh Claude session displayed one full-width blue/graphite composer with no nested native toolbar. Synthetic Nora Vale / nora.test@example.org were masked by real local analysis, explicitly previewed, submitted, and restored inside private extension frames in both user prompt and assistant reply. Conversation: https://claude.ai/chat/7c3a5010-3060-4384-a8cd-21bd69875a0d .

A fresh Gemini session produced a real masked preview for the same synthetic test. During confirmed-send control Chrome changed foreground and subsequent observation failed with ScreenCaptureKit -3811. Do not count Gemini delivery/restoration/layout as passed for this revision. ChatGPT and arbitrary additional providers have not received a fresh signed-in 0.8.2 acceptance run. Image OCR was exercised in all three isolated provider fixtures, not in this signed-in smoke test.

## October 29 — 0.8.4 multi-task currency test

Chrome showed 0.8.4 enabled. A fresh signed-in ChatGPT tab received a synthetic five-task prompt containing name, employer, email, phone, address, birth date, government identifiers, bank details and ₹1,25,000. Local analysis ran and a masked prompt reached ChatGPT. Browser observation timed out between analysis and delivery; the review/confirmation interaction was not observed, so do not claim an agent-verified approval sequence. The final provider answer preserved masked tokens and the currency amount. No raw user-provided personal record was used; the test was labelled fictional.

Conversation: https://chatgpt.com/c/6ae25d17-0040-83ec-9e65-0398c1af2cdb .

Restoration failed: the composer bridge changed from the initial bridge to a new one. An observed page link retained `/c/local-chatgpt%3A8917b658-9a05-41cd-b618-cf3630346b7d`, while the final address used the canonical conversation id. The navigation state machine preserved new-to-temporary but discarded temporary-to-canonical. 0.8.5 adds a single bounded transition after a locally initiated send, with expiry and known-chat isolation regressions. Signed-in acceptance of this fix remains pending reload.

The provider explicitly could not calculate age because DOB was masked. Exact placeholder restoration alone cannot repair that computation. This remains a task-utility gap; do not claim that all five tasks succeeded. Native screenshot capture also failed with ScreenCaptureKit -3811; observations above use accessibility text.

## 0.8.5 signed-in ChatGPT restoration retest

Chrome UI confirmed Incognix 0.8.5 enabled. The agent opened a fresh ChatGPT tab and entered: “Fictional privacy test. Nora Vale uses nora.test@example.org. Write one sentence greeting her by name, mentioning her email and the amount ₹1,25,000. Preserve every placeholder token exactly as written.”

Actual local analysis completed. The exact outgoing preview contained PERSON, EMAIL and AMOUNT placeholders; the agent inspected it and clicked Send reviewed text. The observed route changed from `/c/local-chatgpt%3Aa3884451-2562-4753-b166-de424e07cd90` to `/c/6ae37f63-8224-83ee-9bc0-884d6dc978b2`. The composer and both response frames retained bridge c14147e5-bf8c-4f2f-a8b2-4dc828dbc4df. Both user prompt and assistant reply displayed Nora Vale, nora.test@example.org and ₹1,25,000 inside extension-origin private response frames.

A normal page refresh created bridge a47549cb-b306-4c68-9c45-bc665e12b817. The provider text initially showed placeholders while frames loaded, then both private frames restored the same three original values. This confirms same-tab refresh reattachment for this live conversation.

Conversation: https://chatgpt.com/c/6ae37f63-8224-83ee-9bc0-884d6dc978b2 .

Result: PASS for actual local review, explicit reviewed send, temporary-to-final URL transition, user/assistant restoration and normal refresh. This narrow test does not establish all-provider acceptance, document/voice parity, or DOB-dependent arithmetic. No raw personal data from the user's supplied record was used.

## 0.9.0 signed-in Claude age and cancellation — October 30

User confirmed reloading 0.9.0. Used a new Claude conversation because ChatGPT had an unrelated saved native draft; that draft was not changed or sent.

Synthetic prompt: “Synthetic privacy test using fictional details. My name is Nora Vale. My date of birth is 15 March 2002. Calculate my exact age as of 28 October 2026. Reply in one sentence with my name and the age. Preserve every private placeholder exactly; use any supplied local calculation result.”

- Cancelled actual Chrome local analysis; status confirmed cancellation, private draft remained intact and native Claude editor stayed empty. Retried successfully.
- Actual local inference requested choices for both dates, labelled OTHER. Kept both hidden. The outgoing preview contained PERSON, two OTHER tokens and an AGE result token; no raw name, dates or derived age appeared in the preview.
- Explicit reviewed send reached https://claude.ai/chat/b9ac3171-4528-4c31-8dbd-0d1b6816de22 . The original bridge survived navigation.
- Private assistant frame restored: “Nora Vale., your exact age as of 28 October 2026 is 24 years, 7 months, 13 days.” Age and name restored correctly, but a trailing full stop included in the PERSON span yielded awkward punctuation. Date type accuracy and entity punctuation boundaries remain quality gaps.
- Copy restored text failed visibly in the live embedded frame. The iframe only delegated `language-model`; 0.9.1 adds write-only `clipboard-write` delegation. Native clipboard success still requires retesting. No clipboard-read permission was added.

This is a narrow synthetic acceptance test, not all-provider or arbitrary private-calculation coverage.

## 0.9.2 clipboard fallback follow-up — October 31

Delegating clipboard-write alone did not resolve live Claude's denied async clipboard access: Copy reviewed text still showed its selection fallback. Added an explicit-click copy-command fallback within the extension-owned document; temporary text nodes are removed and focus/selection restored. No private text is placed in the host page and no clipboard-read permission is requested by the extension.

A fresh masked synthetic greeting was submitted in the same test conversation. Its newly created private response frame loaded the updated script from the unpacked extension and displayed “Hello Nora Vale, it’s great to connect with you at nora.test@example.org.” Clicking Copy restored text reported “Copied.” The installed extension manifest had last been reloaded as 0.9.1; these new frame resources contained the 0.9.2 fallback. A later native paste attempt did not expose a pasted value in accessibility output and screen capture returned blank, so the live clipboard round trip is INCONCLUSIVE, not a full pass.

The isolated Chromium regression independently used the real copy command and read back exactly “Hello Nora Vale.” from its clipboard. Separate mocked cases verify the async fallback, denial feedback, unresolved-map exclusion and temporary-node cleanup. The full JavaScript and installed-extension fixture suites passed with the fallback implementation; only the clipboard regression was expanded afterward and rerun successfully.

## 0.9.3 signed-in DeepSeek send test and 0.9.4 follow-up

After the user confirmed reloading 0.9.3, opened a separate DeepSeek tab. The popup offered Enable on this site; reactivated the already-authorized integration without an additional Chrome permission prompt.

Entered the synthetic prompt: “Synthetic privacy test. Write one short greeting for Nora Vale at nora.test@example.org. Preserve every placeholder token exactly as written.” Real local analysis produced PERSON and EMAIL placeholders. Inspected the exact outgoing preview and clicked Send reviewed text. DeepSeek accepted it and created https://chat.deepseek.com/a/chat/s/8bc80ee5-0a9d-4d5f-95bf-52267f639b7e . The provider reply retained both placeholders. This verifies the unlabelled Send control fix on the live chat app.

Restoration failed: the composer bridge changed from 3693c3fa-e107-4a00-8532-1b588fd697b9 to a75927d2-69fa-483d-87a7-a4148a9f78a7 on first-send navigation. Live DOM inspection also found `.ds-assistant-message-main-content` for the actual answer, `.ds-think-content .ds-markdown` for thinking, and `.ds-message .ds-collapsible-text` for the user prompt. Generic selectors missed these bodies.

0.9.4 recognizes DeepSeek root as a new conversation and its established conversation UUID in both content navigation and background indexing. It preserves a locally initiated first-send mapping, supports same-tab refresh reattachment, and keeps subsequent new chats isolated. Optional-site authorization remains required. It selects the observed user/answer bodies, excluding thinking. Automated regression coverage is recorded in TEST_EVIDENCE.md; signed-in restoration acceptance requires the 0.9.4 reload and fresh submission. Existing lost mappings cannot be reconstructed from provider placeholders.

## 0.9.4 signed-in DeepSeek acceptance — November 1

Chrome displayed version 0.9.4; enabled the extension and activated the already-authorized DeepSeek integration. Used a fresh synthetic conversation, not the user's private draft. Actual local analysis of the Nora Vale / nora.test@example.org greeting produced PERSON and EMAIL tokens. Inspected the exact outgoing preview and explicitly clicked Send reviewed text.

Conversation: https://chat.deepseek.com/a/chat/s/2c5aa8f0-3f3d-412b-a76d-a67d59ae2b3d .

The provider received `[PRIVATE_PERSON_1_058CED]` and `[PRIVATE_EMAIL_1_44BD10]` and preserved them in its reply. The original bridge aadf145d-3ea9-42b4-9281-9031e4acde33 survived first-send navigation. Private frames restored the original user prompt and the answer: “Hi Nora Vale, I hope this greeting reaches you at nora.test@example.org.” Thinking content remained masked and was excluded from the restored answer.

A normal page refresh created bridge cfa02141-f4de-4018-84ba-ad900079ff2c and reattached the session. After loading, both private frames again displayed the original synthetic name and email.

PASS: actual local analysis, reviewed masked send, first-send session preservation, user/answer restoration, and same-tab refresh restoration. This narrow text smoke test does not establish attachment acceptance, clipboard round trip, all DeepSeek controls, or universal site compatibility.

## 0.9.6 signed-in Claude clipboard round trip — November 2

Chrome Extensions UI confirmed Incognix 0.9.6 enabled. Recorded two existing clipboard policy error entries associated with the older b9ac3171-4528-4c31-8dbd-0d1b6816de22 conversation; did not clear them. Opened a fresh Claude tab and entered only the synthetic Nora Vale / nora.test@example.org greeting. Actual local analysis produced PERSON and EMAIL placeholders. Copy reviewed text reported success. Inspected the masked preview and explicitly sent it.

Conversation: https://claude.ai/chat/4808be29-e42f-4a87-a265-4aa37240efdb .

The prompt and answer restored in private frames while retaining bridge e0263521-a0f6-4aef-b1ff-d693f689c01b. Copy restored text reported Copied. Pasted using the native keyboard shortcut into the empty Incognix private composer; accessibility output showed the actual answer with Nora Vale and nora.test@example.org, matching the restored answer. Removed that synthetic pasted draft without sending it. This verifies the real clipboard round trip, not only the success label.

Revisited and refreshed Chrome's extension error log: the same two old entries remained, with no new entry for the fresh conversation. PASS for this signed-in copy flow. No claim about every host or forced-denial path in signed-in Chrome. A separate display defect was observed: a trailing private-use glyph U+E056 remained after “Best regards” in the restored answer and its copied text; follow-up formatting work is needed.

## 0.9.7 signed-in Claude rendering and copy — November 3

Chrome Extensions confirmed 0.9.7 enabled. Opened a fresh synthetic Claude conversation and ran actual local analysis for a greeting to Nora Vale at nora.test@example.org ending with Best regards. Inspected the exact outgoing preview before explicitly sending. Name and email were masked; the model also masked Best regards as OTHER, an observed false positive that remains a detection-quality issue.

Conversation: https://claude.ai/chat/4ff82f31-8849-44c7-a141-9ea82af0b888 .

The initial bridge d6e1784a-1656-4c74-9ba6-2e469b5fd073 survived navigation. Both prompt and answer restored locally. The answer ended with Best regards and no stray private-use glyph. Clicked Copy restored text and pasted with the native keyboard shortcut into the empty private composer: the pasted answer matched the displayed answer, with name/email restored and no trailing glyph. Removed the unsent synthetic paste.

PASS for signed-in restored rendering and actual clipboard round trip in this conversation. This does not establish universal website coverage, attachment acceptance, or perfect detection.

## 0.9.8 contextual sign-off counter-tests — November 3

Isolated real BERT inference on the exact prior greeting returned only Nora Vale (PERSON); it did not detect Best regards. Refined Chrome's contextual detection instructions to distinguish generic output-style requests from private facts, preserving explicit secret/confidential contexts. No phrase whitelist or sensitivity bypass was added. The format retry uses the same boundary.

Reloaded the existing extension; Chrome's Extensions UI subsequently confirmed 0.9.8 enabled. On a fresh signed-in Claude new-chat page, actual local analysis produced this outgoing preview: `Synthetic privacy test. Write one short greeting for [PRIVATE_PERSON_1_32DC80] at [PRIVATE_EMAIL_1_E78A67], ending with Best regards. Preserve every placeholder token exactly as written.`

Counter-test input: `Synthetic privacy test. Our unreleased project has the confidential code name Best regards. Write one sentence about this project without disclosing its confidential code name.` The preview masked the codename as `[PRIVATE_OTHER_1_CC3C63]`. Both checks used bridge ed017e23-07e0-4cc0-90a9-df43bfda64a1. Neither prompt was sent to Claude; cleared the synthetic draft afterward.

PASS for these two real local-classifier examples. This is a prompt refinement, not proof that model false positives or false negatives are eliminated. Broader adversarial and repeated evaluation remains necessary.

## 0.9.8 signed-in image attachment attempt — November 3

Created an ignored synthetic PNG fixture at `artifacts/synthetic-ocr-contact.png` containing only a test heading, Nora Vale, and nora.test@example.org. Opened a fresh signed-in Claude page and clicked the Incognix attachment control. The macOS file picker opened, but native automation could not complete selection: the Go To Folder sheet displayed the exact existing path, while activation did not select the file and keyboard actions reset the path. Reacquiring the Chrome handle and a visible-row activation did not resolve it. The browser DOM automation could inspect the outer private iframe but did not expose its attachment control. Reloaded only the empty synthetic test page.

BLOCKED at file selection, before OCR or submission. No image was submitted to Claude and this attempt is not a live attachment pass or evidence of an Incognix extraction failure. Existing isolated image/OCR regression evidence remains separate. A manual file selection or working file-chooser automation is needed to continue the signed-in acceptance test.

## 0.9.8 image test follow-up — November 4

The user completed file selection. Native Chrome accessibility showed local OCR output exactly `SYNTHETIC PRIVACY TEST Name: Nora Vale Email: nora.test@example.org`. Added a synthetic greeting instruction and requested Review. The UI remained at local-model initialization for an extended period; screenshot and accessibility observations disagreed, so reliable timing and cancellation behavior were not established. The eventual reviewed preview masked the name as `[PRIVATE_PERSON_1_C8DFFD]` and email as `[PRIVATE_EMAIL_1_E1D530]`. It also unnecessarily masked `SYNTHETIC` as `[PRIVATE_OTHER_1_ED9015]`, a remaining detection false positive. Explicitly clicked Send reviewed text after inspecting that preview.

Reopened the resulting conversation on November 4: https://claude.ai/chat/c1a114e2-580f-44a6-b8d7-8c7e3fccdb78 . Stored provider-side text contains the reviewed placeholders. The reply reads: “Hello [PRIVATE_PERSON_1_C8DFFD], it’s nice to meet you! I’ll keep your contact at [PRIVATE_EMAIL_1_E1D530] handy for anything we need to follow up on.”

PASS for this synthetic PNG's OCR, name/email masking, reviewed delivery and provider placeholder preservation. Original test tab was no longer open; a fresh native tab did not restore originals, consistent with tab-bound session indexing. Same-tab reply restoration is therefore UNVERIFIED for this image test, and reopening after closing the tab remains a product limitation. This is not a complete attachment acceptance pass, a general image-understanding test, or a network audit.

## 0.9.10 signed-in Claude text acceptance — November 4

Chrome Extensions confirmed 0.9.10 enabled after the user's reload. A new-chat page contained an existing user draft, which was left untouched; testing continued in the existing synthetic conversation https://claude.ai/chat/c1a114e2-580f-44a6-b8d7-8c7e3fccdb78 .

Entered a synthetic request confirming Nora Vale and the birth date 15 March 2002. Cancel analysis stopped the active UI flow, retained the exact draft and sent nothing. Retrying actual local analysis produced PERSON token `[PRIVATE_PERSON_1_53D415]` and date token `[PRIVATE_OTHER_1_A3735D]`. The model classified the date as OTHER; this live test does not isolate the deterministic DOB rule. Inspected the masked preview and explicitly sent it. Both prompt and reply restored in private frames. The answer was: “Confirmed: your name is Nora Vale and your date of birth is 15 March 2002.”

Copy restored text followed by native paste into the empty private composer reproduced that answer exactly. Cleared only that synthetic unsent paste. A normal same-tab refresh created a new bridge and restored both messages again. Screenshot saved locally at `artifacts/live-0.9.10-claude.png` (ignored, not published).

PASS: cancellation UI/draft retention, real local analysis, reviewed masked submission, prompt/reply restoration, actual clipboard round trip and same-tab refresh. This does not prove immediate termination of GPU work, restoration after closing the tab, every provider, or the earlier image reply's same-tab restoration.

## 0.10.0 signed-in Claude multi-file acceptance — November 7

Chrome Extensions displayed 0.10.0 enabled after the user-confirmed reload. Used only synthetic files `01-contact.txt` (Nora Vale / nora.test@example.org) and `02-note.txt` (Nora Vale / paper airplanes) in the existing synthetic conversation https://claude.ai/chat/c1a114e2-580f-44a6-b8d7-8c7e3fccdb78 . Native file selection read both together and the file selector exposed each correct extract. The page subsequently reloaded before analysis completed: the typed instruction recovered but attachments did not, consistent with the documented frame-memory limitation. Reattached the files individually using accessible file-picker actions after coordinate control failed temporarily.

Actual local analysis completed. Kept all disclosure choices hidden. The outgoing preview numbered both documents, omitted original filenames, reused `[PRIVATE_PERSON_1_4C5B37]` for the name in both files, masked email as `[PRIVATE_EMAIL_1_490077]`, and also masked the harmless topic as `[PRIVATE_OTHER_1_067379]`. That topic classification is an observed over-masking case; no perfect detection claim.

Explicitly sent only after inspecting the preview. Claude accepted the masked message. Private frames restored the full prompt and answer: “Hello Nora Vale, I’m reaching out at nora.test@example.org to follow up on our meeting about paper airplanes.” Copy restored text followed by native paste into the empty private composer reproduced the answer exactly. Cleared only the synthetic pasted draft without sending it. Screenshot saved locally as `artifacts/live-0.10.0-multifile.png` (ignored, not published).

PASS for signed-in two-file extraction/selection, real local analysis, consistent repeated-value masking, reviewed delivery, prompt/answer restoration and actual clipboard round trip. This does not establish every format combination, post-refresh attachment recovery, all providers or general image understanding.
