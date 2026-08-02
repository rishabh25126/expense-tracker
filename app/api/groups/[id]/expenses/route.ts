import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { requireGroupMember } from '@/lib/groupAuth';
import { ensureProfile, firstName } from '@/lib/profile';
import { notifyExpenseCreated } from '@/lib/notifications';
import { log } from '@/lib/logger';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const member = await requireGroupMember(id, auth.user.id);
    if ('response' in member) return member.response;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('group_id', id)
      .order('date', { ascending: false });
    if (error) { await log('ERROR', 'expenses GET failed', { group_id: id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    const creatorIds = [...new Set((data ?? []).map(exp => exp.created_by).filter(Boolean))];
    const { data: profiles } = creatorIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, email, color').in('id', creatorIds)
      : { data: [] };
    const profileById = new Map((profiles ?? []).map(profile => [profile.id, profile]));
    return NextResponse.json((data ?? []).map(exp => {
      const profile = profileById.get(exp.created_by);
      return {
        ...exp,
        creator_name: firstName(profile),
        creator_email: profile?.email,
        creator_color: profile?.color || '#6b7280',
      };
    }));
  } catch (e) {
    await log('ERROR', 'expenses GET crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    await ensureProfile(auth.user);
    const member = await requireGroupMember(id, auth.user.id);
    if ('response' in member) return member.response;
    const { amount, category, description, date } = await req.json();
    if (!amount || !category) return NextResponse.json({ error: 'amount and category required' }, { status: 400 });
    const supabase = createAdminClient();
    const { data: group } = await supabase.from('groups').select('name').eq('id', id).single();
    const { data, error } = await supabase.from('expenses').insert({
      group_id: id,
      created_by: auth.user.id,
      amount: Number(amount),
      category,
      description: description || null,
      date: date || new Date().toISOString().split('T')[0],
    }).select().single();
    if (error) { await log('ERROR', 'expenses POST failed', { group_id: id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    await notifyExpenseCreated({
      groupId: id,
      groupName: group?.name ?? 'Group',
      actorId: auth.user.id,
      expenseId: data.id,
      amount: Number(data.amount),
      category: data.category,
      description: data.description,
    });
    await log('INFO', 'Expense created', { id: data.id, group_id: id, user_id: auth.user.id, amount: data.amount, category: data.category });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    await log('ERROR', 'expenses POST crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
