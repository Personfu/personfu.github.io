import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import {
  CIPHER_HEX, HINTS, PUZZLE_IDS, ROUTE_PACKETS, TIMELINE_RECORDS,
  advanceHint, completePuzzle, decodeHexBytes, normalizeProgress,
  verifyBitplane, verifyCipher, verifyRouting, verifyTimeline,
} from '../js/signal-vault.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('forensic chain requires exactly the related records in observed order', () => {
  assert.equal(TIMELINE_RECORDS.length, 5);
  assert.equal(verifyTimeline(['relay', 'rule', 'delivery']), true);
  assert.equal(verifyTimeline(['rule', 'relay', 'delivery']), false);
  assert.equal(verifyTimeline(['backup', 'relay', 'rule', 'delivery']), false);
  assert.equal(verifyTimeline(['relay', 'rule', 'rule']), false);
  assert.equal(verifyTimeline('relay,rule,delivery'), false);
});

test('policy router validates all four assignments and rejects omissions or extras', () => {
  const correct = Object.fromEntries(ROUTE_PACKETS.map(({ id, route }) => [id, route]));
  assert.equal(ROUTE_PACKETS.length, 4);
  assert.equal(new Set(ROUTE_PACKETS.map((packet) => packet.route)).size, 4);
  assert.equal(verifyRouting(correct), true);
  assert.equal(verifyRouting({ ...correct, token: 'cache' }), false);
  assert.equal(verifyRouting({ ...correct, extra: 'vault' }), false);
  assert.equal(verifyRouting({ audit: 'vault' }), false);
  assert.equal(verifyRouting(null), false);
});

test('byte decoder checks printable ASCII and verifies a real decoded phrase', () => {
  assert.equal(decodeHexBytes(CIPHER_HEX), 'SCOPE-FIRST');
  assert.equal(decodeHexBytes('41 42 43'), 'ABC');
  assert.equal(decodeHexBytes('00 42'), null);
  assert.equal(decodeHexBytes('GG'), null);
  assert.equal(verifyCipher('scope first'), true);
  assert.equal(verifyCipher('SCOPE-FIRST'), true);
  assert.equal(verifyCipher('SCOPE-LATER'), false);
});

test('image finding requires the visible channel and a bounded interpretation', () => {
  assert.equal(verifyBitplane('node-7', 'bounded', 'blue'), true);
  assert.equal(verifyBitplane('NODE-7', 'bounded', 'composite'), false);
  assert.equal(verifyBitplane('NODE-7', 'actor', 'blue'), false);
  assert.equal(verifyBitplane('NODE-9', 'bounded', 'blue'), false);
});

test('local progress normalizes corrupt saves and hints cannot exceed authored levels', () => {
  const corrupt = normalizeProgress({ solved: ['routing', 'routing', 'unknown'], hints: { routing: 999, cipher: -4 } });
  assert.deepEqual(corrupt.solved, ['routing']);
  assert.equal(corrupt.hints.routing, HINTS.routing.length);
  assert.equal(corrupt.hints.cipher, 0);
  const solved = completePuzzle(corrupt, 'cipher');
  assert.deepEqual(solved.solved, ['routing', 'cipher']);
  assert.deepEqual(completePuzzle(solved, 'cipher').solved, solved.solved);
  assert.equal(advanceHint(normalizeProgress(null), 'timeline').hints.timeline, 1);
  assert.equal(completePuzzle(solved, 'invalid').solved.length, 2);
});

test('standalone page is wired, local-only, and keeps existing lab/challenge untouched', () => {
  const html = readFileSync(resolve(root, 'signal-vault.html'), 'utf8');
  const script = readFileSync(resolve(root, 'js/signal-vault-ui.js'), 'utf8');
  assert.ok(existsSync(resolve(root, 'css/signal-vault.css')));
  assert.ok(existsSync(resolve(root, 'CyberWorld_login/lab.html')));
  assert.match(html, /href="CyberWorld_login\/lab\.html"/);
  assert.match(html, /src="js\/signal-vault-ui\.js"/);
  for (const id of PUZZLE_IDS) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, new RegExp(`data-hint="${id}"`));
    assert.match(html, new RegExp(`id="check-${id}"`));
  }
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(`${html}\n${script}`, /fetch\s*\(|XMLHttpRequest|WebSocket|<form[^>]+action=/i);
  assert.doesNotMatch(html, /<script[^>]+src="https?:/i);
  for (const [, path] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    if (path.startsWith('#')) continue;
    const localPath = path.split('#')[0];
    assert.ok(existsSync(resolve(root, localPath)), `missing local link or asset: ${path}`);
  }
});
