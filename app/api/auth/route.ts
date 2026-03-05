import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json() as { username: string; password: string };
    if (username !== process.env.APP_USERNAME || password !== process.env.APP_PASSWORD) {
      await log('WARN', 'Failed login attempt', { username });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    await log('INFO', 'Login successful', { username });
    const res = NextResponse.json({ ok: true });
    res.cookies.set('app_session', '1', { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: '/' });
    return res;
  } catch (e) {
    await log('ERROR', 'auth POST crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await log('INFO', 'Logout');
    const res = NextResponse.json({ ok: true });
    res.cookies.delete('app_session');
    res.cookies.delete('last_group');
    return res;
  } catch (e) {
    await log('ERROR', 'auth DELETE crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
