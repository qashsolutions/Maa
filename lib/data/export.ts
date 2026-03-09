/**
 * Data export and deletion utilities.
 * Export: generates JSON of all user data from SQLite.
 * Delete: wipes SQLite tables, MMKV, and Firestore user doc.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { deleteDoc, doc, collection, getDocs } from 'firebase/firestore';
import { db as firestore, auth } from '../../src/config/firebase';
import { clearAll } from '../utils/storage';

interface ExportData {
  exportedAt: string;
  dailyLogs: unknown[];
  cycles: unknown[];
  conversations: unknown[];
  goals: unknown[];
  milestones: unknown[];
  scoreSnapshots: unknown[];
}

/** Export all user data as a JSON file and open share sheet */
export async function exportUserData(db: SQLiteDatabase): Promise<void> {
  const [dailyLogs, cycles, conversations, goals, milestones, scoreSnapshots] =
    await Promise.all([
      db.getAllAsync('SELECT * FROM daily_logs ORDER BY log_date DESC'),
      db.getAllAsync('SELECT * FROM cycles ORDER BY start_date DESC'),
      db.getAllAsync('SELECT * FROM conversations ORDER BY created_at DESC'),
      db.getAllAsync('SELECT * FROM weekly_goals ORDER BY week_start DESC'),
      db.getAllAsync('SELECT * FROM milestones'),
      db.getAllAsync('SELECT * FROM score_snapshots ORDER BY snapshot_date DESC'),
    ]);

  const data: ExportData = {
    exportedAt: new Date().toISOString(),
    dailyLogs,
    cycles,
    conversations,
    goals,
    milestones,
    scoreSnapshots,
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

/** Delete all local data (SQLite + MMKV) and Firestore user documents */
export async function deleteAllUserData(db: SQLiteDatabase): Promise<void> {
  // 1. Clear SQLite tables
  await db.execAsync(`
    DELETE FROM daily_logs;
    DELETE FROM cycles;
    DELETE FROM conversations;
    DELETE FROM weekly_goals;
    DELETE FROM milestones;
    DELETE FROM score_snapshots;
    DELETE FROM weekly_streaks;
  `);

  // 2. Clear MMKV
  clearAll();

  // 3. Clear Firestore user data
  const user = auth.currentUser;
  if (user) {
    const uid = user.uid;
    const subcollections = [
      'score', 'milestones', 'anonymized_data', 'weekly_summaries', 'profile',
    ];

    for (const sub of subcollections) {
      const snap = await getDocs(collection(firestore, `users/${uid}/${sub}`));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    }
  }
}
