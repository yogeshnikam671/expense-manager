export enum ExpenseNature {
  Essential = "Essential",
  Emergency = "Emergency",
  Discretionary = "Discretionary",
}

export enum ExpenseCategory {
  Housing = "Housing",
  Food = "Food",
  Transport = "Transport",
  Healthcare = "Healthcare",
  Utilities = "Utilities",
  Entertainment = "Entertainment",
  Shopping = "Shopping",
  Travel = "Travel",
  Other = "Other",
}

export type Expense = {
  id: string;
  amount: number;
  nature: ExpenseNature;
  category: ExpenseCategory;
  description?: string;
  date: Date;
};
