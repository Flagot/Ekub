import mongoose from 'mongoose';

const { Schema } = mongoose;

const contributionSchema = new Schema(
  {
    group: { type: Schema.Types.ObjectId, ref: 'EkubGroup', required: true },
    cycle: { type: Schema.Types.ObjectId, ref: 'Cycle' },
    member: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cycleNumber: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'paid', 'missed'],
      default: 'pending',
    },
    isLate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

contributionSchema.index({ group: 1, member: 1, cycleNumber: 1 }, { unique: true });
contributionSchema.index({ member: 1, group: 1, cycleNumber: 1 });

export const Contribution = mongoose.model('Contribution', contributionSchema);

