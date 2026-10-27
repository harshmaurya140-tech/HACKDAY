# 0.8.1 development prerelease

- Attach text PDFs/TXT/MD/CSV directly inside the protected composer. Local extraction feeds the existing masking, disclosure and outgoing-preview flow. Sends reviewed text, not original PDF bytes. Combined prompt/document limit is 12,000 characters; scans and encrypted PDFs are rejected.
- Compact auto-growing input, collapsed privacy tools, host-adaptive colors and corrected height-budget forwarding. Consent/preview content scrolls within the available frame.
- Toolbar popup replaces automatic workspace-tab opening. Optional per-site permissions and a generic adapter extend to supported labelled chat forms on other HTTPS sites. Unknown or ambiguous layouts stay unchanged; universal compatibility is not claimed.
- Bind private channels to their registered origin and reject private APIs after host-permission removal. Restrict generic sends to the selected composer container.
- Preserve multiline sanitized text in contenteditable inputs.

Live acceptance of this revision remains pending. See test evidence for isolated automated coverage.

# 0.8.0 development prerelease

Starting from v0.7.1, this build replaces the active placeholder NER path with bundled quantized BERT inference, adds local English OCR, a universal manual workspace, exact outgoing previews, document extraction and visual raster redaction. It also fixes stale-draft submission, serializes preview confirmation, tightens extension-origin checks and preserves integrated drafts in session storage.

Legacy GLiNER adapter code/tests remain for compatibility but GLiNER weights are not shipped and the active UI does not load that path. BERT and Tesseract are the bundled engines. Chrome's language model remains required for contextual text analysis.

See docs/TEST_EVIDENCE.md for measured validation and docs/CAPABILITIES.md for outstanding gates. This is not v1.0, not independently security-audited, and not approved for blanket claims of universal automatic chatbot or attachment protection.
