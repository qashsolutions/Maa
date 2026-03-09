/**
 * Milestone tracking — unlocked based on user progress.
 * 5 milestones tied to cycle tracking longevity + pregnancy.
 */
import type { SQLiteDatabase } from '../db/encrypted-database';

export interface Milestone {
  id: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number; // 0.0 to 1.0
}

/** Get all milestones */
export async function getMilestones(db: SQLiteDatabase): Promise<Milestone[]> {
  const rows = await db.getAllAsync<{
    id: string;
    unlocked: number;
    unlocked_at: string | null;
    progress: number;
  }>(`SELECT * FROM milestones ORDER BY id`);

  return rows.map((row) => ({
    id: row.id,
    unlocked: row.unlocked === 1,
    unlockedAt: row.unlocked_at,
    progress: row.progress,
  }));
}

/** Check and update milestone progress — called after each conversation */
export async function checkMilestones(db: SQLiteDatabase): Promise<string[]> {
  const newlyUnlocked: string[] = [];

  // Count total tracked cycles
  const cycleCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cycles`,
  );
  const cycles = cycleCount?.count ?? 0;

  // Check pregnancy status
  const pregnancyActive = await db.getFirstAsync<{ active: number }>(
    `SELECT active FROM pregnancy WHERE active = 1 LIMIT 1`,
  );

  const milestoneChecks: Array<{ id: string; progress: number; threshold: number }> = [
    { id: 'cycle_1', progress: Math.min(1, cycles / 1), threshold: 1 },
    { id: 'cycle_3', progress: Math.min(1, cycles / 3), threshold: 3 },
    { id: 'cycle_6', progress: Math.min(1, cycles / 6), threshold: 6 },
    { id: 'cycle_12', progress: Math.min(1, cycles / 12), threshold: 12 },
    { id: 'pregnancy', progress: pregnancyActive?.active ? 1 : 0, threshold: 1 },
  ];

  for (const check of milestoneChecks) {
    const current = await db.getFirstAsync<{ unlocked: number }>(
      `SELECT unlocked FROM milestones WHERE id = ?`,
      [check.id],
    );

    const shouldUnlock = check.id === 'pregnancy'
      ? check.progress >= 1
      : cycles >= check.threshold;

    // Update progress
    await db.runAsync(`UPDATE milestones SET progress = ? WHERE id = ?`, [
      check.progress,
      check.id,
    ]);

    // Unlock if threshold reached and not already unlocked
    if (shouldUnlock && current?.unlocked !== 1) {
      await db.runAsync(
        `UPDATE milestones SET unlocked = 1, unlocked_at = datetime('now') WHERE id = ?`,
        [check.id],
      );
      newlyUnlocked.push(check.id);
    }
  }

  return newlyUnlocked;
}
