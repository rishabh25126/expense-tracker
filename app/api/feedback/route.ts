import { NextRequest, NextResponse } from 'next/server';
import { appendFile } from 'fs/promises';
import { join } from 'path';
import { isAuthed, unauth } from '@/lib/auth';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  if (!await isAuthed()) return unauth();

  const { message } = await req.json() as { message: string };
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message.trim()}\n`;

  try {
    await appendFile(join(process.cwd(), 'feedback.txt'), line, 'utf8');
    await log('INFO', 'Feedback received', { length: message.trim().length });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await log('ERROR', 'Failed to write feedback', { error: String(e) });
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
