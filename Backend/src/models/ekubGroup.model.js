import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "approved",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const ekubGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contributionAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    maxMembers: {
      type: Number,
      required: true,
      min: 2,
    },
    frequency: {
      type: String,
      enum: ["weekly", "biweekly", "monthly"],
      default: "monthly",
    },
    status: {
      type: String,
      enum: ["draft", "active", "completed"],
      default: "draft",
    },
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
  },
  { timestamps: true }
);

ekubGroupSchema.index({ createdBy: 1 });
ekubGroupSchema.index({ "members.user": 1 });

const EkubGroup = mongoose.model("EkubGroup", ekubGroupSchema);

export default EkubGroup;
