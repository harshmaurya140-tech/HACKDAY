# Incognix v0.7.1 — Native textbox visibility when protection is OFF

## Fixed

- Protection OFF hides the **entire private-composer iframe**, not merely its textarea. The AI website's native input becomes unobstructed and usable, including seeing everything typed.
- A small **Protection off** switch in a separate extension-origin iframe floats **above** (not inside) the website composer, allowing the user to turn privacy protection back on without disabling the extension.
- Protection ON hides the website composer and restores the already-existing private composer, keeping private drafts inside the extension-origin frame.
- No protected draft is copied to the website when protection is switched off. If an unsent native website draft exists, turning protection back on is blocked until the user clears or sends it.
- OFF state is maintained if the website rerenders its editor; navigation to a different conversation resets protection ON as a safe default.

## Testing

- 44 JavaScript regression test suites passed.
- Chromium DOM integration passed OFF→native typing→ON, including refusal to overwrite a nonempty native draft.
- Chromium rendered the small extension-origin OFF toggle and verified its ON request.
- These are synthetic tests, not authenticated Chrome/Claude end-to-end validation.

## Release limitations

- GLiNER2 model/runtime artifacts remain unbundled; the interim detector relies on Chrome on-device AI.
- This is an experimental development build, not Web Store published or security audited. Use only synthetic data.

---

# Incognix v0.7.1 — Composer toggle and host-adaptive visual update

This release continues from v0.6.3 and addresses the three requested UI/interaction changes.

## Implemented

- **Per-chat, default-on privacy toggle** inside the extension-controlled prompt bar. Off restores the original site's composer; On reclaims it for protected sending. The compact switch remains available while off.
- **Safe mode transitions.** Turning off never copies a private extension draft into the page; it clears only its own verified previously staged sanitized draft. Re-enabling refuses to erase a genuine website draft. Toggling during an active submission is refused.
- **Adaptive UI.** Reads computed presentation styles (opaque background, text, border, button colors, font family and radius) from the actual AI page composer, validates their format and renders the extension with matching visual tokens. This is not a set of hardcoded platform themes.
- **Unbranded input.** Removed the old product-name heading and diamond mark from the private composer; response labels remain hidden. Removed unused Python pairing UI markup.
- **Security.** Mode changes must originate from an authorized extension-origin frame; the content script can only be toggled through the service worker's validated channel. Private draft content does not accompany a toggle message.

## Validation performed

- 43 JavaScript regression suites (including a new toggle authorization and DOM contract test).
- Local Chromium styling preview for protected and off states.
- Source ZIP and extension ZIP validity.

## Still not verified / not launch ready

- Real model GLiNER2 weights and bundled inference runtime are missing; Chrome on-device AI remains the detector.
- End-to-end logged-in ChatGPT/Claude/Gemini interactive and privacy leakage tests still required.
- Chrome Web Store review / public listing not submitted.
- Not for real sensitive data yet.
