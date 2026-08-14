const DEFAULT_SETTINGS = require('../../data/settings.json');

const SETTINGS_KEY = 'nile:settings';

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateSettings(body) {
  if (typeof body !== 'object' || body === null) return 'Settings must be an object';
  for (const key of ['paymentLink', 'phone1', 'phone2', 'email', 'hours']) {
    if (!isNonEmptyString(body[key])) return `"${key}" is required`;
  }
  try {
    const url = new URL(body.paymentLink);
    if (!['http:', 'https:'].includes(url.protocol)) return 'paymentLink must be an http(s) URL';
  } catch {
    return 'paymentLink must be a valid URL';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return 'email is not valid';
  const lot = body.lot;
  if (typeof lot !== 'object' || lot === null) return '"lot" is required';
  for (const key of ['name', 'address', 'description']) {
    if (!isNonEmptyString(lot[key])) return `"lot.${key}" is required`;
  }
  if (!Array.isArray(lot.near) || !lot.near.every(isNonEmptyString)) {
    return '"lot.near" must be a list of non-empty strings';
  }
  return null;
}

async function getSettings(redis) {
  const stored = await redis.get(SETTINGS_KEY);
  return stored || DEFAULT_SETTINGS;
}

async function saveSettings(redis, settings) {
  await redis.set(SETTINGS_KEY, settings);
}

module.exports = { validateSettings, getSettings, saveSettings, DEFAULT_SETTINGS };
