import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("expenses.db");

export function initializeDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      nature TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL
    );
  `);
}
