import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';
import { log } from '@/lib/logger';

const INDIA_TIME_ZONE = 'Asia/Kolkata';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayInIndia() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

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

// PATCH action=start_period: saves current period_start as prev, sets the selected period start
// PATCH action=undo_period: restores prev_period_start
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthed()) return unauth();
  try {
    const { id } = await params;
    const body = await req.json() as { action: string; name?: string; periodStart?: unknown };
    const { action, name, periodStart } = body;
    const supabase = createAdminClient();

    if (action === 'start_period') {
      if (!isValidISODate(periodStart)) {
        return NextResponse.json({ error: 'Choose a valid period start date.' }, { status: 400 });
      }
      if (periodStart > todayInIndia()) {
        return NextResponse.json({ error: 'New period cannot start in the future.' }, { status: 400 });
      }
      const { data: current, error: currentError } = await supabase.from('groups').select('period_start').eq('id', id).single();
      if (currentError || !current) {
        await log('ERROR', 'start_period group fetch failed', { id, error: currentError?.message });
        return NextResponse.json({ error: 'Tracker not found.' }, { status: 404 });
      }
      if (periodStart <= current.period_start) {
        return NextResponse.json({ error: 'New period must start after the current period.' }, { status: 400 });
      }
      const { data, error } = await supabase
        .from('groups')
        .update({ prev_period_start: current.period_start, period_start: periodStart })
        .eq('id', id)
        .select()
        .single();
      if (error) { await log('ERROR', 'start_period failed', { id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
      await log('INFO', 'New period started', { id, prev: current.period_start, new: periodStart });
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

    if (action === 'rename') {
      if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
      const { data, error } = await supabase
        .from('groups')
        .update({ name: name.trim() })
        .eq('id', id)
        .select()
        .single();
      if (error) { await log('ERROR', 'rename group failed', { id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
      await log('INFO', 'Group renamed', { id, name: data.name });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    await log('ERROR', 'group PATCH crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthed()) return unauth();
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) { await log('ERROR', 'group DELETE failed', { id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    await log('INFO', 'Group deleted', { id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await log('ERROR', 'group DELETE crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
