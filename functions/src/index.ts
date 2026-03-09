/**
 * Maa Cloud Functions — Firebase Functions v2 (asia-south1)
 *
 * All AI API keys are server-side only. Client sends audio/text,
 * gets back processed responses. Zero API key exposure.
 */
import { initializeApp } from 'firebase-admin/app';

initializeApp();

// Re-export all functions
export { voiceStt } from './stt';
export { voiceTts } from './tts';
export { voiceGemini } from './gemini';
export { generateWeeklySummary } from './weekly-summary';
export { calculateScore } from './score';
export { generateWeeklyGoals } from './goals';
