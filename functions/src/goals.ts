/**
 * Weekly Goals Cloud Function — generates 3 personalized goals each Monday.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

export const generateWeeklyGoals = onCall(
  { region: 'asia-south1', memory: '256MiB', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    // Get user data for personalization
    const moodDoc = await db.doc(`users/${uid}/anonymized_data/mood_summary`).get();
    const scoreDoc = await db.doc(`users/${uid}/score/current`).get();

    const moodData = moodDoc.data();
    const scoreData = scoreDoc.data();

    const goals: Array<{ text: string; type: string; targetCount: number }> = [];

    // Goal 1: Always include a voice interaction goal
    goals.push({
      text: 'Talk to Maa 3 times this week',
      type: 'voice',
      targetCount: 3,
    });

    // Goal 2: Based on weakest pillar
    if (scoreData) {
      const pillars = [
        { name: 'cycle', score: scoreData.cycleIntelligence ?? 0, goal: 'Log your period when it starts', type: 'cycle', target: 1 },
        { name: 'mood', score: scoreData.moodMap ?? 0, goal: 'Share your mood 5 days this week', type: 'mood', target: 5 },
        { name: 'body', score: scoreData.bodyAwareness ?? 0, goal: 'Track your sleep for 5 days', type: 'sleep', target: 5 },
      ];
      const weakest = pillars.sort((a, b) => a.score - b.score)[0];
      goals.push({ text: weakest.goal, type: weakest.type, targetCount: weakest.target });
    } else {
      goals.push({ text: 'Log your mood today', type: 'mood', targetCount: 1 });
    }

    // Goal 3: Based on sleep data
    if (moodData?.avgSleep && moodData.avgSleep < 7) {
      goals.push({
        text: 'Try to get 7+ hours of sleep tonight',
        type: 'sleep',
        targetCount: 1,
      });
    } else {
      goals.push({
        text: 'Tell Maa about your energy levels',
        type: 'energy',
        targetCount: 1,
      });
    }

    return goals;
  },
);
