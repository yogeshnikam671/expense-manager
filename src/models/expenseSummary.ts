import { Expense, ExpenseCategory, ExpenseNature } from "@/models/expense";

export type CategorySpendSummary = {
  nature: ExpenseNature;
  category: ExpenseCategory;
  total: number;
  count: number;
};

export type ExpenseHistorySummary = {
  total: number;
  count: number;
  categories: CategorySpendSummary[];
};

export type ExpenseCursor = Pick<Expense, "date" | "id"> & {
  revision: number;
};

export type ExpensePage = {
  items: Expense[];
  nextCursor?: ExpenseCursor;
  total?: number;
  reset?: boolean;
};
