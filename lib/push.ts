import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

let configured = false;

function configureWebPush() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export async function sendPushToUsers(userIds: string[], payload: { title: string; body: string; url: string; tag?: string }) {
  if (userIds.length === 0 || !configureWebPush()) return;

  const supabase = createAdminClient();
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .in('user_id', userIds)
    .eq('enabled', true);

  await Promise.all((subscriptions ?? []).map(async (record: { id: string; subscription: webpush.PushSubscription }) => {
    try {
      await webpush.sendNotification(record.subscription, JSON.stringify(payload));
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', record.id);
      }
    }
  }));
}
