# 0.8.0 development prerelease

Starting from v0.7.1, this build replaces the active placeholder NER path with bundled quantized BERT inference, adds local English OCR, a universal manual workspace, exact outgoing previews, document extraction and visual raster redaction. It also fixes stale-draft submission, serializes preview confirmation, tightens extension-origin checks and preserves integrated drafts in session storage.

Legacy GLiNER adapter code/tests remain for compatibility but GLiNER weights are not shipped and the active UI does not load that path. BERT and Tesseract are the bundled engines. Chrome's language model remains required for contextual text analysis.

See docs/TEST_EVIDENCE.md for measured validation and docs/CAPABILITIES.md for outstanding gates. This is not v1.0, not independently security-audited, and not approved for blanket claims of universal automatic chatbot or attachment protection.
