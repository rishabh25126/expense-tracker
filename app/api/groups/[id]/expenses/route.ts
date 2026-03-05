import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';
import { log } from '@/lib/logger';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthed()) return unauth();
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('group_id', id)
      .order('date', { ascending: false });
    if (error) { await log('ERROR', 'expenses GET failed', { group_id: id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json(data ?? []);
  } catch (e) {
    await log('ERROR', 'expenses GET crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthed()) return unauth();
  try {
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
    if (error) { await log('ERROR', 'expenses POST failed', { group_id: id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    await log('INFO', 'Expense created', { id: data.id, group_id: id, amount: data.amount, category: data.category });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    await log('ERROR', 'expenses POST crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
