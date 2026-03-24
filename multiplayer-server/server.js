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
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const APP_ORIGIN = process.env.APP_ORIGIN || '*';
const STRIPE_CHECKOUT_URL = process.env.STRIPE_CHECKOUT_URL || '';
const DB_FILE = path.join(__dirname, 'db.json');

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

app.use(express.json());
app.use(cors({ origin: corsOriginHandler, credentials: true }));

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

  const db = loadDb();
  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = db.users.some((u) => u.email === normalizedEmail);
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
    billing: {
      status: 'inactive',
      lastUpdated: null
    }
  };

  db.users.push(user);
  saveDb(db);

  const token = issueToken(user);
  return res.status(201).json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const db = loadDb();
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.users.find((u) => u.email === normalizedEmail);
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

app.get('/api/auth/me', authRequired, (req, res) => {
  const db = loadDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user: sanitizeUser(user) });
});

app.get('/api/world/state', authOptional, (req, res) => {
  const db = loadDb();
  const user = req.user ? db.users.find((u) => u.id === req.user.id) : null;
  res.json({
    operation: db.world.operation,
    globalThreat: db.world.globalThreat,
    onlineCount: db.world.onlineCount,
    activeLobbies: db.world.activeLobbies,
    news: db.world.news,
    user: user ? sanitizeUser(user) : null
  });
});

app.get('/api/gate', authOptional, (req, res) => {
  const chapter = Number(req.query.chapter || 1);
  const db = loadDb();
  const user = req.user ? db.users.find((u) => u.id === req.user.id) : null;
  const gate = canAccessChapter(user, chapter);
  return res.json({ chapter, ...gate, tier: user ? user.subscriptionTier : 'guest' });
});

app.get('/api/progress', authRequired, (req, res) => {
  const db = loadDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ progress: user.progress, subscriptionTier: user.subscriptionTier });
});

app.post('/api/progress', authRequired, (req, res) => {
  const { chapter, missionId, xpDelta } = req.body || {};
  const db = loadDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const chapterNum = Number(chapter || user.progress.currentChapter || 1);
  const gate = canAccessChapter(user, chapterNum);
  if (!gate.allowed) {
    return res.status(403).json(gate);
  }

  if (missionId && !user.progress.missionsCleared.includes(missionId)) {
    user.progress.missionsCleared.push(missionId);
  }

  if (Number.isFinite(Number(xpDelta))) {
    user.progress.xp += Number(xpDelta);
  }

  user.progress.currentChapter = Math.max(1, chapterNum);
  user.progress.highestUnlockedChapter = Math.max(user.progress.highestUnlockedChapter || 1, chapterNum);

  saveDb(db);
  return res.json({ ok: true, progress: user.progress });
});

app.post('/api/subscription/create-checkout', authRequired, (req, res) => {
  const db = loadDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (STRIPE_CHECKOUT_URL) {
    return res.json({ checkoutUrl: STRIPE_CHECKOUT_URL, mode: 'external' });
  }

  return res.json({
    checkoutUrl: '/mock-checkout/basic',
    mode: 'mock',
    note: 'Set STRIPE_CHECKOUT_URL in multiplayer-server/.env for real hosted checkout.'
  });
});

app.post('/api/subscription/activate-basic', authRequired, (req, res) => {
  const db = loadDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.subscriptionTier = 'basic';
  user.billing = {
    status: 'active',
    lastUpdated: new Date().toISOString()
  };
  saveDb(db);

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
  const db = loadDb();
  db.world.onlineCount = io.engine.clientsCount;
  saveDb(db);
  io.emit('presence:update', { onlineCount: db.world.onlineCount });

  socket.on('lobby:join', (payload) => {
    const room = String((payload && payload.room) || 'nexus').slice(0, 60);
    socket.join(room);

    const dbNow = loadDb();
    if (!dbNow.world.activeLobbies.includes(room)) {
      dbNow.world.activeLobbies.push(room);
      saveDb(dbNow);
    }

    io.emit('world:lobbies', { activeLobbies: dbNow.world.activeLobbies });
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
    const dbAfter = loadDb();
    dbAfter.world.onlineCount = io.engine.clientsCount;
    saveDb(dbAfter);
    io.emit('presence:update', { onlineCount: dbAfter.world.onlineCount });
  });
});

server.listen(PORT, () => {
  console.log(`CyberWorld multiplayer server listening on http://localhost:${PORT}`);
});
