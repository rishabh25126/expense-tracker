import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';
import { log } from '@/lib/logger';
import { isCategoryIconId } from '@/lib/categoryIcons';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  if (!await isAuthed()) return unauth();
  try {
    const { id, cid } = await params;
    const { icon } = await req.json() as { icon?: string };
    if (!isCategoryIconId(icon)) return NextResponse.json({ error: 'Choose a valid icon' }, { status: 400 });
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('categories').update({ icon }).eq('id', cid).eq('group_id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    await log('ERROR', 'category PATCH crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ cid: string }> }) {
  if (!await isAuthed()) return unauth();
  try {
    const { cid } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase.from('categories').delete().eq('id', cid);
    if (error) { await log('ERROR', 'category DELETE failed', { cid, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    await log('INFO', 'Category deleted', { cid });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    await log('ERROR', 'category DELETE crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
