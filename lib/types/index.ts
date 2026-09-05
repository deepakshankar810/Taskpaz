export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  salaryDay?: number;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
}

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskCategory = 'work' | 'personal' | 'health' | 'finance' | 'shopping' | 'other';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  projectId?: string;
  tags?: string[];
  completedAt?: Date;
  orderIndex?: number;
  recurringPattern?: 'none' | 'daily' | 'weekly' | 'monthly';
  timeSpent?: number;
  sharedWith?: string[];
  valueAmount?: number;
  savingsGoalId?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  dueDate?: Date;
  projectId?: string;
  tags?: string[];
  orderIndex?: number;
  recurringPattern?: 'none' | 'daily' | 'weekly' | 'monthly';
  sharedWith?: string[];
  valueAmount?: number;
  savingsGoalId?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus;
  timeSpent?: number;
  valueAmount?: number;
  savingsGoalId?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  content?: string; // HTML content from TipTap
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  content?: string;
  color?: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: Date;
  description: string;
  createdAt: Date;
}

export interface CreateTransactionInput {
  amount: number;
  type: TransactionType;
  category: string;
  date: Date;
  description: string;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  category: string;
  billingCycle: 'daily' | 'monthly' | 'yearly';
  billingInterval: number;
  nextBillingDate: Date;
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  color: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
}

// ---- New Feature Types ----

export interface JournalEntry {
  id: string;
  userId: string;
  date: string; // ISO date string YYYY-MM-DD
  content: string; // HTML from rich text editor
  mood?: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
  completedTaskIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJournalEntryInput {
  date: string;
  content: string;
  mood?: JournalEntry['mood'];
  completedTaskIds?: string[];
}

export interface TaskCollaborator {
  id: string;
  taskId: string;
  invitedEmail: string;
  access: 'read' | 'edit';
  status: 'pending' | 'accepted';
  createdAt: Date;
}
