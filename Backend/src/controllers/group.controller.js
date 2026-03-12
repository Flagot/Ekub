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
