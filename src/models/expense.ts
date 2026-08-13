export enum ExpenseNature {
  Essential = "ESSENTIAL",
  Emergency = "EMERGENCY",
  Discretionary = "DISCRETIONARY",
}

export enum ExpenseCategory {
  Housing = "HOUSING",
  Food = "FOOD",
  Transport = "TRANSPORT",
  Healthcare = "HEALTHCARE",
  Utilities = "UTILITIES",
  Entertainment = "ENTERTAINMENT",
  Shopping = "SHOPPING",
  Travel = "TRAVEL",
  Other = "OTHER",
}

export type Expense = {
  id: string;
  amount: number;
  nature: ExpenseNature;
  category: ExpenseCategory;
  description?: string;
  date: Date;
};
