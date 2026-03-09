/**
 * Core types for the Maa voice-first AI pipeline.
 */

/** Voice session states — drives orb animation + UI */
export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

/** What Gemini returns after processing user speech */
export interface GeminiResponse {
  spoken_response: string;
  extracted_data: ExtractedHealthData | null;
  visual_card: VisualCard | null;
  proactive_reminder: string | null;
}

/** Structured health data extracted from conversation */
export interface ExtractedHealthData {
  period_status?: 'started' | 'ended' | 'spotting' | null;
  flow_intensity?: 'light' | 'medium' | 'heavy' | null;
  mood_level?: number; // 1-5
  energy_level?: number; // 1-5
  sleep_hours?: number;
  pain_level?: number; // 0-10
  symptoms?: string[];
  medications?: string[];
  pregnancy_related?: boolean;
  notes?: string;
}

/** Ephemeral card types returned by Gemini */
export interface VisualCard {
  type: 'cycle_prediction' | 'mood_insight' | 'body_summary' | 'proactive_tip' | 'confirmation';
  title: string;
  data: Record<string, unknown>;
}

/** Audio config matching spec: 16-bit PCM, 16kHz mono */
export const AUDIO_CONFIG = {
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  silenceThresholdMs: 1500, // auto-stop after 1.5s silence
  maxDurationMs: 60000, // max 60 seconds per recording
} as const;

/** Cloud Function endpoints (relative to Firebase Functions base URL) */
export const CLOUD_FUNCTIONS = {
  stt: 'voiceStt',
  tts: 'voiceTts',
  gemini: 'voiceGemini',
  weeklySummary: 'generateWeeklySummary',
  calculateScore: 'calculateScore',
  generateGoals: 'generateWeeklyGoals',
} as const;

/** Conversation turn — one user message + one AI response */
export interface ConversationTurn {
  id?: number;
  sessionDate: string;
  userText: string;
  aiResponse: string;
  extractedData: ExtractedHealthData | null;
  visualCardType: string | null;
  languageCode: string;
  durationSeconds: number;
}
