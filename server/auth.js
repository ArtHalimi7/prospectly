import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Read the secret lazily: this module is imported before index.js loads .env.
// There is no hardcoded fallback; without JWT_SECRET a random per-process secret
// is used, so tokens can't be forged (sessions just reset on restart).
const RANDOM_SECRET = crypto.randomBytes(48).toString('hex');
let warnedMissingSecret = false;
function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!warnedMissingSecret) {
    console.warn('[auth] JWT_SECRET is not set; using a random secret, so sessions reset on restart.');
    warnedMissingSecret = true;
  }
  return RANDOM_SECRET;
}

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      profession: user.profession,
      portfolio_url: user.portfolio_url
    },
    jwtSecret(),
    { expiresIn: '30d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret());
  } catch (err) {
    return null;
  }
}

/**
 * Express Middleware to require authentication
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing or invalid Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }

  req.user = decoded;
  next();
}

/**
 * Optional Authentication middleware: populates req.user if token is present
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}
