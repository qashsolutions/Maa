/**
 * Weekly Goals Cloud Function — generates 3 personalized goals each Monday.
 *
 * 3-tier priority system (from Main spec):
 *   Priority 1: Missing critical data (sleep stale, mood sparse)
 *   Priority 2: Cycle-phase-aware (period expected, fertile window, pregnancy)
 *   Priority 3: Variety fallback (voice engagement, energy, general wellness)
 *
 * Guarantees:
 *   - Always exactly 3 goals
 *   - No duplicate goal types
 *   - New users get onboarding-appropriate goals
 *   - Pregnant users get pregnancy-relevant goals (no cycle-phase goals)
 *   - Priority 2 always gets at least 1 slot (cycle-aware goal is the most valuable)
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
    const isPregnant = profile.pregnancyStatus === 'pregnant';
    const totalCycles = cycleData.totalCycles ?? 0;
    const isNewUser = totalCycles === 0 && !moodData.totalLogs;

    // Build candidate pools per tier, then assemble final 3
    const p1Candidates: Goal[] = []; // missing data
    const p2Candidates: Goal[] = []; // cycle-phase-aware
    const p3Candidates: Goal[] = []; // variety

    // ── Priority 1: Missing critical data ──
    // Only fire if user has EVER logged data before (not brand new)
    if (!isNewUser) {
      const now = Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

      const lastSleepTimestamp = bodyData.lastSleepLogAt
        ? new Date(bodyData.lastSleepLogAt).getTime()
        : 0;
      // Only flag stale sleep if they've logged sleep before
      if (lastSleepTimestamp > 0 && now - lastSleepTimestamp > threeDaysMs) {
        p1Candidates.push({
          text: localize('Tell Maa about your sleep twice', language),
          type: 'sleep',
          targetCount: 2,
        });
      }

      // Check mood logging in last 7 days (not "this week" which resets Monday)
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const lastMoodTimestamp = moodData.lastMoodLogAt
        ? new Date(moodData.lastMoodLogAt).getTime()
        : 0;
      const moodRecent = lastMoodTimestamp > 0 && now - lastMoodTimestamp < sevenDaysMs;
      const moodLogsRecent = moodData.logsLast7Days ?? 0;
      if (lastMoodTimestamp > 0 && (!moodRecent || moodLogsRecent < 2)) {
        p1Candidates.push({
          text: localize('Check in with your mood 3 times', language),
          type: 'mood',
          targetCount: 3,
        });
      }
    }

    // ── Priority 2: Cycle-phase-aware / Pregnancy ──
    if (isPregnant) {
      p2Candidates.push({
        text: localize('Tell Maa how you are feeling today', language),
        type: 'wellness',
        targetCount: 1,
      });
      p2Candidates.push({
        text: localize('Track any new symptoms this week', language),
        type: 'symptom',
        targetCount: 2,
      });
    } else if (isNewUser) {
      // New user: onboarding goals
      p2Candidates.push({
        text: localize('Tell Maa when your next period starts', language),
        type: 'cycle',
        targetCount: 1,
      });
      p2Candidates.push({
        text: localize('Have a conversation with Maa', language),
        type: 'voice',
        targetCount: 1,
      });
    } else {
      const avgCycleLength = cycleData.avgCycleLength ?? 28;
      const lastPeriodStart = cycleData.lastPeriodStart
        ? new Date(cycleData.lastPeriodStart).getTime()
        : null;

      if (lastPeriodStart) {
        const now = Date.now();
        const daysSinceLastPeriod = Math.floor((now - lastPeriodStart) / (24 * 60 * 60 * 1000));
        const daysUntilNextPeriod = avgCycleLength - daysSinceLastPeriod;
        const isInFertileWindow = daysSinceLastPeriod >= 10 && daysSinceLastPeriod <= 16;

        if (daysUntilNextPeriod >= 0 && daysUntilNextPeriod <= 7) {
          p2Candidates.push({
            text: localize('Log when your period starts', language),
            type: 'cycle',
            targetCount: 1,
          });
        } else if (isInFertileWindow) {
          p2Candidates.push({
            text: localize('Track any ovulation symptoms', language),
            type: 'symptom',
            targetCount: 2,
          });
        } else {
          p2Candidates.push({
            text: localize('Share how you are feeling 3 times', language),
            type: 'mood',
            targetCount: 3,
          });
        }
      } else {
        p2Candidates.push({
          text: localize('Tell Maa when your next period starts', language),
          type: 'cycle',
          targetCount: 1,
        });
      }
    }

    // ── Priority 3: Variety pool ──
    p3Candidates.push(
      { text: localize('Have a conversation with Maa', language), type: 'voice', targetCount: 1 },
      { text: localize('Tell Maa about your energy levels', language), type: 'energy', targetCount: 1 },
      { text: localize('Talk to Maa 3 times this week', language), type: 'voice_3x', targetCount: 3 },
      { text: localize('Share how you are feeling today', language), type: 'checkin', targetCount: 1 },
    );

    // ── Assemble: guarantee P2 gets at least 1 slot ──
    const goals: Goal[] = [];
    const usedTypes = new Set<string>();

    function addGoal(goal: Goal): boolean {
      if (usedTypes.has(goal.type)) return false;
      goals.push(goal);
      usedTypes.add(goal.type);
      return true;
    }

    // Reserve 1 slot for P2 — take the best P2 candidate first
    if (p2Candidates.length > 0) {
      addGoal(p2Candidates[0]);
    }

    // Fill remaining from P1 (max 1 from P1 to avoid all-nagging)
    for (const g of p1Candidates) {
      if (goals.length >= 3) break;
      if (goals.length < 2) addGoal(g); // max 1 P1 goal (since 1 P2 already placed)
    }

    // Fill remaining from P2 extras
    for (let i = 1; i < p2Candidates.length; i++) {
      if (goals.length >= 3) break;
      addGoal(p2Candidates[i]);
    }

    // Fill remaining from P3 (no duplicates with existing types)
    for (const g of p3Candidates) {
      if (goals.length >= 3) break;
      addGoal(g);
    }

    return goals.slice(0, 3);
  },
);

/** Simple localization — returns localized text if available, else English */
function localize(text: string, language: string): string {
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
    'Tell Maa how you are feeling today': {
      hi: 'Maa ko bataein aaj aap kaisi feel kar rahi hain',
    },
    'Track any new symptoms this week': {
      hi: 'Is hafte koi naye lakshan track karein',
    },
    'Share how you are feeling today': {
      hi: 'Aaj apni feelings share karein',
    },
  };

  if (language !== 'en' && translations[text]?.[language]) {
    return translations[text][language];
  }
  return text;
}
