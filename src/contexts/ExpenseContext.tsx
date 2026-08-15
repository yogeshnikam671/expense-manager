import { Expense, ExpenseCategory, ExpenseNature } from "@/models/expense";
import {
  ExpenseCursor,
  ExpenseHistorySummary,
  ExpensePage,
} from "@/models/expenseSummary";
import { ExpenseRepository } from "@/repositories/ExpenseRepository";
import { SQLiteExpenseRepository } from "@/repositories/SQLiteExpenseRepository";
import { createContext, ReactNode, useContext } from "react";

type ExpenseContextValue = {
  saveExpense: (expense: Expense) => Promise<void>;
  getHistorySummary: (from: Date, to: Date) => Promise<ExpenseHistorySummary>;
  getCategoryPage: (
    from: Date,
    to: Date,
    nature: ExpenseNature,
    category: ExpenseCategory,
    cursor?: ExpenseCursor
  ) => Promise<ExpensePage>;
};

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

const repository: ExpenseRepository = new SQLiteExpenseRepository();
const contextValue: ExpenseContextValue = {
  saveExpense: (expense) => repository.save(expense),
  getHistorySummary: (from, to) => repository.getHistorySummary(from, to),
  getCategoryPage: (from, to, nature, category, cursor) =>
    repository.getCategoryPage(from, to, nature, category, cursor),
};

export function ExpenseProvider({ children }: { children: ReactNode }) {
  return (
    <ExpenseContext.Provider value={contextValue}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);

  if (!context) {
    throw new Error("useExpenses must be used inside ExpenseProvider");
  }

  return context;
}
