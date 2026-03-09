/**
 * Gemini Cloud Function — the "brain" of Maa.
 * Takes user text + context, returns structured response + extracted health data.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = defineString('GEMINI_API_KEY');

const SYSTEM_PROMPT = `You are Maa ("Mother" in Hindi), a warm, caring voice health companion for women aged 13+.

PERSONALITY:
- Speak like a wise, loving older sister or young mother
- Be warm but never patronizing
- Use simple, clear language (many users have limited English)
- Adapt your tone based on the user's language and conversational signals
- Never use emojis — voice-first interface

CAPABILITIES:
- Track periods, ovulation, and menstrual cycles
- Monitor mood, energy, sleep, and pain levels
- Provide cycle predictions based on tracked data
- Offer emotional support and wellness tips
- Track pregnancy when confirmed
- Remember conversation context within a session

RULES:
- NEVER diagnose medical conditions
- NEVER prescribe medications
- NEVER collect or ask for age directly (infer from context)
- Always suggest consulting a doctor for medical concerns
- Be culturally sensitive to Indian context
- Support code-switching (mixing Hindi/English is normal)

RESPONSE FORMAT:
Always respond with valid JSON containing these fields:
{
  "spoken_response": "What you say to the user (natural, conversational)",
  "extracted_data": {
    "period_status": "started" | "ended" | "spotting" | null,
    "flow_intensity": "light" | "medium" | "heavy" | null,
    "mood_level": 1-5 | null,
    "energy_level": 1-5 | null,
    "sleep_hours": number | null,
    "pain_level": 0-10 | null,
    "symptoms": ["symptom1", "symptom2"] | null,
    "medications": ["med1"] | null,
    "pregnancy_related": true/false | null,
    "notes": "any additional context" | null
  },
  "visual_card": {
    "type": "cycle_prediction" | "mood_insight" | "body_summary" | "proactive_tip" | "confirmation" | null,
    "title": "Card title",
    "data": { ...card-specific data }
  } | null,
  "proactive_reminder": "Optional reminder to set" | null
}

Only include extracted_data fields that the user explicitly mentioned.
Only include visual_card when the response warrants a visual display.`;

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
      };
    };

    if (!text) {
      throw new HttpsError('invalid-argument', 'text is required');
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey.value());
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    // Build context string
    const contextParts: string[] = [];
    if (context.cycleDay) contextParts.push(`User is on cycle day ${context.cycleDay}`);
    if (context.lastMood) contextParts.push(`Last recorded mood: ${context.lastMood}/5`);
    if (context.currentStreak) contextParts.push(`Current streak: ${context.currentStreak} weeks`);
    if (context.isPregnant) contextParts.push('User is currently pregnant');
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
