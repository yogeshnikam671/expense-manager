import { Expense } from "@/models/expense";
import { ExpenseRepository } from "@/repositories/ExpenseRepository";
import { SQLiteExpenseRepository } from "@/repositories/SQLiteExpenseRepository";
import {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";

type ExpenseContextValue = {
  expenses: Expense[];
  saveExpense: (expense: Expense) => Promise<void>;
  loadExpensesBetween: (from: Date, to: Date) => Promise<Expense[]>;
};

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

const repository: ExpenseRepository = new SQLiteExpenseRepository();

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  async function saveExpense(expense: Expense) {
    await repository.save(expense);
  }

  async function loadExpensesBetween(from: Date, to: Date) {
    const result = await repository.getBetween(from, to);
    setExpenses(result);
    return result;
  }

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        saveExpense,
        loadExpensesBetween,
      }}
    >
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
