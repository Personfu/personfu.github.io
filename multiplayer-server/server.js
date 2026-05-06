const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

dotenv.config();

const PORT = Number(process.env.PORT || 8787);
const APP_ORIGIN = process.env.APP_ORIGIN || '*';
const DATABASE_URL = process.env.DATABASE_URL || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const DB_FILE = path.join(__dirname, 'db.json');

// JWT_SECRET: use env var in production. If missing, generate an ephemeral secret
// so the server starts, but warn loudly — tokens will invalidate on restart.
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('╔══════════════════════════════════════════════════════════╗');
  console.warn('║  WARNING: JWT_SECRET not set in environment variables.   ║');
  console.warn('║  Using an ephemeral random secret — all tokens will be  ║');
  console.warn('║  invalidated on server restart. Set JWT_SECRET in your  ║');
  console.warn('║  Railway service environment variables for production.   ║');
  console.warn('╚══════════════════════════════════════════════════════════╝');
}

function parseAllowedOrigins(value) {
  if (!value || value.trim() === '*') {
    return ['*'];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const ALLOWED_ORIGINS = parseAllowedOrigins(APP_ORIGIN);

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes('*')) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function corsOriginHandler(origin, callback) {
  if (isOriginAllowed(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error('Origin not allowed by CyberWorld CORS policy'));
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS.includes('*') ? true : ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: corsOriginHandler, credentials: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiterGeneral = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — slow down, operative.' }
});
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts — try again in 15 minutes.' }
});
const limiterCtfVerify = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'CTF verify rate limit hit.' }
});
app.use('/api/', limiterGeneral);
app.use('/api/auth/login', limiterAuth);
app.use('/api/auth/register', limiterAuth);
app.use('/api/ctf/verify', limiterCtfVerify);

// Parse JSON for all routes EXCEPT the Stripe webhook (which needs raw body)
app.use((req, res, next) => {
  if (req.path === '/api/stripe/webhook') return next();
  express.json()(req, res, next);
});

// ═══════════════════════════════════════════
// Persistence layer — Postgres when DATABASE_URL is set, JSON file fallback
// ═══════════════════════════════════════════

let pool = null;
let usePostgres = false;

if (DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false }
  });
  usePostgres = true;
  console.log('[DB] PostgreSQL mode enabled (Supabase / Railway / custom)');
} else {
  console.log('[DB] JSON file mode (set DATABASE_URL for Supabase Postgres or Railway Postgres)');
}

// ── Postgres schema bootstrap ──
async function ensureSchema() {
  if (!usePostgres) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      subscription_tier TEXT NOT NULL DEFAULT 'free',
      stripe_customer_id TEXT,
      progress JSONB NOT NULL DEFAULT '{}',
      billing JSONB NOT NULL DEFAULT '{}',
      inventory JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS world_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'
    );
    INSERT INTO world_state (key, value)
      VALUES ('meta', '{"operation":"Operation Starshield","globalThreat":"CRITICAL","onlineCount":0,"activeLobbies":[],"news":["Starshield relay weather: unstable but recoverable."]}')
      ON CONFLICT (key) DO NOTHING;
    CREATE TABLE IF NOT EXISTS flag_submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      challenge_id TEXT NOT NULL,
      flag_hash TEXT NOT NULL,
      correct BOOLEAN NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('[DB] Schema verified');
}

// ── JSON file persistence (dev fallback) ──
function ensureDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], world: { onlineCount: 0, activeLobbies: [], news: [] } }, null, 2));
  }
}

function loadDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ── Unified data access ──
const store = {
  async findUserByEmail(email) {
    if (usePostgres) {
      const r = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return r.rows[0] ? pgToUser(r.rows[0]) : null;
    }
    const db = loadDb();
    return db.users.find((u) => u.email === email) || null;
  },

  async findUserById(id) {
    if (usePostgres) {
      const r = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return r.rows[0] ? pgToUser(r.rows[0]) : null;
    }
    const db = loadDb();
    return db.users.find((u) => u.id === id) || null;
  },

  async createUser(user) {
    if (usePostgres) {
      await pool.query(
        `INSERT INTO users (id, email, display_name, password_hash, subscription_tier, progress, billing, inventory)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [user.id, user.email, user.displayName, user.passwordHash, user.subscriptionTier,
         JSON.stringify(user.progress), JSON.stringify(user.billing), JSON.stringify(user.inventory || [])]
      );
      return user;
    }
    const db = loadDb();
    db.users.push(user);
    saveDb(db);
    return user;
  },

  async updateUser(user) {
    if (usePostgres) {
      await pool.query(
        `UPDATE users SET display_name=$2, subscription_tier=$3, progress=$4, billing=$5,
         inventory=$6, stripe_customer_id=$7 WHERE id=$1`,
        [user.id, user.displayName, user.subscriptionTier, JSON.stringify(user.progress),
         JSON.stringify(user.billing), JSON.stringify(user.inventory || []), user.stripeCustomerId || null]
      );
      return user;
    }
    const db = loadDb();
    const idx = db.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) db.users[idx] = user;
    saveDb(db);
    return user;
  },

  async findUserByStripeCustomer(customerId) {
    if (usePostgres) {
      const r = await pool.query('SELECT * FROM users WHERE stripe_customer_id = $1', [customerId]);
      return r.rows[0] ? pgToUser(r.rows[0]) : null;
    }
    const db = loadDb();
    return db.users.find((u) => u.stripeCustomerId === customerId) || null;
  },

  async getWorldMeta() {
    if (usePostgres) {
      const r = await pool.query("SELECT value FROM world_state WHERE key = 'meta'");
      return r.rows[0] ? r.rows[0].value : { onlineCount: 0, activeLobbies: [], news: [] };
    }
    return loadDb().world;
  },

  async updateWorldMeta(partial) {
    if (usePostgres) {
      const current = await this.getWorldMeta();
      const merged = { ...current, ...partial };
      await pool.query("UPDATE world_state SET value = $1 WHERE key = 'meta'", [JSON.stringify(merged)]);
      return merged;
    }
    const db = loadDb();
    Object.assign(db.world, partial);
    saveDb(db);
    return db.world;
  }
};

function pgToUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    subscriptionTier: row.subscription_tier,
    stripeCustomerId: row.stripe_customer_id,
    progress: row.progress || {},
    billing: row.billing || {},
    inventory: row.inventory || [],
    createdAt: row.created_at
  };
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    subscriptionTier: user.subscriptionTier,
    progress: user.progress,
    inventory: user.inventory || [],
    createdAt: user.createdAt
  };
}

function authOptional(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (_err) {
    req.user = null;
  }
  return next();
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Auth required' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function canAccessChapter(user, chapter) {
  if (chapter <= 3) {
    return { allowed: true, reason: 'Free story access' };
  }

  if (!user) {
    return {
      allowed: false,
      reason: 'Email login required for Chapter 4 and multiplayer progression.',
      code: 'LOGIN_REQUIRED'
    };
  }

  if (chapter === 4) {
    return { allowed: true, reason: 'Authenticated free-tier access for Chapter 4' };
  }

  if (user.subscriptionTier === 'basic' || user.subscriptionTier === 'pro') {
    return { allowed: true, reason: `${user.subscriptionTier} subscription active` };
  }

  return {
    allowed: false,
    reason: 'Basic subscription required for Chapter 5+.',
    code: 'SUBSCRIPTION_REQUIRED'
  };
}

function issueToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '14d' });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'cyberworld-multiplayer', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = await store.findUserByEmail(normalizedEmail);
  if (exists) {
    return res.status(409).json({ error: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = {
    id: makeId('usr'),
    email: normalizedEmail,
    displayName: displayName || normalizedEmail.split('@')[0],
    passwordHash,
    createdAt: new Date().toISOString(),
    subscriptionTier: 'free',
    progress: {
      currentChapter: 1,
      highestUnlockedChapter: 3,
      xp: 0,
      missionsCleared: [],
      companions: [],
      factionReputation: {
        fllc: 0,
        sentinel: 0,
        corsair: 0,
        ghostline: 0
      }
    },
    inventory: [],
    billing: {
      status: 'inactive',
      lastUpdated: null
    }
  };

  await store.createUser(user);
  const token = issueToken(user);
  return res.status(201).json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await store.findUserByEmail(normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = issueToken(user);
  return res.json({ token, user: sanitizeUser(user) });
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  const user = await store.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user: sanitizeUser(user) });
});

app.get('/api/world/state', authOptional, async (req, res) => {
  const world = await store.getWorldMeta();
  const user = req.user ? await store.findUserById(req.user.id) : null;
  res.json({
    operation: world.operation,
    globalThreat: world.globalThreat,
    onlineCount: world.onlineCount,
    activeLobbies: world.activeLobbies,
    news: world.news,
    user: user ? sanitizeUser(user) : null
  });
});

app.get('/api/gate', authOptional, async (req, res) => {
  const chapter = Number(req.query.chapter || 1);
  const user = req.user ? await store.findUserById(req.user.id) : null;
  const gate = canAccessChapter(user, chapter);
  return res.json({ chapter, ...gate, tier: user ? user.subscriptionTier : 'guest' });
});

app.get('/api/progress', authRequired, async (req, res) => {
  const user = await store.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ progress: user.progress, inventory: user.inventory || [], subscriptionTier: user.subscriptionTier });
});

// ── Gameplay state: progress + mission rewards + faction rep + inventory ──
const MISSION_REWARDS = {
  signal_drift:      { xp: 100, factionRep: { ghostline: 10 }, tool: 'signal_intercept', companion: 'recon_daemon' },
  neon_beacon:       { xp: 120, factionRep: { sentinel: 10 }, tool: 'scanner_v1' },
  dead_drop:         { xp: 130, factionRep: { corsair: 15 }, tool: 'escrow_probe' },
  honeypot:          { xp: 150, factionRep: { sentinel: 15 }, tool: 'honeypot_builder', companion: 'firewall_sprite' },
  steg:              { xp: 160, factionRep: { ghostline: 15 }, tool: 'steg_decoder', companion: 'crypto_ghost' },
  sql_bypass:        { xp: 170, factionRep: { corsair: 10 }, tool: 'sql_injector' },
  subdomain_enum:    { xp: 140, factionRep: { ghostline: 10 }, tool: 'subdomain_mapper' },
  memory_vault:      { xp: 200, factionRep: { sentinel: 20 }, tool: 'relay_patch_kit' },
  reverse_engineer:  { xp: 220, factionRep: { fllc: 20 }, tool: 'binary_disassembler' },
  cve_dashboard:     { xp: 180, factionRep: { sentinel: 15 }, tool: 'cve_correlator' },
  threat_model:      { xp: 250, factionRep: { fllc: 25 }, tool: 'threat_modeler' },
  buffer_overflow:   { xp: 280, factionRep: { corsair: 20 }, tool: 'overflow_exploit' },
  advanced_sniffer:  { xp: 260, factionRep: { ghostline: 20 }, tool: 'packet_sniffer', companion: 'signal_hound' },
  incident_response: { xp: 300, factionRep: { sentinel: 25 }, tool: 'ir_toolkit' },
  final_node:        { xp: 400, factionRep: { fllc: 30 }, tool: 'uplink_guardian' },
  exfil_apex:        { xp: 500, factionRep: { fllc: 50 }, tool: 'exfil_platform', companion: 'archive_construct' }
};

app.post('/api/progress', authRequired, async (req, res) => {
  const { chapter, missionId, xpDelta } = req.body || {};
  const user = await store.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const chapterNum = Number(chapter || user.progress.currentChapter || 1);
  const gate = canAccessChapter(user, chapterNum);
  if (!gate.allowed) {
    return res.status(403).json(gate);
  }

  let rewardsApplied = null;

  if (missionId && !user.progress.missionsCleared.includes(missionId)) {
    user.progress.missionsCleared.push(missionId);

    // Apply mission rewards
    const reward = MISSION_REWARDS[missionId];
    if (reward) {
      user.progress.xp += reward.xp || 0;

      // Faction reputation
      if (reward.factionRep) {
        user.progress.factionReputation = user.progress.factionReputation || { fllc: 0, sentinel: 0, corsair: 0, ghostline: 0 };
        for (const [faction, rep] of Object.entries(reward.factionRep)) {
          user.progress.factionReputation[faction] = (user.progress.factionReputation[faction] || 0) + rep;
        }
      }

      // Tool unlock
      if (reward.tool) {
        user.inventory = user.inventory || [];
        if (!user.inventory.includes(reward.tool)) {
          user.inventory.push(reward.tool);
        }
      }

      // Companion unlock
      if (reward.companion) {
        user.progress.companions = user.progress.companions || [];
        if (!user.progress.companions.includes(reward.companion)) {
          user.progress.companions.push(reward.companion);
        }
      }

      rewardsApplied = reward;
    }
  }

  if (Number.isFinite(Number(xpDelta))) {
    user.progress.xp += Number(xpDelta);
  }

  user.progress.currentChapter = Math.max(1, chapterNum);
  user.progress.highestUnlockedChapter = Math.max(user.progress.highestUnlockedChapter || 1, chapterNum);

  await store.updateUser(user);
  return res.json({ ok: true, progress: user.progress, inventory: user.inventory, rewards: rewardsApplied });
});

// ═══════════════════════════════════════════
// Stripe subscription flow
// ═══════════════════════════════════════════
let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = require('stripe')(STRIPE_SECRET_KEY);
  console.log('[Stripe] Live billing enabled');
}

app.post('/api/subscription/create-checkout', authRequired, async (req, res) => {
  const user = await store.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!stripe || !STRIPE_PRICE_ID) {
    // Mock mode — allows dev testing without Stripe keys
    return res.json({
      checkoutUrl: '/mock-checkout/basic',
      mode: 'mock',
      note: 'Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID for real billing.'
    });
  }

  const frontendOrigin = req.headers.origin || (APP_ORIGIN !== '*' ? APP_ORIGIN.split(',')[0].trim() : 'https://personfu.github.io');
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email,
    success_url: frontendOrigin + '/cyberworld.html?subscription=success',
    cancel_url: frontendOrigin + '/cyberworld.html?subscription=cancelled',
    metadata: { userId: user.id }
  });

  return res.json({ checkoutUrl: session.url, mode: 'stripe', sessionId: session.id });
});

// Stripe webhook — must use raw body
app.post('/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[Stripe] Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id || (session.metadata && session.metadata.userId);
      if (userId) {
        const user = await store.findUserById(userId);
        if (user) {
          user.subscriptionTier = 'basic';
          user.stripeCustomerId = session.customer;
          user.billing = { status: 'active', lastUpdated: new Date().toISOString(), stripeSessionId: session.id };
          await store.updateUser(user);
          console.log(`[Stripe] Activated basic tier for ${user.email}`);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const user = await store.findUserByStripeCustomer(sub.customer);
      if (user) {
        user.subscriptionTier = 'free';
        user.billing = { status: 'cancelled', lastUpdated: new Date().toISOString() };
        await store.updateUser(user);
        console.log(`[Stripe] Cancelled subscription for ${user.email}`);
      }
    }

    return res.json({ received: true });
  }
);

// ═══════════════════════════════════════════
// Leaderboard
// ═══════════════════════════════════════════
const LEADERBOARD_BOTS = [
  { id: 'bot_01', displayName: 'r00t_kai',    xp: 14750, flags: 148, rank: 'LEGEND',    bot: true },
  { id: 'bot_02', displayName: 'phantom_07',  xp: 11200, flags: 112, rank: 'ELITE',     bot: true },
  { id: 'bot_03', displayName: 'Vex_3r',      xp:  9800, flags:  98, rank: 'ELITE',     bot: true },
  { id: 'bot_04', displayName: 'n0b0dy',      xp:  8250, flags:  83, rank: 'OPERATIVE', bot: true },
  { id: 'bot_05', displayName: 'krypt0n_X',   xp:  7100, flags:  71, rank: 'OPERATIVE', bot: true },
  { id: 'bot_06', displayName: 'cipherlock',  xp:  6400, flags:  64, rank: 'OPERATOR',  bot: true },
  { id: 'bot_07', displayName: 'd4rkm4tter',  xp:  5500, flags:  55, rank: 'OPERATOR',  bot: true },
  { id: 'bot_08', displayName: 'synth3tic',   xp:  4300, flags:  43, rank: 'ANALYST',   bot: true },
  { id: 'bot_09', displayName: 'nullbyte_9',  xp:  3200, flags:  32, rank: 'ANALYST',   bot: true },
  { id: 'bot_10', displayName: 'j4ck_tr4ce',  xp:  2100, flags:  21, rank: 'RECRUIT',   bot: true }
];

function getRank(flags) {
  if (flags >= 100) return 'LEGEND';
  if (flags >= 60)  return 'ELITE';
  if (flags >= 30)  return 'OPERATIVE';
  if (flags >= 15)  return 'OPERATOR';
  if (flags >= 5)   return 'ANALYST';
  return 'RECRUIT';
}

app.get('/api/leaderboard', async (req, res) => {
  try {
    let realUsers = [];
    if (usePostgres) {
      const r = await pool.query(
        `SELECT display_name, progress->>'xp' AS xp,
                jsonb_array_length(COALESCE(progress->'missionsCleared', '[]'::jsonb)) AS missions
         FROM users ORDER BY (progress->>'xp')::int DESC LIMIT 50`
      );
      realUsers = r.rows.map(row => ({
        displayName: row.display_name,
        xp: parseInt(row.xp || '0', 10),
        flags: parseInt(row.missions || '0', 10),
        bot: false
      }));
    } else {
      const db = loadDb();
      realUsers = (db.users || []).map(u => ({
        displayName: u.displayName,
        xp: (u.progress && u.progress.xp) || 0,
        flags: ((u.progress && u.progress.missionsCleared) || []).length,
        bot: false
      }));
    }
    const merged = [...realUsers, ...LEADERBOARD_BOTS]
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 25)
      .map((entry, idx) => ({
        rank: idx + 1,
        displayName: entry.displayName,
        xp: entry.xp,
        flags: entry.flags,
        tier: getRank(entry.flags),
        bot: entry.bot || false
      }));
    return res.json({ leaderboard: merged, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[leaderboard]', err.message);
    return res.json({
      leaderboard: LEADERBOARD_BOTS.map((b, i) => ({ rank: i + 1, ...b })),
      updatedAt: new Date().toISOString()
    });
  }
});

// ═══════════════════════════════════════════
// CTF Flag Verification (server-side SHA-256)
// ═══════════════════════════════════════════
const CTF_FLAGS = {
  // challenge_id -> sha256(correct_flag) — never store plaintext flags server-side
  ctf_01: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b',
  ctf_02: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  ctf_03: '2c624232cdd221771294dfbb310acbc8da4ec4f04621b70a6b6a7df8f7a3c8f5',
  ctf_04: '65e84be33532fb784c48129675f9eff3a682b27168c0ea744b2cf58ee02337c5',
  ctf_05: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb5a1b274abc3843c63'
};

app.post('/api/ctf/verify', authOptional, async (req, res) => {
  const { challengeId, flag } = req.body || {};
  if (!challengeId || !flag) {
    return res.status(400).json({ error: 'challengeId and flag required' });
  }
  const expected = CTF_FLAGS[String(challengeId)];
  if (!expected) {
    return res.status(404).json({ error: 'Unknown challenge' });
  }
  const submitted = crypto.createHash('sha256').update(String(flag).trim()).digest('hex');
  const correct = submitted === expected;

  // Log submission (non-blocking)
  if (usePostgres) {
    pool.query(
      'INSERT INTO flag_submissions (id, user_id, challenge_id, flag_hash, correct) VALUES ($1,$2,$3,$4,$5)',
      [makeId('sub'), req.user ? req.user.id : null, challengeId, submitted, correct]
    ).catch(e => console.error('[ctf/verify log]', e.message));
  }

  if (correct && req.user) {
    // Award XP if authenticated
    try {
      const user = await store.findUserById(req.user.id);
      if (user && !((user.progress.missionsCleared || []).includes(challengeId))) {
        user.progress.xp = (user.progress.xp || 0) + 300;
        user.progress.missionsCleared = user.progress.missionsCleared || [];
        user.progress.missionsCleared.push(challengeId);
        await store.updateUser(user);
      }
    } catch (e) {
      console.error('[ctf/verify xp]', e.message);
    }
  }

  return res.json({ correct, challengeId });
});

// ═══════════════════════════════════════════
// Metasploit Module Catalog
// ═══════════════════════════════════════════
const MSF_MODULES = [
  // Recon / Auxiliary
  { type: 'auxiliary', category: 'scanner', name: 'auxiliary/scanner/portscan/tcp',            desc: 'TCP port scanner. Maps open ports across host ranges.', cve: null },
  { type: 'auxiliary', category: 'scanner', name: 'auxiliary/scanner/smb/smb_ms17_010',        desc: 'Detects EternalBlue (MS17-010) vulnerability in SMB hosts.', cve: 'CVE-2017-0144' },
  { type: 'auxiliary', category: 'scanner', name: 'auxiliary/scanner/http/dir_scanner',        desc: 'HTTP directory brute-force. Discovers hidden web paths.', cve: null },
  { type: 'auxiliary', category: 'scanner', name: 'auxiliary/scanner/ssh/ssh_version',         desc: 'SSH version fingerprinting across a subnet.', cve: null },
  { type: 'auxiliary', category: 'gather',  name: 'auxiliary/gather/dns_enum',                 desc: 'DNS zone enumeration — subdomains, MX, NS, PTR records.', cve: null },
  { type: 'auxiliary', category: 'spoof',   name: 'auxiliary/spoof/arp/arp_poisoning',         desc: 'ARP cache poisoning for MITM on LAN segments.', cve: null },
  // Exploits
  { type: 'exploit', category: 'remote',   name: 'exploit/multi/handler',                     desc: 'Universal payload handler. Catches reverse shells from any platform.', cve: null },
  { type: 'exploit', category: 'remote',   name: 'exploit/windows/smb/ms17_010_eternalblue',  desc: 'EternalBlue — SMBv1 RCE. Win7/2008R2. CVSS 9.3 Critical.', cve: 'CVE-2017-0144' },
  { type: 'exploit', category: 'remote',   name: 'exploit/windows/smb/ms08_067_netapi',       desc: 'MS08-067 Server Service RCE. Windows XP/2003 classic.', cve: 'CVE-2008-4250' },
  { type: 'exploit', category: 'remote',   name: 'exploit/multi/http/apache_mod_cgi_bash_env', desc: 'Shellshock — CGI Bash env injection RCE.', cve: 'CVE-2014-6271' },
  { type: 'exploit', category: 'remote',   name: 'exploit/unix/ftp/vsftpd_234_backdoor',      desc: 'vsFTPd 2.3.4 smiley-face backdoor shell on port 6200.', cve: 'CVE-2011-2523' },
  { type: 'exploit', category: 'remote',   name: 'exploit/multi/http/struts2_content_type_ognl', desc: 'Apache Struts2 OGNL injection RCE (Equifax breach vector).', cve: 'CVE-2017-5638' },
  { type: 'exploit', category: 'local',    name: 'exploit/linux/local/sudo_baron_samedit',    desc: 'Sudo heap overflow — local priv-esc to root. Baron Samedit.', cve: 'CVE-2021-3156' },
  { type: 'exploit', category: 'local',    name: 'exploit/linux/local/pkexec_lpe',            desc: 'PwnKit — pkexec SUID LPE. 12-year-old polkit vuln.', cve: 'CVE-2021-4034' },
  { type: 'exploit', category: 'webapps',  name: 'exploit/multi/http/wp_admin_shell_upload',  desc: 'WordPress authenticated admin plugin shell upload.', cve: null },
  { type: 'exploit', category: 'webapps',  name: 'exploit/multi/http/log4shell_header',       desc: 'Log4Shell — Log4j JNDI injection RCE. CVSS 10.0.', cve: 'CVE-2021-44228' },
  // Payloads (common)
  { type: 'payload', category: 'reverse',  name: 'payload/linux/x64/meterpreter/reverse_tcp', desc: 'Linux x64 Meterpreter reverse TCP shell.', cve: null },
  { type: 'payload', category: 'reverse',  name: 'payload/windows/x64/meterpreter/reverse_https', desc: 'Windows x64 Meterpreter reverse HTTPS — encrypted C2.', cve: null },
  { type: 'payload', category: 'bind',     name: 'payload/cmd/unix/bind_bash',               desc: 'Bind shell using /bin/bash on a specified port.', cve: null },
  // Post-exploitation
  { type: 'post', category: 'gather',      name: 'post/multi/gather/env',                    desc: 'Enumerate environment variables from a Meterpreter session.', cve: null },
  { type: 'post', category: 'gather',      name: 'post/linux/gather/hashdump',               desc: 'Dump /etc/shadow password hashes from compromised Linux host.', cve: null },
  { type: 'post', category: 'gather',      name: 'post/windows/gather/credentials/credential_collector', desc: 'Collect Windows credential artifacts from LSASS, registry, etc.', cve: null },
  { type: 'post', category: 'escalate',    name: 'post/multi/manage/shell_to_meterpreter',   desc: 'Upgrade a basic shell session to full Meterpreter.', cve: null },
  { type: 'post', category: 'persist',     name: 'post/windows/manage/persistence',          desc: 'Install persistent backdoor via Windows registry run key.', cve: null }
];

app.get('/api/metasploit/modules', (_req, res) => {
  const { type, category, search } = _req.query;
  let modules = MSF_MODULES;
  if (type)     modules = modules.filter(m => m.type === String(type));
  if (category) modules = modules.filter(m => m.category === String(category));
  if (search) {
    const q = String(search).toLowerCase().slice(0, 80);
    modules = modules.filter(m => m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q));
  }
  const types = [...new Set(MSF_MODULES.map(m => m.type))];
  const categories = [...new Set(MSF_MODULES.map(m => m.category))];
  return res.json({ modules, total: modules.length, types, categories });
});

// Mock activation (dev only — bypassed when Stripe is configured)
app.post('/api/subscription/activate-basic', authRequired, async (req, res) => {
  if (stripe && STRIPE_SECRET_KEY) {
    return res.status(400).json({ error: 'Use Stripe Checkout for subscription activation.' });
  }

  const user = await store.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.subscriptionTier = 'basic';
  user.billing = { status: 'active', lastUpdated: new Date().toISOString() };
  await store.updateUser(user);

  return res.json({ ok: true, subscriptionTier: user.subscriptionTier });
});

// ═══════════════════════════════════════════
// In-memory TTL cache (Redis-upgradeable)
// ═══════════════════════════════════════════
const CACHE = new Map();
function cacheGet(key) {
  const e = CACHE.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) { CACHE.delete(key); return null; }
  return e.data;
}
function cacheSet(key, data, ttlMs) { CACHE.set(key, { data, exp: Date.now() + ttlMs }); }

let redis = null;
if (process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, enableReadyCheck: false, connectTimeout: 4000 });
    redis.on('error', e => console.warn('[Redis]', e.message));
    console.log('[Redis] ioredis connected — upgrading cache layer');
  } catch (_) { console.warn('[Redis] ioredis not installed, using in-memory cache'); }
}

async function rGet(key) {
  if (redis) { try { const v = await redis.get(key); return v ? JSON.parse(v) : null; } catch (_) {} }
  return cacheGet(key);
}
async function rSet(key, data, ttlSec) {
  if (redis) { try { await redis.setex(key, ttlSec, JSON.stringify(data)); return; } catch (_) {} }
  cacheSet(key, data, ttlSec * 1000);
}

// Purge expired in-memory cache every 5 min
setInterval(() => { const now = Date.now(); for (const [k, v] of CACHE) if (now > v.exp) CACHE.delete(k); }, 300000);

// ═══════════════════════════════════════════
// Input sanitizers
// ═══════════════════════════════════════════
function sanitizeDomain(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const d = raw.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split('?')[0];
  if (!/^[a-z0-9][a-z0-9\-\.]{0,251}[a-z0-9]$/.test(d)) return null;
  return d;
}
function sanitizeIp(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const ip = raw.trim();
  if (!/^[0-9a-fA-F:\.]{3,45}$/.test(ip)) return null;
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|0\.0\.0\.|::1|fc00:|fe80:)/.test(ip)) return null;
  return ip;
}
function ssrfBlock(hostname) {
  return /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|::1|fc00:|fe80:|metadata\.google|169\.254\.)/.test(hostname);
}

// ═══════════════════════════════════════════
// OSINT endpoints
// ═══════════════════════════════════════════
const limiterOsint = rateLimit({ windowMs: 60000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'OSINT rate limit: 20/min.' } });

// GET /api/osint/rdap?domain=example.com
app.get('/api/osint/rdap', limiterOsint, async (req, res) => {
  const domain = sanitizeDomain(req.query.domain);
  if (!domain) return res.status(400).json({ error: 'Valid domain required' });
  const ck = `rdap:${domain}`;
  const hit = await rGet(ck);
  if (hit) return res.json({ ...hit, cached: true });
  try {
    const r = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'FURIOS-OSINT/3.0' },
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return res.status(502).json({ error: `RDAP ${r.status}` });
    const d = await r.json();
    const result = {
      domain: d.ldhName || domain,
      status: d.status || [],
      registrar: (d.entities || []).find(e => (e.roles || []).includes('registrar'))
        ?.vcardArray?.[1]?.find(f => f[0] === 'fn')?.[3] || 'unknown',
      nameservers: (d.nameservers || []).map(n => n.ldhName),
      events: (d.events || []).map(e => ({ action: e.eventAction, date: e.eventDate })),
      handle: d.handle
    };
    await rSet(ck, result, 3600);
    return res.json(result);
  } catch (e) { return res.status(502).json({ error: 'RDAP failed', detail: e.message }); }
});

// GET /api/osint/crtsh?domain=example.com
app.get('/api/osint/crtsh', limiterOsint, async (req, res) => {
  const domain = sanitizeDomain(req.query.domain);
  if (!domain) return res.status(400).json({ error: 'Valid domain required' });
  const ck = `crtsh:${domain}`;
  const hit = await rGet(ck);
  if (hit) return res.json({ ...hit, cached: true });
  try {
    const r = await fetch(`https://crt.sh/?q=%.${encodeURIComponent(domain)}&output=json`, {
      headers: { 'User-Agent': 'FURIOS-OSINT/3.0' },
      signal: AbortSignal.timeout(14000)
    });
    if (!r.ok) return res.status(502).json({ error: `crt.sh ${r.status}` });
    const data = await r.json();
    const seen = new Set();
    const subdomains = data.map(e => e.name_value.split('\n')).flat()
      .filter(s => { if (seen.has(s)) return false; seen.add(s); return true; })
      .filter(s => s.endsWith(domain)).sort();
    const result = {
      domain, subdomains, count: subdomains.length,
      sampleCerts: data.slice(0, 5).map(c => ({
        id: c.id, issuer: c.issuer_name,
        notBefore: c.not_before, notAfter: c.not_after, name: c.name_value
      }))
    };
    await rSet(ck, result, 1800);
    return res.json(result);
  } catch (e) { return res.status(502).json({ error: 'crt.sh failed', detail: e.message }); }
});

