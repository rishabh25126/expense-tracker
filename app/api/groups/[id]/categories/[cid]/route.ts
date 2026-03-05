import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ cid: string }> }) {
  if (!await isAuthed()) return unauth();
  const { cid } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from('categories').delete().eq('id', cid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
