/**
 * Sync engine — one-way push from SQLite to Firestore.
 * Only syncs anonymized summaries, never raw PII.
 * Designed for intermittent connectivity (3G India).
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from '../../src/config/firebase';
import { auth } from '../../src/config/firebase';
import { setString, getString, StorageKeys } from '../utils/storage';

/** Sync anonymized data to Firestore — called periodically or after significant events */
export async function syncToFirestore(db: SQLiteDatabase): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const uid = user.uid;
  const lastSync = getString(StorageKeys.LAST_SYNC_AT);
  const sinceDate = lastSync ?? '2000-01-01';

  try {
    // Sync score snapshot
    const latestScore = await db.getFirstAsync<{
      total_score: number;
      cycle_intelligence: number;
      mood_map: number;
      body_awareness: number;
      consistency: number;
    }>(`SELECT * FROM score_snapshots ORDER BY snapshot_date DESC LIMIT 1`);

    if (latestScore) {
      await setDoc(doc(firestore, `users/${uid}/score`, 'current'), {
        total: latestScore.total_score,
        cycleIntelligence: latestScore.cycle_intelligence,
        moodMap: latestScore.mood_map,
        bodyAwareness: latestScore.body_awareness,
        consistency: latestScore.consistency,
        updatedAt: serverTimestamp(),
      });
    }

    // Sync milestone state
    const milestones = await db.getAllAsync<{
      id: string;
      unlocked: number;
      unlocked_at: string | null;
      progress: number;
    }>(`SELECT * FROM milestones`);

    const milestoneData: Record<string, { unlocked: boolean; progress: number }> = {};
    for (const m of milestones) {
      milestoneData[m.id] = { unlocked: m.unlocked === 1, progress: m.progress };
    }
    await setDoc(doc(firestore, `users/${uid}/milestones`, 'state'), {
      ...milestoneData,
      updatedAt: serverTimestamp(),
    });

    // Sync anonymized cycle summaries (no raw dates, just averages)
    const cycleStats = await db.getFirstAsync<{
      count: number;
      avg_length: number;
    }>(
      `SELECT COUNT(*) as count,
       AVG(JULIANDAY(end_date) - JULIANDAY(start_date)) as avg_length
       FROM cycles WHERE end_date IS NOT NULL`,
    );

    if (cycleStats) {
      await setDoc(doc(firestore, `users/${uid}/anonymized_data`, 'cycle_summary'), {
        totalCycles: cycleStats.count,
        avgCycleLength: Math.round(cycleStats.avg_length ?? 28),
        updatedAt: serverTimestamp(),
      });
    }

    // Sync anonymized mood averages (last 30 days)
    const moodStats = await db.getFirstAsync<{
      avg_mood: number;
      avg_energy: number;
      avg_sleep: number;
      log_count: number;
    }>(
      `SELECT AVG(mood_level) as avg_mood, AVG(energy_level) as avg_energy,
       AVG(sleep_hours) as avg_sleep, COUNT(*) as log_count
       FROM daily_logs WHERE log_date >= date('now', '-30 days')
       AND (mood_level IS NOT NULL OR energy_level IS NOT NULL)`,
    );

    if (moodStats && moodStats.log_count > 0) {
      await setDoc(doc(firestore, `users/${uid}/anonymized_data`, 'mood_summary'), {
        avgMood: Math.round((moodStats.avg_mood ?? 0) * 10) / 10,
        avgEnergy: Math.round((moodStats.avg_energy ?? 0) * 10) / 10,
        avgSleep: Math.round((moodStats.avg_sleep ?? 0) * 10) / 10,
        logCount: moodStats.log_count,
        updatedAt: serverTimestamp(),
      });
    }

    // Update last sync timestamp
    setString(StorageKeys.LAST_SYNC_AT, new Date().toISOString());
  } catch (error) {
    // Sync failures are non-critical — will retry next time
    console.warn('Sync to Firestore failed (will retry):', error);
  }
}

/** Sync user profile metadata */
export async function syncProfile(
  languageCode: string,
  fcmToken?: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  await setDoc(
    doc(firestore, `users/${user.uid}/profile`, 'meta'),
    {
      language: languageCode,
      fcmToken: fcmToken ?? null,
      plan: 'free_trial',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
