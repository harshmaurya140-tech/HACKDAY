# Capabilities and boundaries

| Area | Implemented | Boundary |
|---|---|---|
| ChatGPT / Claude / Gemini | Private iframe, adaptive styling, ON/OFF, preview, confirmed send, response restoration | Isolated fixtures verified; signed-in basic masked sends passed on all three, restoration passed all three; ChatGPT/Gemini display fixes passed live retest |
| Other chatbots | Private workspace, reviewed copy, manual answer restoration | No automatic interception, send or restoration |
| AI | Real bundled quantized BERT, Chrome local contextual analysis | BERT is English-oriented and fallible; semantic runtime availability varies |
| Credentials | Luhn cards, IBAN checksum, SSN patterns, labeled secrets, keys, OTP/PIN/CVV and baseline checks | Pattern coverage is not exhaustive |
| Company terms | User-maintained exact, case-sensitive terms | Not centrally enforced admin policy |
| Text documents | TXT/MD/CSV and text-PDF extraction; reviewed derivative export | 8 MB / 25 PDF pages / 60,000 characters; binary Office files unsupported |
| Text PDF export | Brand-new text-only PDF | ASCII fonts only; use UTF-8 TXT for other scripts; layout/images discarded |
| Visual redaction | PDF/PNG/JPEG rendering, manual regions, English OCR suggestions, new raster PDF | 8 MB; PDF 10 pages / 20M pixels; image 16MP; manual page review required |
| Native attachments/voice | Best-effort controls blocked while ON | Not a network firewall; arbitrary native tools and routes cannot be guaranteed blocked |
| Voice / DOCX | No protection pipeline | Not supported |

Text-PDF extraction does not redact the original PDF. Raster export replaces selected pixels in a new image-only PDF and excludes original text layers, attachments and metadata. Unselected visible content remains. OCR can miss handwriting, unusual fonts, small text and non-English content; faces, signatures and logos need manual selection. Raster export loses selectable text and accessibility. Automated checks are not an independent redaction security audit.

No automatic provider attachment submission is implemented. Downloaded derivatives must be inspected and deliberately shared by the user. Never upload the original believing a preview changed it.

## Remaining full-release gates

- Signed-in ChatGPT, Claude and Gemini acceptance, including streaming, navigation and provider DOM changes.
- Real Chrome local semantic-model evaluation across supported hardware and adversarial prompts.
- Broad NER/OCR multilingual and document fixture corpus, partial-region precision and accessibility review.
- Provider upload instrumentation and validation of every supported attachment route.
- Local audio transcription, Office document handling and managed enterprise policy, if retained in product scope.
- Independent security review and Chrome Web Store packaging/policy review.
