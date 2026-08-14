const { Redis } = require('@upstash/redis');

let client;

function getRedis() {
  if (!client) {
    // Reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from env,
    // which the Vercel Upstash integration sets automatically.
    client = Redis.fromEnv();
  }
  return client;
}

module.exports = { getRedis };
