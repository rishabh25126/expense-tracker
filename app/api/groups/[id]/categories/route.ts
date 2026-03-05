import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';
import { log } from '@/lib/logger';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthed()) return unauth();
  try {
    const { id } = await params;
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
  if (!await isAuthed()) return unauth();
  try {
    const { id } = await params;
    const { name } = await req.json() as { name: string };
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('categories').insert({ group_id: id, name: name.trim() }).select().single();
    if (error) { await log('ERROR', 'categories POST failed', { group_id: id, error: error.message }); return NextResponse.json({ error: error.message }, { status: 500 }); }
    await log('INFO', 'Category created', { id: data.id, group_id: id, name: data.name });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    await log('ERROR', 'categories POST crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
