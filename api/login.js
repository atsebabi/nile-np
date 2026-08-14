const { getRedis } = require('./_lib/redis');
const { setAuthCookie } = require('./_lib/auth');

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 10;

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const redis = getRedis();
  const key = `nile:loginattempts:${clientIp(req)}`;
  const attempts = await redis.incr(key);
  if (attempts === 1) await redis.expire(key, WINDOW_SECONDS);
  if (attempts > MAX_ATTEMPTS) {
    res.status(429).json({ error: 'Too many attempts. Try again later.' });
    return;
  }

  const { password } = req.body || {};
  if (typeof password !== 'string' || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }

  await redis.del(key);
  setAuthCookie(res);
  res.status(200).json({ ok: true });
};
