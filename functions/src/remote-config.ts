/**
 * Remote Config — centralized configuration fetched from Firebase Remote Config.
 * All tunable parameters live here instead of being hardcoded.
 * Falls back to defaults if Remote Config is unavailable.
 */
import { getRemoteConfig } from 'firebase-admin/remote-config';

/** Default values — used as fallback when Remote Config is unavailable */
const DEFAULTS = {
  gemini_system_prompt: `You are Maa ("Mother" in Hindi), a warm, caring voice health companion for women aged 13+.

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
    "period_status": "menstruating" | "fertile" | "ovulating" | "luteal" | "started" | "ended" | "spotting" | null,
    "flow_intensity": "light" | "medium" | "heavy" | null,
    "mood_level": 1-10 | null,
    "energy_level": 1-5 | null,
    "sleep_hours": number | null,
    "pain_level": 0-10 | null,
    "symptoms": ["symptom1", "symptom2"] | null,
    "medications": ["med1"] | null,
    "pregnancy_related": true/false | null,
    "notes": "any additional context" | null,
    "navigation_intent": "score" | "settings" | "summary" | "milestones" | null
  },
  "visual_card": {
    "type": "cycle_prediction" | "mood_insight" | "body_summary" | "proactive_tip" | "confirmation" | null,
    "title": "Card title",
    "data": { ...card-specific data }
  } | null,
  "proactive_reminder": "Optional reminder to set" | null
}

Only include extracted_data fields that the user explicitly mentioned.
Only include visual_card when the response warrants a visual display.
Set navigation_intent when the user wants to navigate to a specific screen (e.g., "show my score", "settings dikhaao").`,

  gemini_model: 'gemini-2.0-flash',
  gemini_temperature: 0.7,
  gemini_top_p: 0.9,
  gemini_max_output_tokens: 1024,
  silence_threshold_ms: 1500,
  silence_threshold_db: -40,
  weekly_summary_day: 'saturday',
  weekly_summary_hour_ist: 21,
  summary_notification_day: 'sunday',
  summary_notification_hour_ist: 19,
  max_conversation_history: 10,
  trial_duration_days: 180,
  subscription_price_inr: 170,
} as const;

export type RemoteConfigKey = keyof typeof DEFAULTS;

/** Cache fetched config to avoid repeated API calls within a single function invocation */
let _cachedConfig: Record<string, string | number> | null = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch a config value from Firebase Remote Config.
 * Falls back to DEFAULTS if Remote Config fails or key is missing.
 */
export async function getConfigValue<K extends RemoteConfigKey>(
  key: K,
): Promise<typeof DEFAULTS[K]> {
  try {
    if (_cachedConfig && Date.now() < _cacheExpiry) {
      const cached = _cachedConfig[key];
      if (cached !== undefined) return cached as typeof DEFAULTS[K];
    }

    const rc = getRemoteConfig();
    const template = await rc.getServerTemplate();
    const config = template.evaluate();

    // Build cache
    const newCache: Record<string, string | number> = {};
    for (const k of Object.keys(DEFAULTS)) {
      const param = config.getString(k);
      if (param) newCache[k] = param;
    }
    _cachedConfig = newCache;
    _cacheExpiry = Date.now() + CACHE_TTL_MS;

    const value = newCache[key];
    if (value !== undefined) {
      // Coerce to the correct type based on default
      const defaultVal = DEFAULTS[key];
      if (typeof defaultVal === 'number') return Number(value) as typeof DEFAULTS[K];
      return value as typeof DEFAULTS[K];
    }
  } catch {
    // Remote Config unavailable — use defaults
  }

  return DEFAULTS[key];
}

/**
 * Fetch multiple config values at once (single Remote Config call).
 */
export async function getConfigValues<K extends RemoteConfigKey>(
  keys: K[],
): Promise<{ [P in K]: typeof DEFAULTS[P] }> {
  const result = {} as { [P in K]: typeof DEFAULTS[P] };
  // Trigger cache population with first key
  if (keys.length > 0) await getConfigValue(keys[0]);
  // All subsequent reads hit cache
  for (const key of keys) {
    result[key] = await getConfigValue(key);
  }
  return result;
}
