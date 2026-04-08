import { fromNodeHeaders } from 'better-auth/node';
import { User } from '../models/user.model.js';

/**
 * Creates middleware that resolves better-auth session and syncs to our User model.
 * Sets req.user = { sub, roles } for use by controllers (sub = our User._id).
 */
export function createAuthMiddleware(auth) {
  return async function authMiddleware(req, res, next) {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!session?.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const { email, name } = session.user;
      let user = await User.findOne({ email });
      if (!user) {
        const passwordHash = await User.hashPassword(
          Math.random().toString(36) + 'placeholder'
        );
        user = await User.create({
          fullName: name || email.split('@')[0],
          email,
          passwordHash,
          isVerified: true,
        });
      }
      req.user = {
        sub: user._id.toString(),
        email: user.email,
        roles: user.roles || ['member'],
      };
      next();
    } catch (err) {
      console.error('Auth middleware error', err);
      return res.status(401).json({ message: 'Authentication required' });
    }
  };
}

/** Use after createAuthMiddleware; ensures req.user exists (for route-level use). */
export function authRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

export function requireRole(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const userRoles = req.user.roles || [];
    const hasRole = userRoles.some((r) => allowed.includes(r));
    if (!hasRole) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
