/// <reference types="node" />

import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { categoryPageQuery, HISTORY_SUMMARY_SQL } from "./expenseQueries";

test("history aggregates and category keyset pagination exclude tombstones", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      nature TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      deletedAt TEXT
    )
  `);
  const insert = db.prepare(
    "INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?)"
  );
  const rows = [
    [
      "deleted",
      100,
      "Essential",
      "Food",
      "2026-01-04T00:00:00.000Z",
      "2026-01-05T00:00:00.000Z",
    ],
    ["c", 30, "Essential", "Food", "2026-01-03T00:00:00.000Z", null],
    ["b", 20, "Essential", "Food", "2026-01-02T00:00:00.000Z", null],
    ["a", 10, "Essential", "Food", "2026-01-02T00:00:00.000Z", null],
    ["z", 5, "Essential", "Food", "2026-01-01T00:00:00.000Z", null],
    ["other", 7, "Emergency", "Travel", "2026-01-01T00:00:00.000Z", null],
  ] as const;
  for (const row of rows) insert.run(...row);

  const start = "2026-01-01T00:00:00.000Z";
  const end = "2026-01-31T23:59:59.999Z";
  const summary = db.prepare(HISTORY_SUMMARY_SQL).all(start, end) as {
    total: number;
    count: number;
  }[];
  assert.equal(summary.reduce((sum, item) => sum + item.total, 0), 72);
  assert.equal(summary.reduce((sum, item) => sum + item.count, 0), 5);

  const first = categoryPageQuery(start, end, "Essential", "Food", 3);
  const firstRows = db.prepare(first.sql).all(...first.params) as {
    id: string;
    categoryTotal: number;
  }[];
  assert.deepEqual(firstRows.map(({ id }) => id), ["c", "b", "a"]);
  assert.equal(firstRows[0]?.categoryTotal, 65);

  const second = categoryPageQuery(start, end, "Essential", "Food", 3, {
    date: "2026-01-02T00:00:00.000Z",
    id: "b",
  });
  const secondRows = db.prepare(second.sql).all(...second.params) as {
    id: string;
  }[];
  assert.deepEqual(secondRows.map(({ id }) => id), ["a", "z"]);

  db.close();
});
