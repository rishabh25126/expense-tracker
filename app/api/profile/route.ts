import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { ensureProfile } from '@/lib/profile';

const ALLOWED_COLORS = new Set(['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899']);

export async function GET() {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  const profile = await ensureProfile(auth.user);
  return NextResponse.json({ user: { id: auth.user.id, email: auth.user.email }, profile });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;

  const body = await req.json() as { full_name?: string; color?: string; password?: string };
  const update: Record<string, string> = { updated_at: new Date().toISOString() };

  if (typeof body.full_name === 'string') update.full_name = body.full_name.trim();
  if (body.color && ALLOWED_COLORS.has(body.color)) update.color = body.color;

  const supabaseAdmin = createAdminClient();
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update(update)
    .eq('id', auth.user.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.password) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    const supabase = await createClient();
    const { error: passwordError } = await supabase.auth.updateUser({ password: body.password });
    if (passwordError) return NextResponse.json({ error: passwordError.message }, { status: 400 });
  }

  return NextResponse.json({ profile });
}
