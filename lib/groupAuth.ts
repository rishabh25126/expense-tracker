import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type GroupRole = 'owner' | 'member';

export type GroupMembership = {
  group_id: string;
  user_id: string;
  role: GroupRole;
  app_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
};

export async function getGroupMembership(groupId: string, userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as GroupMembership;
}

export async function requireGroupMember(groupId: string, userId: string) {
  const membership = await getGroupMembership(groupId, userId);
  if (!membership) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { membership };
}

export async function requireGroupOwner(groupId: string, userId: string) {
  const result = await requireGroupMember(groupId, userId);
  if ('response' in result) return result;
  if (result.membership.role !== 'owner') {
    return { response: NextResponse.json({ error: 'Owner access required' }, { status: 403 }) };
  }
  return result;
}
