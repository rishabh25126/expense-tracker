import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json() as { username: string; password: string };
  if (username !== process.env.APP_USERNAME || password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('app_session', '1', { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: '/' });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('app_session');
  res.cookies.delete('last_group');
  return res;
}
