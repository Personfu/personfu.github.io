const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CASES, grade } = require('../CyberWorld_login/defender-path.js');

assert.equal(CASES.length, 10, 'The progress meter assumes ten real cases');
assert.equal(new Set(CASES.map((item) => item.id)).size, CASES.length, 'Case IDs must be unique');
assert.deepEqual(new Set(CASES.map((item) => item.type)), new Set(['multi', 'single', 'order', 'match', 'numeric']));

for (const item of CASES) {
  assert.ok(item.stage && item.range && item.title && item.objective && item.prompt);
  assert.ok(item.evidence.length >= 2 && item.hint && item.why && item.counter);
  assert.equal(grade(item, item.expected), true, `${item.id} correct answer must pass`);
  assert.equal(grade(item, null), false, `${item.id} incomplete answer must fail`);
  const wrong = item.type === 'numeric' ? item.expected + 10
    : item.type === 'single' ? item.choices.find(([id]) => id !== item.expected)[0]
    : item.type === 'multi' ? []
    : item.type === 'order' ? [...item.expected].reverse()
    : {};
  assert.equal(grade(item, wrong), false, `${item.id} wrong answer must fail`);
}

const root = path.resolve(__dirname, '..');
for (const relative of ['CyberWorld_login/index.html', 'CyberWorld_login/lab.html', 'CyberWorld/index.html', 'ctf-trail.html']) {
  const body = fs.readFileSync(path.join(root, relative), 'utf8');
  assert.match(body, /defender-path\.html/, `${relative} must contain the route`);
}
const html = fs.readFileSync(path.join(root, 'CyberWorld_login/defender-path.html'), 'utf8');
assert.match(html, /defender-path\.js/);
assert.match(html, /connect-src 'none'/);
for (const [, href] of html.matchAll(/href="([^"#]+)"/g)) {
  if (/^https?:/.test(href)) continue;
  const target = path.resolve(root, 'CyberWorld_login', href);
  assert.ok(fs.existsSync(target), `Broken casebook link: ${href}`);
}
assert.ok(fs.existsSync(path.join(root, 'CyberWorld_login', 'defender-path.js')));
console.log('Defender Path: ten graded cases, five mechanics, links, and static security boundary verified.');
