/**
 * Weekly Goals Cloud Function — generates 3 personalized goals each Monday.
 *
 * 3-tier priority system (from Main spec):
 *   Priority 1: Missing critical data (sleep >3 days old, mood <2 this week)
 *   Priority 2: Cycle-phase-aware (period expected, fertile window, etc.)
 *   Priority 3: Variety fallback ("Have a conversation with Maa")
 *
 * Always returns exactly 3 goals.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

interface Goal {
  text: string;
  type: string;
  targetCount: number;
}

export const generateWeeklyGoals = onCall(
  { region: 'asia-south1', memory: '256MiB', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    // Fetch user data for personalization
    const [profileDoc, moodDoc, cycleDoc, bodyDoc] = await Promise.all([
      db.doc(`users/${uid}/profile`).get(),
      db.doc(`users/${uid}/anonymized_data/mood_summary`).get(),
      db.doc(`users/${uid}/anonymized_data/cycle_summary`).get(),
      db.doc(`users/${uid}/anonymized_data/body_summary`).get(),
    ]);

    const profile = profileDoc.data() ?? {};
    const moodData = moodDoc.data() ?? {};
    const cycleData = cycleDoc.data() ?? {};
    const bodyData = bodyDoc.data() ?? {};

    const language = profile.language ?? 'en';
    const goals: Goal[] = [];

    // ── Priority 1: Missing critical data ──
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    // Check if sleep data is stale (>3 days old)
    const lastSleepTimestamp = bodyData.lastSleepLogAt
      ? new Date(bodyData.lastSleepLogAt).getTime()
      : 0;
    if (now - lastSleepTimestamp > threeDaysMs) {
      goals.push({
        text: localize('Tell Maa about your sleep twice', language),
        type: 'sleep',
        targetCount: 2,
      });
    }

    // Check if mood logs are sparse this week (<2)
    const moodLogsThisWeek = moodData.logsThisWeek ?? 0;
    if (moodLogsThisWeek < 2 && goals.length < 3) {
      goals.push({
        text: localize('Check in with your mood 3 times', language),
        type: 'mood',
        targetCount: 3,
      });
    }

    // ── Priority 2: Cycle-phase-aware ──
    if (goals.length < 3) {
      const avgCycleLength = cycleData.avgCycleLength ?? 28;
      const lastPeriodStart = cycleData.lastPeriodStart
        ? new Date(cycleData.lastPeriodStart).getTime()
        : null;

      if (lastPeriodStart) {
        const daysSinceLastPeriod = Math.floor((now - lastPeriodStart) / (24 * 60 * 60 * 1000));
        const daysUntilNextPeriod = avgCycleLength - daysSinceLastPeriod;

        // Ovulation window: roughly day 12-16 of cycle
        const isInFertileWindow = daysSinceLastPeriod >= 10 && daysSinceLastPeriod <= 16;

        if (daysUntilNextPeriod >= 0 && daysUntilNextPeriod <= 7) {
          // Period expected this week
          goals.push({
            text: localize('Log when your period starts', language),
            type: 'cycle',
            targetCount: 1,
          });
        } else if (isInFertileWindow) {
          // In fertile window
          goals.push({
            text: localize('Track any ovulation symptoms', language),
            type: 'symptom',
            targetCount: 2,
          });
        } else {
          // Default cycle-phase goal
          goals.push({
            text: localize('Share how you are feeling 3 times', language),
            type: 'mood',
            targetCount: 3,
          });
        }
      } else {
        // No cycle data yet
        goals.push({
          text: localize('Tell Maa when your next period starts', language),
          type: 'cycle',
          targetCount: 1,
        });
      }
    }

    // ── Priority 3: Variety fallback ──
    while (goals.length < 3) {
      // Pick from variety goals that aren't already represented
      const existingTypes = new Set(goals.map((g) => g.type));

      if (!existingTypes.has('voice')) {
        goals.push({
          text: localize('Have a conversation with Maa', language),
          type: 'voice',
          targetCount: 1,
        });
      } else if (!existingTypes.has('energy')) {
        goals.push({
          text: localize('Tell Maa about your energy levels', language),
          type: 'energy',
          targetCount: 1,
        });
      } else {
        goals.push({
          text: localize('Talk to Maa 3 times this week', language),
          type: 'voice',
          targetCount: 3,
        });
      }
    }

    return goals.slice(0, 3); // Always exactly 3
  },
);

/** Simple localization — returns localized text if available, else English */
function localize(text: string, language: string): string {
  // For MVP: return English text. Cloud Function i18n can be expanded later
  // via Firebase Remote Config or a strings table.
  // The client-side already handles full i18n via constants/strings.ts.
  const translations: Record<string, Record<string, string>> = {
    'Tell Maa about your sleep twice': {
      hi: 'Maa ko apni neend ke baare mein 2 baar bataein',
    },
    'Check in with your mood 3 times': {
      hi: 'Apne mood ke baare mein 3 baar baat karein',
    },
    'Log when your period starts': {
      hi: 'Jab aapka period shuru ho tab Maa ko bataein',
    },
    'Track any ovulation symptoms': {
      hi: 'Ovulation ke lakshan track karein',
    },
    'Share how you are feeling 3 times': {
      hi: 'Apni feelings 3 baar share karein',
    },
    'Tell Maa when your next period starts': {
      hi: 'Maa ko bataein jab aapka agla period aaye',
    },
    'Have a conversation with Maa': {
      hi: 'Maa se baat karein',
    },
    'Tell Maa about your energy levels': {
      hi: 'Maa ko apni energy ke baare mein bataein',
    },
    'Talk to Maa 3 times this week': {
      hi: 'Is hafte Maa se 3 baar baat karein',
    },
  };

  if (language !== 'en' && translations[text]?.[language]) {
    return translations[text][language];
  }
  return text;
}
