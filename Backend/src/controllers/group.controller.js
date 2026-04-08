import mongoose from 'mongoose';
import { EkubGroup } from '../models/ekubGroup.model.js';
import { Cycle } from '../models/cycle.model.js';
import { Contribution } from '../models/contribution.model.js';
import { Payout } from '../models/payout.model.js';
import { TransactionLog } from '../models/transactionLog.model.js';
import { User } from '../models/user.model.js';
import { Notification } from '../models/notification.model.js';

function computeNextDueDate(startDate, frequency, cycleNumber) {
  const date = new Date(startDate);
  if (frequency === 'daily') {
    date.setDate(date.getDate() + cycleNumber);
  } else if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7 * cycleNumber);
  } else if (frequency === 'monthly') {
    date.setMonth(date.getMonth() + cycleNumber);
  }
  return date;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Create contribution records for a member for all existing cycles (e.g. when added after Ekub started). */
async function createContributionsForMemberForExistingCycles(group, memberUserId, amount) {
  const cycles = await Cycle.find({ group: group._id }).sort({ cycleNumber: 1 }).lean();
  if (cycles.length === 0) return;

  const memberId = mongoose.Types.ObjectId.isValid(memberUserId)
    ? (memberUserId instanceof mongoose.Types.ObjectId ? memberUserId : new mongoose.Types.ObjectId(memberUserId.toString()))
    : memberUserId;
  const existing = await Contribution.find({
    group: group._id,
    member: memberId,
    cycleNumber: { $in: cycles.map((c) => c.cycleNumber) },
  }).lean();
  const existingCycleNumbers = new Set(existing.map((c) => c.cycleNumber));

  const docs = [];
  for (const cycle of cycles) {
    if (existingCycleNumbers.has(cycle.cycleNumber)) continue;
    const dueDate = computeNextDueDate(group.startDate, group.contributionFrequency, cycle.cycleNumber - 1);
    docs.push({
      group: group._id,
      cycle: cycle._id,
      member: memberId,
      cycleNumber: cycle.cycleNumber,
      amount: Number(amount) || 0,
      dueDate,
    });
  }
  if (docs.length > 0) {
    await Contribution.insertMany(docs);
  }
}

