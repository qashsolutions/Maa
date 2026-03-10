/**
 * Gemini Cloud Function — the "brain" of Maa.
 * Takes user text + context, returns structured response + extracted health data.
 * System prompt and model params are fetched from Firebase Remote Config.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConfigValues } from './remote-config';

const geminiApiKey = defineString('GEMINI_API_KEY');

/** Valid period_status values (must match ExtractedHealthData type in client) */
const VALID_PERIOD_STATUS = new Set([
  'started', 'ended', 'spotting', 'menstruating', 'fertile', 'ovulating', 'luteal',
]);

/** Valid visual_card types (must match VisualCard type in client) */
const VALID_CARD_TYPES = new Set([
  'cycle_prediction', 'mood_insight', 'body_summary', 'proactive_tip', 'confirmation',
]);

/** Valid navigation intents */
const VALID_NAV_INTENTS = new Set(['score', 'settings', 'summary', 'milestones']);

export const voiceGemini = onCall(
  { region: 'asia-south1', memory: '1GiB', timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { text, language, history, context } = request.data as {
      text: string;
      language: string;
      history: Array<{ role: 'user' | 'assistant'; text: string }>;
      context: {
        cycleDay?: number;
        lastMood?: number;
        currentStreak?: number;
        isPregnant?: boolean;
        cycleHistorySummary?: string;
        pregnancyWeek?: number;
        trimester?: number;
        dueDate?: string;
        averageCycleLength?: number;
        lastPeriodDate?: string;
      };
    };

    if (!text) {
      throw new HttpsError('invalid-argument', 'text is required');
    }

    // Fetch all Gemini-related config from Remote Config (single call, cached)
    const config = await getConfigValues([
      'gemini_system_prompt',
      'gemini_model',
      'gemini_temperature',
      'gemini_top_p',
      'gemini_max_output_tokens',
    ]);

    const genAI = new GoogleGenerativeAI(geminiApiKey.value());
    const model = genAI.getGenerativeModel({
      model: config.gemini_model,
      generationConfig: {
        temperature: config.gemini_temperature,
        topP: config.gemini_top_p,
        maxOutputTokens: config.gemini_max_output_tokens,
        responseMimeType: 'application/json',
      },
      systemInstruction: config.gemini_system_prompt,
    });

    // Build context string with personalized user data
    const contextParts: string[] = [];

    if (context.isPregnant) {
      // Pregnancy-aware context — trimester-specific
      contextParts.push('User is currently pregnant');
      if (context.pregnancyWeek) {
        contextParts.push(`Pregnancy week: ${context.pregnancyWeek}`);
      }
      if (context.trimester) {
        const trimesterGuidance: Record<number, string> = {
          1: 'First trimester (weeks 1-12): focus on nausea, fatigue, emotional changes. Be extra gentle.',
          2: 'Second trimester (weeks 13-27): energy returning, baby movement starting. Encourage wellness tracking.',
          3: 'Third trimester (weeks 28-40): discomfort, preparation anxiety. Be reassuring and supportive.',
        };
        contextParts.push(trimesterGuidance[context.trimester] ?? `Trimester: ${context.trimester}`);
      }
      if (context.dueDate) {
        const daysUntilDue = Math.floor(
          (new Date(context.dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
        );
        if (daysUntilDue > 0) {
          contextParts.push(`Due date: ${context.dueDate} (${daysUntilDue} days away)`);
        } else if (daysUntilDue >= -14) {
          contextParts.push(`Due date was ${context.dueDate} (${Math.abs(daysUntilDue)} days past due)`);
        }
      }
      contextParts.push('Do NOT discuss cycle phases, periods, or ovulation — user is pregnant');
    } else {
      // Non-pregnant context — cycle-aware
      if (context.cycleDay) contextParts.push(`User is on cycle day ${context.cycleDay}`);
      if (context.averageCycleLength) contextParts.push(`Average cycle length: ${context.averageCycleLength} days`);
      if (context.lastPeriodDate) contextParts.push(`Last period started: ${context.lastPeriodDate}`);
      if (context.cycleHistorySummary) contextParts.push(`Cycle history: ${context.cycleHistorySummary}`);
    }

    if (context.lastMood) contextParts.push(`Last recorded mood: ${context.lastMood}/10`);
    if (context.currentStreak) contextParts.push(`Current streak: ${context.currentStreak} weeks`);
    if (language !== 'en') contextParts.push(`User's preferred language: ${language}`);

    // Build conversation for Gemini
    const chatHistory = history.map((h) => ({
      role: h.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: h.text }],
    }));

    const chat = model.startChat({ history: chatHistory });

    const userMessage = contextParts.length > 0
      ? `[Context: ${contextParts.join('. ')}]\n\nUser says: "${text}"`
      : `User says: "${text}"`;

    const result = await chat.sendMessage(userMessage);
    const responseText = result.response.text();

    try {
      const parsed = JSON.parse(responseText);
      return {
        spoken_response: parsed.spoken_response || responseText,
        extracted_data: sanitizeExtractedData(parsed.extracted_data),
        visual_card: sanitizeVisualCard(parsed.visual_card),
        proactive_reminder: typeof parsed.proactive_reminder === 'string' ? parsed.proactive_reminder : null,
      };
    } catch {
      // If Gemini doesn't return valid JSON, wrap it
      return {
        spoken_response: responseText,
        extracted_data: null,
        visual_card: null,
        proactive_reminder: null,
      };
    }
  },
);

