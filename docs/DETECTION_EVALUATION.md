# Synthetic detector evaluation

Run `npm run evaluate:ner` from the Incognix directory. Results are written to `artifacts/ner-evaluation.json`.

This runs actual bundled ONNX/WASM BERT inference and deterministic format detection in an isolated Chromium extension profile. HTTP requests are blocked. All fixtures are synthetic. It does **not** run Chrome's contextual detector or necessity model, so its findings must not be presented as full-extension accuracy or proof of disclosure.

The command reports known misses rather than failing merely because a model is imperfect. It fails for runtime errors, invalid fixture spans, or loss of the original text on restoration. The age helper's appended calculation instruction is excluded from the original-text round-trip comparison.

- `missedDetectionFields`: explicitly marked private values not fully covered by the combined detector spans.
- `overmaskedPublicSegments`: explicitly marked public phrases with any overlapping detected span. This is not an exhaustive false-positive count.
- `remainingPrivateValuesInPreparedText`: marked private values still present after this restricted pipeline prepares text. It excludes Chrome contextual detection and is not a provider transmission.

## November 4 baseline

Eight targeted cases cover image headings, sign-offs, mobile numbers, short account numbers, Indian identifiers, plain instructions, a confidential codename and a labelled birth date.

Before the labelled-DOB safeguard: two missed fields and one marked public segment over-masked. After the safeguard: one missed field (confidential codename) and one over-masked segment (`SYNTHETIC`). Both remaining cases need broader contextual-model evaluation. An earlier signed-in contextual test did protect a confidential codename; this harness intentionally evaluates the independent BERT/rules layer.

Explicit `DOB`, `date of birth`, and `birth date` labels now protect common numeric and full English-month date forms locally. Date ordering is not inferred. Unlabelled reference dates are left for contextual classification. This does not establish multilingual, abbreviated-month, handwritten or universal birth-date recognition.
