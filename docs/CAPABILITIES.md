# Capabilities and boundaries

| Area | Implemented | Boundary |
|---|---|---|
| ChatGPT / Claude / Gemini | Private iframe, adaptive styling, ON/OFF, preview, confirmed send, response restoration | Isolated fixtures verified; signed-in basic masked sends passed on all three, restoration passed all three; ChatGPT/Gemini display fixes passed live retest |
| Other HTTPS chatbots | Optional per-site/all-HTTPS activation, input picker, generic labelled-input adapter with open-shadow discovery, preview/send and supported response selectors; manual fallback | Automatic detection requires a unique labelled input; manual picking helps with unlabelled inputs. Closed shadow DOM, cross-origin embedded frames, custom editors and unknown response markup may be unsupported. No all-sites guarantee |
| DeepSeek chat | Reviewed text send, prompt/answer restoration, same-tab refresh | Signed-in synthetic text smoke test passed on 0.9.4, November 1; broader controls and attachment acceptance pending |
| AI | Real bundled quantized BERT, Chrome local contextual analysis | BERT is English-oriented and fallible; semantic runtime availability varies |
| Credentials | Luhn cards, IBAN checksum, SSN patterns, labeled secrets, keys, OTP/PIN/CVV and baseline checks | Pattern coverage is not exhaustive |
| Company terms | User-maintained exact, case-sensitive terms | Not centrally enforced admin policy |
| Text documents | Attach TXT/MD/CSV and text PDFs inside the composer; same review/send flow; workspace derivative export | 8 MB / 25 PDF pages; composer combined limit 12,000 characters, workspace 60,000; composer scans use English OCR (10 pages / 20M rendered pixels); encrypted PDFs rejected; Office formats have a separate bounded text reader |
| Multiple attachments | Up to five files, sequential extraction, cancellation, individual review/edit/removal; failed batch preserves earlier attachments | 8 MB each / 24 MB total; 12,000 combined prompt/text characters; originals and extracts are frame-memory only and lost on refresh |
| Image attachments | PNG/JPEG local English OCR in composer, paste/drop, editable extraction, standard privacy review | 8 MB / 16MP; text only, no original pixels sent. Not general visual understanding; handwriting/non-English may fail |
| Text PDF export | Brand-new text-only PDF | ASCII fonts only; use UTF-8 TXT for other scripts; layout/images discarded |
| Visual redaction | PDF/PNG/JPEG rendering, manual regions, English OCR suggestions, new raster PDF | 8 MB; PDF 10 pages / 20M pixels; image 16MP; manual page review required |
| Native attachments/voice | Best-effort controls blocked while ON | Not a network firewall; arbitrary native tools and routes cannot be guaranteed blocked |
| Local exact age | Private calendar calculation and result token restoration | One self-labelled DOB and explicit age-as-of date; ISO or full English month date only; not general arithmetic |
| Analysis cancellation / private copy | Retain draft on cancellation; copy restored answers in private frame | Cancellation passed signed-in Claude; copy passed isolated Chromium readback and signed-in Claude copy/paste on 0.9.6. Other hosts remain unverified |
| Office | DOCX text, XLSX raw/cached cells, PPTX ordered slide text; same privacy review | 8 MB compressed / 24 MB expanded ZIP, 1,000 archive entries, 4 MB per XML, 12,000 output characters, 50 sheets / 100 slides. Macros/embedded packages rejected; visual objects omitted |
| Audio/video | Local multilingual Whisper small transcription for supported WAV/MP3/M4A/OGG/FLAC/MP4/WebM audio tracks; editable transcript, cancellation | 8 MB / ten minutes / 15-minute speech processing deadline. Chrome codec support applies. Up to 24 video frames sampled for English OCR; not full scene understanding, speaker identity or guaranteed recognition |
| Microphone | Explicit-click mono recording inside the composer, Stop/Cancel, track cleanup | Four minutes; browser/OS consent required. Site embedding-policy denial opens an extension-owned recorder with private transcript return |

Text-PDF extraction does not redact the original PDF. Raster export replaces selected pixels in a new image-only PDF and excludes original text layers, attachments and metadata. Unselected visible content remains. OCR can miss handwriting, unusual fonts, small text and non-English content; faces, signatures and logos need manual selection. Raster export loses selectable text and accessibility. Automated checks are not an independent redaction security audit.

No automatic provider attachment submission is implemented. Downloaded derivatives must be inspected and deliberately shared by the user. Never upload the original believing a preview changed it.

## Remaining full-release gates

- Signed-in ChatGPT, Claude and Gemini acceptance, including streaming, navigation and provider DOM changes.
- Real Chrome local semantic-model evaluation across supported hardware and adversarial prompts.
- Broad NER/OCR multilingual and document fixture corpus, partial-region precision and accessibility review.
- Provider upload instrumentation and validation of every supported attachment route.
- Managed enterprise enforcement is not part of this consumer extension.
- Independent security review and Chrome Web Store packaging/policy review.