// GET /api/osint/dns?domain=example.com&type=ALL
const dnsLib = require('dns').promises;
app.get('/api/osint/dns', limiterOsint, async (req, res) => {
  const domain = sanitizeDomain(req.query.domain);
  const type = String(req.query.type || 'ALL').toUpperCase();
  const ALLOWED = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'ALL'];
  if (!domain) return res.status(400).json({ error: 'Valid domain required' });
  if (!ALLOWED.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  const ck = `dns:${domain}:${type}`;
  const hit = await rGet(ck);
  if (hit) return res.json({ ...hit, cached: true });
  const recs = {};
  const resolveOne = async (t) => {
    try {
      switch (t) {
        case 'A':     recs.A     = await dnsLib.resolve4(domain);     break;
        case 'AAAA':  recs.AAAA  = await dnsLib.resolve6(domain);     break;
        case 'MX':    recs.MX    = await dnsLib.resolveMx(domain);    break;
        case 'NS':    recs.NS    = await dnsLib.resolveNs(domain);    break;
        case 'TXT':   recs.TXT   = await dnsLib.resolveTxt(domain);   break;
        case 'CNAME': recs.CNAME = await dnsLib.resolveCname(domain); break;
        case 'SOA':   recs.SOA   = await dnsLib.resolveSoa(domain);   break;
      }
    } catch (_) { recs[t] = null; }
  };
  if (type === 'ALL') await Promise.all(['A','AAAA','MX','NS','TXT','CNAME'].map(resolveOne));
  else await resolveOne(type);
  const result = { domain, records: recs };
  await rSet(ck, result, 300);
  return res.json(result);
});

