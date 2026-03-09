/**
 * Encrypted SQLite database wrapper using @op-engineering/op-sqlite with SQLCipher.
 *
 * Provides the same interface as expo-sqlite's SQLiteDatabase so all existing
 * code continues to work unchanged. The encryption key is generated once on
 * first launch and stored in MMKV (which itself is encrypted).
 */
import { open, type DB } from '@op-engineering/op-sqlite';
import { storage, StorageKeys } from '../utils/storage';

const DB_NAME = 'maa.db';

/** Generate a 32-char hex encryption key */
function generateEncryptionKey(): string {
  const chars = '0123456789abcdef';
  let key = '';
  for (let i = 0; i < 64; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

/**
 * Get or create the SQLCipher encryption key.
 * Stored in MMKV which is already encrypted with its own key.
 */
function getEncryptionKey(): string {
  const existing = storage.getString(StorageKeys.DB_ENCRYPTION_KEY);
  if (existing) return existing;

  const key = generateEncryptionKey();
  storage.set(StorageKeys.DB_ENCRYPTION_KEY, key);
  return key;
}

/**
 * EncryptedDatabase — drop-in replacement for expo-sqlite's SQLiteDatabase.
 *
 * All existing code uses:
 *   db.execAsync(sql)
 *   db.getFirstAsync<T>(sql, params?)
 *   db.getAllAsync<T>(sql, params?)
 *   db.runAsync(sql, params?)
 *
 * This class implements all four with the same signatures.
 */
export class EncryptedDatabase {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Execute one or more SQL statements (no return value).
   * Supports multi-statement strings separated by semicolons.
   */
  async execAsync(sql: string): Promise<void> {
    // op-sqlite's execute doesn't handle multi-statement strings well,
    // so we split on semicolons (outside of string literals) and execute each.
    const statements = splitStatements(sql);
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed.length > 0) {
        await this.db.execute(trimmed);
      }
    }
  }

  /**
   * Execute a query and return the first row, or null.
   */
  async getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const result = await this.db.execute(sql, params as (string | number | boolean | null)[]);
    if (result.rows && result.rows.length > 0) {
      return result.rows[0] as T;
    }
    return null;
  }

  /**
   * Execute a query and return all rows.
   */
  async getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await this.db.execute(sql, params as (string | number | boolean | null)[]);
    return (result.rows ?? []) as T[];
  }

  /**
   * Execute a statement and return changes + lastInsertRowId.
   */
  async runAsync(
    sql: string,
    params?: unknown[],
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    const result = await this.db.execute(sql, params as (string | number | boolean | null)[]);
    return {
      changes: result.rowsAffected ?? 0,
      lastInsertRowId: result.insertId ?? 0,
    };
  }

  /** Close the database connection */
  close(): void {
    this.db.close();
  }
}

/**
 * Open the encrypted database. This is the single entry point —
 * replaces `SQLite.openDatabaseAsync('maa.db')`.
 */
export async function openEncryptedDatabase(): Promise<EncryptedDatabase> {
  const encryptionKey = getEncryptionKey();

  const db = open({
    name: DB_NAME,
    encryptionKey,
  });

  return new EncryptedDatabase(db);
}

/**
 * Split a multi-statement SQL string into individual statements.
 * Handles semicolons inside string literals correctly.
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    if (inString) {
      current += char;
      // Handle escaped quotes (doubled)
      if (char === stringChar) {
        if (i + 1 < sql.length && sql[i + 1] === stringChar) {
          current += sql[i + 1];
          i++;
        } else {
          inString = false;
        }
      }
    } else if (char === "'" || char === '"') {
      inString = true;
      stringChar = char;
      current += char;
    } else if (char === ';') {
      statements.push(current);
      current = '';
    } else if (char === '-' && i + 1 < sql.length && sql[i + 1] === '-') {
      // Skip line comments
      const newlineIndex = sql.indexOf('\n', i);
      if (newlineIndex === -1) break;
      i = newlineIndex;
    } else {
      current += char;
    }
  }

  if (current.trim().length > 0) {
    statements.push(current);
  }

  return statements;
}

/** Type alias for compatibility — other files can import this instead of expo-sqlite's type */
export type SQLiteDatabase = EncryptedDatabase;
