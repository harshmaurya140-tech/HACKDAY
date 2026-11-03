# Validation evidence — 2026-10-27

Local run on macOS ARM64, Node 25.6.0, Playwright 1.56.1 / isolated Chromium 141.0.7390.37:

- JavaScript suites: 50 passed. Includes baseline contracts, worker bridge integration, duplicate-send serialization, mandatory previews, origin rejection, draft recovery, credential rules, Unicode restoration and image dimension budgets.
- Source syntax checks passed.
- Real packaged ONNX/WASM BERT inference passed on synthetic name/company/location and a long-window input. Observed short-example startup/inference: 367 ms in the latest source run (368 ms from the extracted ZIP); not a general benchmark.
- Real bundled English OCR recognized five words from a synthetic rasterized PDF with external HTTP blocked.
- PDF extraction, reviewed text reconstruction, re-extraction canary checks, response restoration and stale-preview invalidation passed.
- Raster PDF export re-rendered with black replacement pixels, empty text layer, no attachments and no original metadata canary. Full-page and partial-region exports passed; the partial-region test also verifies unchanged white pixels outside the selection. Broader document/coordinate cases still need validation.
- Installed-extension ChatGPT, Claude and Gemini DOM fixtures passed private draft isolation, OFF/ON, guarded native draft handling, exact preview, confirmed sanitized send and stale-analysis rejection.
- No HTTP requests from the tested workspace/redactor pages. Tests block external HTTP; provider fixtures are synthetic routed pages.
- npm audit reported zero known vulnerabilities at validation time. This is not a security certification.

**Semantic inference is mocked in UI tests.** Actual BERT and OCR are exercised separately. Chrome's built-in language model was not available in the isolated test profile. Subsequent native Chrome control allowed a signed-in synthetic smoke test: real local analysis and reviewed masked submission completed on Claude, Gemini and ChatGPT. Claude and Gemini restored replies; ChatGPT restoration exposed changed markup. Adapter fixes passed a DOM regression and an October 27 installed-extension retest with fresh submissions on ChatGPT and Gemini. ChatGPT and Gemini restoration survived page refreshes. See [live checkpoint](LIVE_TEST_CHECKPOINT.md) for exact scope and limitations.

Reproduce with README commands. `artifacts/browser-evidence.json` is written only after the browser suite completes successfully. Screenshots are synthetic fixtures. The initial branch build also passed GitHub Actions on Ubuntu (run 40223963173). Follow the PR checks for the latest revision.

No claims are made for multilingual accuracy, scanned-document completeness, handwriting, native upload interception, real provider streaming or security against every hostile page. Remaining gates are listed in CAPABILITIES.md.

## Local checkout follow-up

Development resumed in the verified local checkout on the existing `codex/incognix-release` branch. Model hashes passed in the copied checkout. Added full PDF extraction deadlines, AbortSignal cleanup and independent document-loading state so typing does not discard a pending attachment. Six real browser rejection cases cover malformed UTF-8, NUL text, malformed PDF, unsupported DOCX, blank PDF and page-limit violations. The expanded browser suite passed, including typing during delayed file loading. Chrome semantic inference remains mocked in these UI checks.

## 0.8.1 composer documents and optional sites

Added browser-fixture tests for attaching a synthetic text PDF inside each integrated composer, mandatory preview, masked email in outgoing document text, original filename exclusion, successful send, attachment cleanup and malformed PDF rejection. All three passed. Idle composers measured below 190 px, and fixed-bottom inputs remained inside a 420 × 500 viewport. A multiline contenteditable failure found by these tests was fixed using text nodes and line breaks.

Generic-adapter tests use a separate HTTPS fixture and verify unique labelled-input selection, refusal of ambiguous chat inputs and exclusion of unrelated fields. Background tests verify optional permission requirements, revocation, origin binding and frame-height forwarding. These do not establish compatibility with all live AI sites. UI suites mock semantic inference; real bundled NER/OCR checks still run separately.

## 0.8.2 follow-up — October 28

