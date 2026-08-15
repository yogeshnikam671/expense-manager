export enum ExpenseNature {
  Essential = "Essential",
  Discretionary = "Discretionary",
  Emergency = "Emergency",
}

export enum ExpenseCategory {
  Bills = "Bills",
  Food = "Food",
  Shopping = "Shopping",
  Investment = "Investment",
  Utilities = "Utilities",
  Entertainment = "Entertainment",
  Healthcare = "Healthcare",
  Travel = "Travel",
  Housing = "Housing",
  Other = "Other",
}

export const EXPENSE_NATURES = Object.values(ExpenseNature);
export const EXPENSE_CATEGORIES = Object.values(ExpenseCategory);

export enum SyncStatus {
  Synced = "SYNCED",
  PendingCreate = "PENDING_CREATE",
  PendingUpdate = "PENDING_UPDATE",
  PendingDelete = "PENDING_DELETE",
}

export type Expense = {
  id: string;
  amount: number;
  nature: ExpenseNature;
  category: ExpenseCategory;
  labels: string[];
  description?: string;
  date: Date;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  syncStatus: SyncStatus;
};

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
