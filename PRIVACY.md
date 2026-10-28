# Privacy and storage

Drafts and documents are processed in extension-origin pages. Incognix bundles its BERT and English OCR assets and processing libraries. It does not upload raw content to an Incognix server or use a cloud analysis API. Chrome manages its own local language-model availability and initial download. Build-time dependency/model downloads are separate from user-content processing.

Integrated drafts and placeholder mappings live in Chrome session storage, scoped to tab/conversation. Closing a tab clears its records; browser restart clears session storage. These records are not separately encrypted by Incognix. The workspace and raster editor hold document content/mappings in page memory. Closing or reloading those tabs loses them. Confidential terms are saved in local extension storage until changed or the extension is removed.

Only the exact reviewed outgoing text is handed to integrated providers after confirmation. Copy/export deliberately puts reviewed content on your clipboard or disk; those locations are outside extension control. Response restoration happens locally. Restored responses can contain private information.

OFF mode uses the normal site editor. Content typed into a site's native editor, uploaded through native tools, or shared before activation is already exposed to that site. The extension cannot retract previous disclosures. A hostile site can imitate or hide UI; Incognix is not a browser-wide network firewall.

No analytics or telemetry endpoint is configured. Automated evidence covers tested local operations, not every possible browser or third-party behavior. Detection is fallible; review previews and every redacted page yourself.

Additional HTTPS sites require an explicit per-site or all-HTTPS host permission from the toolbar popup. Granted sites receive an isolated content script; permission can be revoked through Chrome extension site access. The generic detector leaves ambiguous inputs unchanged; the user can explicitly select an input. PNG/JPEG OCR runs locally and only reviewed extracted text can be sent. Image pixels are not uploaded by this flow. Composer document bytes/text stay in the extension frame until extraction and review; only the approved text crosses to the provider. Original attachments and extracted attachment text are not saved as durable backups.
