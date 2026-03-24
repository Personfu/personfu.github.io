const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET = process.env.JWT_SECRET || '';
const APP_ORIGIN = process.env.APP_ORIGIN || '*';
const DATABASE_URL = process.env.DATABASE_URL || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const DB_FILE = path.join(__dirname, 'db.json');

if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET is not set. Set it in your environment variables.');
  process.exit(1);
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
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CyberWorld multiplayer server listening on 0.0.0.0:${PORT}`);
    if (usePostgres) console.log('[DB] Connected to PostgreSQL');
    if (stripe) console.log('[Stripe] Webhook endpoint: POST /api/stripe/webhook');
  });
})();
