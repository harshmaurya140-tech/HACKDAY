# Validation evidence — 2026-10-26

Local run on macOS ARM64, Node 25.6.0, Playwright 1.56.1 / isolated Chromium 141.0.7390.37:

- JavaScript suites: 46 passed. Includes baseline contracts, worker bridge integration, duplicate-send serialization, mandatory previews, origin rejection, draft recovery, credential rules, Unicode restoration and image dimension budgets.
- Source syntax checks passed.
- Real packaged ONNX/WASM BERT inference passed on synthetic name/company/location and a long-window input. Observed short-example startup/inference: 403 ms in this run; not a general benchmark.
- Real bundled English OCR recognized five words from a synthetic rasterized PDF with external HTTP blocked.
- PDF extraction, reviewed text reconstruction, re-extraction canary checks, response restoration and stale-preview invalidation passed.
- Raster PDF export re-rendered with black replacement pixels, empty text layer, no attachments and no original metadata canary. Current pixel test covers full-page redaction; partial-region precision needs broader validation.
- Installed-extension ChatGPT, Claude and Gemini DOM fixtures passed private draft isolation, OFF/ON, guarded native draft handling, exact preview, confirmed sanitized send and stale-analysis rejection.
- No HTTP requests from the tested workspace/redactor pages. Tests block external HTTP; provider fixtures are synthetic routed pages.
- npm audit reported zero known vulnerabilities at validation time. This is not a security certification.

**Semantic inference is mocked in UI tests.** Actual BERT and OCR are exercised separately. Chrome's built-in language model was not available in the isolated test profile. Signed-in Chrome control was explicitly denied by the computer-use permission boundary, so live provider acceptance was not performed or bypassed.

Reproduce with README commands. `artifacts/browser-evidence.json` is written only after the browser suite completes successfully. Screenshots are synthetic fixtures. CI configuration is supplied; a passing remote CI run is not claimed before it actually runs.

No claims are made for multilingual accuracy, scanned-document completeness, handwriting, native upload interception, real provider streaming or security against every hostile page. Remaining gates are listed in CAPABILITIES.md.
