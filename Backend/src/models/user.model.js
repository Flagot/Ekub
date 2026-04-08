import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String },
    nationalId: { type: String }, // simple identity field for MVP
    isVerified: { type: Boolean, default: false },
    roles: {
      type: [String],
      enum: ['member', 'admin', 'superadmin'],
      default: ['member'],
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'defaulted'],
      default: 'active',
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const User = mongoose.model('User', userSchema);