51 JavaScript suites passed, including short labelled account numbers, optional all-HTTPS permission rejection/registration, and formless or explicitly selected generic editors. Source syntax checks passed. Installed-extension fixtures for ChatGPT, Claude and Gemini passed real PNG OCR in the composer, extracted-email masking, private host-page isolation, PDF submission, whole rounded shell replacement, compact idle sizing and a 420 × 500 viewport. Real bundled NER and OCR ran; contextual semantic inference was mocked. Live Chrome showed 0.8.2 enabled. A fresh Claude test verified the full composer shell visually, real local masked preview, confirmed submission, and local prompt/reply restoration. Gemini produced a real masked preview, but native Chrome control failed during the send check (ScreenCaptureKit error -3811); delivery and resulting layout were not verified. No universal platform-compatibility claim is made.

## 0.8.3 attachment follow-up

Added actual scanned-PDF OCR on an image-only synthetic PDF, cancelled-document rejection, clipboard-image ingestion in each of the three provider fixtures, and replacement-file drop checks that invalidate the prior preview. OCR worker cancellation has a separate regression for cancellation during startup and late worker cleanup. Generic adapter tests cover plain-text send controls, hidden duplicates and ambiguous visible controls. Semantic inference remains mocked in automated UI tests. No new signed-in acceptance is claimed for this revision.

## 0.8.4 currency input regression — 2026-10-29

Reproduced the bundled BERT tokenizer alignment exception with `₹1,25,000`. The old custom punctuation splitter disagreed with the model tokenizer. Non-whitespace source segments now retain tokenizer-native punctuation/normalization, with conservative word-level source spans and the full sequence equality guard still enforced.

Passed syntax checks, all JavaScript suites (including real-tokenizer Unicode/currency regression), and the complete installed-extension browser suite. Actual ONNX/WASM inference succeeded for a synthetic multi-task currency prompt. OCR/PDF and ChatGPT/Claude/Gemini fixture flows passed. Contextual Chrome AI is mocked in those fixture flows; this is not a signed-in end-to-end pass. The previously observed new-chat restoration issue remains under investigation.

## 0.8.5 conversation identity regression — 2026-10-29

All JavaScript tests and the full installed-extension browser suite passed after the navigation fix. The ChatGPT fixture now begins at `/`, submits a reviewed sanitized prompt, transitions through the observed local-chatgpt provisional route, and then to a canonical UUID route. It asserts that both routes register the same private session and retain the original composer bridge. This fixture failed before fixing registration to use Chrome's current tab URL (sender.url retained the initial document URL). Unit regressions cover provisional expiry, no-send navigation, existing chats, interrupted navigation, stale sender URLs, cross-origin rejection and reattachment on reload. Signed-in verification of 0.8.5 remains pending; this does not resolve DOB-dependent arithmetic.

## 0.8.6 generic send compatibility

Live read-only DeepSeek landing-page inspection confirmed `textarea.hero-input[maxlength="800"]` inside `.ds-input-wrapper`, an unnamed `button.ds-hero-send-btn`, and DeepThink/Search toggle buttons. Added an origin-scoped selector for that send button; generic detection now supports named ARIA button controls, title labels and submit inputs while rejecting disabled/ambiguous/toggle controls. Added pre-staging maxlength validation and explicit Copy reviewed text recovery. The original page initially failed with its own ChunkLoadError and recovered on reload. No successful live DeepSeek submission or cross-origin mapping transfer is claimed.

Syntax, all JavaScript suites and the complete browser suite passed. Regressions cover observed DeepSeek DOM, custom/disabled buttons and 800/801-character native-send boundaries. Existing ChatGPT, Claude and Gemini fixture flows remain passing. Clipboard action is implemented but has not received a signed-in browser acceptance test. Universal website compatibility remains unverified.

## 0.9.0 release-hardening validation — October 30

Verified in the authoritative local checkout on `codex/incognix-release`:

