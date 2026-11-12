// Keep browser decoding, worker and recorder budgets consistent.
export const MAX_MEDIA_SECONDS=600;
export const MAX_RECORDING_SECONDS=240;
export const MEDIA_DEADLINE_MS=15*60*1000;
export const SPEECH_LANGUAGES=["af", "am", "ar", "as", "az", "ba", "be", "bg", "bn", "bo", "br", "bs", "ca", "cs", "cy", "da", "de", "el", "en", "es", "et", "eu", "fa", "fi", "fo", "fr", "gl", "gu", "haw", "ha", "he", "hi", "hr", "ht", "hu", "hy", "id", "is", "it", "ja", "jw", "ka", "kk", "km", "kn", "ko", "la", "lb", "ln", "lo", "lt", "lv", "mg", "mi", "mk", "ml", "mn", "mr", "ms", "mt", "my", "ne", "nl", "nn", "no", "oc", "pa", "pl", "ps", "pt", "ro", "ru", "sa", "sd", "si", "sk", "sl", "sn", "so", "sq", "sr", "su", "sv", "sw", "ta", "te", "tg", "th", "tk", "tl", "tr", "tt", "uk", "ur", "uz", "vi", "yi", "yo", "zh"];
export function validateLanguage(language='en'){
 if(!SPEECH_LANGUAGES.includes(language))throw Error('Select a supported spoken language.');
 return language;
}
export async function speechLanguage(){
 const settings=await globalThis.chrome?.storage?.local?.get('incognixSpeechLanguage');
 return validateLanguage(settings?.incognixSpeechLanguage||'en');
}
