import mongoose from 'mongoose';

const { Schema } = mongoose;

const payoutSchema = new Schema(
  {
    group: { type: Schema.Types.ObjectId, ref: 'EkubGroup', required: true },
    cycle: { type: Schema.Types.ObjectId, ref: 'Cycle' },
    /** First winner (for backward compat); use winners when multiple */
    member: { type: Schema.Types.ObjectId, ref: 'User' },
    /** All winners for this cycle (one or more; e.g. group of two people) */
    winners: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    cycleNumber: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['scheduled', 'paid', 'locked'],
      default: 'locked',
    },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

payoutSchema.index({ group: 1, cycleNumber: 1 }, { unique: true });

export const Payout = mongoose.model('Payout', payoutSchema);

