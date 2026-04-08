import mongoose from 'mongoose';

const { Schema } = mongoose;

const ekubMemberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    amount: { type: Number, min: 0 },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'rejected', 'defaulted', 'left'],
      default: 'active',
    },
    joinedAt: { type: Date },
    leftAt: { type: Date },
  },
  { _id: true }
);

const ekubGroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [ekubMemberSchema],
    fixedContributionAmount: { type: Number, min: 0 },
    contributionFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    /** How many cycles the Ekub runs (e.g. 10 monthly = 10 slots, one winner per cycle). */
    numberOfCycles: { type: Number, min: 1 },
    /** Payout to the winner(s) each cycle (e.g. 10000). Pool per cycle = sum of slot contributions = this. */
    payoutPerCycle: { type: Number, min: 0 },
    /** Min contribution per person per cycle (e.g. 500). Enforced when adding members. */
    minContributionPerPerson: { type: Number, min: 0 },
    /** Max contribution per person per cycle (e.g. 1000). Enforced when adding members. */
    maxContributionPerPerson: { type: Number, min: 0 },
    numberOfMembers: { type: Number, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    payoutStrategy: {
      type: String,
      enum: ['RANDOM', 'MANUAL_PRIORITY', 'CUSTOM_ORDER'],
      default: 'MANUAL_PRIORITY',
    },
    /** Order of slots; each slot = one or more user IDs. Stored as array of arrays. */
    payoutOrder: { type: Schema.Types.Mixed, default: [] },
    currentCycleIndex: { type: Number, default: 0 }, // index in payoutOrder
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'cancelled'],
      default: 'draft',
    },
    visibility: {
      type: String,
      enum: ['private', 'public'],
      default: 'private',
    },
  },
  { timestamps: true }
);

export const EkubGroup = mongoose.model('EkubGroup', ekubGroupSchema);

