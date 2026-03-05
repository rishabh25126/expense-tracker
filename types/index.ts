export type Expense = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string;
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
  user_id: string;
  name: string;
};
