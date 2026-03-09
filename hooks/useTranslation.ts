/**
 * React hook for translations + TTS "speak" capability.
 * Wraps the centralized strings registry with the current user language.
 *
 * Usage:
 *   const { t, speak, speakKey } = useTranslation();
 *   <Text>{t('auth.enterPhone')}</Text>
 *   <Pressable onPress={() => speakKey('auth.enterPhone')}>
 */
import { useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { t as translate } from '../constants/strings';
import { textToSpeech } from '../lib/ai/cloud-api';
import { TtsPlayer } from '../lib/ai/tts-player';
import { getString } from '../lib/utils/storage';
import { StorageKeys } from '../lib/utils/storage';

export function useTranslation() {
  const { language } = useLanguage();
  const playerRef = useRef<TtsPlayer | null>(null);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      return translate(key, language.code, params);
    },
    [language.code],
  );

  /** Speak arbitrary text via Cloud Function TTS */
  const speak = useCallback(
    async (text: string): Promise<void> => {
      try {
        // Stop any current playback
        if (playerRef.current) {
          await playerRef.current.stop();
        }

        const gender = (getString(StorageKeys.VOICE_GENDER) as 'female' | 'male') || 'female';
        const speed = parseFloat(getString(StorageKeys.VOICE_SPEED) ?? '1.0');

        const audioBase64 = await textToSpeech(text, language.code, gender, speed);

        if (!playerRef.current) {
          playerRef.current = new TtsPlayer();
        }
        await playerRef.current.play(audioBase64);
      } catch {
        // Silently fail — TTS is a convenience, not critical
      }
    },
    [language.code],
  );

  /** Translate a key then speak the result */
  const speakKey = useCallback(
    async (key: string, params?: Record<string, string | number>): Promise<void> => {
      const text = translate(key, language.code, params);
      await speak(text);
    },
    [language.code, speak],
  );

  /** Stop any ongoing TTS playback */
  const stopSpeaking = useCallback(async (): Promise<void> => {
    if (playerRef.current) {
      await playerRef.current.stop();
    }
  }, []);

  return { t, speak, speakKey, stopSpeaking, lang: language.code };
}
