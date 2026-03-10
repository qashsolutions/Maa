/**
 * Data export and deletion utilities.
 * Export: generates JSON of all user data from SQLite.
 * Delete: wipes SQLite -> Firestore -> Auth -> MMKV -> reset to onboarding.
 */
import type { SQLiteDatabase } from '../db/encrypted-database';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db as firestore, auth } from '../../src/config/firebase';
import { signOut } from 'firebase/auth';
import { clearAll } from '../utils/storage';
import { router } from 'expo-router';

interface ExportData {
  exportedAt: string;
  dailyLogs: unknown[];
  cycles: unknown[];
  conversations: unknown[];
  goals: unknown[];
  milestones: unknown[];
  scoreSnapshots: unknown[];
  userProfile: unknown[];
  pregnancy: unknown[];
  streaks: unknown[];
}

/** Export all user data as a JSON file and open share sheet */
export async function exportUserData(db: SQLiteDatabase): Promise<void> {
  const [dailyLogs, cycles, conversations, goals, milestones, scoreSnapshots, userProfile, pregnancy, streaks] =
    await Promise.all([
      db.getAllAsync('SELECT * FROM daily_logs ORDER BY log_date DESC'),
      db.getAllAsync('SELECT * FROM cycles ORDER BY start_date DESC'),
      db.getAllAsync('SELECT * FROM conversations ORDER BY created_at DESC'),
      db.getAllAsync('SELECT * FROM weekly_goals ORDER BY week_start DESC'),
      db.getAllAsync('SELECT * FROM milestones'),
      db.getAllAsync('SELECT * FROM score_snapshots ORDER BY snapshot_date DESC'),
      db.getAllAsync('SELECT * FROM user_profile'),
      db.getAllAsync('SELECT * FROM pregnancy ORDER BY confirmed_date DESC'),
      db.getAllAsync('SELECT * FROM streaks'),
    ]);

  const data: ExportData = {
    exportedAt: new Date().toISOString(),
    dailyLogs,
    cycles,
    conversations,
    goals,
    milestones,
    scoreSnapshots,
    userProfile,
    pregnancy,
    streaks,
  };

  const filePath = `${FileSystem.documentDirectory}maa-data-export.json`;
  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Export Maa Data',
    });
  }
}

/**
 * Delete all user data. Follows strict order:
 * 1. SQLite (all 9 tables)
 * 2. Firestore (all user subcollections)
 * 3. Firebase Auth sign-out
 * 4. MMKV (all keys)
 * 5. Reset to onboarding
 */
export async function deleteAllUserData(db: SQLiteDatabase): Promise<void> {
  // 1. Clear all 9 SQLite tables
  await db.execAsync(`
    DELETE FROM daily_logs;
    DELETE FROM cycles;
    DELETE FROM conversations;
    DELETE FROM weekly_goals;
    DELETE FROM milestones;
    DELETE FROM score_snapshots;
    DELETE FROM user_profile;
    DELETE FROM pregnancy;
    DELETE FROM streaks;
  `);

  // Re-seed milestones and streaks so schema stays valid
  await db.execAsync(`
    INSERT OR IGNORE INTO milestones (id, unlocked, progress) VALUES
      ('cycle_1', 0, 0.0),
      ('cycle_3', 0, 0.0),
      ('cycle_6', 0, 0.0),
      ('cycle_12', 0, 0.0),
      ('pregnancy', 0, 0.0);
    INSERT OR IGNORE INTO streaks (id, current_streak, best_streak, updated_at)
      VALUES (1, 0, 0, datetime('now'));
  `);

  // 2. Clear Firestore user data
  const user = auth.currentUser;
  if (user) {
    const uid = user.uid;
    const subcollections = [
      'score', 'milestones', 'anonymized_data', 'weekly_summaries', 'profile', 'medications',
    ];

    for (const sub of subcollections) {
      try {
        const snap = await getDocs(collection(firestore, `users/${uid}/${sub}`));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch {
        // Non-fatal: Firestore may be unreachable offline
      }
    }
  }

  // 3. Sign out of Firebase Auth
  try {
    await signOut(auth);
  } catch {
    // Non-fatal
  }

  // 4. Clear MMKV (all cached settings, tokens, encryption key references)
  clearAll();

  // 5. Reset to onboarding
  router.replace('/(auth)/language-detect');
}
