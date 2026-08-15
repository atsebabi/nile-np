const { getRedis } = require('./_lib/redis');
const { setAuthCookie } = require('./_lib/auth');

const WINDOW_SECONDS = 15 * 60;
