import { createAdminClient } from '@/lib/supabase/admin';
import { displayName } from '@/lib/profile';
import { sendPushToUsers } from '@/lib/push';

type ExpenseNotificationInput = {
  groupId: string;
  groupName: string;
  actorId: string;
  expenseId: string;
  amount: number;
  category: string;
  description?: string | null;
};

export async function notifyExpenseCreated(input: ExpenseNotificationInput) {
  const supabase = createAdminClient();

  const [{ data: members }, { data: actorProfile }] = await Promise.all([
    supabase
      .from('group_members')
      .select('user_id, app_notifications_enabled, push_notifications_enabled')
      .eq('group_id', input.groupId)
      .neq('user_id', input.actorId),
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', input.actorId)
      .single(),
  ]);

  const recipients = (members ?? []).filter(member => member.app_notifications_enabled || member.push_notifications_enabled);
  if (recipients.length === 0) return;

  const actorName = displayName(actorProfile);
  const title = `${actorName} added an expense`;
  const detail = input.description ? `${input.category} - ${input.description}` : input.category;
  const body = `₹${Number(input.amount).toLocaleString('en-IN')} in ${input.groupName}: ${detail}`;
  const url = `/groups/${input.groupId}/expenses`;

  const appRecipients = recipients.filter(member => member.app_notifications_enabled);
  if (appRecipients.length > 0) {
    await supabase.from('notifications').insert(appRecipients.map(member => ({
      group_id: input.groupId,
      recipient_id: member.user_id,
      actor_id: input.actorId,
      expense_id: input.expenseId,
      type: 'expense_created',
      title,
      body,
      url,
    })));
  }

  const pushUserIds = recipients
    .filter(member => member.push_notifications_enabled)
    .map(member => member.user_id);
  await sendPushToUsers(pushUserIds, { title, body, url, tag: `expense-${input.expenseId}` });
}
