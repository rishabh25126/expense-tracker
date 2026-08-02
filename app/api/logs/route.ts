import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;

  try {
    const { level, message, metadata } = await req.json();
    if (!level || !message) {
      return NextResponse.json({ error: 'Missing level or message' }, { status: 400 });
    }
    await log(level, message, metadata);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to write logs' }, { status: 500 });
  }
}
