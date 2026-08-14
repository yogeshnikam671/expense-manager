import { ExpenseCategory, ExpenseNature } from "@/models/expense";

export type CategorySpendSummary = {
  nature: ExpenseNature;
  category: ExpenseCategory;
  total: number;
  count: number;
};
