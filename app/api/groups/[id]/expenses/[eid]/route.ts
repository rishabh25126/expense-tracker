import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { requireGroupMember } from '@/lib/groupAuth';
import { log } from '@/lib/logger';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eid: string }> }) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  try {
    const { eid } = await params;
    const body = await req.json();
    const supabase = createAdminClient();
    const { data: existing } = await supabase.from('expenses').select('group_id, created_by').eq('id', eid).single();
    if (!existing) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    const member = await requireGroupMember(existing.group_id, auth.user.id);
    if ('response' in member) return member.response;
    if (existing.created_by !== auth.user.id && member.membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only the creator or group owner can update this expense' }, { status: 403 });
    }
    const payload = {
      amount: body.amount != null ? Number(body.amount) : undefined,
      category: body.category,
      description: body.description || null,
      date: body.date,
    };
    const { data, error } = await supabase.from('expenses').update(payload).eq('id', eid).select().single();
    if (error) { await log('ERROR', 'expense PATCH failed', { eid, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    await log('INFO', 'Expense updated', { eid });
    return NextResponse.json(data);
  } catch (e) {
    await log('ERROR', 'expense PATCH crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ eid: string }> }) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  try {
    const { eid } = await params;
    const supabase = createAdminClient();
    const { data: existing } = await supabase.from('expenses').select('group_id, created_by').eq('id', eid).single();
    if (!existing) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    const member = await requireGroupMember(existing.group_id, auth.user.id);
    if ('response' in member) return member.response;
    if (existing.created_by !== auth.user.id && member.membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only the creator or group owner can delete this expense' }, { status: 403 });
    }
    const { error } = await supabase.from('expenses').delete().eq('id', eid);
    if (error) { await log('ERROR', 'expense DELETE failed', { eid, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    await log('INFO', 'Expense deleted', { eid });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    await log('ERROR', 'expense DELETE crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
