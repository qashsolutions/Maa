/**
 * Offline detection and error recovery utilities for the voice pipeline.
 * Handles STT failures, TTS failures, Gemini timeouts, and no-internet scenarios.
 */
import NetInfo from '@react-native-community/netinfo';

/** Check if device is online */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
}

/** Categorize voice pipeline errors for appropriate user feedback */
export type ErrorCategory = 'offline' | 'stt_failed' | 'tts_failed' | 'gemini_timeout' | 'unknown';

export function categorizeError(error: Error): ErrorCategory {
  const msg = error.message.toLowerCase();

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
    return 'offline';
  }
  if (msg.includes('stt') || msg.includes('speech') || msg.includes('transcri')) {
    return 'stt_failed';
  }
  if (msg.includes('tts') || msg.includes('audio') || msg.includes('playback')) {
    return 'tts_failed';
  }
  if (msg.includes('gemini') || msg.includes('429') || msg.includes('500')) {
    return 'gemini_timeout';
  }
  return 'unknown';
}

/** Get user-friendly error message by category and language.
 *  Uses centralized string registry for all 10 Indian languages. */
export function getErrorMessage(category: ErrorCategory, language: string): string {
  const { t } = require('../../constants/strings');

  const keyMap: Record<ErrorCategory, string> = {
    offline: 'errors.offline',
    stt_failed: 'errors.sttFailed',
    tts_failed: 'errors.ttsFailed',
    gemini_timeout: 'errors.geminiTimeout',
    unknown: 'errors.unknown',
  };

  return t(keyMap[category], language);
}

/** Retry a function with exponential backoff */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError!;
}
