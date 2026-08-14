import { Expense, ExpenseCategory, ExpenseNature, SyncStatus } from "@/models/expense";
import { ExpenseRepository } from "./ExpenseRepository";
import { db } from "../storage/database";

type ExpenseRow = {
  id: string;
  amount: number;
  nature: string;
  category: string;
  description: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: string;
};

function expenseFrom(row: ExpenseRow) {
  return {
    id: row.id,
    amount: row.amount,
    nature: row.nature as ExpenseNature,
    category: row.category as ExpenseCategory,
    description: row.description ?? undefined,
    date: new Date(row.date),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    deletedAt: row.deletedAt ? new Date(row.deletedAt) : undefined,
    syncStatus: row.syncStatus as SyncStatus,
  }
}

export class SQLiteExpenseRepository implements ExpenseRepository {
  async save(expense: Expense): Promise<void> {
    db.runSync(
      `
        INSERT INTO expenses (
          id,
          amount,
          nature,
          category,
          description,
          date,
          createdAt,
          updatedAt,
          deletedAt,
          syncStatus
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      expense.id,
      expense.amount,
      expense.nature,
      expense.category,
      expense.description ?? null,
      expense.date.toISOString(),
      expense.createdAt.toISOString(),
      expense.updatedAt.toISOString(),
      expense.deletedAt?.toISOString() ?? null,
      expense.syncStatus
    );
  }

  async getAll(): Promise<Expense[]> {
    const rows = db.getAllSync<ExpenseRow>(
      `SELECT * FROM expenses ORDER BY date DESC`
    );

    return rows.map((row) => expenseFrom(row));
  }

  async getBetween(from: Date, to: Date): Promise<Expense[]> {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    const rows = db.getAllSync<ExpenseRow>(
      `
        SELECT * FROM expenses
        WHERE date >= ? AND date <= ?
        ORDER BY date DESC
       `,
      start.toISOString(),
      end.toISOString()
    );

    return rows.map((row) => expenseFrom(row));
  }

  //
  // getTotal(expenses: Expense[]) {
  //   return expenses.reduce((acc, expense) => acc + expense.amount, 0);
  // }

}
