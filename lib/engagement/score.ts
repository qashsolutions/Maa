/**
 * Maa Score — local calculation engine.
 * 4 pillars, 25 points each, 100 total.
 * Runs locally for instant display, Cloud Function for authoritative weekly snapshot.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

export interface MaaScore {
  total: number;
  cycleIntelligence: number; // 0-25
  moodMap: number; // 0-25
  bodyAwareness: number; // 0-25
  consistency: number; // 0-25
}

/** Calculate score from local SQLite data */
export async function calculateLocalScore(db: SQLiteDatabase): Promise<MaaScore> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Cycle Intelligence (0-25): based on tracked cycles
  const cycleCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cycles WHERE start_date >= ?`,
    [thirtyDaysAgo],
  );
  const cycleScore = Math.min(25, (cycleCount?.count ?? 0) * 12);

  // Mood Map (0-25): based on mood entries in daily_logs
  const moodEntries = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM daily_logs WHERE log_date >= ? AND mood_level IS NOT NULL`,
    [thirtyDaysAgo],
  );
  const moodScore = Math.min(25, Math.round(((moodEntries?.count ?? 0) / 30) * 25));

  // Body Awareness (0-25): based on any logged data (sleep, energy, pain, symptoms)
  const bodyEntries = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM daily_logs WHERE log_date >= ?
     AND (sleep_hours IS NOT NULL OR energy_level IS NOT NULL OR pain_level IS NOT NULL OR symptoms IS NOT NULL)`,
    [thirtyDaysAgo],
  );
  const bodyScore = Math.min(25, Math.round(((bodyEntries?.count ?? 0) / 30) * 25));

  // Consistency (0-25): based on streak + voice logging days
  const streakRow = await db.getFirstAsync<{ current_streak: number; best_streak: number }>(
    `SELECT current_streak, best_streak FROM streaks WHERE id = 1`,
  );
  const voiceDays = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM daily_logs WHERE log_date >= ? AND voice_logged = 1`,
    [thirtyDaysAgo],
  );
  const streakPart = Math.min(12, (streakRow?.current_streak ?? 0) * 3);
  const voicePart = Math.min(13, Math.round(((voiceDays?.count ?? 0) / 30) * 13));
  const consistencyScore = streakPart + voicePart;

  return {
    total: cycleScore + moodScore + bodyScore + consistencyScore,
    cycleIntelligence: cycleScore,
    moodMap: moodScore,
    bodyAwareness: bodyScore,
    consistency: consistencyScore,
  };
}

/** Save a score snapshot to SQLite */
export async function saveScoreSnapshot(db: SQLiteDatabase, score: MaaScore): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await db.runAsync(
    `INSERT OR REPLACE INTO score_snapshots (snapshot_date, total_score, cycle_intelligence, mood_map, body_awareness, consistency, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [today, score.total, score.cycleIntelligence, score.moodMap, score.bodyAwareness, score.consistency],
  );
}
