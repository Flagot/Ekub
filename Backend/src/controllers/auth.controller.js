import bcrypt from "bcryptjs";
import { signToken } from "../config/jwt.js";
import User from "../models/user.model.js";

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
});

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedName || !normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already in use." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
    });

    const token = signToken({ sub: user._id.toString(), email: user.email });
    return res.status(201).json({ token, user: userResponse(user) });
  } catch (error) {
    if (error?.code === 13297) {
      return res.status(500).json({
        message:
          "Database name case conflict detected. Set MONGO_DB_NAME in Backend/.env (for example: Ekub).",
      });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Email already in use." });
    }
    return res.status(500).json({ message: "Failed to create user account." });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = signToken({ sub: user._id.toString(), email: user.email });
    return res.json({ token, user: userResponse(user) });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to login. Please try again." });
  }
};

export const me = async (req, res) => {
  return res.json({ user: req.user });
};
