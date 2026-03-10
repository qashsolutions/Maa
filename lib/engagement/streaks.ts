/**
 * Streak tracking — pause-not-reset logic.
 * A "week" is Mon-Sun (ISO 8601). User keeps streak by talking to Maa at least once per week.
 * Missing 1-3 weeks pauses the streak. Missing 4+ weeks resets to 1.
 */
import type { SQLiteDatabase } from '../db/encrypted-database';

/**
 * Get ISO 8601 week identifier (e.g., "2026-W10").
 * ISO weeks: Monday is first day, week 1 contains the year's first Thursday.
 */
function getISOWeek(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Mon=1, Sun=7)
  const dayNum = d.getUTCDay() || 7; // Convert Sunday from 0 to 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate week number
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Get the Monday date for a given ISO week string */
function weekToDate(weekStr: string): Date {
  const [year, weekPart] = weekStr.split('-W');
  const weekNum = parseInt(weekPart, 10);
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(parseInt(year, 10), 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // Mon=1..Sun=7
  // Monday of week 1
  const week1Monday = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000);
  // Monday of target week
  return new Date(week1Monday.getTime() + (weekNum - 1) * 7 * 86400000);
}

/** Get the difference in weeks between two ISO week strings */
function getWeekDifference(week1: string, week2: string): number {
  const d1 = weekToDate(week1);
  const d2 = weekToDate(week2);
  return Math.round((d2.getTime() - d1.getTime()) / (7 * 86400000));
}

/** Get the previous ISO week */
function getPreviousWeek(weekStr: string): string {
  const monday = weekToDate(weekStr);
  const prevMonday = new Date(monday.getTime() - 7 * 86400000);
  return getISOWeek(prevMonday);
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveWeek: string | null;
  isActiveThisWeek: boolean;
}

/** Get current streak info */
export async function getStreak(db: SQLiteDatabase): Promise<StreakData> {
  const row = await db.getFirstAsync<{
    current_streak: number;
    best_streak: number;
    last_active_week: string | null;
  }>(`SELECT * FROM streaks WHERE id = 1`);

  const currentWeek = getISOWeek();

  return {
    currentStreak: row?.current_streak ?? 0,
    bestStreak: row?.best_streak ?? 0,
    lastActiveWeek: row?.last_active_week ?? null,
    isActiveThisWeek: row?.last_active_week === currentWeek,
  };
}

/** Record activity for the current week — called after each voice conversation */
export async function recordWeeklyActivity(db: SQLiteDatabase): Promise<StreakData> {
  const currentWeek = getISOWeek();
  const streak = await getStreak(db);

  if (streak.lastActiveWeek === currentWeek) {
    // Already active this week, no change
    return { ...streak, isActiveThisWeek: true };
  }

  let newStreak = streak.currentStreak;

  if (streak.lastActiveWeek === null) {
    // First ever activity
    newStreak = 1;
  } else if (streak.lastActiveWeek === getPreviousWeek(currentWeek)) {
    // Consecutive week — increment streak
    newStreak += 1;
  } else {
    // Gap detected — check how many weeks
    const weekDiff = getWeekDifference(streak.lastActiveWeek, currentWeek);
    if (weekDiff >= 4) {
      newStreak = 1; // Reset after 4+ consecutive inactive weeks
    }
    // 1-3 week gap: streak stays the same (PAUSED, not reset)
  }

  const newBest = Math.max(streak.bestStreak, newStreak);

  await db.runAsync(
    `UPDATE streaks SET current_streak = ?, best_streak = ?, last_active_week = ?, updated_at = datetime('now') WHERE id = 1`,
    [newStreak, newBest, currentWeek],
  );

  return {
    currentStreak: newStreak,
    bestStreak: newBest,
    lastActiveWeek: currentWeek,
    isActiveThisWeek: true,
  };
}
