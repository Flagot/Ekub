import { Cycle } from '../models/cycle.model.js';
import { Contribution } from '../models/contribution.model.js';
import { Payout } from '../models/payout.model.js';
import { TransactionLog } from '../models/transactionLog.model.js';
import { EkubGroup } from '../models/ekubGroup.model.js';
import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';

// Admin triggers payout for a cycle once all contributions are paid.
export async function executePayoutForCurrentCycle(req, res) {
  try {
    const adminId = req.user.sub;
    const { groupId } = req.params;

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: 'Only admin can execute payouts' });
    }

    const cycleNumber = group.currentCycleIndex + 1;

    const payout = await Payout.findOne({ group: groupId, cycleNumber });
    if (!payout) {
      return res.status(404).json({ message: 'Payout record not found for current cycle' });
    }
    if (payout.status === 'paid') {
      return res.status(400).json({ message: 'Payout already executed for this cycle' });
    }

    const contributions = await Contribution.find({
      group: groupId,
      cycleNumber,
    });

    const allPaid = contributions.every((c) => c.status === 'paid');
    if (!allPaid) {
      return res.status(400).json({ message: 'All contributions for this cycle must be paid before payout' });
    }

    payout.status = 'paid';
    payout.paidAt = new Date();
    await payout.save();

    const winnerIds = (payout.winners && payout.winners.length) ? payout.winners : [payout.member].filter(Boolean);
    for (const uid of winnerIds) {
      await TransactionLog.create([{
        type: 'PAYOUT',
        user: uid,
        group: payout.group,
        payout: payout._id,
        amount: payout.amount,
        direction: 'DEBIT',
        description: `Ekub payout for cycle ${cycleNumber}`,
      }]);
    }

    const winnerUsers = await User.find({ _id: { $in: winnerIds } }).select('fullName').lean();
    const winnerNames = winnerUsers.map((u) => u.fullName || 'A member');
    const winnerNamesLabel = winnerNames.join(' and ');

    for (const winnerId of winnerIds) {
      await Notification.create([{
        user: winnerId,
        group: payout.group,
        type: 'PAYOUT_RECEIVED',
        title: `You won cycle ${cycleNumber}`,
        message: winnerIds.length > 1
          ? `Your group has received the Ekub payout of ${payout.amount} birr for cycle ${cycleNumber}.`
          : `You have received the Ekub payout of ${payout.amount} birr for cycle ${cycleNumber}.`,
        metadata: { payoutId: payout._id, cycleNumber },
      }]);
    }

    const memberIds = [...new Set(contributions.map((c) => c.member.toString()))];
    const winnerIdSet = new Set(winnerIds.map((id) => id.toString()));
    const otherMemberIds = memberIds.filter((id) => !winnerIdSet.has(id));
    if (otherMemberIds.length > 0) {
      await Notification.insertMany(
        otherMemberIds.map((userId) => ({
          user: userId,
          group: payout.group,
          type: 'CYCLE_WINNER',
          title: `Cycle ${cycleNumber} complete`,
          message: `${winnerNamesLabel} won cycle ${cycleNumber} and received the payout.`,
          metadata: { cycleNumber, winnerIds },
        }))
      );
    }

    group.currentCycleIndex += 1;
    if (group.currentCycleIndex >= group.payoutOrder.length) {
      group.status = 'completed';
    }
    await group.save();

    const nextCycleNumber = group.currentCycleIndex;
    if (nextCycleNumber <= group.payoutOrder.length && group.status !== 'completed') {
      const nextContributions = await Contribution.find({
        group: groupId,
        cycleNumber: nextCycleNumber,
      });
      if (nextContributions.length > 0) {
        const dueNotifications = nextContributions.map((c) => ({
          user: c.member,
          group: payout.group,
          type: 'PAYMENT_DUE',
          title: `${group.name} – Pay for cycle ${c.cycleNumber}`,
          message: `Your contribution of ${c.amount} birr is due by ${c.dueDate.toDateString()}. Please pay on time.`,
          metadata: { contributionId: c._id, cycleNumber: c.cycleNumber, dueDate: c.dueDate },
        }));
        await Notification.insertMany(dueNotifications);
      }
    }

    return res.json({ message: 'Payout executed successfully', payout });
  } catch (err) {
    console.error('ExecutePayoutForCurrentCycle error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** Admin: mark winner as paid for a specific cycle (must be the current cycle in order). */
export async function payWinnerForCycle(req, res) {
  try {
    const adminId = req.user.sub;
    const { groupId, cycleNumber: cycleNumberParam } = req.params;
    const cycleNumber = parseInt(cycleNumberParam, 10);
    if (Number.isNaN(cycleNumber) || cycleNumber < 1) {
      return res.status(400).json({ message: 'Invalid cycle number' });
    }

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: 'Only the creator can pay the winner' });
    }

    const currentCycle = group.currentCycleIndex + 1;
    if (cycleNumber !== currentCycle) {
      return res.status(400).json({
        message: `You must pay winners in order. The next cycle to pay is cycle ${currentCycle}, not cycle ${cycleNumber}.`,
      });
    }

    const payout = await Payout.findOne({ group: groupId, cycleNumber });
    if (!payout) {
      return res.status(404).json({ message: 'Payout record not found for this cycle' });
    }
    if (payout.status === 'paid') {
      return res.status(400).json({ message: 'Winner for this cycle is already marked as paid' });
    }

    const contributions = await Contribution.find({
      group: groupId,
      cycleNumber,
    });
    const allPaid = contributions.every((c) => c.status === 'paid');
    if (!allPaid) {
      return res.status(400).json({ message: 'All contributions for this cycle must be paid before paying the winner' });
    }

    payout.status = 'paid';
    payout.paidAt = new Date();
    await payout.save();

    const winnerIds = (payout.winners && payout.winners.length) ? payout.winners : [payout.member].filter(Boolean);
    for (const uid of winnerIds) {
      await TransactionLog.create([{
        type: 'PAYOUT',
        user: uid,
        group: payout.group,
        payout: payout._id,
        amount: payout.amount,
        direction: 'DEBIT',
        description: `Ekub payout for cycle ${cycleNumber}`,
      }]);
    }

    const winnerUsers = await User.find({ _id: { $in: winnerIds } }).select('fullName').lean();
    const winnerNames = winnerUsers.map((u) => u.fullName || 'A member');
    const winnerNamesLabel = winnerNames.join(' and ');

    for (const winnerId of winnerIds) {
      await Notification.create([{
        user: winnerId,
        group: payout.group,
        type: 'PAYOUT_RECEIVED',
        title: `You won cycle ${cycleNumber}`,
        message: winnerIds.length > 1
          ? `Your group has received the Ekub payout of ${payout.amount} birr for cycle ${cycleNumber}.`
          : `You have received the Ekub payout of ${payout.amount} birr for cycle ${cycleNumber}.`,
        metadata: { payoutId: payout._id, cycleNumber },
      }]);
    }

    const memberIds = [...new Set(contributions.map((c) => c.member.toString()))];
    const winnerIdSet = new Set(winnerIds.map((id) => id.toString()));
    const otherMemberIds = memberIds.filter((id) => !winnerIdSet.has(id));
    if (otherMemberIds.length > 0) {
      await Notification.insertMany(
        otherMemberIds.map((userId) => ({
          user: userId,
          group: payout.group,
          type: 'CYCLE_WINNER',
          title: `Cycle ${cycleNumber} complete`,
          message: `${winnerNamesLabel} won cycle ${cycleNumber} and received the payout.`,
          metadata: { cycleNumber, winnerIds },
        }))
      );
    }

    group.currentCycleIndex += 1;
    if (group.currentCycleIndex >= group.payoutOrder.length) {
      group.status = 'completed';
    }
    await group.save();

    const nextCycleNumber = group.currentCycleIndex;
    if (nextCycleNumber <= group.payoutOrder.length && group.status !== 'completed') {
      const nextContributions = await Contribution.find({
        group: groupId,
        cycleNumber: nextCycleNumber,
      });
      if (nextContributions.length > 0) {
        const dueNotifications = nextContributions.map((c) => ({
          user: c.member,
          group: payout.group,
          type: 'PAYMENT_DUE',
          title: `${group.name} – Pay for cycle ${c.cycleNumber}`,
          message: `Your contribution of ${c.amount} birr is due by ${c.dueDate.toDateString()}. Please pay on time.`,
          metadata: { contributionId: c._id, cycleNumber: c.cycleNumber, dueDate: c.dueDate },
        }));
        await Notification.insertMany(dueNotifications);
      }
    }

    return res.json({ message: 'Winner marked as paid', payout });
  } catch (err) {
    console.error('PayWinnerForCycle error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** Randomly choose the winner slot for the current cycle. A slot can be one or more people (group). Notifies all. */
export async function chooseRandomWinner(req, res) {
  try {
    const adminId = req.user.sub;
    const { groupId } = req.params;

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: 'Only the creator can choose the winner' });
    }

    const cycleNumber = group.currentCycleIndex + 1;

    const contributionsForCycle = await Contribution.find({ group: groupId, cycleNumber });
    const allPaid = contributionsForCycle.length > 0 && contributionsForCycle.every((c) => c.status === 'paid');
    if (!allPaid) {
      return res.status(400).json({
        message: 'Everyone must pay for this cycle before a winner can be chosen. Check payment tracking and remind members to pay.',
      });
    }

    const paidPayouts = await Payout.find({ group: groupId, status: 'paid' }).select('winners member').lean();
    const alreadyWonIds = new Set(paidPayouts.flatMap((p) => (p.winners && p.winners.length ? p.winners.map((w) => w.toString()) : [p.member].filter(Boolean).map((m) => m.toString()))));

    const payoutOrder = group.payoutOrder || [];
    const slots = Array.isArray(payoutOrder) && payoutOrder.length > 0
      ? payoutOrder.map((s) => (Array.isArray(s) ? s.map((id) => id.toString()) : [s.toString()]))
      : [];
    const eligibleSlots = slots.filter((slot) => !slot.some((id) => alreadyWonIds.has(id)));

    if (eligibleSlots.length === 0) {
      return res.status(400).json({ message: 'No eligible slots (every slot has already won or no slots found)' });
    }

    const randomIndex = Math.floor(Math.random() * eligibleSlots.length);
    const chosenSlot = eligibleSlots[randomIndex];
    const chosenIds = chosenSlot;

    const winnerUsers = await User.find({ _id: { $in: chosenIds } }).select('fullName').lean();
    const winnerNames = winnerUsers.map((u) => u.fullName || 'A member');
    const chosenNamesLabel = winnerNames.join(' and ');

    let payout = await Payout.findOne({ group: groupId, cycleNumber });
    const amount = contributionsForCycle.length > 0
      ? contributionsForCycle.reduce((sum, c) => sum + c.amount, 0)
      : 0;

    if (payout) {
      payout.member = chosenIds[0];
      payout.winners = chosenIds;
      await payout.save();
    } else {
      const cycleDoc = await Cycle.findOne({ group: groupId, cycleNumber });
      const created = await Payout.create([{
        group: groupId,
        cycle: cycleDoc?._id,
        member: chosenIds[0],
        winners: chosenIds,
        cycleNumber,
        amount,
        status: 'locked',
      }]);
      payout = created[0] || created;
    }

    for (const winnerId of chosenIds) {
      await Notification.create([{
        user: winnerId,
        group: groupId,
        type: 'WINNER_CHOSEN',
        title: `You were chosen for cycle ${cycleNumber}!`,
        message: chosenIds.length > 1
          ? `Your group was chosen as the winner for cycle ${cycleNumber} in ${group.name}. You and your group members will receive the payout once all contributions are collected.`
          : `You were chosen as the winner for cycle ${cycleNumber} in ${group.name}. You will receive the payout once all contributions are collected.`,
        metadata: { cycleNumber, payoutId: payout._id },
      }]);
    }

    const allMemberIds = [...new Set(contributionsForCycle.map((c) => c.member.toString()))];
    const otherMemberIds = allMemberIds.filter((id) => !chosenIds.includes(id));
    if (otherMemberIds.length > 0) {
      await Notification.insertMany(
        otherMemberIds.map((userId) => ({
          user: userId,
          group: groupId,
          type: 'WINNER_ANNOUNCED',
          title: `Winner chosen for cycle ${cycleNumber}`,
          message: `${chosenNamesLabel} ${chosenIds.length > 1 ? 'were' : 'was'} chosen as the winner for cycle ${cycleNumber} in ${group.name}.`,
          metadata: { cycleNumber, winnerIds: chosenIds },
        }))
      );
    }

    return res.json({
      message: 'Winner chosen and all members notified',
      winner: { ids: chosenIds, fullNames: winnerNames, label: chosenNamesLabel },
      cycleNumber,
      payoutId: payout._id,
    });
  } catch (err) {
    console.error('ChooseRandomWinner error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listPayoutsForGroup(req, res) {
  try {
    const { groupId } = req.params;
    const payouts = await Payout.find({ group: groupId }).sort({ cycleNumber: 1 });
    return res.json(payouts);
  } catch (err) {
    console.error('ListPayoutsForGroup error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

