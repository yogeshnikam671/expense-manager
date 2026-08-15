import { Expense, ExpenseCategory, ExpenseNature } from "@/models/expense";
import {
  ExpenseCursor,
  ExpenseHistorySummary,
  ExpensePage,
} from "@/models/expenseSummary";

export interface ExpenseRepository {
  save(expense: Expense): Promise<void>;
  applySync(expenses: Expense[]): Promise<void>;
  getAll(): Promise<Expense[]>;
  getHistorySummary(from: Date, to: Date): Promise<ExpenseHistorySummary>;
  getCategoryPage(
    from: Date,
    to: Date,
    nature: ExpenseNature,
    category: ExpenseCategory,
    cursor?: ExpenseCursor,
    limit?: number
  ): Promise<ExpensePage>;
}
