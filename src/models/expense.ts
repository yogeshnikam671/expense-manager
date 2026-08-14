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
