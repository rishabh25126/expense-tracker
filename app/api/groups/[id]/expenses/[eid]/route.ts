import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eid: string }> }) {
  if (!await isAuthed()) return unauth();
  const { eid } = await params;
  const body = await req.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('expenses').update(body).eq('id', eid).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ eid: string }> }) {
  if (!await isAuthed()) return unauth();
  const { eid } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from('expenses').delete().eq('id', eid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
