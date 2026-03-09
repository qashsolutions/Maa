/**
 * Score calculation Cloud Function — authoritative weekly score snapshot.
 * Mirrors the local algorithm (lib/engagement/score.ts) using Firestore data.
 *
 * Algorithm (from Main spec):
 *   Cycle Intelligence: tiered by cycle count + prediction accuracy bonus
 *   Mood Map: weeks with mood data + mood-cycle correlation + PMS prediction
 *   Body Awareness: symptomTypes*2 + sleepDataPoints*0.5 + crossDomainBonus
 *   Consistency: tiered by streak + perfectWeeks
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

export const calculateScore = onCall(
  { region: 'asia-south1', memory: '256MiB', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    // Fetch all anonymized data
    const [cycleDoc, moodDoc, bodyDoc, streakDoc, goalsSnap] = await Promise.all([
      db.doc(`users/${uid}/anonymized_data/cycle_summary`).get(),
      db.doc(`users/${uid}/anonymized_data/mood_summary`).get(),
      db.doc(`users/${uid}/anonymized_data/body_summary`).get(),
      db.doc(`users/${uid}/anonymized_data/streak_summary`).get(),
      db.collection(`users/${uid}/anonymized_data/goals_summary/weeks`).get(),
    ]);

    const cycleData = cycleDoc.data() ?? {};
    const moodData = moodDoc.data() ?? {};
    const bodyData = bodyDoc.data() ?? {};
    const streakData = streakDoc.data() ?? {};

    // ── Cycle Intelligence (0-25) ──
    const totalCycles = cycleData.totalCycles ?? 0;
    // Prediction accuracy bonus from cycle regularity (stdDev of lengths)
    const cycleLengthStdDev = cycleData.cycleLengthStdDev ?? 10;
    const predictionAccuracyBonus =
      totalCycles >= 3 ? Math.max(0, Math.min(5, Math.round(5 - cycleLengthStdDev))) : 0;

    let cycleIntelligence: number;
    if (totalCycles === 0) {
      cycleIntelligence = 0;
    } else if (totalCycles === 1) {
      cycleIntelligence = 5;
    } else if (totalCycles < 3) {
      cycleIntelligence = 8;
    } else if (totalCycles < 6) {
      cycleIntelligence = Math.min(20, 15 + predictionAccuracyBonus);
    } else {
      cycleIntelligence = Math.min(25, 20 + predictionAccuracyBonus);
    }

    // ── Mood Map (0-25) ──
    const moodDataWeeks = moodData.weeksWithData ?? 0;
    const hasMoodCycleCorrelation = totalCycles >= 3 && moodDataWeeks >= 4;
    const hasPmsPrediction = totalCycles >= 6 && moodDataWeeks >= 6;
    const correlationStrength = hasMoodCycleCorrelation ? Math.min(1, moodDataWeeks / 8) : 0;

    let moodMap: number;
    if (moodDataWeeks === 0) {
      moodMap = 0;
    } else if (moodDataWeeks < 2) {
      moodMap = 5;
    } else if (!hasMoodCycleCorrelation) {
      moodMap = Math.min(15, 8 + moodDataWeeks);
    } else if (!hasPmsPrediction) {
      moodMap = Math.min(20, 15 + Math.round(correlationStrength * 5));
    } else {
      moodMap = 25;
    }

    // ── Body Awareness (0-25) ──
    const symptomTypes = bodyData.distinctSymptomTypes ?? 0;
    const sleepDataPoints = bodyData.sleepEntries ?? 0;
    const domainsLogged = bodyData.domainsLogged ?? 0;
    const crossDomainBonus = Math.max(0, (domainsLogged - 1) * 2);
    const bodyAwareness = Math.min(
      25,
      Math.round(symptomTypes * 2 + sleepDataPoints * 0.5 + crossDomainBonus),
    );

    // ── Consistency (0-25) ──
    const streak = streakData.currentStreak ?? 0;
    // Count perfect weeks from goals data
    let perfectWeeks = 0;
    goalsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.totalGoals >= 3 && data.completedGoals === data.totalGoals) {
        perfectWeeks++;
      }
    });

    let consistency: number;
    if (streak === 0) {
      consistency = 0;
    } else if (streak < 4) {
      consistency = Math.min(6, streak * 2);
    } else if (streak < 8) {
      consistency = Math.min(15, 8 + perfectWeeks);
    } else if (streak < 12) {
      consistency = Math.min(22, 15 + Math.round(perfectWeeks * 0.5));
    } else {
      consistency = Math.min(25, 20 + Math.round(perfectWeeks * 0.3));
    }

    const total = cycleIntelligence + moodMap + bodyAwareness + consistency;

    // Save to Firestore
    await db.doc(`users/${uid}/score/current`).set({
      total,
      cycleIntelligence,
      moodMap,
      bodyAwareness,
      consistency,
      calculatedAt: new Date().toISOString(),
    });

    return { total, cycleIntelligence, moodMap, bodyAwareness, consistency };
  },
);
