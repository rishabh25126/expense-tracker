import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { isAuthed, unauth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!await isAuthed()) return unauth();
  try {
    const { level, message, metadata } = await req.json() as { level?: string; message?: string; metadata?: unknown };
    if (!['INFO', 'WARN', 'ERROR'].includes(level ?? '') || !message?.trim()) {
      return NextResponse.json({ error: 'Invalid level or message' }, { status: 400 });
    }
    if (!await log(level as 'INFO' | 'WARN' | 'ERROR', message, metadata)) {
      return NextResponse.json({ error: 'Log storage unavailable' }, { status: 503 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to write logs' }, { status: 500 });
  }
}
