import { Expense } from "@/models/expense";

export interface ExpenseRepository {
  save(expense: Expense): Promise<void>;
  getAll(): Promise<Expense[]>;
  getBetween(from: Date, to: Date): Promise<Expense[]>;
}
