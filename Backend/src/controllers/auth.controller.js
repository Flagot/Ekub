import { User } from '../models/user.model.js';
import { signJwt } from '../config/jwt.js';

export async function register(req, res) {
  try {
    const { fullName, email, password, phone, nationalId } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'fullName, email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      fullName,
      email,
      passwordHash,
      phone,
      nationalId,
      isVerified: true, // auto-verify for MVP; plug real KYC later
    });

    const token = signJwt({
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
    });

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signJwt({
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
    });

    return res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getMe(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user });
  } catch (err) {
    console.error('GetMe error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

