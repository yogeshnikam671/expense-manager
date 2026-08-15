import {
  CategorySpendSummary,
  Expense,
  ExpenseCategory,
  ExpenseCursor,
  ExpenseHistorySummary,
  ExpenseNature,
  ExpensePage,
  SyncStatus,
} from "@/models/expense";
import { db } from "@/storage/database";
import { labelsFromDatabase } from "@/utils/expenseLabels";

import { categoryPageQuery, HISTORY_SUMMARY_SQL } from "./expenseQueries";

type ExpenseRow = {
  id: string;
  amount: number;
  nature: string;
  category: string;
  labels: string | null;
  description: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: string;
  categoryTotal?: number;
};

type CategorySummaryRow = {
  nature: string;
  category: string;
  total: number;
  count: number;
};

// ponytail: process-local revision; use a DB trigger if expenses gain direct writers.
let expenseRevision = 0;

function dateRange(from: Date, to: Date): [string, string] {
  const start = new Date(from);
  const end = new Date(to);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw new Error("Invalid expense date range");
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (start > end) throw new Error("Invalid expense date range");
  return [start.toISOString(), end.toISOString()];
}

function expenseFromRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount,
    nature: row.nature as ExpenseNature,
    category: row.category as ExpenseCategory,
    labels: labelsFromDatabase(row.labels),
    description: row.description ?? undefined,
    date: new Date(row.date),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    deletedAt: row.deletedAt ? new Date(row.deletedAt) : undefined,
    syncStatus: row.syncStatus as SyncStatus,
  };
}

function upsertExpense(expense: Expense): void {
  db.runSync(
    `
      INSERT INTO expenses (
        id, amount, nature, category, labels, description,
        date, createdAt, updatedAt, deletedAt, syncStatus
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        amount = excluded.amount,
        nature = excluded.nature,
        category = excluded.category,
        labels = excluded.labels,
        description = excluded.description,
        date = excluded.date,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt,
        deletedAt = excluded.deletedAt,
        syncStatus = excluded.syncStatus
    `,
    expense.id,
    expense.amount,
    expense.nature,
    expense.category,
    JSON.stringify(expense.labels),
    expense.description ?? null,
    expense.date.toISOString(),
    expense.createdAt.toISOString(),
    expense.updatedAt.toISOString(),
    expense.deletedAt?.toISOString() ?? null,
    expense.syncStatus
  );
}

export async function saveExpense(expense: Expense): Promise<void> {
  upsertExpense(expense);
  expenseRevision += 1;
}

export async function applySyncedExpenses(expenses: Expense[]): Promise<void> {
  db.withTransactionSync(() => {
    for (const expense of expenses) {
      upsertExpense({ ...expense, syncStatus: SyncStatus.Synced });
    }
  });
  expenseRevision += 1;
}

export async function getAllExpenses(): Promise<Expense[]> {
  const rows = db.getAllSync<ExpenseRow>(
    "SELECT * FROM expenses ORDER BY date DESC"
  );
  return rows.map(expenseFromRow);
}

export async function getHistorySummary(
  from: Date,
  to: Date
): Promise<ExpenseHistorySummary> {
  const rows = await db.getAllAsync<CategorySummaryRow>(
    HISTORY_SUMMARY_SQL,
    ...dateRange(from, to)
  );
  const categories: CategorySpendSummary[] = rows.map((row) => ({
    nature: row.nature as ExpenseNature,
    category: row.category as ExpenseCategory,
    total: row.total,
    count: row.count,
  }));
  const total = categories.reduce((sum, item) => sum + item.total, 0);
  const count = categories.reduce((sum, item) => sum + item.count, 0);
  return { total, count, categories };
}

export async function getCategoryPage(
  from: Date,
  to: Date,
  nature: ExpenseNature,
  category: ExpenseCategory,
  cursor?: ExpenseCursor,
  limit = 50
): Promise<ExpensePage> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Expense page size must be between 1 and 100");
  }
  if (
    cursor &&
    (!cursor.id ||
      !Number.isFinite(cursor.date.getTime()) ||
      !Number.isInteger(cursor.revision))
  ) {
    throw new Error("Invalid expense cursor");
  }

  const revision = expenseRevision;
  if (cursor && cursor.revision !== revision) {
    return { items: [], reset: true };
  }

  const [start, end] = dateRange(from, to);
  const query = categoryPageQuery(
    start,
    end,
    nature,
    category,
    limit + 1,
    cursor ? { date: cursor.date.toISOString(), id: cursor.id } : undefined
  );
  const rows = await db.getAllAsync<ExpenseRow>(query.sql, ...query.params);
  if (revision !== expenseRevision) return { items: [], reset: true };

  const items = rows.slice(0, limit).map(expenseFromRow);
  const last = items.at(-1);
  return {
    items,
    total: cursor ? undefined : (rows[0]?.categoryTotal ?? 0),
    nextCursor:
      rows.length > limit && last
        ? { date: last.date, id: last.id, revision }
        : undefined,
  };
}
