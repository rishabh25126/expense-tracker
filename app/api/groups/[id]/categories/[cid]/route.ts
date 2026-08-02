import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { requireGroupMember } from '@/lib/groupAuth';
import { log } from '@/lib/logger';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ cid: string }> }) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  try {
    const { cid } = await params;
    const supabase = createAdminClient();
    const { data: category } = await supabase.from('categories').select('group_id').eq('id', cid).single();
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    const member = await requireGroupMember(category.group_id, auth.user.id);
    if ('response' in member) return member.response;
    const { error } = await supabase.from('categories').delete().eq('id', cid);
    if (error) { await log('ERROR', 'category DELETE failed', { cid, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    await log('INFO', 'Category deleted', { cid });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    await log('ERROR', 'category DELETE crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
