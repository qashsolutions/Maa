import * as SQLite from 'expo-sqlite';

const SCHEMA_VERSION = 2;

const CREATE_TABLES = `
-- User profile (local only)
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  phone_hash TEXT,
  language_code TEXT NOT NULL DEFAULT 'en',
  cycle_length_avg INTEGER DEFAULT 28,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Cycle tracking
CREATE TABLE IF NOT EXISTS cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  flow_intensity TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

-- Daily health log (one row per day, upserted)
CREATE TABLE IF NOT EXISTS daily_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_date TEXT NOT NULL UNIQUE,
  mood_level INTEGER,
  energy_level INTEGER,
  sleep_hours REAL,
  pain_level INTEGER,
  symptoms TEXT,
  medications TEXT,
  period_status TEXT,
  notes TEXT,
  voice_logged INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Voice conversation transcripts
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date TEXT NOT NULL,
  user_text TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  extracted_data TEXT,
  visual_card_type TEXT,
  language_code TEXT,
  duration_seconds INTEGER,
  created_at TEXT NOT NULL
);

-- Maa Score snapshots
CREATE TABLE IF NOT EXISTS score_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date TEXT NOT NULL UNIQUE,
  total_score INTEGER NOT NULL,
  cycle_intelligence INTEGER NOT NULL,
  mood_map INTEGER NOT NULL,
  body_awareness INTEGER NOT NULL,
  consistency INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

-- Weekly goals
CREATE TABLE IF NOT EXISTS weekly_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL,
  goal_text TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  target_count INTEGER DEFAULT 1,
  current_count INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  unlocked INTEGER DEFAULT 0,
  unlocked_at TEXT,
  progress REAL DEFAULT 0.0
);

-- Pregnancy tracking
CREATE TABLE IF NOT EXISTS pregnancy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  confirmed_date TEXT NOT NULL,
  due_date TEXT,
  current_week INTEGER,
  notes TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

-- Streaks
CREATE TABLE IF NOT EXISTS streaks (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_active_week TEXT,
  updated_at TEXT NOT NULL
);
`;

const SEED_MILESTONES = `
INSERT OR IGNORE INTO milestones (id, unlocked, progress) VALUES
  ('cycle_1', 0, 0.0),
  ('cycle_3', 0, 0.0),
  ('cycle_6', 0, 0.0),
  ('cycle_12', 0, 0.0),
  ('pregnancy', 0, 0.0);
`;

const SEED_STREAKS = `
INSERT OR IGNORE INTO streaks (id, current_streak, best_streak, updated_at)
VALUES (1, 0, 0, datetime('now'));
`;

export async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = WAL;`);

  // Check schema version
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(CREATE_TABLES);
    await db.execAsync(SEED_MILESTONES);
    await db.execAsync(SEED_STREAKS);
  }

  // v2: Add health profile columns for conditions, medications, pregnancy status
  if (currentVersion < 2) {
    await db.execAsync(`
      ALTER TABLE user_profile ADD COLUMN conditions TEXT DEFAULT '[]';
      ALTER TABLE user_profile ADD COLUMN medications TEXT DEFAULT '[]';
      ALTER TABLE user_profile ADD COLUMN pregnancy_status TEXT DEFAULT 'not_pregnant';
    `);
  }

  if (currentVersion < SCHEMA_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }
}

// Create indexes for performance on low-end devices
export async function createIndexes(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(log_date);
    CREATE INDEX IF NOT EXISTS idx_cycles_start ON cycles(start_date);
    CREATE INDEX IF NOT EXISTS idx_conversations_date ON conversations(session_date);
    CREATE INDEX IF NOT EXISTS idx_weekly_goals_week ON weekly_goals(week_start);
  `);
}