export async function createGroup(req, res) {
  try {
    const adminId = req.user.sub;
    const { name, contributionFrequency, startDate, visibility, numberOfCycles, payoutPerCycle, minContributionPerPerson, maxContributionPerPerson } = req.body;

    if (!name || !contributionFrequency || !startDate) {
      return res.status(400).json({ message: 'Missing required fields: name, contributionFrequency, startDate' });
    }

    const numCycles = numberOfCycles != null ? Number(numberOfCycles) : null;
    if (numCycles != null && (Number.isNaN(numCycles) || numCycles < 1)) {
      return res.status(400).json({ message: 'numberOfCycles must be at least 1' });
    }

    const payout = payoutPerCycle != null ? Number(payoutPerCycle) : null;
    const minC = minContributionPerPerson != null ? Number(minContributionPerPerson) : null;
    const maxC = maxContributionPerPerson != null ? Number(maxContributionPerPerson) : null;
    if (minC != null && (Number.isNaN(minC) || minC < 0)) {
      return res.status(400).json({ message: 'minContributionPerPerson must be 0 or more' });
    }
    if (maxC != null && (Number.isNaN(maxC) || maxC < 0)) {
      return res.status(400).json({ message: 'maxContributionPerPerson must be 0 or more' });
    }
    if (minC != null && maxC != null && minC > maxC) {
      return res.status(400).json({ message: 'minContributionPerPerson cannot be greater than maxContributionPerPerson' });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    const group = await EkubGroup.create({
      name,
      admin: adminId,
      members: [],
      contributionFrequency,
      numberOfCycles: numCycles ?? undefined,
      payoutPerCycle: payout ?? undefined,
      minContributionPerPerson: minC ?? undefined,
      maxContributionPerPerson: maxC ?? undefined,
      startDate,
      status: 'draft',
      visibility: visibility === 'public' ? 'public' : 'private',
    });

    return res.status(201).json(group);
  } catch (err) {
    console.error('CreateGroup error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listMyGroups(req, res) {
  try {
    const userId = req.user.sub;
    const groups = await EkubGroup.find({
      $or: [{ admin: userId }, { 'members.user': userId }],
    })
      .sort({ createdAt: -1 })
      .lean();
    const withAdmin = groups.map((g) => ({
      ...g,
      isAdmin: g.admin.toString() === userId,
    }));
    return res.json(withAdmin);
  } catch (err) {
    console.error('ListMyGroups error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** Public (no auth): list public Ekubs for landing page */
export async function listPublicGroupsGuest(req, res) {
  try {
    const groups = await EkubGroup.find({
      visibility: 'public',
      status: { $in: ['draft', 'active'] },
    })
      .sort({ createdAt: -1 })
      .select('name contributionFrequency startDate visibility _id members')
      .lean();

    const withMeta = groups.map((g) => {
      const contributorCount = g.members?.length ?? 0;
      const totalSum = (g.members || []).reduce((s, m) => s + (m.amount || 0), 0);
      return {
        _id: g._id,
        name: g.name,
        contributionFrequency: g.contributionFrequency,
        startDate: g.startDate,
        visibility: g.visibility,
        contributorCount,
        totalSum,
      };
    });

    return res.json(withMeta);
  } catch (err) {
    console.error('ListPublicGroupsGuest error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listPublicGroups(req, res) {
  try {
    const userId = req.user?.sub;
    const groups = await EkubGroup.find({
      visibility: 'public',
      status: { $in: ['draft', 'active'] },
    })
      .sort({ createdAt: -1 })
      .select('name contributionFrequency startDate visibility admin members')
      .lean();

    const withMeta = groups.map((g) => {
      const activeMembers = (g.members || []).filter((m) => m.status === 'active');
      const contributorCount = activeMembers.length;
      const totalSum = activeMembers.reduce((s, m) => s + (m.amount || 0), 0);
      const memberEntry = userId && (g.members || []).find((m) => m.user && m.user.toString() === userId);
      const isMember = !!memberEntry && memberEntry.status === 'active';
      const isPending = !!memberEntry && memberEntry.status === 'pending';
      return {
        ...g,
        contributorCount,
        totalSum,
        isMember,
        isPending,
      };
    });

    return res.json(withMeta);
  } catch (err) {
    console.error('ListPublicGroups error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getGroup(req, res) {
  try {
    const userId = req.user.sub;
    const { groupId } = req.params;
    const group = await EkubGroup.findById(groupId).populate('members.user', 'fullName email');
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isAdmin = group.admin.toString() === userId;
    const isMember = group.members.some((m) => m.user && m.user.toString() === userId);
    if (group.visibility === 'private' && !isAdmin && !isMember) {
      return res.status(403).json({ message: 'This Ekub is private. Only members can view it.' });
    }
    const activeMembers = group.members.filter((m) => m.status === 'active');
    const contributorCount = activeMembers.length;
    const totalSum = activeMembers.reduce((sum, m) => sum + (m.amount || 0), 0);
    const groupObj = group.toObject();
    // Ensure every member has status for the client (subdocuments can be missing it in serialization)
    groupObj.members = (groupObj.members || []).map((m) => ({
      ...m,
      status: m.status || 'active',
    }));
    return res.json({
      ...groupObj,
      contributorCount,
      totalSum,
      isAdmin,
      isMember,
    });
  } catch (err) {
    console.error('GetGroup error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteGroup(req, res) {
  try {
    const adminId = req.user.sub;
    const { groupId } = req.params;

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: 'Only the creator can delete this Ekub' });
    }

    group.status = 'cancelled';
    group.endDate = new Date();
    await group.save();

    return res.json({ message: 'Ekub deleted' });
  } catch (err) {
    console.error('DeleteGroup error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateGroup(req, res) {
  try {
    const adminId = req.user.sub;
    const { groupId } = req.params;
    const { name, description, contributionFrequency, startDate, visibility, numberOfCycles, payoutPerCycle, minContributionPerPerson, maxContributionPerPerson } = req.body;

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: 'Only the creator can edit this Ekub' });
    }

    if (name !== undefined) group.name = name.trim();
    if (description !== undefined) group.description = description?.trim() || '';
    if (visibility === 'public' || visibility === 'private') group.visibility = visibility;
    if (group.status === 'draft') {
      if (contributionFrequency !== undefined) group.contributionFrequency = contributionFrequency;
      if (startDate !== undefined) group.startDate = new Date(startDate);
      if (numberOfCycles !== undefined) {
        const n = Number(numberOfCycles);
        if (Number.isNaN(n) || n < 1) {
          return res.status(400).json({ message: 'numberOfCycles must be at least 1' });
        }
        group.numberOfCycles = n;
      }
      if (payoutPerCycle !== undefined) {
        const p = Number(payoutPerCycle);
        if (!Number.isNaN(p) && p >= 0) group.payoutPerCycle = p;
      }
      if (minContributionPerPerson !== undefined) {
        const m = Number(minContributionPerPerson);
        if (!Number.isNaN(m) && m >= 0) group.minContributionPerPerson = m;
      }
      if (maxContributionPerPerson !== undefined) {
        const m = Number(maxContributionPerPerson);
        if (!Number.isNaN(m) && m >= 0) group.maxContributionPerPerson = m;
      }
      if (group.minContributionPerPerson != null && group.maxContributionPerPerson != null && group.minContributionPerPerson > group.maxContributionPerPerson) {
        return res.status(400).json({ message: 'minContributionPerPerson cannot be greater than maxContributionPerPerson' });
      }
    }

    await group.save();
    const contributorCount = group.members.length;
    const totalSum = group.members.reduce((s, m) => s + (m.amount || 0), 0);
    return res.json({
      ...group.toObject(),
      contributorCount,
      totalSum,
    });
  } catch (err) {
    console.error('UpdateGroup error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function addMember(req, res) {
  try {
    const adminId = req.user.sub;
    const { groupId } = req.params;
    const { email, amount } = req.body;

    const emailTrim = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!emailTrim || amount == null || amount < 0) {
      return res.status(400).json({ message: 'email and amount (≥ 0) are required' });
    }

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: 'Only the Ekub creator can add members' });
    }

    const user = await User.findOne({ email: emailTrim });
    if (!user) {
      return res.status(400).json({
        message: 'No account with that email. They need to sign up for Ekub first.',
        code: 'USER_NOT_FOUND',
      });
    }

    const userIdStr = user._id.toString();
    if (group.admin.toString() === userIdStr) {
      return res.status(400).json({ message: 'You cannot add yourself as a member' });
    }
    const alreadyMember = group.members.some((m) => m.user && m.user.toString() === userIdStr);
    if (alreadyMember) {
      return res.status(400).json({ message: 'This person is already a member of this Ekub' });
    }

    const amountNum = Number(amount);
    if (group.minContributionPerPerson != null && amountNum < group.minContributionPerPerson) {
      return res.status(400).json({
        message: `Contribution must be at least ${group.minContributionPerPerson} birr per cycle (min for this Ekub).`,
      });
    }
    if (group.maxContributionPerPerson != null && amountNum > group.maxContributionPerPerson) {
      return res.status(400).json({
        message: `Contribution cannot exceed ${group.maxContributionPerPerson} birr per cycle (max for this Ekub).`,
      });
    }

    group.members.push({
      user: user._id,
      name: user.fullName,
      amount: amountNum,
      role: 'member',
      status: 'active',
      joinedAt: new Date(),
    });
    await group.save();

    if (group.status === 'active') {
      await createContributionsForMemberForExistingCycles(group, user._id, Number(amount));
    }

    await Notification.create({
      user: user._id,
      group: group._id,
      type: 'ADDED_TO_EKUB',
      title: 'Added to Ekub',
      message: `You were added to "${group.name}" by the creator. Your contribution amount is ${Number(amount)} birr per cycle.`,
    });

    const contributorCount = group.members.length;
    const totalSum = group.members.reduce((s, m) => s + (m.amount || 0), 0);
    return res.status(201).json({
      message: 'Member added and notified',
      group,
      contributorCount,
      totalSum,
    });
  } catch (err) {
    console.error('AddMember error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function requestToJoinGroup(req, res) {
  try {
    const userId = req.user.sub;
    const { groupId } = req.params;
    const { amount } = req.body;

    const amountNum = amount != null ? Number(amount) : NaN;
    if (Number.isNaN(amountNum) || amountNum < 0) {
      return res.status(400).json({ message: 'Amount (number ≥ 0) is required' });
    }

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.visibility !== 'public') {
      return res.status(403).json({ message: 'This Ekub is private. Only the creator can add members.' });
    }

    const alreadyMember = group.members.some((m) => m.user && m.user.toString() === userId);
    if (alreadyMember) {
      return res.status(400).json({ message: 'Already a member or pending' });
    }
    if (group.admin.toString() === userId) {
      return res.status(400).json({ message: 'You are the creator of this Ekub' });
    }

    if (group.minContributionPerPerson != null && amountNum < group.minContributionPerPerson) {
      return res.status(400).json({
        message: `Contribution must be at least ${group.minContributionPerPerson} birr per cycle (min for this Ekub).`,
      });
    }
    if (group.maxContributionPerPerson != null && amountNum > group.maxContributionPerPerson) {
      return res.status(400).json({
        message: `Contribution cannot exceed ${group.maxContributionPerPerson} birr per cycle (max for this Ekub).`,
      });
    }

    group.members.push({
      user: userId,
      role: 'member',
      status: 'pending',
      amount: amountNum,
    });

    await group.save();
    return res.status(201).json({ message: 'Join request submitted. The creator will approve.' });
  } catch (err) {
    console.error('RequestToJoinGroup error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function approveMember(req, res) {
  try {
    const adminId = req.user.sub;
    const { groupId, memberId } = req.params;

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: 'Only group admin can approve members' });
    }

    const member = group.members.find((m) => m.user.toString() === memberId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found in group' });
    }

    member.status = 'active';
    member.joinedAt = new Date();

    await group.save();

    if (group.status === 'active') {
      await createContributionsForMemberForExistingCycles(group, member.user, member.amount ?? 0);
    }

    await Notification.create({
      user: member.user,
      group: group._id,
      type: 'ADDED_TO_EKUB',
      title: 'Join request approved',
      message: `You were approved to join "${group.name}". Your contribution amount is ${member.amount ?? 0} birr per cycle.`,
    });

    return res.json({ message: 'Member approved' });
  } catch (err) {
    console.error('ApproveMember error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function rejectMember(req, res) {
  try {
    const adminId = req.user.sub;
    const { groupId, memberId } = req.params;

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: 'Only group admin can reject members' });
    }

    const member = group.members.find((m) => m.user.toString() === memberId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found in group' });
    }
    if (member.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending requests can be rejected' });
    }

    member.status = 'rejected';
    await group.save();

    await Notification.create({
      user: member.user,
      group: group._id,
      type: 'JOIN_REQUEST_REJECTED',
      title: 'Join request not accepted',
      message: `Your request to join "${group.name}" was not accepted by the creator.`,
    });

    return res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error('RejectMember error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function withdrawJoinRequest(req, res) {
  try {
    const userId = req.user.sub;
    const { groupId } = req.params;

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const pendingIndex = group.members.findIndex(
      (m) => m.user && m.user.toString() === userId && m.status === 'pending'
    );
    if (pendingIndex === -1) {
      return res.status(400).json({ message: 'You do not have a pending request for this Ekub' });
    }

    group.members.splice(pendingIndex, 1);
    await group.save();

    return res.json({ message: 'Request withdrawn' });
  } catch (err) {
    console.error('WithdrawJoinRequest error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function removeMember(req, res) {
  try {
    const adminId = req.user.sub;
    const { groupId, memberId } = req.params;

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: 'Only the creator can remove members' });
    }
    if (group.status === 'completed' || group.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot remove members from this Ekub' });
    }

    const member = group.members.find((m) => m.user && m.user.toString() === memberId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found in group' });
    }
    if (member.status !== 'active') {
      return res.status(400).json({ message: 'Can only remove active members' });
    }
    if (member.user.toString() === adminId) {
      return res.status(400).json({ message: 'Cannot remove yourself; use Delete Ekub to end it' });
    }

    member.status = 'left';
    member.leftAt = new Date();
    await group.save();

    return res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('RemoveMember error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function setPayoutOrder(req, res) {
  try {
    const adminId = req.user.sub;
    const { groupId } = req.params;
    const { payoutStrategy, payoutOrder } = req.body;

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.admin.toString() !== adminId) {
      return res.status(403).json({ message: 'Only admin can set payout order' });
    }

    const activeMemberIds = group.members
      .filter((m) => m.status === 'active')
      .map((m) => m.user.toString());

    /** Normalize to array of slots (each slot = array of user ids). Single id -> [id]. */
    function toSlots(order) {
      if (!Array.isArray(order)) return [];
      return order.map((item) =>
        Array.isArray(item) ? item.map((id) => id.toString()) : [item.toString()]
      );
    }

    let finalOrder = []; // array of slots (each slot = array of ids)
    if (payoutStrategy === 'RANDOM') {
      finalOrder = shuffleArray([...activeMemberIds]).map((id) => [id]);
      const payoutPerCycleCheck = group.payoutPerCycle != null ? Number(group.payoutPerCycle) : null;
      const numCyclesCheck = group.numberOfCycles != null ? group.numberOfCycles : finalOrder.length;
      if (payoutPerCycleCheck != null && numCyclesCheck > 0) {
        const slotTotal = payoutPerCycleCheck / numCyclesCheck;
        const memberAmountByUserId = new Map(
          (group.members || []).filter((m) => m.user && m.status === 'active').map((m) => [m.user.toString(), Number(m.amount) || 0])
        );
        for (const slot of finalOrder) {
          const total = (slot || []).reduce((s, uid) => s + (memberAmountByUserId.get(uid.toString()) || 0), 0);
          if (Math.abs(total - slotTotal) > 0.01) {
            return res.status(400).json({
              message: `With payout per cycle and RANDOM, each member must contribute exactly ${slotTotal} birr (payout ÷ cycles). Use custom order to group members into slots with different amounts.`,
            });
          }
        }
      }
    } else if (payoutStrategy === 'CUSTOM_ORDER' || payoutStrategy === 'MANUAL_PRIORITY') {
      const slots = toSlots(payoutOrder);
      const providedIds = slots.flat();
      const providedSet = new Set(providedIds);
      const activeSet = new Set(activeMemberIds);
      if (providedSet.size !== activeSet.size) {
        return res.status(400).json({ message: 'payoutOrder must include each active member exactly once (can group into slots)' });
      }
      for (const id of activeMemberIds) {
        if (!providedSet.has(id)) {
          return res.status(400).json({ message: 'payoutOrder must match active members' });
        }
      }
      finalOrder = slots;
    } else {
      return res.status(400).json({ message: 'Invalid payoutStrategy' });
    }

    const numberOfCycles = group.numberOfCycles != null ? group.numberOfCycles : finalOrder.length;
    if (finalOrder.length !== numberOfCycles) {
      return res.status(400).json({
        message: `This Ekub is set to run for ${numberOfCycles} cycles. You must have exactly ${numberOfCycles} slots (one winner or group per cycle). Each slot can be one person or a group (e.g. two people paying 500 each = one slot of 1000).`,
      });
    }

    const payoutPerCycle = group.payoutPerCycle != null ? Number(group.payoutPerCycle) : null;
    const slotTotalRequired = payoutPerCycle != null && numberOfCycles > 0 ? payoutPerCycle / numberOfCycles : null;
    if (slotTotalRequired != null) {
      const memberAmountByUserId = new Map(
        (group.members || []).filter((m) => m.user && m.status === 'active').map((m) => [m.user.toString(), Number(m.amount) || 0])
      );
      for (let i = 0; i < finalOrder.length; i += 1) {
        const slot = finalOrder[i];
        const slotTotal = (slot || []).reduce((sum, uid) => sum + (memberAmountByUserId.get(uid.toString()) || 0), 0);
        if (Math.abs(slotTotal - slotTotalRequired) > 0.01) {
          return res.status(400).json({
            message: `Slot ${i + 1} total is ${slotTotal} birr; it must equal ${slotTotalRequired} birr (payout ${payoutPerCycle} ÷ ${numberOfCycles} cycles). Group members so each slot's contributions add up to ${slotTotalRequired}.`,
          });
        }
      }
    }

    group.payoutStrategy = payoutStrategy;
    group.payoutOrder = finalOrder;
    group.status = 'active';
    group.currentCycleIndex = 0;

    // Set end date: last cycle end (e.g. 10 monthly → end after 10th cycle)
    const lastCycleDue = computeNextDueDate(group.startDate, group.contributionFrequency, numberOfCycles - 1);
    if (group.contributionFrequency === 'monthly') {
      group.endDate = new Date(lastCycleDue.getFullYear(), lastCycleDue.getMonth() + 1, 0);
    } else if (group.contributionFrequency === 'weekly') {
      group.endDate = new Date(lastCycleDue.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
      group.endDate = new Date(lastCycleDue.getTime() + 24 * 60 * 60 * 1000);
    }

    await group.save();

    // Amount per member: use fixedContributionAmount or first member's amount
    const amountPerMember =
      group.fixedContributionAmount ??
      group.members.find((m) => m.user && m.amount != null)?.amount ??
      0;
    if (amountPerMember <= 0) {
      return res.status(400).json({ message: 'Set contribution amount (e.g. by adding members with amounts) before starting the Ekub.' });
    }
    if (!group.fixedContributionAmount) {
      group.fixedContributionAmount = amountPerMember;
      await group.save();
    }

    // Pre-create cycles, contributions, and payouts (no transaction — works on standalone MongoDB)
    for (let i = 0; i < numberOfCycles; i += 1) {
      const cycleNumber = i + 1;
      const slot = finalOrder[i]; // array of user ids (one or more)
      const dueDate = computeNextDueDate(group.startDate, group.contributionFrequency, i);
      const cycleStartDate = dueDate;
      const cycleEndDate = group.contributionFrequency === 'monthly'
        ? new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + 1, 0)
        : group.contributionFrequency === 'weekly'
          ? new Date(cycleStartDate.getTime() + 7 * 24 * 60 * 60 * 1000)
          : new Date(cycleStartDate.getTime() + 24 * 60 * 60 * 1000);

      const [cycleDoc] = await Cycle.create([
        { group: group._id, cycleNumber, startDate: cycleStartDate, endDate: cycleEndDate },
      ]);

      // Create contribution obligations for each member (each can have different amount)
      const contributionDocs = activeMemberIds.map((uid) => {
        const memberEntry = group.members.find((m) => m.user && m.user.toString() === uid);
        const amount = memberEntry?.amount != null ? memberEntry.amount : amountPerMember;
        return {
          group: group._id,
          cycle: cycleDoc._id,
          member: uid,
          cycleNumber,
          amount,
          dueDate,
        };
      });
      const poolAmount = contributionDocs.reduce((s, c) => s + c.amount, 0);

      // Only create Payout for the first cycle. Later cycles get a Payout when the admin chooses the winner (chooseRandomWinner or fixed order flow).
      if (i === 0) {
        await Payout.create([
          {
            group: group._id,
            cycle: cycleDoc._id,
            member: slot[0],
            winners: slot,
            cycleNumber,
            amount: poolAmount,
            status: 'locked',
          },
        ]);
      }

      const contributions = await Contribution.insertMany(contributionDocs);

      // Notify members only for cycle 1 now (when the first cycle starts). Later cycles get notified when previous payout is executed.
      if (i === 0) {
        const cycleOneNotifications = contributions.map((c) => ({
          user: c.member,
          group: c.group,
          type: 'PAYMENT_DUE',
          title: `${group.name} – Pay for cycle ${c.cycleNumber}`,
          message: `Your contribution of ${c.amount} birr is due by ${c.dueDate.toDateString()}. Please pay on time.`,
          metadata: { contributionId: c._id, cycleNumber: c.cycleNumber, dueDate: c.dueDate },
        }));
        await Notification.insertMany(cycleOneNotifications);
      }
    }

    return res.json({ message: 'Payout order set and schedule initialized', group });
  } catch (err) {
    console.error('SetPayoutOrder error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Detailed payout schedule (per group)
export async function getGroupSchedule(req, res) {
  try {
    const userId = req.user.sub;
    const { groupId } = req.params;

    const group = await EkubGroup.findById(groupId).populate('payoutOrder', 'fullName email');
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isAdmin = group.admin.toString() === userId;
    const isMember = group.members.some((m) => m.user && m.user.toString() === userId);
    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: 'Only the creator or members can view schedule' });
    }

    const payouts = await Payout.find({ group: groupId })
      .populate('member', 'fullName email')
      .populate('winners', 'fullName email')
      .sort({ cycleNumber: 1 });
    const contributions = await Contribution.find({ group: groupId }).sort({ cycleNumber: 1, member: 1 });

    const schedule = payouts.map((payout) => {
      const cycleContributions = contributions.filter((c) => c.cycleNumber === payout.cycleNumber);
      const totalPool = cycleContributions.reduce((sum, c) => sum + c.amount, 0);
      const allPaid = cycleContributions.every((c) => c.status === 'paid');
      const receiverNames = (payout.winners && payout.winners.length)
        ? payout.winners.map((u) => u.fullName || '—').join(', ')
        : (payout.member?.fullName || '—');

      return {
        cycleNumber: payout.cycleNumber,
        receiver: payout.member,
        receiverNames,
        amount: payout.amount,
        status: payout.status,
        paidAt: payout.paidAt,
        totalPool,
        allPaid,
        contributions: cycleContributions,
      };
    });

    return res.json({ group, schedule });
  } catch (err) {
    console.error('GetGroupSchedule error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** Get a particular user's data for a particular cycle and ekub (contribution + whether they won) */
export async function getMemberCycleData(req, res) {
  try {
    const requesterId = req.user.sub;
    const { groupId, cycleNumber, userId: memberId } = req.params;
    const cycleNum = Number(cycleNumber);
    if (Number.isNaN(cycleNum) || cycleNum < 1) {
      return res.status(400).json({ message: 'Invalid cycle number' });
    }

    const group = await EkubGroup.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isAdmin = group.admin.toString() === requesterId;
    const isMember = group.members.some((m) => m.user && m.user.toString() === requesterId);
    const canView = isAdmin || requesterId === memberId;
    if (!canView || (!isAdmin && !isMember)) {
      return res.status(403).json({ message: 'Not allowed to view this data' });
    }

    const cycle = await Cycle.findOne({ group: groupId, cycleNumber: cycleNum }).lean();
    const contribution = await Contribution.findOne({
      group: groupId,
      member: memberId,
      cycleNumber: cycleNum,
    })
      .populate('member', 'fullName email')
      .lean();
    const payout = await Payout.findOne({ group: groupId, cycleNumber: cycleNum })
      .populate('winners', 'fullName email')
      .lean();

    const memberIdStr = memberId;
    const isWinner = payout && (
      (payout.winners && payout.winners.some((w) => (w._id || w).toString() === memberIdStr)) ||
      (payout.member && (payout.member._id ? payout.member._id.toString() : payout.member.toString()) === memberIdStr)
    );

    return res.json({
      group: { _id: group._id, name: group.name },
      cycle: cycle ? {
        _id: cycle._id,
        cycleNumber: cycle.cycleNumber,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
      } : { cycleNumber: cycleNum, startDate: null, endDate: null },
      memberId,
      contribution: contribution ? {
        _id: contribution._id,
        amount: contribution.amount,
        dueDate: contribution.dueDate,
        status: contribution.status,
        paidAt: contribution.paidAt,
        memberName: contribution.member?.fullName || contribution.member?.email,
      } : null,
      payout: isWinner && payout ? {
        _id: payout._id,
        amount: payout.amount,
        status: payout.status,
        paidAt: payout.paidAt,
        winnerNames: (payout.winners || []).map((w) => w.fullName || w.email || '—').join(', '),
      } : null,
      isWinner: !!isWinner,
    });
  } catch (err) {
    console.error('GetMemberCycleData error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** Creator/member view: contributions (filter by paid/unpaid), totals, and who has received payout vs not */
export async function getGroupPaymentTracking(req, res) {
  try {
    const userId = req.user.sub;
    const { groupId } = req.params;

    const group = await EkubGroup.findById(groupId).populate('members.user', 'fullName email');
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isAdmin = group.admin.toString() === userId;
    const isMember = group.members.some((m) => m.user && m.user.toString() === userId);
    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: 'Only the creator or members can view payment tracking' });
    }

    const activeMembers = (group.members || []).filter((m) => m.status === 'active');
    const membersList = activeMembers.map((m) => ({
      _id: m.user?._id?.toString() || m.user?.toString(),
      fullName: m.user?.fullName || null,
      email: m.user?.email || null,
      amount: m.amount ?? 0,
    }));

    const contributions = await Contribution.find({ group: groupId })
      .populate('member', 'fullName email')
      .sort({ cycleNumber: 1, member: 1 })
      .lean();

    const payouts = await Payout.find({ group: groupId })
      .populate('member', 'fullName email')
      .populate('winners', 'fullName email')
      .sort({ cycleNumber: 1 })
      .lean();

    const paidContributions = contributions.filter((c) => c.status === 'paid');
    const unpaidContributions = contributions.filter((c) => c.status !== 'paid');
    const totalPaid = paidContributions.reduce((sum, c) => sum + c.amount, 0);
    const totalUnpaid = unpaidContributions.reduce((sum, c) => sum + c.amount, 0);

    const receivedPayouts = payouts.filter((p) => p.status === 'paid');
    const pendingPayouts = payouts.filter((p) => p.status !== 'paid');

    function winnerNames(p) {
      const list = (p.winners && p.winners.length) ? p.winners : (p.member ? [p.member] : []);
      return list.map((u) => (u && u.fullName) || '—').join(', ');
    }

    const memberCount = activeMembers.length;
    return res.json({
      isAdmin,
      group: {
        _id: group._id,
        name: group.name,
        contributionFrequency: group.contributionFrequency,
        startDate: group.startDate,
        memberCount,
      },
      members: membersList,
      contributions: contributions.map((c) => ({
        _id: c._id,
        cycleNumber: c.cycleNumber,
        member: c.member,
        memberName: c.member?.fullName || '—',
        amount: c.amount,
        status: c.status,
        dueDate: c.dueDate,
        paidAt: c.paidAt,
      })),
      contributionSummary: {
        totalPaid,
        totalUnpaid,
        paidCount: paidContributions.length,
        unpaidCount: unpaidContributions.length,
        totalCount: contributions.length,
      },
      payoutsReceived: receivedPayouts.map((p) => ({
        cycleNumber: p.cycleNumber,
        member: p.member,
        memberName: winnerNames(p),
        amount: p.amount,
        paidAt: p.paidAt,
      })),
      payoutsPending: pendingPayouts.map((p) => ({
        cycleNumber: p.cycleNumber,
        member: p.member,
        memberName: winnerNames(p),
        amount: p.amount,
        status: p.status,
      })),
    });
  } catch (err) {
    console.error('GetGroupPaymentTracking error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** Current user's contributions for this group (for Pay Ekub modal) */
export async function getGroupMyContributions(req, res) {
  try {
    const userId = req.user.sub;
    const { groupId } = req.params;

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isAdmin = group.admin.toString() === userId;
    const isMember = group.members.some((m) => m.user && m.user.toString() === userId);
    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: 'Only the creator or members can view contributions' });
    }

    const memberObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const contributions = await Contribution.find({ group: groupId, member: memberObjectId })
      .sort({ cycleNumber: 1, dueDate: 1 })
      .lean();

    const isCreatorNotMember = isAdmin && !group.members.some((m) => m.user && m.user.toString() === userId);
    return res.json({
      contributions: contributions || [],
      isCreatorNotMember: contributions.length === 0 && isCreatorNotMember,
    });
  } catch (err) {
    console.error('GetGroupMyContributions error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** Who won per cycle (for members and admin – no contribution details). Returns all payouts with status (paid/pending). */
export async function getGroupWinners(req, res) {
  try {
    const userId = req.user.sub;
    const { groupId } = req.params;

    const group = await EkubGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isAdmin = group.admin.toString() === userId;
    const isMember = group.members.some((m) => m.user && m.user.toString() === userId);
    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: 'Only the creator or members can view winners' });
    }

    const payouts = await Payout.find({ group: groupId })
      .populate('member', 'fullName')
      .populate('winners', 'fullName')
      .sort({ cycleNumber: 1 })
      .lean();

    const winnerNames = (p) => {
      const list = (p.winners && p.winners.length) ? p.winners : (p.member ? [p.member] : []);
      return list.map((u) => (u && u.fullName) || '—').join(', ');
    };

    return res.json({
      group: { _id: group._id, name: group.name },
      currentCycleIndex: group.currentCycleIndex ?? 0,
      winners: payouts.map((p) => ({
        cycleNumber: p.cycleNumber,
        memberName: winnerNames(p),
        amount: p.amount,
        status: p.status || 'locked',
        paidAt: p.paidAt,
      })),
    });
  } catch (err) {
    console.error('GetGroupWinners error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getDashboard(req, res) {
  try {
    const userId = req.user.sub;
    const groupsRaw = await EkubGroup.find({
      $or: [{ admin: userId }, { 'members.user': userId }],
      status: { $in: ['draft', 'active'] },
    })
      .sort({ createdAt: -1 })
      .lean();
    const groups = groupsRaw.map((g) => ({
      ...g,
      isAdmin: g.admin.toString() === userId,
    }));

    const pastGroupsRaw = await EkubGroup.find({
      $or: [{ admin: userId }, { 'members.user': userId }],
      status: 'completed',
    })
      .sort({ updatedAt: -1 })
      .lean();
    const pastGroups = pastGroupsRaw.map((g) => ({
      ...g,
      isAdmin: g.admin.toString() === userId,
    }));

    const groupIds = groups.map((g) => g._id);
    const contributions = await Contribution.find({ group: { $in: groupIds }, member: userId })
      .sort({ dueDate: 1 })
      .lean();
    const payouts = await Payout.find({ group: { $in: groupIds }, member: userId });

    const activeEkubs = groups.length;
    const groupMap = new Map(groups.map((g) => [g._id.toString(), g]));

    const unpaidContributions = contributions.filter((c) => c.status !== 'paid');
    const upcomingPayments = unpaidContributions.slice(0, 15).map((c) => {
      const group = groupMap.get(c.group.toString());
      return {
        _id: c._id,
        groupId: c.group.toString(),
        groupName: group?.name || 'Ekub',
        cycleNumber: c.cycleNumber,
        amount: c.amount,
        dueDate: c.dueDate ? new Date(c.dueDate).toISOString() : null,
      };
    });

    const unpaidPayouts = payouts.filter((p) => p.status !== 'paid').slice(0, 5);
    const upcomingPayouts = unpaidPayouts.map((p) => {
      const group = groupMap.get(p.group.toString());
      const dueDate = group && group.startDate && group.contributionFrequency
        ? computeNextDueDate(group.startDate, group.contributionFrequency, p.cycleNumber - 1)
        : null;
      return {
        _id: p._id,
        cycleNumber: p.cycleNumber,
        amount: p.amount,
        groupName: group?.name || 'Ekub',
        dueDate: dueDate ? dueDate.toISOString() : null,
      };
    });

    return res.json({
      activeEkubs,
      groups,
      pastGroups,
      contributions,
      upcomingPayouts,
      upcomingPayments,
    });
  } catch (err) {
    console.error('GetDashboard error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