/**
 * Sanitize extracted_data from Gemini — enforce valid enum values.
 * Gemini sometimes returns creative values; clamp them to our schema.
 */
function sanitizeExtractedData(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;

  const result: Record<string, unknown> = {};
  let hasAnyField = false;

  // period_status: must be one of our valid values
  if (data.period_status && typeof data.period_status === 'string') {
    const normalized = data.period_status.toLowerCase().trim();
    if (VALID_PERIOD_STATUS.has(normalized)) {
      result.period_status = normalized;
      hasAnyField = true;
    }
  }

  // flow_intensity: must be light/medium/heavy
  if (data.flow_intensity && typeof data.flow_intensity === 'string') {
    const val = data.flow_intensity.toLowerCase().trim();
    if (['light', 'medium', 'heavy'].includes(val)) {
      result.flow_intensity = val;
      hasAnyField = true;
    }
  }

  // mood_level: 1-10 integer
  if (data.mood_level != null) {
    const val = Number(data.mood_level);
    if (!isNaN(val) && val >= 1 && val <= 10) {
      result.mood_level = Math.round(val);
      hasAnyField = true;
    }
  }

  // energy_level: 1-5 integer
  if (data.energy_level != null) {
    const val = Number(data.energy_level);
    if (!isNaN(val) && val >= 1 && val <= 5) {
      result.energy_level = Math.round(val);
      hasAnyField = true;
    }
  }

  // sleep_hours: 0-24 number
  if (data.sleep_hours != null) {
    const val = Number(data.sleep_hours);
    if (!isNaN(val) && val >= 0 && val <= 24) {
      result.sleep_hours = Math.round(val * 10) / 10; // 1 decimal place
      hasAnyField = true;
    }
  }

  // pain_level: 0-10 integer
  if (data.pain_level != null) {
    const val = Number(data.pain_level);
    if (!isNaN(val) && val >= 0 && val <= 10) {
      result.pain_level = Math.round(val);
      hasAnyField = true;
    }
  }

  // symptoms: array of strings
  if (Array.isArray(data.symptoms) && data.symptoms.length > 0) {
    const clean = data.symptoms.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
    if (clean.length > 0) {
      result.symptoms = clean;
      hasAnyField = true;
    }
  }

  // medications: array of strings
  if (Array.isArray(data.medications) && data.medications.length > 0) {
    const clean = data.medications.filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
    if (clean.length > 0) {
      result.medications = clean;
      hasAnyField = true;
    }
  }

  // pregnancy_related: boolean
  if (typeof data.pregnancy_related === 'boolean') {
    result.pregnancy_related = data.pregnancy_related;
    hasAnyField = true;
  }

  // notes: string
  if (typeof data.notes === 'string' && data.notes.trim().length > 0) {
    result.notes = data.notes.trim();
    hasAnyField = true;
  }

  // navigation_intent: must be valid target
  if (data.navigation_intent && typeof data.navigation_intent === 'string') {
    const val = data.navigation_intent.toLowerCase().trim();
    if (VALID_NAV_INTENTS.has(val)) {
      result.navigation_intent = val;
      hasAnyField = true;
    }
  }

  return hasAnyField ? result : null;
}

/** Sanitize visual_card from Gemini */
function sanitizeVisualCard(card: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!card || typeof card !== 'object') return null;
  if (typeof card.type !== 'string' || !VALID_CARD_TYPES.has(card.type)) return null;
  return {
    type: card.type,
    title: typeof card.title === 'string' ? card.title : '',
    data: typeof card.data === 'object' && card.data ? card.data : {},
  };
}
