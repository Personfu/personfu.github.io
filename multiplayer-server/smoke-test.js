#!/usr/bin/env node
/**
 * CyberWorld Operation Starshield — Smoke Test
 *
 * Tests: health, register, login, me, gate checks,
 * mission progress + rewards, inventory, faction rep,
 * subscription, and world state.
 *
 * Usage:
 *   node smoke-test.js                   # defaults to http://localhost:8787
 *   node smoke-test.js https://cyberworld-multiplayer.onrender.com
 */

const BASE = (process.argv[2] || 'http://localhost:8787').replace(/\/$/, '');
const EMAIL = `smoke_${Date.now()}@test.cyberworld`;
const PASSWORD = 'StarshieldTest!42';

let token = '';
let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${detail ? ' — ' + detail : ''}`);
  }
}

async function req(method, path, body, raw) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body && !raw) headers['Content-Type'] = 'application/json';

  const resp = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const json = await resp.json().catch(() => ({}));
  return { status: resp.status, ...json };
}

async function run() {
  console.log(`\n🚀 CyberWorld Smoke Test — ${BASE}\n`);

  // 1. Health
  console.log('▸ Health');
  const health = await req('GET', '/health');
  assert('GET /health returns ok', health.ok === true);

  // 2. Register
  console.log('▸ Register');
  const reg = await req('POST', '/api/auth/register', { email: EMAIL, password: PASSWORD, displayName: 'SmokeOp' });
  assert('Register succeeds', reg.status === 201 && !!reg.token, `status=${reg.status}`);
  if (reg.token) token = reg.token;
  assert('User has inventory array', Array.isArray(reg.user && reg.user.inventory));
  assert('User starts with free tier', reg.user && reg.user.subscriptionTier === 'free');

  // 3. Login
  console.log('▸ Login');
  const login = await req('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
  assert('Login succeeds', login.status === 200 && !!login.token);

  // 4. Me
  console.log('▸ Me');
  const me = await req('GET', '/api/auth/me');
  assert('GET /me returns user', me.user && me.user.email === EMAIL);

  // 5. Gate checks
  console.log('▸ Gate checks');
  const g3 = await req('GET', '/api/gate?chapter=3');
  assert('Ch3 guest allowed', g3.allowed === true);

  const g4 = await req('GET', '/api/gate?chapter=4');
  assert('Ch4 authenticated allowed', g4.allowed === true);

  const g5 = await req('GET', '/api/gate?chapter=5');
  assert('Ch5 free tier blocked', g5.allowed === false && g5.code === 'SUBSCRIPTION_REQUIRED');

  // 6. Mission progress with rewards
  console.log('▸ Mission progress + rewards');
  const p1 = await req('POST', '/api/progress', { chapter: 1, missionId: 'signal_drift' });
  assert('signal_drift mission clears', p1.ok === true);
  assert('Rewards applied (xp)', p1.rewards && p1.rewards.xp === 100);
  assert('Tool unlocked (signal_intercept)', p1.inventory && p1.inventory.includes('signal_intercept'));
  assert('Companion unlocked (recon_daemon)', p1.progress && p1.progress.companions && p1.progress.companions.includes('recon_daemon'));
  assert('Faction rep added (ghostline)', p1.progress && p1.progress.factionReputation && p1.progress.factionReputation.ghostline === 10);

  // Second mission
  const p2 = await req('POST', '/api/progress', { chapter: 1, missionId: 'neon_beacon' });
  assert('neon_beacon mission clears', p2.ok === true);
  assert('Cumulative XP', p2.progress && p2.progress.xp === 220);
  assert('Inventory grows', p2.inventory && p2.inventory.length === 2);

  // Duplicate mission doesn't double-reward
  const p3 = await req('POST', '/api/progress', { chapter: 1, missionId: 'signal_drift' });
  assert('Duplicate mission = no new rewards', p3.rewards === null);
  assert('XP unchanged on duplicate', p3.progress && p3.progress.xp === 220);

  // 7. Get progress
  console.log('▸ Get progress');
  const prog = await req('GET', '/api/progress');
  assert('GET /progress returns inventory', prog.inventory && prog.inventory.length === 2);
  assert('GET /progress returns tier', prog.subscriptionTier === 'free');

  // 8. Subscription (mock mode)
  console.log('▸ Subscription');
  const checkout = await req('POST', '/api/subscription/create-checkout');
  assert('Checkout returns mock mode', checkout.mode === 'mock' || checkout.mode === 'stripe');

  const activate = await req('POST', '/api/subscription/activate-basic');
  // Either mock activation succeeds OR Stripe blocks it
  const activateOk = (activate.ok === true && activate.subscriptionTier === 'basic') ||
                     (activate.status === 400 && activate.error);
  assert('Activate-basic works (mock) or blocked (stripe)', activateOk);

  if (activate.ok) {
    const g5after = await req('GET', '/api/gate?chapter=5');
    assert('Ch5 allowed after basic subscription', g5after.allowed === true);
  }

  // 9. World state
  console.log('▸ World state');
  const world = await req('GET', '/api/world/state');
  assert('World state returns operation', !!world.operation);

  // ── Summary ──
  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
