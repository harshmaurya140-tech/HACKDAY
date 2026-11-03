# Final release readiness

Status: development prerelease. Do not label this build universally compatible or production audited.

## Implemented in this release-hardening pass

- Local calendar-age calculation for one explicit self-labelled DOB and one explicit age-as-of date (English full month names or ISO dates, 1900–2200). The derived result uses a private AGE token and is restored locally. Ambiguous dates, multiple DOBs, relative dates and invalid dates do not produce a result. Calendar month-end anniversaries clamp to the last day of the month. The provider must preserve the result token.
- Cancel local analysis while retaining the private draft.
- Copy restored text from inside the private response frame, rather than the website's masked copy action.
- Wrapping review controls and visible keyboard focus.
- CI installs Chromium before JavaScript suites which launch Playwright. Remote CI success is not yet verified.

## Release gates and pending features

| Area | State | Required evidence or work |
|---|---|---|
| Text privacy | Bundled NER + Chrome contextual model + format rules | Broader adversarial, multilingual and false-negative corpus; improve date types and broader entity boundaries (PERSON sentence punctuation regression fixed in 0.9.5); 0.9.8 ordinary-sign-off and confidential-codename live counter-tests passed after contextual prompt refinement; broader false-positive/negative evaluation still required; no perfect detection claim |
| Local age | Implemented, deterministic unit coverage | Signed-in Claude synthetic age test passed; other providers pending. This is not arbitrary private arithmetic |
| Website compatibility | Three primary adapters; optional generic sites; DeepSeek chat text smoke test passed November 1 | DeepSeek reviewed send, first navigation and same-tab refresh restoration verified in 0.9.4. Broader fresh signed-in matrix still needed, including edits, retries, attachments and additional providers |
| Unknown websites | Generic detection and explicit input picker; reviewed-copy recovery | Shadow DOM, embedded cross-origin editors, unsupported rich editors and unknown reply structures need dedicated support; never claim every site works |
| Images and scanned PDFs | Local English OCR; review extracted text | Synthetic PNG OCR, reviewed masked delivery and provider placeholder preservation confirmed on Claude November 4; same-tab image reply restoration still unverified. Other signed-in attachment workflows and handwriting/non-English evaluation pending; original visual meaning is not preserved by OCR |
| Visual redaction | Separate local raster export with mandatory visual review | Independent security review and more precision/metadata/accessibility fixtures |
| Office files | Not implemented | Bounded DOCX/XLSX/PPTX extraction, embedded-content handling and malformed/archive-bomb corpus |
| Voice/video | Not implemented | Local-only transcription, microphone consent, bounded models, cancellation, multimodal privacy tests; never silently use cloud speech |
| Multiple attachments | One at a time | Per-file queues, aggregate memory limits, removal/review state, cancellation and privacy tests |
| Private calculations | Narrow age helper | General deterministic task operations, explicit scope and provenance; do not replace arbitrary model answers with guessed results |
| Copy controls | Reviewed-copy and private-response copy implemented | 0.9.6 passes isolated clipboard/policy tests and signed-in Claude copy/paste round trip. Other hosts and streaming tests remain; Claude 0.9.7 restored rendering and copy/paste passed signed-in retest November 3 |
| Recovery | Draft preservation and explicit failures | Crash, browser restart, extension upgrade and model download interruption matrix |
| Accessibility | Focus styles and responsive controls | Keyboard-only and screen-reader acceptance across supported providers |
| Distribution | Reproducible ZIPs and pinned assets | Clean-install checks on supported Chrome/hardware, remote CI green, store policy/privacy disclosures, licensing review |
| Security | Isolation and consent tests | Independent review of bridge authorization, page spoofing, hostile documents and data retention |

## Shipping scope

A final release should publish a versioned support matrix with precise limits and last-tested dates. Generic activation is best-effort integration, not a network firewall. Unsupported attachments must fail visibly and retain the draft. No raw private data may be sent merely to improve compatibility. Keep the development label until required acceptance and security gates have evidence.
