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
  description?: string;
  date: Date;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  syncStatus: SyncStatus;
};
