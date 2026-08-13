import { Expense } from "@/models/expense";

export interface ExpenseRepository {
  save(expense: Expense): Promise<void>;
  getAll(): Promise<Expense[]>;
}