- `npm run check`, `npm test`, `npm run test:browser`, and `npm run verify:model` passed.
- The installed-extension browser fixtures passed explicit cancellation with draft retention and no additional send on ChatGPT, Claude and Gemini, alongside existing stale-analysis, PDF/image OCR, consent and compact-layout checks.
- Local calendar-age tests passed the supplied DOB/reference-date example (24 years, 7 months, 13 days), leap-day convention, invalid/future/ambiguous inputs, masked DOB and private AGE-token restoration.
- `node tests-js/test-private-copy.cjs` passed restored-text copying, clipboard denial feedback, and hiding copy when mappings are unresolved. This uses the actual frame script with a mocked bridge and clipboard; it does not verify native clipboard permissions on signed-in websites.
- The full browser suite exercised real bundled ONNX/WASM NER and English OCR. Contextual semantic inference remained mocked in provider fixtures. Model/runtime and OCR pinned assets verified.
- No external requests were observed from the tested workspace and redactor pages. This is not a whole-browser network/privacy audit.

The new age/cancel/copy features still need signed-in acceptance after reloading version 0.9.0. Remote CI has not been checked for this revision. See RELEASE_READINESS.md for explicit pending features and final-release gates.

## 0.9.1 clipboard follow-up

The signed-in Claude test passed actual cancellation/retry, masked send and local age restoration, but exposed denied clipboard writes in the embedded response frame. Added `clipboard-write` to the private iframe's delegated capabilities (no clipboard-read or new manifest permission). Updated the capability contract. Syntax checks, all JavaScript suites, the full browser suite, pinned asset verification and ZIP integrity checks passed again. Native clipboard acceptance is recorded separately in LIVE_TEST_CHECKPOINT.md.

## 0.9.2 clipboard fallback — October 31

Write-only iframe delegation did not fix the signed-in host's async clipboard denial. Added a user-click copy-command path entirely in the private frame, retaining the async path and visible failure feedback. Syntax checks, the JavaScript suites and the installed-extension browser suite passed. The expanded clipboard regression also passed a real isolated Chromium clipboard readback with exact text equality. It requests clipboard-read only in the isolated test context, never in the extension. Signed-in Claude reported Copied, but native paste verification was inconclusive; see LIVE_TEST_CHECKPOINT.md.

## 0.9.3 DeepSeek chat control — October 31

Inspected the live signed-in `chat.deepseek.com` DOM without submitting the user's pending draft. Unlike the `deepseek.com/en/` landing control, the chat app uses an unlabelled `div[role=button]` with semantic `ds-button--primary ds-button--circle` classes and an arrow SVG. Disabled state uses `ds-button--disabled`, not native disabled or aria-disabled. The hidden native composer scope contains this control.

Added an origin- and editor-scoped match requiring the observed arrow glyph, and excluded the CSS-disabled state. Tests reproduce the unlabelled control, reject disabled and stop-glyph states, and retain ambiguous-control rejection. Updated the error to describe an unidentified enabled button without incorrectly directing full-chat users to the full chat app.

Syntax, JavaScript suites, installed-extension browser suite and pinned model/OCR asset verification passed. The DeepSeek regression uses observed DOM fixtures; a live end-to-end send is pending extension reload. This does not establish DeepSeek reply restoration or universal website support.

## 0.9.4 DeepSeek restoration follow-up — November 1

Added DeepSeek first-send navigation, unrelated-chat isolation, revisit and query-stability coverage. Background integration tests verify root is not indexed as an established chat, live URL registration after navigation uses the same session, refresh reattaches it, and a new chat gets an isolated session. Observed-DOM tests select only the main answer and user text, excluding the thinking panel. Syntax and JavaScript suites passed. Live 0.9.3 masked submission passed but restoration failed; 0.9.4 live restoration remains pending.

The full installed-extension browser suite also passed for this revision: real bundled NER/OCR and document processing, plus ChatGPT/Claude/Gemini fixtures with mocked contextual semantic inference. Those fixtures do not substitute for a live DeepSeek restoration check.

