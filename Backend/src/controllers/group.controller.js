import EkubGroup from "../models/ekubGroup.model.js";

export const createGroup = async (req, res) => {
  const { name, contributionAmount, maxMembers, frequency } = req.body;
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const amount = Number(contributionAmount);
  const memberLimit = Number(maxMembers);

  if (!normalizedName || !Number.isFinite(amount) || !Number.isFinite(memberLimit)) {
    return res.status(400).json({
      message: "name, contributionAmount, and maxMembers are required.",
    });
  }

  if (amount < 1) {
    return res.status(400).json({ message: "contributionAmount must be at least 1." });
  }

  if (memberLimit < 2) {
    return res.status(400).json({ message: "maxMembers must be at least 2." });
  }

  const group = await EkubGroup.create({
    name: normalizedName,
    contributionAmount: amount,
    maxMembers: memberLimit,
    frequency,
    createdBy: req.user._id,
    members: [
      {
        user: req.user._id,
        role: "admin",
        status: "approved",
      },
    ],
  });

  return res.status(201).json({ group });
};

export const listMyGroups = async (req, res) => {
  const groups = await EkubGroup.find({
    "members.user": req.user._id,
  })
    .sort({ createdAt: -1 })
    .populate("createdBy", "name email");

  return res.json({ groups });
};

export const getGroupById = async (req, res) => {
  const { groupId } = req.params;
  const group = await EkubGroup.findById(groupId)
    .populate("createdBy", "name email")
    .populate("members.user", "name email");

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  const isMember = group.members.some(
    (member) => member.user?._id?.toString() === req.user._id.toString()
  );

  if (!isMember) {
    return res.status(403).json({ message: "You are not a member of this group." });
  }

  return res.json({ group });
};

export const requestJoinGroup = async (req, res) => {
  const { groupId } = req.params;
  const group = await EkubGroup.findById(groupId);

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  if (group.members.length >= group.maxMembers) {
    return res.status(400).json({ message: "Group is already full." });
  }

  const alreadyMember = group.members.some(
    (member) => member.user?.toString() === req.user._id.toString()
  );
  if (alreadyMember) {
    return res.status(409).json({ message: "You already joined or requested this group." });
  }

  group.members.push({
    user: req.user._id,
    role: "member",
    status: "pending",
  });

  await group.save();
  return res.status(201).json({ message: "Join request sent.", group });
};
