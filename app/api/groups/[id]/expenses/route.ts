import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthed()) return unauth();
  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('group_id', id)
    .order('date', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthed()) return unauth();
  const { id } = await params;
  const { amount, category, description, date } = await req.json();
  if (!amount || !category) return NextResponse.json({ error: 'amount and category required' }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('expenses').insert({
    group_id: id,
    amount: Number(amount),
    category,
    description: description || null,
    date: date || new Date().toISOString().split('T')[0],
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