// GET /api/osint/ip?ip=8.8.8.8
app.get('/api/osint/ip', limiterOsint, async (req, res) => {
  const ip = sanitizeIp(req.query.ip);
  if (!ip) return res.status(400).json({ error: 'Valid public IP required' });
  const ck = `ip:${ip}`;
  const hit = await rGet(ck);
  if (hit) return res.json({ ...hit, cached: true });
  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      headers: { 'User-Agent': 'FURIOS-OSINT/3.0' },
      signal: AbortSignal.timeout(6000)
    });
    if (!r.ok) return res.status(502).json({ error: `ipwho.is ${r.status}` });
    const d = await r.json();
    const result = {
      ip: d.ip, type: d.type,
      country: d.country, country_code: d.country_code,
      region: d.region, city: d.city,
      isp: d.connection && d.connection.isp,
      org: d.connection && d.connection.org,
      asn: d.connection && d.connection.asn,
      lat: d.latitude, lon: d.longitude,
      is_eu: d.is_eu
    };
    await rSet(ck, result, 3600);
    return res.json(result);
  } catch (e) { return res.status(502).json({ error: 'IP lookup failed', detail: e.message }); }
});

// GET /api/tools/headers?url=https://example.com  (SSRF-safe)
const limiterHeaders = rateLimit({ windowMs: 60000, max: 15, standardHeaders: true, legacyHeaders: false, message: { error: 'Header check rate limit.' } });
app.get('/api/tools/headers', limiterHeaders, async (req, res) => {
  if (!req.query.url) return res.status(400).json({ error: 'url required' });
  let target;
  try {
    target = new URL(req.query.url);
    if (!['http:', 'https:'].includes(target.protocol)) throw new Error('bad protocol');
    if (ssrfBlock(target.hostname)) return res.status(400).json({ error: 'Private URLs not allowed' });
  } catch (e) { return res.status(400).json({ error: 'Invalid URL' }); }

  const ck = `headers:${target.origin}`;
  const hit = await rGet(ck);
  if (hit) return res.json({ ...hit, cached: true });
  try {
    const r = await fetch(target.origin + '/', {
      method: 'HEAD', redirect: 'follow',
      headers: { 'User-Agent': 'FURIOS-SecurityAudit/3.0' },
      signal: AbortSignal.timeout(8000)
    });
    const hdrs = Object.fromEntries(r.headers.entries());
    const SEC_HDRS = [
      'strict-transport-security', 'content-security-policy', 'x-frame-options',
      'x-content-type-options', 'referrer-policy', 'permissions-policy',
      'cross-origin-opener-policy', 'cross-origin-resource-policy', 'cross-origin-embedder-policy'
    ];
    const analysis = {};
    for (const h of SEC_HDRS) analysis[h] = { present: h in hdrs, value: hdrs[h] || null };
    const score = Math.round(SEC_HDRS.filter(h => h in hdrs).length / SEC_HDRS.length * 100);
    const result = { url: target.origin, status: r.status, securityHeaders: analysis, securityScore: score };
    await rSet(ck, result, 600);
    return res.json(result);
  } catch (e) { return res.status(502).json({ error: 'Fetch failed', detail: e.message }); }
});

