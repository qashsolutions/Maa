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
    if (context.cycleDay) contextParts.push(`User is on cycle day ${context.cycleDay}`);
    if (context.averageCycleLength) contextParts.push(`Average cycle length: ${context.averageCycleLength} days`);
    if (context.lastPeriodDate) contextParts.push(`Last period started: ${context.lastPeriodDate}`);
    if (context.cycleHistorySummary) contextParts.push(`Cycle history: ${context.cycleHistorySummary}`);
    if (context.lastMood) contextParts.push(`Last recorded mood: ${context.lastMood}/10`);
    if (context.currentStreak) contextParts.push(`Current streak: ${context.currentStreak} weeks`);
    if (context.isPregnant) {
      contextParts.push('User is currently pregnant');
      if (context.pregnancyWeek) contextParts.push(`Pregnancy week: ${context.pregnancyWeek}`);
    }
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
        extracted_data: parsed.extracted_data || null,
        visual_card: parsed.visual_card || null,
        proactive_reminder: parsed.proactive_reminder || null,
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
