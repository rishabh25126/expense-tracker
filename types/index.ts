export type Group = {
  id: string;
  name: string;
  period_start: string; // YYYY-MM-DD
  prev_period_start: string | null;
  created_at: string;
};

export type Expense = {
  id: string;
  group_id: string;
  amount: number;
  category: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  created_at: string;
};

export type ParsedExpense = {
  amount: number | null;
  category: string | null;
  date: string | null;
  description: string;
};

export type Category = {
  id: string;
  group_id: string;
  name: string;
};

export type PushSubscriptionRecord = {
  id: string;
  group_id: string;
  device_id: string;
  endpoint: string;
  enabled: boolean;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};
