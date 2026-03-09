import EkubGroup from "../models/ekubGroup.model.js";

export const createGroup = async (req, res) => {
  const { name, contributionAmount, maxMembers, frequency } = req.body;

  if (!name || !contributionAmount || !maxMembers) {
    return res.status(400).json({
      message: "name, contributionAmount, and maxMembers are required.",
    });
  }

  const group = await EkubGroup.create({
    name,
    contributionAmount,
    maxMembers,
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
