export interface Language {
  code: string;
  name: string;
  native: string;
  script: string;
  sarvamCode?: string; // Sarvam AI language code
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English', script: 'Aa' },
  { code: 'hi', name: 'Hindi', native: '\u0939\u093F\u0928\u094D\u0926\u0940', script: '\u0905', sarvamCode: 'hi-IN' },
  { code: 'ta', name: 'Tamil', native: '\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD', script: '\u0BA4', sarvamCode: 'ta-IN' },
  { code: 'te', name: 'Telugu', native: '\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41', script: '\u0C24\u0C46', sarvamCode: 'te-IN' },
  { code: 'kn', name: 'Kannada', native: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1', script: '\u0C95', sarvamCode: 'kn-IN' },
  { code: 'bn', name: 'Bengali', native: '\u09AC\u09BE\u0982\u09B2\u09BE', script: '\u09AC', sarvamCode: 'bn-IN' },
  { code: 'mr', name: 'Marathi', native: '\u092E\u0930\u093E\u0920\u0940', script: '\u092E', sarvamCode: 'mr-IN' },
  { code: 'gu', name: 'Gujarati', native: '\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0', script: '\u0A97', sarvamCode: 'gu-IN' },
  { code: 'ml', name: 'Malayalam', native: '\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02', script: '\u0D2E', sarvamCode: 'ml-IN' },
  { code: 'pa', name: 'Punjabi', native: '\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40', script: '\u0A2A', sarvamCode: 'pa-IN' },
];

export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0]; // English

// Map Indian states to likely languages
export const STATE_LANGUAGE_MAP: Record<string, string> = {
  // Hindi belt
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
  // South
  'Tamil Nadu': 'ta',
  'Andhra Pradesh': 'te',
  'Telangana': 'te',
  'Karnataka': 'kn',
  'Kerala': 'ml',
  // East
  'West Bengal': 'bn',
  // West
  'Maharashtra': 'mr',
  'Gujarat': 'gu',
  'Goa': 'mr',
  // North
  'Punjab': 'pa',
};

export function getLanguageByCode(code: string): Language {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? DEFAULT_LANGUAGE;
}

export function isIndianLanguage(code: string): boolean {
  return code !== 'en' && SUPPORTED_LANGUAGES.some((l) => l.code === code && l.sarvamCode);
}
