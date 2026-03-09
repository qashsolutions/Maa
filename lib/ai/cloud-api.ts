/**
 * Client-side API layer for calling Firebase Cloud Functions.
 * All AI API keys stay server-side — client only sends audio/text.
 */
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import app from '../../src/config/firebase';
import { CLOUD_FUNCTIONS, type GeminiResponse } from './types';

// Initialize functions with asia-south1 region (Mumbai)
const functions = getFunctions(app, 'asia-south1');

/** Send audio blob to Cloud Function for STT */
export async function speechToText(
  audioBase64: string,
  languageCode: string,
): Promise<string> {
  const fn = httpsCallable<{ audio: string; language: string }, { text: string }>(
    functions,
    CLOUD_FUNCTIONS.stt,
  );
  const result = await fn({ audio: audioBase64, language: languageCode });
  return result.data.text;
}

/** Send user text + conversation history to Gemini via Cloud Function */
export async function processWithGemini(
  userText: string,
  languageCode: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>,
  userContext: {
    cycleDay?: number;
    lastMood?: number;
    currentStreak?: number;
    isPregnant?: boolean;
    cycleHistorySummary?: string;
    pregnancyWeek?: number;
    averageCycleLength?: number;
    lastPeriodDate?: string;
  },
): Promise<GeminiResponse> {
  const fn = httpsCallable<
    {
      text: string;
      language: string;
      history: Array<{ role: 'user' | 'assistant'; text: string }>;
      context: Record<string, unknown>;
    },
    GeminiResponse
  >(functions, CLOUD_FUNCTIONS.gemini);

  const result = await fn({
    text: userText,
    language: languageCode,
    history: conversationHistory,
    context: userContext,
  });
  return result.data;
}

/** Send text to Cloud Function for TTS, returns audio base64 */
export async function textToSpeech(
  text: string,
  languageCode: string,
  voiceGender: 'female' | 'male',
  speed: number,
): Promise<string> {
  const fn = httpsCallable<
    { text: string; language: string; gender: string; speed: number },
    { audio: string }
  >(functions, CLOUD_FUNCTIONS.tts);

  const result = await fn({
    text,
    language: languageCode,
    gender: voiceGender,
    speed,
  });
  return result.data.audio;
}

/** Request weekly summary generation */
export async function requestWeeklySummary(): Promise<{
  summaryText: string;
  audioUrl: string;
  insights: Array<{ title: string; detail: string; domain: string }>;
}> {
  const fn = httpsCallable(functions, CLOUD_FUNCTIONS.weeklySummary);
  const result = await fn({});
  return result.data as {
    summaryText: string;
    audioUrl: string;
    insights: Array<{ title: string; detail: string; domain: string }>;
  };
}

/** Request score calculation */
export async function calculateScore(): Promise<{
  total: number;
  cycleIntelligence: number;
  moodMap: number;
  bodyAwareness: number;
  consistency: number;
}> {
  const fn = httpsCallable(functions, CLOUD_FUNCTIONS.calculateScore);
  const result = await fn({});
  return result.data as {
    total: number;
    cycleIntelligence: number;
    moodMap: number;
    bodyAwareness: number;
    consistency: number;
  };
}

/** Request weekly goals generation */
export async function generateWeeklyGoals(): Promise<
  Array<{ text: string; type: string; targetCount: number }>
> {
  const fn = httpsCallable(functions, CLOUD_FUNCTIONS.generateGoals);
  const result = await fn({});
  return result.data as Array<{ text: string; type: string; targetCount: number }>;
}
