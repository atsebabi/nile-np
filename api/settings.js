const { getRedis } = require('./_lib/redis');
const { isAuthenticated } = require('./_lib/auth');
const { validateSettings, getSettings, saveSettings } = require('./_lib/settings');

module.exports = async function handler(req, res) {
  const redis = getRedis();

  if (req.method === 'GET') {
    const settings = await getSettings(redis);
    res.status(200).json(settings);
    return;
  }

  if (req.method === 'PUT') {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const error = validateSettings(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    await saveSettings(redis, req.body);
    res.status(200).json({ ok: true, settings: req.body });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
