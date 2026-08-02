import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { requireGroupMember } from '@/lib/groupAuth';
import { log } from '@/lib/logger';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const member = await requireGroupMember(id, auth.user.id);
    if ('response' in member) return member.response;
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('categories').select('*').eq('group_id', id).order('name');
    if (error) { await log('ERROR', 'categories GET failed', { group_id: id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json(data ?? []);
  } catch (e) {
    await log('ERROR', 'categories GET crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const member = await requireGroupMember(id, auth.user.id);
    if ('response' in member) return member.response;
    const { name } = await req.json() as { name: string };
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('categories').insert({ group_id: id, name: name.trim(), created_by: auth.user.id }).select().single();
    if (error) { await log('ERROR', 'categories POST failed', { group_id: id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    await log('INFO', 'Category created', { id: data.id, group_id: id, name: data.name });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    await log('ERROR', 'categories POST crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
