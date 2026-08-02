import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/profile';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email: string; password: string };
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      await log('WARN', 'Failed login attempt', { email });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    await ensureProfile(data.user);
    await log('INFO', 'Login successful', { user_id: data.user.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await log('ERROR', 'auth POST crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    await log('INFO', 'Logout');
    const res = NextResponse.json({ ok: true });
    res.cookies.delete('last_group');
    return res;
  } catch (e) {
    await log('ERROR', 'auth DELETE crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
