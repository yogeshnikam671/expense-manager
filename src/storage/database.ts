import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("expenses.db");

export function initializeDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      nature TEXT NOT NULL,
      category TEXT NOT NULL,
      labels TEXT NOT NULL DEFAULT '[]',
      description TEXT,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT,
      syncStatus TEXT NOT NULL
    );
  `);

  const { user_version: currentVersion } = db.getFirstSync<{ user_version: number }>(
    "PRAGMA user_version"
  ) ?? { user_version: 0 };

  if (currentVersion < 1) {
    const columns = db.getAllSync<{ name: string }>("PRAGMA table_info(expenses)");
    if (!columns.some((column) => column.name === "labels")) {
      db.execSync("ALTER TABLE expenses ADD COLUMN labels TEXT NOT NULL DEFAULT '[]'");
    }
    db.execSync("PRAGMA user_version = 1");
  }

  if (currentVersion < 2) {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);
    db.execSync("PRAGMA user_version = 2");
  }

  if (currentVersion < 3) {
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_expenses_active_date
        ON expenses(date DESC, id DESC) WHERE deletedAt IS NULL;
      CREATE INDEX IF NOT EXISTS idx_expenses_active_category_date
        ON expenses(nature, category, date DESC, id DESC) WHERE deletedAt IS NULL;
      PRAGMA user_version = 3;
    `);
  }
}

export function getSyncMetadata(key: string): string | null {
  return db.getFirstSync<{ value: string | null }>(
    "SELECT value FROM sync_metadata WHERE key = ?",
    key
  )?.value ?? null;
}

export function setSyncMetadata(key: string, value: string | null): void {
  db.runSync(
    "INSERT INTO sync_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value
  );
}
