# Incognix 0.12.0 handoff — November 12, 2026

Authoritative folder: `/Users/divytandon1813/Developer/HackDay/incognix`, branch `codex/incognix-release`. Load/reload its `extension` directory. For another computer, extract `dist/incognix-0.12.0-extension.zip` and load the folder containing `manifest.json`. Save private drafts and attachment extracts before reloading.

## New functionality
- Bundled multilingual Whisper small, with **Privacy tools → Spoken language** in the composer and matching controls in recorder/workspace. Select the language before adding audio. English, Spanish and Hindi synthetic samples have actual inference evidence; other model languages are selectable but not individually validated.
- Audio/video files up to ten minutes, microphone capture up to four minutes. Browser/OS microphone consent remains required. Site embedding-policy denial uses the extension-owned recorder and private transcript-return flow.
- Video visual text: local English OCR on up to 24 sampled frames, timestamped/deduplicated text, silent-video support, and preserved audio-only WebM handling. Faces/scenes/fast changes may be missed. No original video or frames are sent, and this is not a redacted-video export.
- Attachment-specific extraction notices are shown before review. Speech transcriptions remain editable; recognition/spelling errors were observed and are not hidden.

## Verification and delivery
Local JavaScript checks, existing full browser fixtures, real multilingual speech, Office/OCR, video visual-text, audio-only container and cancellation/network-isolation tests are recorded in `docs/TEST_EVIDENCE.md`. Current package hashes are in `dist/SHA256SUMS`. The speech assets are pinned in `docs/SPEECH_ASSETS.json` and ship with the extension; no separate program, server or API key is required. Chrome manages its own contextual-model availability/download.

Live 0.11.1 recovery on Claude passed: recorder opening, synthetic transcript return, draft preservation and real local name/email masking. No microphone audio was captured in that signed-in test. Live 0.12.0 acceptance is pending reload.

## Remaining limits
8 MB per file / 24 MB total / five files; 12,000 combined composer characters. Speech deadline fifteen minutes, visual extraction deadline three minutes. OCR is English; multilingual speech support does not establish multilingual privacy-detector accuracy. Custom/closed/cross-origin editors cannot all be automatically integrated. Detection and transcription are fallible. No zero-bug, universal-compatibility or independent-security-audit claim is made.

Chrome Web Store publication has not occurred. Publisher account, support contact, hosted privacy policy and store review are external distribution steps. Prepared listing materials are in `docs/STORE_LISTING.md`.
