# Synthetic speech fixtures

Generated locally with macOS `say`, 16 kHz mono PCM WAV; no user recording or personal data.

- speech.wav: English, “Hello. This is a local privacy test. Please keep my information private.”
- speech-es.wav: Mónica, “Hola. Esta es una prueba de privacidad. Mi nombre es Ana. Por favor, protege mi información personal.”
- speech-hi.wav: Lekha, “नमस्ते। मेरा नाम राहुल है। यह एक परीक्षण है। मेरी जानकारी निजी रखें।”

Assertions verify core words and the expected language/script, not perfect accuracy. Whisper small produced spelling errors and rendered Ana as Anna in the observed Spanish output. These three fixtures do not establish coverage of every model language, accent, noisy recording, or downstream multilingual privacy detection.
