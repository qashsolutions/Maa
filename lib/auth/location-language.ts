/**
 * Language auto-detection.
 * Primary: device locale (instant, no permission needed).
 * Secondary: geolocation for Indian states (only if locale is ambiguous like en-IN).
 */
import * as Localization from 'expo-localization';
import { languageFromLocale, DEFAULT_LANGUAGE } from '../../constants/languages';

interface LanguageDetectionResult {
  languageCode: string;
  detectedFrom: 'device_locale' | 'fallback';
  permissionGranted: boolean;
}

/** Detect language from device locale — instant, no permissions required */
export async function detectLanguageFromLocation(): Promise<LanguageDetectionResult & { state: string | null }> {
  try {
    const locales = Localization.getLocales();
    if (locales.length > 0) {
      const deviceLocale = locales[0].languageTag; // e.g., "es-US", "zh-Hans-CN", "hi-IN"
      const languageCode = languageFromLocale(deviceLocale);
      return {
        languageCode,
        state: null,
        detectedFrom: 'device_locale',
        permissionGranted: false, // no permission needed
      };
    }
  } catch (error) {
    console.warn('Locale detection failed:', error);
  }

  return {
    languageCode: DEFAULT_LANGUAGE.code,
    state: null,
    detectedFrom: 'fallback',
    permissionGranted: false,
  };
}
