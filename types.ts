
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER'
}

export interface ScheduledBudgetChange {
  id: string;
  date: string; // ISO YYYY-MM-DD
  amount: number;
}

export type CategoryType = 'expense' | 'income' | 'investment';

export interface Category {
  id: string;
  name: string;
  type: CategoryType; // New field to distinguish category purpose
  monthlyBudget: number; // Target for expenses/investments
  rollover: number; 
  allocationRule: number; 
  color: string;
  startDate?: string;
  scheduledChanges?: ScheduledBudgetChange[];
  linkedPaymentIndex?: number; // 1-based index. If set, this category is ONLY funded by this payment (at 100%).
}

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  categoryId?: string; 
  accountId?: string; // Links transaction to a specific bank account
  type: TransactionType;
  parentTransactionId?: string; // Links allocation transactions back to the income source
  
  // Transfer Logic
  transferDirection?: 'in' | 'out';
  transferPeerId?: string; // ID of the matching transaction in the other account
}

export type PaymentFrequency = 'monthly' | 'semi-monthly' | 'weekly';

export interface AllocationRule {
  paymentIndex: number;
  percentage: number;
  amount: number; 
  name?: string; 
  note?: string; 
  isUncertain?: boolean; // New field: if true, amount is an estimate/variable
}

export interface IncomeSource {
  id: string;
  name: string;
  currency: string;
  estimatedAmount: number;
  frequency: PaymentFrequency;
  allocations: AllocationRule[];
  openingBalance?: number; // Deprecated in favor of Account.initialBalance, kept for migration
}

export interface AppState {
  categories: Category[];
  transactions: Transaction[];
  incomeSource: IncomeSource;
  currentMonth: string; 
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export type SyncStatus = 'synced' | 'saving' | 'error' | 'local';

export interface FullBackupData {
    categories: Category[];
    transactions: Transaction[];
    incomeSources: IncomeSource[];
    accounts: Account[];
    lastUpdated: string;
}