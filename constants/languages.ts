export interface Language {
  code: string;
  name: string;
  native: string;
  script: string;
  sarvamCode?: string; // Sarvam AI language code (Indian languages)
  googleCode?: string; // Google Cloud STT/TTS language code
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English', script: 'Aa', googleCode: 'en-US' },
  { code: 'es', name: 'Spanish', native: 'Español', script: 'Es', googleCode: 'es-US' },
  { code: 'zh', name: 'Mandarin', native: '中文', script: '中', googleCode: 'zh-CN' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', script: 'अ', sarvamCode: 'hi-IN', googleCode: 'hi-IN' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', script: 'த', sarvamCode: 'ta-IN', googleCode: 'ta-IN' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', script: 'తె', sarvamCode: 'te-IN', googleCode: 'te-IN' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', script: 'ಕ', sarvamCode: 'kn-IN', googleCode: 'kn-IN' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', script: 'ব', sarvamCode: 'bn-IN', googleCode: 'bn-IN' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', script: 'म', sarvamCode: 'mr-IN', googleCode: 'mr-IN' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', script: 'ગ', sarvamCode: 'gu-IN', googleCode: 'gu-IN' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', script: 'മ', sarvamCode: 'ml-IN', googleCode: 'ml-IN' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'ਪ', sarvamCode: 'pa-IN', googleCode: 'pa-IN' },
];

export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0]; // English

/**
 * Map device locale prefix to supported language code.
 * Used for auto-detecting language from device settings (no permission needed).
 */
export const LOCALE_LANGUAGE_MAP: Record<string, string> = {
  en: 'en',
  es: 'es',
  zh: 'zh',
  hi: 'hi',
  ta: 'ta',
  te: 'te',
  kn: 'kn',
  bn: 'bn',
  mr: 'mr',
  gu: 'gu',
  ml: 'ml',
  pa: 'pa',
};

/**
 * Map Indian states to likely languages (used as secondary signal when geo is available).
 * Only used if device locale is ambiguous (e.g., en-IN).
 */
export const STATE_LANGUAGE_MAP: Record<string, string> = {
  'Uttar Pradesh': 'hi',
  'Madhya Pradesh': 'hi',
  'Bihar': 'hi',
  'Rajasthan': 'hi',
  'Jharkhand': 'hi',
  'Chhattisgarh': 'hi',
  'Uttarakhand': 'hi',
  'Himachal Pradesh': 'hi',
  'Haryana': 'hi',
  'Delhi': 'hi',
  'Tamil Nadu': 'ta',
  'Andhra Pradesh': 'te',
  'Telangana': 'te',
  'Karnataka': 'kn',
  'Kerala': 'ml',
  'West Bengal': 'bn',
  'Maharashtra': 'mr',
  'Gujarat': 'gu',
  'Goa': 'mr',
  'Punjab': 'pa',
};

export function getLanguageByCode(code: string): Language {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? DEFAULT_LANGUAGE;
}

export function isIndianLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code && !!l.sarvamCode);
}

/**
 * Detect language from device locale string (e.g., "es-US", "zh-Hans-CN", "hi-IN").
 * Returns the matched language code or English as fallback.
 */
export function languageFromLocale(locale: string): string {
  const prefix = locale.split('-')[0].toLowerCase();
  return LOCALE_LANGUAGE_MAP[prefix] ?? 'en';
}
