import { Expense, ExpenseCategory, ExpenseNature } from "@/models/expense";
import { ExpenseRepository } from "./ExpenseRepository";
import { db } from "../storage/database";

type ExpenseRow = {
  id: string;
  amount: number;
  nature: string;
  category: string;
  description: string | null;
  date: string;
};

function expenseFrom(row: ExpenseRow) {
  return {
    id: row.id,
    amount: row.amount,
    nature: row.nature as ExpenseNature,
    category: row.category as ExpenseCategory,
    description: row.description ?? undefined,
    date: new Date(row.date),
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
    const rows = db.getAllSync<ExpenseRow>(
      `SELECT * FROM expenses ORDER BY date DESC`
    );

    return rows.map((row) => expenseFrom(row));
  }

  async getBetween(from: Date, to: Date): Promise<Expense[]> {
    const rows = db.getAllSync<ExpenseRow>(
      `
        SELECT * FROM expenses
        WHERE date >= ? AND date <= ?
        ORDER BY date DESC
       `,
      from.toISOString(),
      to.toISOString()
    );
    
    return rows.map((row) => expenseFrom(row));
  }

  //
  // getTotal(expenses: Expense[]) {
  //   return expenses.reduce((acc, expense) => acc + expense.amount, 0);
  // }

}
