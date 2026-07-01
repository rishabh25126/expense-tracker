import webpush, { PushSubscription } from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { log } from '@/lib/logger';

type PushSubscriptionRow = {
  id: string;
  group_id: string;
  device_id: string;
  endpoint: string;
  subscription: PushSubscription;
};

type ExpenseNotificationInput = {
  amount: number;
  category: string;
  description: string | null;
  groupId: string;
  groupName: string;
  originDeviceId: string | null;
};

let vapidConfigured = false;

function ensurePushConfigured() {
  if (vapidConfigured) return true;

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function isPushConfigured() {
  return Boolean(
    process.env.VAPID_SUBJECT &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendExpenseAddedPush(input: ExpenseNotificationInput) {
  if (!ensurePushConfigured()) return;

  const supabase = createAdminClient();
  let query = supabase
    .from('push_subscriptions')
    .select('id, group_id, device_id, endpoint, subscription')
    .eq('group_id', input.groupId)
    .eq('enabled', true);

  if (input.originDeviceId) {
    query = query.neq('device_id', input.originDeviceId);
  }

  const { data, error } = await query;

  if (error) {
    await log('ERROR', 'push subscriptions lookup failed', {
      group_id: input.groupId,
      error: error.message,
    });
    return;
  }

  const rows = (data ?? []) as PushSubscriptionRow[];
  if (rows.length === 0) return;

  const bodyParts = [`${input.category}`, `₹${Number(input.amount).toLocaleString('en-IN')}`];
  if (input.description) bodyParts.push(input.description);

  const payload = JSON.stringify({
    title: `Expense added in ${input.groupName}`,
    body: bodyParts.join(' · '),
    url: `/groups/${input.groupId}/expenses`,
    tag: `group-${input.groupId}-expense`,
  });

  const staleIds: string[] = [];

  await Promise.all(rows.map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription, payload);
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : undefined;

      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(row.id);
        return;
      }

      await log('ERROR', 'push notification failed', {
        group_id: input.groupId,
        endpoint: row.endpoint,
        statusCode,
        error: String(error),
      });
    }
  }));

  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds);
  }
}