// ═══════════════════════════════════════════
// Threat Intelligence Feeds (server-cached)
// ═══════════════════════════════════════════

// GET /api/threat/nvd?limit=10&severity=CRITICAL
app.get('/api/threat/nvd', async (req, res) => {
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || '10', 10)));
  const severity = String(req.query.severity || '').toUpperCase();
  if (severity && !['CRITICAL','HIGH','MEDIUM','LOW'].includes(severity)) return res.status(400).json({ error: 'Invalid severity' });
  const ck = `nvd:${severity}:${limit}`;
  const hit = await rGet(ck);
  if (hit) return res.json({ ...hit, cached: true });
  try {
    const params = new URLSearchParams({ resultsPerPage: String(limit), startIndex: '0' });
    if (severity) params.set('cvssV3Severity', severity);
    if (process.env.NVD_API_KEY) params.set('apiKey', process.env.NVD_API_KEY);
    const r = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?${params}`, {
      headers: { 'User-Agent': 'FURIOS-Intel/3.0' },
      signal: AbortSignal.timeout(12000)
    });
    if (!r.ok) return res.status(502).json({ error: `NVD ${r.status}` });
    const data = await r.json();
    const cves = (data.vulnerabilities || []).map(v => {
      const cve = v.cve;
      const m = cve.metrics;
      const cv = (m && m.cvssMetricV31 && m.cvssMetricV31[0]) || (m && m.cvssMetricV30 && m.cvssMetricV30[0]);
      const desc = ((cve.descriptions || []).find(d => d.lang === 'en') || {}).value || '';
      return {
        id: cve.id, published: cve.published, modified: cve.lastModified,
        score: cv ? cv.cvssData.baseScore : null,
        severity: cv ? cv.cvssData.baseSeverity : null,
        vector: cv ? cv.cvssData.vectorString : null,
        description: desc,
        refs: (cve.references || []).slice(0, 3).map(r => r.url)
      };
    });
    const result = { total: data.totalResults, returned: cves.length, cves };
    await rSet(ck, result, 900);
    // Broadcast critical CVEs to all connected clients
    cves.filter(c => c.severity === 'CRITICAL').forEach(c => {
      io.emit('cve:alert', { cveId: c.id, severity: c.severity, score: c.score, description: c.description.slice(0, 200), at: new Date().toISOString() });
    });
    return res.json(result);
  } catch (e) { return res.status(502).json({ error: 'NVD failed', detail: e.message }); }
});

// GET /api/threat/cisa-kev?limit=20&search=apache
app.get('/api/threat/cisa-kev', async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const search = String(req.query.search || '').slice(0, 80).toLowerCase();
  const ck = 'cisa-kev';
  let all = await rGet(ck);
  if (!all) {
    try {
      const r = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
        headers: { 'User-Agent': 'FURIOS-Intel/3.0' },
        signal: AbortSignal.timeout(15000)
      });
      if (!r.ok) return res.status(502).json({ error: `CISA ${r.status}` });
      const data = await r.json();
      all = data.vulnerabilities || [];
      await rSet(ck, all, 3600);
    } catch (e) { return res.status(502).json({ error: 'CISA KEV failed', detail: e.message }); }
  }
  const filtered = search
    ? all.filter(v => [(v.cveID||''),(v.vulnerabilityName||''),(v.product||''),(v.vendorProject||'')]
        .some(s => s.toLowerCase().includes(search)))
    : all;
  return res.json({
    total: all.length, filtered: filtered.length, cached: !!await rGet(ck),
    vulnerabilities: filtered.slice(0, limit).map(v => ({
      cveID: v.cveID, vulnerabilityName: v.vulnerabilityName,
      vendorProject: v.vendorProject, product: v.product,
      dateAdded: v.dateAdded, dueDate: v.dueDate,
      requiredAction: v.requiredAction, shortDescription: v.shortDescription
    }))
  });
});

// GET /api/threat/mitre?technique=T1190
const MITRE_DB = {
  'T1190': { id:'T1190', name:'Exploit Public-Facing Application', tactic:'initial-access', desc:'Adversaries exploit weaknesses in Internet-facing systems.', mitigation:'Patch management, WAF, network segmentation.', url:'https://attack.mitre.org/techniques/T1190' },
  'T1059': { id:'T1059', name:'Command and Scripting Interpreter', tactic:'execution', desc:'Adversaries abuse interpreters to execute commands, scripts, or binaries.', mitigation:'AppLocker, WDAC, PowerShell logging.', url:'https://attack.mitre.org/techniques/T1059' },
  'T1078': { id:'T1078', name:'Valid Accounts', tactic:'defense-evasion', desc:'Adversaries obtain and abuse credentials of existing accounts.', mitigation:'MFA, privilege review, PAM.', url:'https://attack.mitre.org/techniques/T1078' },
  'T1566': { id:'T1566', name:'Phishing', tactic:'initial-access', desc:'Adversaries send phishing messages to gain access to victim systems.', mitigation:'Email filtering, user training, DMARC.', url:'https://attack.mitre.org/techniques/T1566' },
  'T1055': { id:'T1055', name:'Process Injection', tactic:'privilege-escalation', desc:'Adversaries inject code into processes to evade defenses and elevate privileges.', mitigation:'Endpoint protection, behavior monitoring.', url:'https://attack.mitre.org/techniques/T1055' },
  'T1003': { id:'T1003', name:'OS Credential Dumping', tactic:'credential-access', desc:'Adversaries dump credentials to obtain account login material.', mitigation:'Credential Guard, LSASS protection.', url:'https://attack.mitre.org/techniques/T1003' },
  'T1021': { id:'T1021', name:'Remote Services', tactic:'lateral-movement', desc:'Adversaries use Valid Accounts to interact with remote connection services.', mitigation:'Network segmentation, MFA on RDP/SSH.', url:'https://attack.mitre.org/techniques/T1021' },
  'T1071': { id:'T1071', name:'Application Layer Protocol (C2)', tactic:'command-and-control', desc:'Adversaries communicate over app-layer protocols to avoid detection.', mitigation:'TLS inspection, DNS monitoring, anomaly detection.', url:'https://attack.mitre.org/techniques/T1071' },
  'T1486': { id:'T1486', name:'Data Encrypted for Impact', tactic:'impact', desc:'Adversaries encrypt data (ransomware) to interrupt availability.', mitigation:'Offline backups, EDR, network segmentation.', url:'https://attack.mitre.org/techniques/T1486' },
  'T1110': { id:'T1110', name:'Brute Force', tactic:'credential-access', desc:'Adversaries use brute force techniques to gain access to accounts.', mitigation:'Account lockout, MFA, fail2ban.', url:'https://attack.mitre.org/techniques/T1110' },
  'T1027': { id:'T1027', name:'Obfuscated Files or Information', tactic:'defense-evasion', desc:'Adversaries obfuscate content to make analysis and detection harder.', mitigation:'AV/EDR, binary analysis, network inspection.', url:'https://attack.mitre.org/techniques/T1027' },
  'T1562': { id:'T1562', name:'Impair Defenses', tactic:'defense-evasion', desc:'Adversaries disable or tamper with security tools and logging.', mitigation:'Audit log integrity, endpoint hardening.', url:'https://attack.mitre.org/techniques/T1562' }
};
app.get('/api/threat/mitre', (req, res) => {
  const id = String(req.query.technique || '').toUpperCase().slice(0, 10);
  if (id) {
    const t = MITRE_DB[id];
    if (!t) return res.status(404).json({ error: 'Not in local cache', url: `https://attack.mitre.org/techniques/${id}` });
    return res.json(t);
  }
  return res.json({ techniques: Object.values(MITRE_DB), count: Object.keys(MITRE_DB).length });
});

