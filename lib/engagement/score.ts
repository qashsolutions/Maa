/**
 * Maa Score — local calculation engine.
 * 4 pillars, 25 points each, 100 total.
 * Runs locally for instant display, Cloud Function for authoritative weekly snapshot.
 */
import type { SQLiteDatabase } from '../db/encrypted-database';

export interface MaaScore {
  total: number;
  cycleIntelligence: number; // 0-25
  moodMap: number; // 0-25
  bodyAwareness: number; // 0-25
  consistency: number; // 0-25
}

/** Calculate score from local SQLite data using detailed spec thresholds */
export async function calculateLocalScore(db: SQLiteDatabase): Promise<MaaScore> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // ── Cycle Intelligence (0-25) ──
  // Total cycles ever tracked
  const totalCycleRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cycles`,
  );
  const totalCycles = totalCycleRow?.count ?? 0;

  // Calculate regularity bonus: how consistent are cycle lengths?
  let regularityBonus = 0;
  if (totalCycles >= 2) {
    const cycleRows = await db.getAllAsync<{ start_date: string }>(
      `SELECT start_date FROM cycles ORDER BY start_date ASC`,
    );
    if (cycleRows.length >= 2) {
      const lengths: number[] = [];
      for (let i = 1; i < cycleRows.length; i++) {
        const prev = new Date(cycleRows[i - 1].start_date).getTime();
        const curr = new Date(cycleRows[i].start_date).getTime();
        lengths.push(Math.round((curr - prev) / (24 * 60 * 60 * 1000)));
      }
      // Filter to valid lengths (18-50 days)
      const valid = lengths.filter((l) => l >= 18 && l <= 50);
      if (valid.length >= 2) {
        const avg = valid.reduce((s, v) => s + v, 0) / valid.length;
        const variance = valid.reduce((s, v) => s + (v - avg) ** 2, 0) / (valid.length - 1);
        const stdDev = Math.sqrt(variance);
        // Lower std dev = higher bonus (max 5 points)
        // stdDev <= 2 -> 5 points, stdDev >= 7 -> 0 points
        regularityBonus = Math.max(0, Math.min(5, Math.round(5 - stdDev)));
      }
    }
  }

  let cycleScore: number;
  if (totalCycles === 0) {
    cycleScore = 0;
  } else if (totalCycles === 1) {
    cycleScore = 5;
  } else if (totalCycles < 3) {
    cycleScore = 8;
  } else if (totalCycles < 6) {
    cycleScore = Math.min(25, 15 + regularityBonus);
  } else {
    cycleScore = Math.min(25, 20 + regularityBonus);
  }

  // ── Mood Map (0-25) ──
  // Based on days with mood logged in last 30 days
  const moodEntries = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM daily_logs WHERE log_date >= ? AND mood_level IS NOT NULL`,
    [thirtyDaysAgo],
  );
  const moodDays = moodEntries?.count ?? 0;

  let moodScore: number;
  if (moodDays === 0) {
    moodScore = 0;
  } else if (moodDays <= 3) {
    moodScore = 5;
  } else if (moodDays <= 7) {
    moodScore = 10;
  } else if (moodDays <= 14) {
    moodScore = 15;
  } else if (moodDays <= 21) {
    moodScore = 20;
  } else {
    moodScore = 25;
  }

  // ── Body Awareness (0-25) ──
  // Based on symptom/energy/sleep logging frequency in last 30 days
  const bodyEntries = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM daily_logs WHERE log_date >= ?
     AND (sleep_hours IS NOT NULL OR energy_level IS NOT NULL OR pain_level IS NOT NULL OR symptoms IS NOT NULL)`,
    [thirtyDaysAgo],
  );
  const bodyDays = bodyEntries?.count ?? 0;

  let bodyScore: number;
  if (bodyDays === 0) {
    bodyScore = 0;
  } else if (bodyDays <= 3) {
    bodyScore = 5;
  } else if (bodyDays <= 7) {
    bodyScore = 10;
  } else if (bodyDays <= 14) {
    bodyScore = 15;
  } else if (bodyDays <= 21) {
    bodyScore = 20;
  } else {
    bodyScore = 25;
  }

  // ── Consistency (0-25) ──
  // Current streak * 2 (max 15) + best streak bonus (max 10)
  const streakRow = await db.getFirstAsync<{ current_streak: number; best_streak: number }>(
    `SELECT current_streak, best_streak FROM streaks WHERE id = 1`,
  );
  const currentStreak = streakRow?.current_streak ?? 0;
  const bestStreak = streakRow?.best_streak ?? 0;

  const streakPart = Math.min(15, currentStreak * 2);
  // Best streak bonus: 1 point per 2 weeks of best streak, max 10
  const bestStreakBonus = Math.min(10, Math.floor(bestStreak / 2));
  const consistencyScore = Math.min(25, streakPart + bestStreakBonus);

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
