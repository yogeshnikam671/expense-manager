import { Expense, ExpenseNature } from "@/models/expense";
import { CategorySpendSummary } from "@/models/expenseSummary";

export function getTotalSpend(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

export function filterByNature(
  expenses: Expense[],
  nature: ExpenseNature
): Expense[] {
  return expenses.filter((expense) => expense.nature === nature);
}

export function getCategoryBreakdown(
  expenses: Expense[]
): CategorySpendSummary[] {
  const map = new Map<string, CategorySpendSummary>();

  for (const expense of expenses) {
    const key = `${expense.nature}:${expense.category}`;

    const existing = map.get(key);

    if (existing) {
      existing.total += expense.amount;
      existing.count += 1;
    } else {
      map.set(key, {
        nature: expense.nature,
        category: expense.category,
        total: expense.amount,
        count: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
