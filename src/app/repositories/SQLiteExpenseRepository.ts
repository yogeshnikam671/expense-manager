import { Expense } from "@/models/expense";
import { ExpenseRepository } from "./ExpenseRepository";
import { db } from "../storage/database";

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
        date
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      expense.id,
      expense.amount,
      expense.nature,
      expense.category,
      expense.description ?? null,
      expense.date.toISOString()
    );
  }

  async getAll(): Promise<Expense[]> {
    return [];
  }
}
