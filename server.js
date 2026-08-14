const path = require('path');
const fs = require('fs/promises');
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

const PORT = process.env.PORT || 8000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_PASSWORD || !SESSION_SECRET) {
  console.error('Missing ADMIN_PASSWORD or SESSION_SECRET. Set them in .env (see .env.example).');
  process.exit(1);
}

const SETTINGS_PATH = path.join(__dirname, 'data', 'settings.json');

const app = express();
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  },
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

async function readSettings() {
  const raw = await fs.readFile(SETTINGS_PATH, 'utf8');
  return JSON.parse(raw);
}

async function writeSettings(settings) {
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

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

// Login attempts are rate-limited to slow down password guessing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/login', loginLimiter, (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== 'string' || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  res.json({ authenticated: Boolean(req.session && req.session.isAdmin) });
});

// Public: the landing page reads current settings on load.
app.get('/api/settings', async (req, res) => {
  try {
    res.json(await readSettings());
  } catch (err) {
    res.status(500).json({ error: 'Could not read settings' });
  }
});

app.put('/api/settings', requireAuth, async (req, res) => {
  const error = validateSettings(req.body);
  if (error) return res.status(400).json({ error });
  try {
    await writeSettings(req.body);
    res.json({ ok: true, settings: req.body });
  } catch (err) {
    res.status(500).json({ error: 'Could not save settings' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Nile Parking site running at http://localhost:${PORT}`);
  console.log(`Admin page at http://localhost:${PORT}/admin.html`);
});
