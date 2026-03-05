import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';
import { log } from '@/lib/logger';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eid: string }> }) {
  if (!await isAuthed()) return unauth();
  try {
    const { eid } = await params;
    const body = await req.json();
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('expenses').update(body).eq('id', eid).select().single();
    if (error) { await log('ERROR', 'expense PATCH failed', { eid, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    await log('INFO', 'Expense updated', { eid });
    return NextResponse.json(data);
  } catch (e) {
    await log('ERROR', 'expense PATCH crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ eid: string }> }) {
  if (!await isAuthed()) return unauth();
  try {
    const { eid } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase.from('expenses').delete().eq('id', eid);
    if (error) { await log('ERROR', 'expense DELETE failed', { eid, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    await log('INFO', 'Expense deleted', { eid });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    await log('ERROR', 'expense DELETE crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
