import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureProfile } from '@/lib/profile';

type PushBody = {
  deviceId?: string;
  endpoint?: string;
  subscription?: PushSubscriptionJSON;
};

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  await ensureProfile(auth.user);

  const body = await req.json() as PushBody;
  if (!body.deviceId || !body.subscription?.endpoint) {
    return NextResponse.json({ error: 'deviceId and subscription required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: auth.user.id,
    device_id: body.deviceId,
    endpoint: body.subscription.endpoint,
    subscription: body.subscription,
    enabled: true,
    user_agent: req.headers.get('user-agent'),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,device_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;

  const body = await req.json().catch(() => ({})) as PushBody;
  const supabase = createAdminClient();
  let query = supabase.from('push_subscriptions').delete().eq('user_id', auth.user.id);

  if (body.deviceId) query = query.eq('device_id', body.deviceId);
  else if (body.endpoint) query = query.eq('endpoint', body.endpoint);
  else return NextResponse.json({ error: 'deviceId or endpoint required' }, { status: 400 });

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
