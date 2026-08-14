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
}