Signed-in 0.9.4 DeepSeek acceptance subsequently PASSED on November 1: actual local analysis, inspected masked preview, explicit reviewed send, retained first-send session, user/answer restoration and restoration after a normal page refresh. The fresh synthetic conversation and observed bridge transitions are recorded in LIVE_TEST_CHECKPOINT.md. This closes the narrow live restoration check above; broader provider and attachment acceptance gates remain open.

## 0.9.5 detection boundary hardening — November 2

Fixed the sentence punctuation absorbed into PERSON spans observed in the earlier Claude test. Boundary adjustment occurs only after overlap resolution and never trims credential unions. Regression cases preserve initials, Jr. suffixes, apostrophes, hyphens and accented names, and verify exact draft round trips. The Indian mobile format backup now accepts internal spaces, nonbreaking spaces and hyphens, including +91 prefixes, without joining separate lines or matching inside longer contiguous identifiers. This is not international phone validation.

`npm run check`, `npm test`, and `npm run test:browser` all passed. A new actual bundled ONNX/WASM NER browser regression verifies Nora Vale is masked without its sentence period, the spaced phone is masked, and restoration exactly reproduces the original draft. Existing real OCR, PDF and raster-export checks passed, as did ChatGPT/Claude/Gemini installed-extension fixtures. Contextual semantic inference remains mocked in those provider fixtures; no new signed-in acceptance is claimed for 0.9.5.

Remote CI inspection found only older failed runs at b51d5f9 (latest run 40697120379); it does not validate the current local release. Current-version remote CI remains pending.

## 0.9.6 clipboard policy guard — November 2

The screenshot shows a Clipboard API policy violation on the earlier Claude test conversation; the screenshot alone cannot date the logged event. The current copy fallback could still invoke async writeText after the copy command failed even when the effective document policy denied clipboard-write. Added an effective-policy check before that fallback, retaining manual-copy feedback and extension-local handling. No new clipboard permissions or host-page transfer were added.

Syntax and all JavaScript suites passed, including real Chromium clipboard readback and a new real Permissions-Policy: clipboard-write=() response-header test. With the copy command forced to fail, the async API is never called, the UI reports Copy unavailable, temporary fields are removed, and no policy violation is logged. The successful command fallback remains available under that policy. This is isolated browser verification; no fresh signed-in Claude test or full document/provider browser suite rerun is claimed for this narrowly scoped change.

Signed-in 0.9.6 Claude clipboard round trip subsequently PASSED November 2: restored answer copied and pasted back into the private composer with exact visible name/email and answer text. After refreshing the error log, only the two pre-existing entries remained. See LIVE_TEST_CHECKPOINT.md for the synthetic conversation and separate trailing-glyph defect.

## 0.9.7 Claude footer icon cleanup — November 2

Read-only inspection of the signed-in synthetic Claude conversation found the stray U+E056 character inside span[data-cds="Icon"][aria-hidden="true"]. Cleanup now removes one trailing occurrence per observed hidden design-system icon, only when no prose follows that icon in the source DOM. It does not globally delete private-use Unicode or rewrite model prose.

Syntax and the JavaScript suites passed; the added real Chromium DOM regression covers the observed footer, a literal identical symbol in answer text, literal plus footer, a leading icon before prose, unknown hidden spans, user text, action-like prose and placeholder preservation. The additional footer-position guard passed the targeted regression after the full JavaScript run. Signed-in post-reload display acceptance remains pending.

The full installed-extension browser suite also passed for 0.9.7: real NER/OCR, PDF extraction and raster export, and ChatGPT/Claude/Gemini composer fixtures. Contextual semantic inference is mocked in provider fixtures; this is not signed-in acceptance of the updated adapter.

November 3 signed-in acceptance: Chrome confirmed 0.9.7 enabled. A fresh Claude synthetic greeting restored without the stray trailing glyph, and native copy/paste into the private composer matched the clean displayed answer. Actual contextual analysis ran; it also produced a false-positive OTHER detection for Best regards, recorded for follow-up. See LIVE_TEST_CHECKPOINT.md for the conversation and exact scope.
