import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';
import { log } from '@/lib/logger';

type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthed()) return unauth();

  try {
    const { id } = await params;
    const { deviceId, subscription } = await req.json() as {
      deviceId?: string;
      subscription?: PushSubscriptionPayload;
    };

    if (!deviceId || !subscription?.endpoint) {
      return NextResponse.json({ error: 'deviceId and subscription are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const payload = {
      group_id: id,
      device_id: deviceId,
      endpoint: subscription.endpoint,
      subscription,
      enabled: true,
      user_agent: req.headers.get('user-agent'),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(payload, { onConflict: 'group_id,device_id' });

    if (error) {
      await log('ERROR', 'push subscription upsert failed', { group_id: id, error: error.message });
      return NextResponse.json({ error: 'Failed to save push subscription' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    await log('ERROR', 'push subscription POST crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthed()) return unauth();

  try {
    const { id } = await params;
    const { deviceId, endpoint } = await req.json() as { deviceId?: string; endpoint?: string };

    if (!deviceId && !endpoint) {
      return NextResponse.json({ error: 'deviceId or endpoint is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    let query = supabase.from('push_subscriptions').delete().eq('group_id', id);

    if (endpoint) query = query.eq('endpoint', endpoint);
    else if (deviceId) query = query.eq('device_id', deviceId);

    const { error } = await query;
    if (error) {
      await log('ERROR', 'push subscription delete failed', { group_id: id, error: error.message });
      return NextResponse.json({ error: 'Failed to delete push subscription' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    await log('ERROR', 'push subscription DELETE crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
