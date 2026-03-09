/**
 * Weekly Summary Cloud Function
 * Generates a personalized audio summary of the user's week.
 * Runs on schedule (Saturday night) or on-demand.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

export const generateWeeklySummary = onCall(
  { region: 'asia-south1', memory: '512MiB', timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    // Get user's anonymized data for summary generation
    const moodSummary = await db.doc(`users/${uid}/anonymized_data/mood_summary`).get();
    const cycleSummary = await db.doc(`users/${uid}/anonymized_data/cycle_summary`).get();
    const scoreCurrent = await db.doc(`users/${uid}/score/current`).get();

    const summaryData = {
      mood: moodSummary.exists ? moodSummary.data() : null,
      cycle: cycleSummary.exists ? cycleSummary.data() : null,
      score: scoreCurrent.exists ? scoreCurrent.data() : null,
    };

    // TODO: Call Gemini to generate natural language summary
    // TODO: Call TTS to convert summary to audio
    // TODO: Upload audio to Firebase Storage
    // TODO: Save summary to Firestore

    // Placeholder response
    const insights = [];
    if (summaryData.mood?.avgMood) {
      insights.push({
        title: 'Mood Trend',
        detail: `Your average mood this week was ${summaryData.mood.avgMood}/5`,
        domain: 'mood',
      });
    }
    if (summaryData.mood?.avgSleep) {
      insights.push({
        title: 'Sleep Pattern',
        detail: `You averaged ${summaryData.mood.avgSleep} hours of sleep`,
        domain: 'sleep',
      });
    }
    if (summaryData.score?.total) {
      insights.push({
        title: 'Maa Score',
        detail: `Your score is ${summaryData.score.total}/100`,
        domain: 'score',
      });
    }

    return {
      summaryText: 'Your weekly summary is being prepared.',
      audioUrl: '', // Will be populated when TTS pipeline is wired
      insights,
    };
  },
);
