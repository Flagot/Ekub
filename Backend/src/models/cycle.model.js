import mongoose from 'mongoose';

const { Schema } = mongoose;

const cycleSchema = new Schema(
  {
    group: { type: Schema.Types.ObjectId, ref: 'EkubGroup', required: true },
    cycleNumber: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
  },
  { timestamps: true }
);

cycleSchema.index({ group: 1, cycleNumber: 1 }, { unique: true });

export const Cycle = mongoose.model('Cycle', cycleSchema);
