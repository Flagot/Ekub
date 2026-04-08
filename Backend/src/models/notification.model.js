import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    group: { type: Schema.Types.ObjectId, ref: 'EkubGroup' },
    type: {
      type: String,
      enum: ['PAYMENT_DUE', 'PAYOUT_RECEIVED', 'MISSED_PAYMENT', 'CYCLE_WINNER', 'WINNER_CHOSEN', 'WINNER_ANNOUNCED', 'ADDED_TO_EKUB', 'PAYMENT_SUCCESS', 'JOIN_REQUEST_REJECTED'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);

