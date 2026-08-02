import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyGroupPassword } from '@/lib/groupPassword';
import { ensureProfile } from '@/lib/profile';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;

  const { joinCode, password } = await req.json() as { joinCode: string; password: string };
  if (!joinCode?.trim() || !password) return NextResponse.json({ error: 'Group code and password required' }, { status: 400 });

  await ensureProfile(auth.user);
  const supabase = createAdminClient();
  const { data: group, error } = await supabase
    .from('groups')
    .select('*')
    .eq('join_code', joinCode.trim().toUpperCase())
    .single();

  if (error || !group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  if (!await verifyGroupPassword(password, group.password_hash)) {
    await log('WARN', 'Group join failed', { join_code: joinCode, user_id: auth.user.id });
    return NextResponse.json({ error: 'Invalid group password' }, { status: 401 });
  }

  const { error: memberError } = await supabase
    .from('group_members')
    .upsert({ group_id: group.id, user_id: auth.user.id, role: 'member' }, { onConflict: 'group_id,user_id', ignoreDuplicates: true });

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });
  await log('INFO', 'Group joined', { group_id: group.id, user_id: auth.user.id });
  return NextResponse.json({ ...group, member_role: 'member' });
}
