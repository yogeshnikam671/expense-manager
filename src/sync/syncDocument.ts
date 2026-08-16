import {
  EXPENSE_CATEGORIES,
  EXPENSE_NATURES,
  Expense,
  ExpenseCategory,
  ExpenseNature,
  SyncStatus,
} from "@/models/expense";
import { isExpenseLabel } from "@/utils/expenseLabels";

export const CURRENT_SYNC_SCHEMA = 1;
export const CURRENT_ENCRYPTION_VERSION = 1;

export type CloudExpense = Omit<Expense, "date" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus" | "description"> & {
  date: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  description: string | null;
};

export type SyncDocument = {
  schemaVersion: typeof CURRENT_SYNC_SCHEMA;
  records: CloudExpense[];
};

type EncryptedSyncDocument = {
  encryptionVersion: typeof CURRENT_ENCRYPTION_VERSION;
  data: string;
};

export function serializeEncryptedSyncDocument(data: string): string {
  return JSON.stringify({
    encryptionVersion: CURRENT_ENCRYPTION_VERSION,
    data,
  } satisfies EncryptedSyncDocument);
}

export function parseEncryptedSyncDocument(input: string): Uint8Array {
  const document: unknown = JSON.parse(input);
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("Invalid encrypted sync document");
  }
  const envelope = document as Record<string, unknown>;
  if (envelope.encryptionVersion !== CURRENT_ENCRYPTION_VERSION) {
    throw new Error("Unsupported encrypted sync document version");
  }
  if (typeof envelope.data !== "string" || envelope.data.length === 0) {
    throw new Error("Invalid encrypted sync document");
  }
  try {
    return Uint8Array.from(atob(envelope.data), (character) => character.charCodeAt(0));
  } catch {
    throw new Error("Invalid encrypted sync document");
  }
}

function cloudExpenseFrom(expense: Expense): CloudExpense {
  return {
    id: expense.id,
    amount: expense.amount,
    nature: expense.nature,
    category: expense.category,
    labels: expense.labels,
    description: expense.description ?? null,
    date: expense.date.toISOString(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    deletedAt: expense.deletedAt?.toISOString() ?? null,
  };
}

function expenseFromCloud(record: CloudExpense): Expense {
  return {
    id: record.id,
    amount: record.amount,
    nature: record.nature,
    category: record.category,
    labels: record.labels,
    description: record.description ?? undefined,
    date: new Date(record.date),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    deletedAt: record.deletedAt ? new Date(record.deletedAt) : undefined,
    syncStatus: SyncStatus.Synced,
  };
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function isCloudExpense(value: unknown): value is CloudExpense {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.trim().length > 0 &&
    typeof record.amount === "number" &&
    Number.isFinite(record.amount) &&
    record.amount > 0 &&
    EXPENSE_NATURES.includes(record.nature as ExpenseNature) &&
    EXPENSE_CATEGORIES.includes(record.category as ExpenseCategory) &&
    Array.isArray(record.labels) &&
    record.labels.every(isExpenseLabel) &&
    (record.description === null || typeof record.description === "string") &&
    isDate(record.date) &&
    isDate(record.createdAt) &&
    isDate(record.updatedAt) &&
    (record.deletedAt === null || isDate(record.deletedAt))
  );
}

export function serializeSyncDocument(expenses: Expense[]): string {
  return JSON.stringify({
    schemaVersion: CURRENT_SYNC_SCHEMA,
    records: expenses.map(cloudExpenseFrom),
  } satisfies SyncDocument);
}

export function parseSyncDocument(input: string): Expense[] {
  const data: unknown = JSON.parse(input);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid sync document");
  }

  const document = data as Record<string, unknown>;
  if (document.schemaVersion !== CURRENT_SYNC_SCHEMA) {
    throw new Error("Unsupported sync document version");
  }
  if (!Array.isArray(document.records)) throw new Error("Invalid sync document");

  return document.records.map((record, index) => {
    if (!isCloudExpense(record)) throw new Error(`Invalid sync record at index ${index}`);
    return expenseFromCloud(record);
  });
}

function recordKey(expense: Expense): string {
  return JSON.stringify(cloudExpenseFrom(expense));
}

function newer(left: Expense, right: Expense): Expense {
  // ponytail: client-clock LWW; add logical revisions when cross-device edits/deletes exist.
  const timeDifference = left.updatedAt.getTime() - right.updatedAt.getTime();
  if (timeDifference !== 0) return timeDifference > 0 ? left : right;
  return recordKey(left) >= recordKey(right) ? left : right;
}

export function mergeExpenses(local: Expense[], cloud: Expense[]): Expense[] {
  const merged = new Map<string, Expense>();
  for (const expense of [...local, ...cloud]) {
    const existing = merged.get(expense.id);
    merged.set(expense.id, existing ? newer(existing, expense) : expense);
  }
  return [...merged.values()].sort(
    (left, right) => right.date.getTime() - left.date.getTime() || left.id.localeCompare(right.id)
  );
}
