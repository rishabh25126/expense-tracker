import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';

export async function GET() {
  if (!await isAuthed()) return unauth();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('groups').select('*').order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await isAuthed()) return unauth();
  const { name } = await req.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('groups')
    .insert({ name: name.trim(), period_start: today })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
