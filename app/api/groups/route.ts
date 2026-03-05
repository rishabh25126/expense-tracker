import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';
import { log } from '@/lib/logger';

export async function GET() {
  if (!await isAuthed()) return unauth();
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('groups').select('*').order('created_at');
    if (error) { await log('ERROR', 'groups GET failed', { error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json(data ?? []);
  } catch (e) {
    await log('ERROR', 'groups GET crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await isAuthed()) return unauth();
  try {
    const { name } = await req.json() as { name: string };
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const supabase = createAdminClient();
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('groups')
      .insert({ name: name.trim(), period_start: today })
      .select()
      .single();
    if (error) { await log('ERROR', 'groups POST failed', { error: error.message, name }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    await log('INFO', 'Group created', { id: data.id, name: data.name });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    await log('ERROR', 'groups POST crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
