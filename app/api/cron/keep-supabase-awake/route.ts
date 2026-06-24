import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const EXPECTED_SCHEDULE = '30 3 * * *';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const schedule = req.headers.get('x-vercel-cron-schedule');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (schedule !== EXPECTED_SCHEDULE) {
    return NextResponse.json({ error: 'Invalid cron schedule' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('groups')
      .select('id', { head: true })
      .limit(1);

    if (error) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
