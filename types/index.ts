export type Group = {
  id: string;
  name: string;
  join_code: string;
  created_by: string;
  member_role?: 'owner' | 'member';
  period_start: string; // YYYY-MM-DD
  prev_period_start: string | null;
  created_at: string;
};

export type Expense = {
  id: string;
  group_id: string;
  created_by: string;
  creator_name?: string;
  creator_email?: string;
  creator_color?: string;
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
  created_by?: string | null;
  name: string;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

export type MeResponse = {
  user: {
    id: string;
    email?: string | null;
  };
  profile: Profile | null;
};

export type NotificationRecord = {
  id: string;
  group_id: string;
  recipient_id: string;
  actor_id: string | null;
  expense_id: string | null;
  type: 'expense_created';
  title: string;
  body: string;
  url: string;
  read_at: string | null;
  created_at: string;
};
