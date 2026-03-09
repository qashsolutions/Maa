/**
 * Persists conversation turns and extracted health data to SQLite.
 * This is how voice conversations become structured health data.
 */
import type { SQLiteDatabase } from '../db/encrypted-database';
import type { ConversationTurn, ExtractedHealthData } from './types';

/** Save a conversation turn to SQLite */
export async function saveConversationTurn(
  db: SQLiteDatabase,
  turn: ConversationTurn,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO conversations (session_date, user_text, ai_response, extracted_data, visual_card_type, language_code, duration_seconds, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      turn.sessionDate,
      turn.userText,
      turn.aiResponse,
      turn.extractedData ? JSON.stringify(turn.extractedData) : null,
      turn.visualCardType,
      turn.languageCode,
      turn.durationSeconds,
    ],
  );
  return result.lastInsertRowId;
}

/** Apply extracted health data to daily_logs (upsert today's row) */
export async function applyExtractedData(
  db: SQLiteDatabase,
  data: ExtractedHealthData,
  date: string,
): Promise<void> {
  // Build dynamic SET clause from non-null fields
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.mood_level != null) {
    updates.push('mood_level = ?');
    values.push(data.mood_level);
  }
  if (data.energy_level != null) {
    updates.push('energy_level = ?');
    values.push(data.energy_level);
  }
  if (data.sleep_hours != null) {
    updates.push('sleep_hours = ?');
    values.push(data.sleep_hours);
  }
  if (data.pain_level != null) {
    updates.push('pain_level = ?');
    values.push(data.pain_level);
  }
  if (data.symptoms && data.symptoms.length > 0) {
    updates.push('symptoms = ?');
    values.push(JSON.stringify(data.symptoms));
  }
  if (data.medications && data.medications.length > 0) {
    updates.push('medications = ?');
    values.push(JSON.stringify(data.medications));
  }
  if (data.period_status) {
    updates.push('period_status = ?');
    values.push(data.period_status);
  }
  if (data.notes) {
    updates.push('notes = ?');
    values.push(data.notes);
  }

  if (updates.length === 0) return;

  // Upsert: insert if no row for today, update if exists
  await db.runAsync(
    `INSERT INTO daily_logs (log_date, ${updates.map((u) => u.split(' = ')[0]).join(', ')}, voice_logged, created_at, updated_at)
     VALUES (?, ${values.map(() => '?').join(', ')}, 1, datetime('now'), datetime('now'))
     ON CONFLICT(log_date) DO UPDATE SET ${updates.join(', ')}, voice_logged = 1, updated_at = datetime('now')`,
    [date, ...values],
  );

  // Handle period status -> cycles table
  if (data.period_status === 'started') {
    await db.runAsync(
      `INSERT INTO cycles (start_date, flow_intensity, created_at)
       VALUES (?, ?, datetime('now'))`,
      [date, data.flow_intensity ?? 'medium'],
    );
  } else if (data.period_status === 'ended') {
    // Close the most recent open cycle
    await db.runAsync(
      `UPDATE cycles SET end_date = ? WHERE end_date IS NULL ORDER BY start_date DESC LIMIT 1`,
      [date],
    );
  }
}

/** Get recent conversations for display or context */
export async function getRecentConversations(
  db: SQLiteDatabase,
  limit: number = 20,
): Promise<ConversationTurn[]> {
  const rows = await db.getAllAsync<{
    id: number;
    session_date: string;
    user_text: string;
    ai_response: string;
    extracted_data: string | null;
    visual_card_type: string | null;
    language_code: string;
    duration_seconds: number;
  }>(`SELECT * FROM conversations ORDER BY created_at DESC LIMIT ?`, [limit]);

  return rows.map((row) => ({
    id: row.id,
    sessionDate: row.session_date,
    userText: row.user_text,
    aiResponse: row.ai_response,
    extractedData: row.extracted_data ? JSON.parse(row.extracted_data) : null,
    visualCardType: row.visual_card_type,
    languageCode: row.language_code,
    durationSeconds: row.duration_seconds,
  }));
}

/** Get today's daily log */
export async function getTodayLog(db: SQLiteDatabase): Promise<{
  moodLevel: number | null;
  energyLevel: number | null;
  sleepHours: number | null;
  painLevel: number | null;
  periodStatus: string | null;
  voiceLogged: boolean;
} | null> {
  const today = new Date().toISOString().split('T')[0];
  const row = await db.getFirstAsync<{
    mood_level: number | null;
    energy_level: number | null;
    sleep_hours: number | null;
    pain_level: number | null;
    period_status: string | null;
    voice_logged: number;
  }>(`SELECT * FROM daily_logs WHERE log_date = ?`, [today]);

  if (!row) return null;

  return {
    moodLevel: row.mood_level,
    energyLevel: row.energy_level,
    sleepHours: row.sleep_hours,
    painLevel: row.pain_level,
    periodStatus: row.period_status,
    voiceLogged: row.voice_logged === 1,
  };
}