// ═══════════════════════════════════════════
// Metasploit RPC Proxy + Console Simulation
// ═══════════════════════════════════════════
const MSF_RPC_URL  = process.env.MSF_RPC_URL  || '';
const MSF_RPC_PASS = process.env.MSF_RPC_PASS || '';
let msfToken = null;

async function msfAuth() {
  if (!MSF_RPC_URL || !MSF_RPC_PASS) return null;
  try {
    const r = await fetch(`${MSF_RPC_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'msf', password: MSF_RPC_PASS }),
      signal: AbortSignal.timeout(5000)
    });
    const d = await r.json();
    msfToken = d.token || null;
    if (msfToken) console.log('[MSF] RPC authenticated — live Metasploit connected');
    return msfToken;
  } catch (e) {
    console.warn('[MSF] RPC auth failed:', e.message);
    return null;
  }
}

// GET /api/tools/msf/search?q=eternalblue&type=exploit
app.get('/api/tools/msf/search', async (req, res) => {
  const q        = String(req.query.q        || '').slice(0, 80).toLowerCase();
  const type     = String(req.query.type     || '');
  const category = String(req.query.category || '');

  if (MSF_RPC_URL && msfToken) {
    try {
      const r = await fetch(`${MSF_RPC_URL}/api/v1/modules/search?q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${msfToken}` },
        signal: AbortSignal.timeout(6000)
      });
      if (r.ok) return res.json({ source: 'live-msf', ...(await r.json()) });
    } catch (_) {}
  }

  let mods = MSF_MODULES;
  if (q)        mods = mods.filter(m => m.name.includes(q) || m.desc.toLowerCase().includes(q) || (m.cve||'').includes(q));
  if (type)     mods = mods.filter(m => m.type === type);
  if (category) mods = mods.filter(m => m.category === category);
  return res.json({ source: 'catalog', modules: mods, total: mods.length });
});

// GET /api/tools/msf/module?name=exploit/...
app.get('/api/tools/msf/module', (req, res) => {
  const name = String(req.query.name || '').slice(0, 120);
  if (!name) return res.status(400).json({ error: 'name required' });
  const mod = MSF_MODULES.find(m => m.name === name);
  if (!mod) return res.status(404).json({ error: 'Module not in catalog' });
  const USAGE = {
    'exploit/windows/smb/ms17_010_eternalblue': 'use exploit/windows/smb/ms17_010_eternalblue\nset RHOSTS <target>\nset PAYLOAD windows/x64/meterpreter/reverse_tcp\nset LHOST <your-ip>\nrun',
    'auxiliary/scanner/portscan/tcp': 'use auxiliary/scanner/portscan/tcp\nset RHOSTS 10.10.10.0/24\nset PORTS 22,80,443,445,3389\nrun',
    'exploit/multi/http/log4shell_header': 'use exploit/multi/http/log4shell_header\nset RHOSTS <target>\nset LHOST <your-ip>\nrun'
  };
  return res.json({ ...mod, usageExample: USAGE[name] || `use ${name}\nshow options\nrun` });
});

// GET /api/tools/msf/sessions (live RPC or empty)
app.get('/api/tools/msf/sessions', authRequired, async (req, res) => {
  if (MSF_RPC_URL && msfToken) {
    try {
      const r = await fetch(`${MSF_RPC_URL}/api/v1/sessions`, {
        headers: { 'Authorization': `Bearer ${msfToken}` },
        signal: AbortSignal.timeout(5000)
      });
      if (r.ok) return res.json(await r.json());
    } catch (_) {}
  }
  return res.json({ sessions: [], note: 'Set MSF_RPC_URL + MSF_RPC_PASS to connect live Metasploit' });
});

// POST /api/tools/msf/console — proxy or educational simulation
const limiterMsfConsole = rateLimit({ windowMs: 60000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'MSF console: 10 commands/min.' } });
const MSF_DENY = /shell|exec|system\s*\(|rm\s+-rf|del\s+\/|format\s+[a-z]:|;\s*\S|&&|\|\||`/i;

app.post('/api/tools/msf/console', authRequired, limiterMsfConsole, async (req, res) => {
  const cmd = String((req.body || {}).command || '').slice(0, 200).trim();
  if (!cmd) return res.status(400).json({ error: 'command required' });
  if (MSF_DENY.test(cmd)) return res.status(400).json({ error: 'Command not permitted in training mode.' });

  if (MSF_RPC_URL && msfToken) {
    try {
      const r = await fetch(`${MSF_RPC_URL}/api/v1/consoles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${msfToken}` },
        body: JSON.stringify({ command: cmd }),
        signal: AbortSignal.timeout(8000)
      });
      if (r.ok) return res.json(await r.json());
    } catch (_) {}
  }

  // Educational simulation
  const SIM = {
    'help':              'Core Commands:\n  help, use <module>, search <term>, show options|exploits|payloads\n  set <OPT> <VAL>, run, sessions, exit\n',
    'version':           'Framework: 6.4.0-dev-FURIOS-TRAINING  Ruby: 3.2.0  OpenSSL: 3.1.4\n',
    'sessions':          'Active sessions: 0\n[TIP] Run an exploit first to create sessions.\n',
    'show exploits':     MSF_MODULES.filter(m => m.type === 'exploit').map(m => `  ${m.name}`).join('\n') + '\n',
    'show auxiliary':    MSF_MODULES.filter(m => m.type === 'auxiliary').map(m => `  ${m.name}`).join('\n') + '\n',
    'search eternalblue': '  exploit/windows/smb/ms17_010_eternalblue  [EternalBlue CVE-2017-0144]\n  auxiliary/scanner/smb/smb_ms17_010       [Scanner]\n',
    'search log4':       '  exploit/multi/http/log4shell_header        [Log4Shell CVE-2021-44228]\n',
    'search struts':     '  exploit/multi/http/struts2_content_type_ognl  [CVE-2017-5638]\n',
    'search sudo':       '  exploit/linux/local/sudo_baron_samedit     [Baron Samedit CVE-2021-3156]\n'
  };
  const key = Object.keys(SIM).find(k => cmd.toLowerCase().startsWith(k));
  if (key) return res.json({ output: `msf6 > ${cmd}\n${SIM[key]}`, mode: 'simulation' });

  if (/^use\s+/.test(cmd)) {
    const modName = cmd.slice(4).trim();
    const found = MSF_MODULES.find(m => m.name === modName);
    return res.json({ output: found
      ? `msf6 > ${cmd}\n[*] Using ${found.name}\n[i] ${found.desc}\nmsf6 ${found.type}(${found.name.split('/').pop()}) >\n`
      : `msf6 > ${cmd}\n[-] Module not found: ${modName}\n`, mode: 'simulation' });
  }

  return res.json({ output: `msf6 > ${cmd}\n[i] Training mode — use 'help' or 'show exploits'\n`, mode: 'simulation' });
});

// ═══════════════════════════════════════════
// Admin API (ADMIN_KEY header required)
// ═══════════════════════════════════════════
const ADMIN_KEY = process.env.ADMIN_KEY || '';
function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || (req.body && req.body.adminKey);
  if (!ADMIN_KEY || key !== ADMIN_KEY) return res.status(403).json({ error: 'Admin access denied' });
  return next();
}

