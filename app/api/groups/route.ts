import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { ensureProfile } from '@/lib/profile';
import { generateJoinCode, hashGroupPassword } from '@/lib/groupPassword';
import { log } from '@/lib/logger';

export async function GET() {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  try {
    const supabase = createAdminClient();
    const { data: memberships, error: membershipError } = await supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', auth.user.id);
    if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 });
    const ids = (memberships ?? []).map(m => m.group_id);
    if (ids.length === 0) return NextResponse.json([]);

    const { data, error } = await supabase.from('groups').select('*').in('id', ids).order('created_at');
    if (error) { await log('ERROR', 'groups GET failed', { error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    const roleByGroup = new Map((memberships ?? []).map(m => [m.group_id, m.role]));
    return NextResponse.json((data ?? []).map(group => ({ ...group, member_role: roleByGroup.get(group.id) })));
  } catch (e) {
    await log('ERROR', 'groups GET crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  try {
    await ensureProfile(auth.user);
    const { name, password } = await req.json() as { name: string; password: string };
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ error: 'Group password must be at least 6 characters' }, { status: 400 });
    const supabase = createAdminClient();
    const today = new Date().toISOString().split('T')[0];
    let data = null;
    let error = null;
    for (let i = 0; i < 4; i++) {
      const result = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          period_start: today,
          created_by: auth.user.id,
          join_code: generateJoinCode(),
          password_hash: await hashGroupPassword(password),
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
      if (!error) break;
      if (!error.message.toLowerCase().includes('duplicate')) break;
    }
    if (error || !data) { await log('ERROR', 'groups POST failed', { error: error?.message, name }); return NextResponse.json({ error: error?.message ?? 'Create failed' }, { status: 500 }); }
    const { error: memberError } = await supabase.from('group_members').insert({ group_id: data.id, user_id: auth.user.id, role: 'owner' });
    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });
    await log('INFO', 'Group created', { id: data.id, name: data.name, user_id: auth.user.id });
    data.member_role = 'owner';
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    await log('ERROR', 'groups POST crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
