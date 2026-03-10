/**
 * Maa Score — local calculation engine.
 * 4 pillars, 25 points each, 100 total.
 * Runs locally for instant display, Cloud Function for authoritative weekly snapshot.
 *
 * Algorithm follows Main spec exactly:
 *   Cycle Intelligence: tiered by cycle count + prediction accuracy (regularity) bonus
 *   Mood Map: weeks with mood data + mood-cycle correlation + PMS prediction
 *   Body Awareness: symptomTypes*2 + sleepDataPoints*0.5 + crossDomainBonus
 *   Consistency: tiered by streak length + perfectWeeks bonus
 */
import type { SQLiteDatabase } from '../db/encrypted-database';

export interface MaaScore {
  total: number;
  cycleIntelligence: number; // 0-25
  moodMap: number; // 0-25
  bodyAwareness: number; // 0-25
  consistency: number; // 0-25
}

/** Calculate score from local SQLite data using Main spec algorithm */
export async function calculateLocalScore(db: SQLiteDatabase): Promise<MaaScore> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // ── Cycle Intelligence (0-25) ──
  // Tiered by cycle count + prediction accuracy bonus (regularity of cycle lengths)
  const totalCycleRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cycles`,
  );
  const totalCycles = totalCycleRow?.count ?? 0;

  // Prediction accuracy bonus: how regular are cycle lengths? (max 5 points)
  let predictionAccuracyBonus = 0;
  if (totalCycles >= 3) {
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
      const valid = lengths.filter((l) => l >= 18 && l <= 50);
      if (valid.length >= 2) {
        const avg = valid.reduce((s, v) => s + v, 0) / valid.length;
        const variance = valid.reduce((s, v) => s + (v - avg) ** 2, 0) / (valid.length - 1);
        const stdDev = Math.sqrt(variance);
        // Lower std dev = higher bonus (max 5 points)
        predictionAccuracyBonus = Math.max(0, Math.min(5, Math.round(5 - stdDev)));
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
    cycleScore = Math.min(20, 15 + predictionAccuracyBonus); // max 20 per spec
  } else {
    cycleScore = Math.min(25, 20 + predictionAccuracyBonus); // max 25 per spec
  }

  // ── Mood Map (0-25) ──
  // Based on WEEKS with mood data (not days), mood-cycle correlation, PMS prediction
  // Count distinct weeks with mood entries in last 30 days
  const moodWeekRows = await db.getAllAsync<{ week_id: string }>(
    `SELECT DISTINCT strftime('%Y-%W', log_date) as week_id
     FROM daily_logs WHERE log_date >= ? AND mood_level IS NOT NULL`,
    [thirtyDaysAgo],
  );
  const moodDataWeeks = moodWeekRows.length;

  // Detect mood-cycle correlation: do we have both mood AND cycle data?
  // True if user has 3+ cycles AND 4+ weeks of mood data (enough to see patterns)
  const hasMoodCycleCorrelation = totalCycles >= 3 && moodDataWeeks >= 4;

  // PMS prediction: requires 6+ cycles of data to detect pattern
  const hasPmsPrediction = totalCycles >= 6 && moodDataWeeks >= 6;

  // Correlation strength: approximate from consistency of mood logging during cycles
  let correlationStrength = 0;
  if (hasMoodCycleCorrelation) {
    // Use ratio of mood weeks to total weeks as a proxy for correlation strength (0-1)
    correlationStrength = Math.min(1, moodDataWeeks / 8);
  }

  let moodScore: number;
  if (moodDataWeeks === 0) {
    moodScore = 0;
  } else if (moodDataWeeks < 2) {
    moodScore = 5;
  } else if (!hasMoodCycleCorrelation) {
    moodScore = Math.min(15, 8 + moodDataWeeks); // max 15
  } else if (hasMoodCycleCorrelation && !hasPmsPrediction) {
    moodScore = Math.min(20, 15 + Math.round(correlationStrength * 5)); // max 20
  } else {
    moodScore = 25; // full marks: correlation + PMS prediction
  }

  // ── Body Awareness (0-25) ──
  // Formula: min(25, symptomTypes*2 + sleepDataPoints*0.5 + crossDomainBonus)
  // Count distinct symptom types logged in last 30 days
  const symptomRows = await db.getAllAsync<{ symptoms: string }>(
    `SELECT symptoms FROM daily_logs WHERE log_date >= ? AND symptoms IS NOT NULL`,
    [thirtyDaysAgo],
  );
  const allSymptomTypes = new Set<string>();
  for (const row of symptomRows) {
    try {
      const parsed = JSON.parse(row.symptoms);
      if (Array.isArray(parsed)) {
        parsed.forEach((s: string) => allSymptomTypes.add(s));
      }
    } catch {
      // Single symptom string
      if (row.symptoms) allSymptomTypes.add(row.symptoms);
    }
  }
  const symptomTypes = allSymptomTypes.size;

  // Count sleep data points in last 30 days
  const sleepRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM daily_logs WHERE log_date >= ? AND sleep_hours IS NOT NULL`,
    [thirtyDaysAgo],
  );
  const sleepDataPoints = sleepRow?.count ?? 0;

  // Cross-domain bonus: logging across multiple domains (energy + pain + sleep + symptoms)
  const domainCountRow = await db.getFirstAsync<{
    has_energy: number;
    has_pain: number;
    has_sleep: number;
    has_symptoms: number;
  }>(
    `SELECT
       MAX(CASE WHEN energy_level IS NOT NULL THEN 1 ELSE 0 END) as has_energy,
       MAX(CASE WHEN pain_level IS NOT NULL THEN 1 ELSE 0 END) as has_pain,
       MAX(CASE WHEN sleep_hours IS NOT NULL THEN 1 ELSE 0 END) as has_sleep,
       MAX(CASE WHEN symptoms IS NOT NULL THEN 1 ELSE 0 END) as has_symptoms
     FROM daily_logs WHERE log_date >= ?`,
    [thirtyDaysAgo],
  );
  const domainsLogged =
    (domainCountRow?.has_energy ?? 0) +
    (domainCountRow?.has_pain ?? 0) +
    (domainCountRow?.has_sleep ?? 0) +
    (domainCountRow?.has_symptoms ?? 0);
  // Bonus: 2 points per domain beyond the first (max 6 for 4 domains)
  const crossDomainBonus = Math.max(0, (domainsLogged - 1) * 2);

  const bodyScore = Math.min(25, symptomTypes * 2 + sleepDataPoints * 0.5 + crossDomainBonus);

  // ── Consistency (0-25) ──
  // Tiered by streak + perfectWeeks (weeks where all 3 goals completed)
  const streakRow = await db.getFirstAsync<{ current_streak: number; best_streak: number }>(
    `SELECT current_streak, best_streak FROM streaks WHERE id = 1`,
  );
  const streak = streakRow?.current_streak ?? 0;

  // Count "perfect weeks" — weeks where all 3 goals were completed
  const perfectWeekRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT week_start) as count FROM (
       SELECT week_start, COUNT(*) as total, SUM(completed) as done
       FROM weekly_goals
       GROUP BY week_start
       HAVING total = done AND total >= 3
     )`,
  );
  const perfectWeeks = perfectWeekRow?.count ?? 0;

  // Base score from streak tier + flat +2 per perfect week (Main spec)
  let streakBase: number;
  if (streak === 0) {
    streakBase = 0;
  } else if (streak < 4) {
    streakBase = Math.min(6, streak * 2); // max 6
  } else if (streak < 8) {
    streakBase = 8;
  } else if (streak < 12) {
    streakBase = 15;
  } else {
    streakBase = 20;
  }
  const perfectWeekBonus = perfectWeeks * 2; // +2 per perfect week (all 3 goals completed)
  const consistencyScore = Math.min(25, streakBase + perfectWeekBonus);

  return {
    total: cycleScore + moodScore + Math.round(bodyScore) + consistencyScore,
    cycleIntelligence: cycleScore,
    moodMap: moodScore,
    bodyAwareness: Math.round(bodyScore),
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