// POST /api/admin/world
app.post('/api/admin/world', adminAuth, async (req, res) => {
  const { operation, globalThreat, news, onlineCount } = req.body || {};
  const partial = {};
  if (operation)    partial.operation    = String(operation).slice(0, 100);
  if (globalThreat) partial.globalThreat = String(globalThreat).slice(0, 30);
  if (Array.isArray(news)) partial.news  = news.slice(0, 5).map(n => String(n).slice(0, 200));
  if (typeof onlineCount === 'number') partial.onlineCount = Math.max(0, onlineCount);
  const world = await store.updateWorldMeta(partial);
  io.emit('world:update', world);
  return res.json({ ok: true, world });
});

// POST /api/admin/broadcast
app.post('/api/admin/broadcast', adminAuth, (req, res) => {
  const { event, payload, room } = req.body || {};
  if (!event) return res.status(400).json({ error: 'event required' });
  const safeEvent = String(event).replace(/[^a-z0-9:_-]/gi, '').slice(0, 50);
  const data = payload || {};
  room ? io.to(String(room).slice(0, 60)).emit(safeEvent, data) : io.emit(safeEvent, data);
  return res.json({ ok: true, event: safeEvent, room: room || 'global', clients: io.engine.clientsCount });
});

// POST /api/admin/cve-alert
app.post('/api/admin/cve-alert', adminAuth, (req, res) => {
  const { cveId, severity, description, score } = req.body || {};
  if (!cveId) return res.status(400).json({ error: 'cveId required' });
  const alert = { cveId: String(cveId).slice(0,30), severity: String(severity||'HIGH').slice(0,10), score: Number(score)||null, description: String(description||'').slice(0,300), at: new Date().toISOString() };
  io.emit('cve:alert', alert);
  return res.json({ ok: true, alert, recipients: io.engine.clientsCount });
});

