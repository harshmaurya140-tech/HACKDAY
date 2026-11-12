# Chrome Web Store submission materials — Incognix 0.12.0

Status: prepared copy and disclosures; not submitted or approved. A developer account, final publisher identity, hosted privacy-policy URL and store review are required to publish.

## Short description

Local privacy review for AI chats: text, document extraction and multilingual speech transcription. Review before sharing.

## Description

Incognix adds a private composer to supported AI chat pages. Review the exact outgoing text, hide personal details with reversible placeholders, then send only after confirmation. Known placeholders in replies are restored locally.

Attach PDF, text, PNG/JPEG, DOCX, XLSX or PPTX documents. Supported audio and audio-bearing video clips are transcribed locally in the selected spoken language. Video visual text is sampled with English OCR; scene understanding is not claimed. Record voice after explicitly granting microphone permission. Extracted text and transcripts remain editable before privacy review. File limits and omitted content are shown in the interface; original files are not uploaded by these flows.

ChatGPT, Claude and Gemini have dedicated integrations. Other HTTPS sites can be enabled per site or across HTTPS sites. Automatic integration depends on the editor and send controls; use the input picker or reviewed-copy workflow when a site cannot be integrated. Closed components, cross-origin embedded editors and arbitrary native uploads are not universally supported.

Processing uses bundled local NER/OCR/speech models and Chrome's on-device language model. Chrome hardware/model availability requirements apply. There is no cloud-analysis fallback. Detection and transcription can make mistakes; review every outgoing preview. Incognix is not a browser-wide firewall or a guarantee against all disclosure.

## Permission explanations

- storage: session-scoped drafts and placeholder mappings; local confidential terms. No sync storage or analytics.
- tabs: identify the active provider, scope sessions, clean up closed tabs and route reviewed submissions.
- scripting: install the private composer on explicitly enabled sites.
- default host access: ChatGPT, Claude and Gemini integration.
- optional HTTPS host access: user-requested activation for other chatbots; per-site grants are available.
- microphone: requested by the browser only after the user clicks Record voice; no background recording, no raw-media upload.

No remote executable code, telemetry, ads, cloud speech or Incognix server is configured. Model/library assets ship in the extension; Chrome manages its own on-device model download separately.

## Submission checklist

Use the built extension ZIP, icons in extension/icons and current screenshots from a verified build. Host PRIVACY.md at a publisher-controlled public URL and supply the real support contact. Declare processing of user-provided sensitive content accurately; do not describe the extension as having no access to user data. Its implementation processes that data locally. Do not claim universal compatibility, independently audited security or store approval.
