import mongoose from 'mongoose';

const { Schema } = mongoose;

const transactionLogSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['CONTRIBUTION', 'PAYOUT', 'PENALTY', 'SYSTEM'],
      required: true,
    },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    group: { type: Schema.Types.ObjectId, ref: 'EkubGroup' },
    contribution: { type: Schema.Types.ObjectId, ref: 'Contribution' },
    payout: { type: Schema.Types.ObjectId, ref: 'Payout' },
    amount: { type: Number, required: true },
    direction: {
      type: String,
      enum: ['DEBIT', 'CREDIT'],
      required: true,
    },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const TransactionLog = mongoose.model('TransactionLog', transactionLogSchema);