// ── GET /api/stats ──────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  const world = await store.getWorldMeta().catch(() => ({}));
  let userCount = 0;
  if (usePostgres) {
    try { const r = await pool.query('SELECT COUNT(*) FROM users'); userCount = parseInt(r.rows[0].count, 10); } catch (_) {}
  } else {
    try { const db = loadDb(); userCount = (db.users || []).length; } catch (_) {}
  }
  return res.json({
    service: 'furios-nexus', version: '3.0.0',
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    db: usePostgres ? 'postgres' : 'json-file',
    redis: redis ? 'connected' : 'in-memory',
    msfRpc: MSF_RPC_URL ? 'configured' : 'catalog-only',
    operatives: userCount, onlineNow: io.engine.clientsCount,
    world: { operation: world.operation, globalThreat: world.globalThreat },
    cacheSize: CACHE.size
  });
});

// Socket presence + simple lobby rooms.
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) {
    socket.user = null;
    return next();
  }
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (_err) {
    socket.user = null;
    return next();
  }
});

io.on('connection', (socket) => {
  store.updateWorldMeta({ onlineCount: io.engine.clientsCount });
  io.emit('presence:update', { onlineCount: io.engine.clientsCount });

  socket.on('lobby:join', async (payload) => {
    const room = String((payload && payload.room) || 'nexus').slice(0, 60);
    socket.join(room);

    const world = await store.getWorldMeta();
    const lobbies = Array.isArray(world.activeLobbies) ? world.activeLobbies : [];
    if (!lobbies.includes(room)) {
      lobbies.push(room);
      await store.updateWorldMeta({ activeLobbies: lobbies });
    }

    io.emit('world:lobbies', { activeLobbies: lobbies });
    io.to(room).emit('lobby:event', {
      type: 'join',
      room,
      user: socket.user ? socket.user.email : 'guest',
      at: new Date().toISOString()
    });
  });

  socket.on('chat:send', (payload) => {
    const room = String((payload && payload.room) || 'nexus').slice(0, 60);
    const message = String((payload && payload.message) || '').slice(0, 300);
    if (!message) return;
    io.to(room).emit('chat:message', {
      room,
      message,
      user: socket.user ? socket.user.email : 'guest',
      at: new Date().toISOString()
    });
  });

  socket.on('world:ping', async () => {
    const world = await store.getWorldMeta().catch(() => ({}));
    socket.emit('world:update', world);
  });

  socket.on('msf:module:search', (payload) => {
    const q = String((payload && payload.q) || '').slice(0, 80).toLowerCase();
    const results = MSF_MODULES.filter(m => !q || m.name.includes(q) || m.desc.toLowerCase().includes(q));
    socket.emit('msf:module:results', { q, modules: results.slice(0, 20), total: results.length });
  });

  socket.on('disconnect', () => {
    store.updateWorldMeta({ onlineCount: io.engine.clientsCount });
    io.emit('presence:update', { onlineCount: io.engine.clientsCount });
  });
});

// ── Startup ──
(async () => {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('[DB] Schema init failed (server will start without DB):', err.message);
    usePostgres = false;
  }

  // Attempt Metasploit RPC auth if configured
  if (MSF_RPC_URL) {
    await msfAuth();
    // Re-auth every 30 minutes (token expiry)
    setInterval(msfAuth, 30 * 60 * 1000);
  }

  // Warm the CISA KEV cache in background
  fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
    headers: { 'User-Agent': 'FURIOS-Intel/3.0' }, signal: AbortSignal.timeout(20000)
  }).then(r => r.json()).then(d => {
    if (d.vulnerabilities) rSet('cisa-kev', d.vulnerabilities, 3600);
    console.log(`[INTEL] CISA KEV cached — ${(d.vulnerabilities || []).length} entries`);
  }).catch(e => console.warn('[INTEL] CISA KEV warm failed:', e.message));

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CyberWorld multiplayer server listening on 0.0.0.0:${PORT}`);
    console.log(`[OSINT] Endpoints: /api/osint/rdap|crtsh|dns|ip`);
    console.log(`[INTEL] Endpoints: /api/threat/nvd|cisa-kev|mitre`);
    console.log(`[MSF]   Endpoints: /api/tools/msf/search|module|sessions|console`);
    console.log(`[ADMIN] Endpoints: /api/admin/world|broadcast|cve-alert (ADMIN_KEY required)`);
    console.log(`[STATS] Endpoint:  /api/stats`);
    if (usePostgres) console.log('[DB] Connected to PostgreSQL');
    if (stripe) console.log('[Stripe] Webhook endpoint: POST /api/stripe/webhook');
    if (MSF_RPC_URL) console.log(`[MSF] Live RPC configured at ${MSF_RPC_URL}`);
  });
})();
