import mongoose from 'mongoose';
import { Contribution } from '../models/contribution.model.js';
import { TransactionLog } from '../models/transactionLog.model.js';
import { EkubGroup } from '../models/ekubGroup.model.js';
import { User } from '../models/user.model.js';
import { Notification } from '../models/notification.model.js';

export async function listMyContributions(req, res) {
  try {
    const userId = req.user.sub;
    const contributions = await Contribution.find({ member: userId }).sort({ dueDate: 1 });
    return res.json(contributions);
  } catch (err) {
    console.error('ListMyContributions error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// MVP: admin confirms payment after receiving offline/mobile-money transfer.
export async function confirmContributionPayment(req, res) {
  const session = await mongoose.startSession();
  try {
    const adminId = req.user.sub;
    const { contributionId } = req.params;

    const contribution = await Contribution.findById(contributionId).session(session);
    if (!contribution) {
      session.endSession();
      return res.status(404).json({ message: 'Contribution not found' });
    }

    const group = await EkubGroup.findById(contribution.group).session(session);
    if (!group) {
      session.endSession();
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.admin.toString() !== adminId) {
      session.endSession();
      return res.status(403).json({ message: 'Only group admin can confirm payments' });
    }

    if (contribution.status === 'paid') {
      session.endSession();
      return res.status(400).json({ message: 'Contribution already marked as paid' });
    }

    await session.withTransaction(async () => {
      contribution.status = 'paid';
      contribution.paidAt = new Date();
      contribution.isLate = contribution.paidAt > contribution.dueDate;
      await contribution.save({ session });

      await TransactionLog.create(
        [
          {
            type: 'CONTRIBUTION',
            user: contribution.member,
            group: contribution.group,
            contribution: contribution._id,
            amount: contribution.amount,
            direction: 'CREDIT',
            description: 'Ekub contribution confirmed by admin',
          },
        ],
        { session }
      );
    });

    session.endSession();
    return res.json({ message: 'Contribution marked as paid', contribution });
  } catch (err) {
    console.error('ConfirmContributionPayment error', err);
    session.endSession();
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** Member: mark their own contribution as paid (self-report) */
export async function selfConfirmContribution(req, res) {
  try {
    const userId = req.user.sub;
    const { contributionId } = req.params;

    const contribution = await Contribution.findById(contributionId);
    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' });
    }
    if (contribution.member.toString() !== userId) {
      return res.status(403).json({ message: 'You can only mark your own contribution as paid' });
    }
    if (contribution.status === 'paid') {
      return res.status(400).json({ message: 'Contribution already marked as paid' });
    }

    const now = new Date();
    const dueDate = contribution.dueDate ? new Date(contribution.dueDate) : null;
    if (dueDate) {
      const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (todayStart < dueStart) {
        return res.status(400).json({
          message: `You can only pay for this cycle on or after ${dueStart.toLocaleDateString()}. Please wait until then.`,
        });
      }
    }

    contribution.status = 'paid';
    contribution.paidAt = new Date();
    contribution.isLate = contribution.dueDate && contribution.paidAt > contribution.dueDate;
    await contribution.save();

    await TransactionLog.create([
      {
        type: 'CONTRIBUTION',
        user: contribution.member,
        group: contribution.group,
        contribution: contribution._id,
        amount: contribution.amount,
        direction: 'CREDIT',
        description: 'Ekub contribution self-confirmed by member',
      },
    ]);

    const group = await EkubGroup.findById(contribution.group).lean();
    const groupName = group?.name || 'Ekub';
    await Notification.create({
      user: contribution.member,
      group: contribution.group,
      type: 'PAYMENT_SUCCESS',
      title: 'Payment successful',
      message: `Your payment of ${contribution.amount} birr for ${groupName} has been recorded. The Ekub manager will see your status as paid for this cycle.`,
      metadata: { contributionId: contribution._id, cycleNumber: contribution.cycleNumber, amount: contribution.amount },
    });

    return res.json({ message: 'Contribution marked as paid', contribution });
  } catch (err) {
    console.error('SelfConfirmContribution error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** Admin: set contribution status to paid or unpaid (pending) for a member in a cycle */
export async function updateContributionStatus(req, res) {
  try {
    const adminId = req.user.sub;
    const { contributionId } = req.params;
    const { status } = req.body;

    if (!status || !['paid', 'pending', 'unpaid'].includes(status)) {
      return res.status(400).json({ message: 'status must be "paid" or "pending"/"unpaid"' });
    }

    const contribution = await Contribution.findById(contributionId);
    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    const group = await EkubGroup.findById(contribution.group);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: 'Only the creator can update contribution status' });
    }

    const isPaid = status === 'paid';
    contribution.status = isPaid ? 'paid' : 'pending';
    contribution.paidAt = isPaid ? new Date() : null;
    if (isPaid && contribution.dueDate) {
      contribution.isLate = contribution.paidAt > contribution.dueDate;
    }
    await contribution.save();

    return res.json({ message: `Contribution marked as ${isPaid ? 'paid' : 'unpaid'}`, contribution });
  } catch (err) {
    console.error('UpdateContributionStatus error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Simple defaulter marking: mark any member with missed payments as defaulted
export async function markDefaultersForCycle(req, res) {
  const session = await mongoose.startSession();
  try {
    const adminId = req.user.sub;
    const { groupId, cycleNumber } = req.params;

    const group = await EkubGroup.findById(groupId).session(session);
    if (!group) {
      session.endSession();
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.admin.toString() !== adminId) {
      session.endSession();
      return res.status(403).json({ message: 'Only group admin can mark defaulters' });
    }

    const contributions = await Contribution.find({
      group: groupId,
      cycleNumber: Number(cycleNumber),
      status: { $ne: 'paid' },
    }).session(session);

    await session.withTransaction(async () => {
      for (const c of contributions) {
        c.status = 'missed';
        await c.save({ session });

        await TransactionLog.create(
          [
            {
              type: 'PENALTY',
              user: c.member,
              group: c.group,
              contribution: c._id,
              amount: 0,
              direction: 'DEBIT',
              description: 'Marked as defaulter for missed contribution',
            },
          ],
          { session }
        );

        // mark user and membership as defaulted
        const user = await User.findById(c.member).session(session);
        if (user) {
          user.status = 'defaulted';
          await user.save({ session });
        }
        const member = group.members.find((m) => m.user.toString() === c.member.toString());
        if (member) {
          member.status = 'defaulted';
        }

        await Notification.create(
          [
            {
              user: c.member,
              group: c.group,
              type: 'MISSED_PAYMENT',
              title: `Missed contribution for cycle ${c.cycleNumber}`,
              message: 'You have been marked as a defaulter for this cycle.',
              metadata: { contributionId: c._id, cycleNumber: c.cycleNumber },
            },
          ],
          { session }
        );
      }
      await group.save({ session });
    });

    session.endSession();
    return res.json({ message: 'Defaulters marked for cycle' });
  } catch (err) {
    console.error('MarkDefaultersForCycle error', err);
    session.endSession();
    return res.status(500).json({ message: 'Internal server error' });
  }
}

