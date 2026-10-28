## 0.8.3 — attachment workflow and accurate status

- Paste screenshots into the private draft or drop one supported file onto the composer. Replacing an attachment cancels its processing and invalidates earlier previews.
- Composer PDF attachments now OCR image-only pages locally with the bundled English model. Limits: 10 PDF pages when OCR is needed, 20M total rendered pixels and a three-minute document deadline. Text-only workspace behavior is unchanged.
- OCR cancellation settles promptly even during worker startup; late-created workers terminate.
- Generic adapters recognize a unique plain-text Send/Ask/Submit button inside the bound composer, ignoring hidden/disabled controls and rejecting ambiguity.
- Toolbar status explicitly reports protection OFF instead of claiming an installed composer is active.
- This is an incremental development release. Broader live-site acceptance, multiple attachments, multilingual quality evaluation and visual-image sharing remain outstanding.

## 0.8.2 — composer images and wider activation

- PNG/JPEG attachments now use the bundled local OCR, with editable extracted text and the existing mandatory privacy preview. Original pixels remain local.
- New neutral graphite/blue composer, full bounded shell replacement (including native toolbars), and consistent restored user bubbles/assistant typography.
- Optional activation across HTTPS sites and a manual input picker extend the generic adapter beyond the three built-in sites. Unknown send controls and unsupported editors still fail closed.
- Explicitly labelled 4–8 digit account identifiers are now masked by the format validator.
- Automated installed-extension fixtures exercise real image OCR, PDF review/send, full shell replacement and small viewports. Contextual AI remains mocked in those tests; Claude passed a signed-in masked-send/restoration check; Gemini preview passed, but delivery checking was interrupted by the screen-capture connection. Broader signed-in acceptance remains outstanding.

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
