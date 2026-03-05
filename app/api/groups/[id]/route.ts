import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';
import { log } from '@/lib/logger';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthed()) return unauth();
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('groups').select('*').eq('id', id).single();
    if (error) { await log('ERROR', 'group GET failed', { id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 404 }); }
    return NextResponse.json(data);
  } catch (e) {
    await log('ERROR', 'group GET crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH action=start_period: saves current period_start as prev, sets period_start=today
// PATCH action=undo_period: restores prev_period_start
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthed()) return unauth();
  try {
    const { id } = await params;
    const { action } = await req.json() as { action: string };
    const supabase = createAdminClient();

    if (action === 'start_period') {
      const { data: current } = await supabase.from('groups').select('period_start').eq('id', id).single();
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('groups')
        .update({ prev_period_start: current?.period_start, period_start: today })
        .eq('id', id)
        .select()
        .single();
      if (error) { await log('ERROR', 'start_period failed', { id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
      await log('INFO', 'New period started', { id, prev: current?.period_start, new: today });
      return NextResponse.json(data);
    }

    if (action === 'undo_period') {
      const { data: current } = await supabase.from('groups').select('prev_period_start').eq('id', id).single();
      if (!current?.prev_period_start) return NextResponse.json({ error: 'No previous period to restore' }, { status: 400 });
      const { data, error } = await supabase
        .from('groups')
        .update({ period_start: current.prev_period_start, prev_period_start: null })
        .eq('id', id)
        .select()
        .single();
      if (error) { await log('ERROR', 'undo_period failed', { id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
      await log('INFO', 'Period undone', { id, restored: current.prev_period_start });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    await log('ERROR', 'group PATCH crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
