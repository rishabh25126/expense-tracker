import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';
import { log } from '@/lib/logger';

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
