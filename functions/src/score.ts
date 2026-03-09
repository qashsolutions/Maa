/**
 * Score calculation Cloud Function — authoritative weekly score snapshot.
 * Client also calculates locally for instant display; this is the ground truth.
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

    // Get user data from Firestore
    const moodDoc = await db.doc(`users/${uid}/anonymized_data/mood_summary`).get();
    const cycleDoc = await db.doc(`users/${uid}/anonymized_data/cycle_summary`).get();

    const moodData = moodDoc.data();
    const cycleData = cycleDoc.data();

    // Cycle Intelligence (0-25)
    const totalCycles = cycleData?.totalCycles ?? 0;
    const cycleIntelligence = Math.min(25, totalCycles * 12);

    // Mood Map (0-25)
    const logCount = moodData?.logCount ?? 0;
    const moodMap = Math.min(25, Math.round((logCount / 30) * 25));

    // Body Awareness (0-25) — based on breadth of data logged
    const bodyAwareness = Math.min(25, Math.round((logCount / 30) * 25));

    // Consistency (0-25) — placeholder until streak data syncs
    const consistency = 0;

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
