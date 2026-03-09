/**
 * Streak tracking — pause-not-reset logic.
 * A "week" is Mon-Sun. User keeps streak by talking to Maa at least once per week.
 * Missing a week pauses the streak (doesn't reset to 0).
 */
import type { SQLiteDatabase } from 'expo-sqlite';

/** Get current week identifier (ISO week, e.g., "2026-W10") */
function getCurrentWeek(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
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

  const currentWeek = getCurrentWeek();

  return {
    currentStreak: row?.current_streak ?? 0,
    bestStreak: row?.best_streak ?? 0,
    lastActiveWeek: row?.last_active_week ?? null,
    isActiveThisWeek: row?.last_active_week === currentWeek,
  };
}

/** Record activity for the current week — called after each voice conversation */
export async function recordWeeklyActivity(db: SQLiteDatabase): Promise<StreakData> {
  const currentWeek = getCurrentWeek();
  const streak = await getStreak(db);

  if (streak.lastActiveWeek === currentWeek) {
    // Already active this week, no change
    return { ...streak, isActiveThisWeek: true };
  }

  let newStreak = streak.currentStreak;

  if (streak.lastActiveWeek === getPreviousWeek(currentWeek)) {
    // Consecutive week — increment streak
    newStreak += 1;
  } else if (streak.lastActiveWeek === null) {
    // First ever activity
    newStreak = 1;
  } else {
    // Gap — pause logic: keep current streak but don't increment
    // Only reset if gap is > 2 weeks
    const weekDiff = getWeekDifference(streak.lastActiveWeek, currentWeek);
    if (weekDiff > 2) {
      newStreak = 1; // Reset after 2+ weeks of inactivity
    }
    // 1 week gap: streak stays the same (pause, not reset)
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

function getPreviousWeek(weekStr: string): string {
  const [year, week] = weekStr.split('-W').map(Number);
  if (week === 1) return `${year - 1}-W52`;
  return `${year}-W${String(week - 1).padStart(2, '0')}`;
}

function getWeekDifference(week1: string, week2: string): number {
  const [y1, w1] = week1.split('-W').map(Number);
  const [y2, w2] = week2.split('-W').map(Number);
  return (y2 - y1) * 52 + (w2 - w1);
}
