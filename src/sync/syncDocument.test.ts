/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

import { Expense, ExpenseCategory, ExpenseNature, SyncStatus } from "@/models/expense";
import {
  mergeExpenses,
  parseEncryptedSyncDocument,
  parseSyncDocument,
  serializeEncryptedSyncDocument,
  serializeSyncDocument,
} from "./syncDocument";

function expense(id: string, updatedAt = "2026-01-01T00:00:00.000Z"): Expense {
  const timestamp = new Date(updatedAt);
  return {
    id,
    amount: 10,
    nature: ExpenseNature.Essential,
    category: ExpenseCategory.Food,
    labels: [],
    date: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: timestamp,
    syncStatus: SyncStatus.PendingCreate,
  };
}

test("sync document validates, round-trips, and merges deterministically", () => {
  const original = expense("round-trip");
  const roundTrip = parseSyncDocument(serializeSyncDocument([original]));
  assert.equal(roundTrip[0]?.id, original.id);
  assert.equal(roundTrip[0]?.syncStatus, SyncStatus.Synced);

  const invalid = JSON.parse(serializeSyncDocument([original]));
  invalid.records[0].amount = "10";
  assert.throws(() => parseSyncDocument(JSON.stringify(invalid)), /Invalid sync record/);
  invalid.records[0].amount = 10;
  invalid.records[0].labels = ["bad label"];
  assert.throws(() => parseSyncDocument(JSON.stringify(invalid)), /Invalid sync record/);

  const old = expense("same", "2026-01-01T00:00:00.000Z");
  const current = { ...expense("same", "2026-01-02T00:00:00.000Z"), amount: 20 };
  assert.equal(mergeExpenses([old], [current])[0]?.amount, 20);
  assert.deepEqual(mergeExpenses([expense("b"), expense("a")], []).map(({ id }) => id), ["a", "b"]);
});

test("encrypted sync envelope validates and round-trips", () => {
  assert.equal(parseEncryptedSyncDocument(serializeEncryptedSyncDocument("ciphertext")), "ciphertext");
  assert.throws(
    () => parseEncryptedSyncDocument('{"encryptionVersion":2,"data":"ciphertext"}'),
    /Unsupported encrypted sync document version/
  );
  assert.throws(
    () => parseEncryptedSyncDocument('{"encryptionVersion":1,"data":""}'),
    /Invalid encrypted sync document/
  );
});
