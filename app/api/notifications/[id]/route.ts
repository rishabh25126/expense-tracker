import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', auth.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
