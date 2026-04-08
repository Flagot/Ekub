import { Contribution } from '../models/contribution.model.js';
import { Notification } from '../models/notification.model.js';
import { EkubGroup } from '../models/ekubGroup.model.js';

/**
 * Run daily: notify members whose contribution due date is today so they can pay.
 * For each cycle, when the due day is reached (e.g. 1st of month for monthly),
 * everyone with an unpaid contribution for that cycle gets a PAYMENT_DUE notification.
 */
export async function runPaymentDueReminder() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  try {
    const dueToday = await Contribution.find({
      dueDate: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: 'paid' },
    })
      .lean();

    if (dueToday.length === 0) return;

    const groupIds = [...new Set(dueToday.map((c) => c.group.toString()))];
    const groups = await EkubGroup.find({ _id: { $in: groupIds } })
      .select('name')
      .lean();
    const groupMap = new Map(groups.map((g) => [g._id.toString(), g]));

    let sent = 0;
    for (const c of dueToday) {
      const alreadySent = await Notification.exists({
        type: 'PAYMENT_DUE',
        'metadata.contributionId': c._id,
      });
      if (alreadySent) continue;

      const group = groupMap.get(c.group.toString());
      const groupName = group?.name || 'Ekub';

      await Notification.create({
        user: c.member,
        group: c.group,
        type: 'PAYMENT_DUE',
        title: `${groupName} – Pay for cycle ${c.cycleNumber}`,
        message: `Today is the due date. Your contribution of ${c.amount} birr is due. Open Pay Ekub to record your payment.`,
        metadata: { contributionId: c._id, cycleNumber: c.cycleNumber, dueDate: c.dueDate },
      });
      sent += 1;
    }

    if (sent > 0) {
      console.log(`[PaymentDueReminder] Sent ${sent} payment due notification(s) for today.`);
    }
  } catch (err) {
    console.error('[PaymentDueReminder] Error:', err);
  }
}
