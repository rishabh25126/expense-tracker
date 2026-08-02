import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
