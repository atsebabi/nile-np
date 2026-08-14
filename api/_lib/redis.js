const { Redis } = require('@upstash/redis');

let client;

function getRedis() {
  if (!client) {
    // Vercel's Upstash integration names these KV_REST_API_URL / KV_REST_API_TOKEN;
    // fall back to the UPSTASH_REDIS_REST_* names in case a different setup is used.
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error('Redis env vars are not set (KV_REST_API_URL / KV_REST_API_TOKEN)');
    client = new Redis({ url, token });
  }
  return client;
}

module.exports = { getRedis };
