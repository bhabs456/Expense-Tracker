export type Money = string | number;
export type TransactionType = "credit" | "debit";
export type Theme = "light" | "dark" | "system";
export interface Catalog {
  categories: Record<string, string[]>;
  payment_methods: string[];
  savings_sources: string[];
  tracking_start: string;
  today: string;
}
export interface Preferences {
  id: number;
  minimum_savings_percent: Money;
  stretch_savings_percent: Money;
  default_payment_method: string;
  theme: Theme;
  currency: string;
}
export type PreferencesInput = Omit<Preferences, "id" | "currency">;
export interface ExpenseInput {
  amount: Money;
  date: string;
  category: string;
  subcategory: string;
  payment_method: string;
  notes: string;
}
export interface BatchRow extends ExpenseInput {
  savings_funded: boolean;
}
export interface Refund {
  id: number;
  expense_id: number;
  amount: Money;
  date: string;
  notes: string;
}
export interface Expense extends ExpenseInput {
  id: number;
  subscription_id: number | null;
  refunded_amount: Money;
  net_amount: Money;
  refunds: Refund[];
}
export interface SavingsTransaction extends ExpenseInput {
  id: number;
  type: TransactionType;
  running_balance: Money;
}
export interface SavingsInput extends ExpenseInput {
  type: TransactionType;
}
export interface Confirmation {
  confirm_duplicates?: boolean;
  confirm_negative_savings?: boolean;
}
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
export interface Filters {
  search: string;
  start: string;
  end: string;
  category: string;
  payment_method: string;
  type: string;
}
export interface CategoryTotal {
  name: string;
  value: Money;
}
export interface MonthlySummary {
  month: string;
  budget: Money;
  spending: Money;
  remaining: Money;
  savings: Money;
  stipend_pending: boolean;
  usage_percent: Money;
  categories: CategoryTotal[];
}
export interface DashboardSummary extends MonthlySummary {
  today_spending: Money;
  recent: Expense[];
  accumulated_savings: Money;
  minimum_goal: Money;
  stretch_goal: Money;
  tracking_open: boolean;
}
export interface SavingsSummary {
  accumulated: Money;
  projected: Money;
  history: MonthlySummary[];
  settings: Preferences;
}
export interface AnalyticsSummary {
  selected: MonthlySummary;
  months: MonthlySummary[];
}
export interface CalendarSummary {
  items: Expense[];
  days: { date: string; total: Money }[];
}
export interface StipendInput {
  earning_month: string;
  expected_amount: Money;
  received_amount: Money;
  received_date: string | null;
  confirmed: boolean;
}
export interface Stipend extends StipendInput {
  id: number;
}
export interface SubscriptionInput {
  name: string;
  amount: Money;
  start_date: string;
  category: string;
  payment_method: string;
  first_payment_made: boolean;
  existing_expense_id: number | null;
}
export type SubscriptionEdit = Pick<
  SubscriptionInput,
  "name" | "amount" | "category" | "payment_method"
>;
export interface Subscription extends SubscriptionEdit {
  id: number;
  start_date: string;
  billing_day: number;
  billing_interval_days: number;
  first_payment_status: "paid" | "not_recorded" | "deleted";
  status: "active" | "paused" | "canceled";
  next_charge: string | null;
}
export interface BackupFile {
  name: string;
  bytes: number;
}
export interface RestoreResult {
  restored: boolean;
  safety_backup: string;
  counts: Record<string, number>;
}
