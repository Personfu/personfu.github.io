import {
  HINTS,
  ROUTE_PACKETS,
  ROUTE_RULES,
  TIMELINE_RECORDS,
  advanceHint,
  completePuzzle,
  normalizeProgress,
  verifyBitplane,
  verifyCipher,
  verifyRouting,
  verifyTimeline,
} from './signal-vault.js';

const STORAGE_KEY = 'personfu.signal-vault.v1';
const byId = (id) => document.getElementById(id);
let progress = normalizeProgress(null);
let storageAvailable = true;

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { progress = normalizeProgress(JSON.parse(raw)); }
    catch { progress = normalizeProgress(null); }
  }
} catch {
  storageAvailable = false;
}

function persist() {
  if (!storageAvailable) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
  catch { storageAvailable = false; byId('reset-status').textContent = 'Local storage is unavailable; this session remains playable, but progress will not survive a reload.'; }
}

function setFeedback(id, message, kind = '') {
  const element = byId(`${id}-feedback`);
  element.textContent = message;
  element.className = `feedback ${kind}`;
}

function refreshProgress() {
  byId('progress-count').textContent = String(progress.solved.length).padStart(2, '0');
  byId('progress-fill').style.width = `${progress.solved.length * 25}%`;
  byId('progress-caption').textContent = progress.solved.length === 4 ? 'All rooms cleared' : `${progress.solved.length} of 4 rooms cleared`;
  document.querySelectorAll('[data-badge]').forEach((badge) => {
    const solved = progress.solved.includes(badge.dataset.badge);
    badge.textContent = solved ? 'CLEARED ✓' : 'UNCLEARED';
    badge.closest('.puzzle').classList.toggle('solved', solved);
  });
  for (const id of Object.keys(HINTS)) {
    const level = progress.hints[id];
    const hint = byId(`${id}-hint`);
    hint.hidden = level === 0;
    if (level) hint.textContent = `HINT ${level}/3 // ${HINTS[id][level - 1]}`;
    const button = document.querySelector(`[data-hint="${id}"]`);
    button.disabled = level >= HINTS[id].length;
    button.textContent = level >= HINTS[id].length ? 'ALL HINTS REVEALED' : `REVEAL HINT ${level + 1}/3`;
  }
}

function award(id, message) {
  progress = completePuzzle(progress, id);
  persist();
  refreshProgress();
  setFeedback(id, `ROOM CLEARED // ${message}`, 'good');
}

let timelineOrder = TIMELINE_RECORDS.map((record) => record.id);
const selectedTimeline = new Set();

function renderTimeline(focusId = '') {
  const container = byId('timeline-records');
  container.replaceChildren();
  timelineOrder.forEach((id, index) => {
    const record = TIMELINE_RECORDS.find((item) => item.id === id);
    const row = document.createElement('div');
    row.className = 'record';
    const input = document.createElement('input');
    input.type = 'checkbox'; input.id = `record-${id}`; input.checked = selectedTimeline.has(id);
    input.setAttribute('aria-label', `Include ${record.source} at ${record.time} in the evidence chain`);
    input.addEventListener('change', () => { if (input.checked) selectedTimeline.add(id); else selectedTimeline.delete(id); });
    const stamp = document.createElement('span'); stamp.className = 'record-time'; stamp.textContent = record.time;
    const copy = document.createElement('label'); copy.className = 'record-copy'; copy.htmlFor = input.id;
    const title = document.createElement('strong'); title.textContent = record.source;
    const detail = document.createElement('span'); detail.textContent = record.text;
    copy.append(title, detail);
    const moves = document.createElement('div'); moves.className = 'record-move';
    for (const [symbol, offset, label] of [['↑', -1, 'up'], ['↓', 1, 'down']]) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = symbol; button.disabled = index + offset < 0 || index + offset >= timelineOrder.length;
      button.setAttribute('aria-label', `Move ${record.source} ${label}`); button.dataset.move = `${id}:${label}`;
      button.addEventListener('click', () => {
        [timelineOrder[index], timelineOrder[index + offset]] = [timelineOrder[index + offset], timelineOrder[index]];
        renderTimeline(`${id}:${label}`);
      });
      moves.append(button);
    }
    row.append(input, stamp, copy, moves);
    container.append(row);
  });
  if (focusId) container.querySelector(`[data-move="${focusId}"]`)?.focus({ preventScroll: true });
}

function renderRouting() {
  const packets = byId('route-packets');
  const rules = byId('route-rules');
  ROUTE_RULES.forEach((lane) => {
    const item = document.createElement('li');
    const title = document.createElement('strong'); title.textContent = `${lane.label} // `;
    item.append(title, document.createTextNode(lane.rule));
    rules.append(item);
  });
  ROUTE_PACKETS.forEach((packet) => {
    const row = document.createElement('div'); row.className = 'packet';
    const copy = document.createElement('div');
    const title = document.createElement('b'); title.textContent = packet.label;
    const detail = document.createElement('span'); detail.textContent = packet.detail;
    copy.append(title, detail);
    const select = document.createElement('select'); select.id = `route-${packet.id}`;
    select.setAttribute('aria-label', `Route ${packet.label}`);
    select.add(new Option('Choose lane', ''));
    ROUTE_RULES.forEach((lane) => select.add(new Option(lane.label, lane.id)));
    row.append(copy, select); packets.append(row);
  });
}

renderTimeline();
renderRouting();
refreshProgress();
if (!storageAvailable) byId('reset-status').textContent = 'Local storage is unavailable; this session remains playable, but progress will not survive a reload.';

byId('check-timeline').addEventListener('click', () => {
  const selectedInOrder = timelineOrder.filter((id) => selectedTimeline.has(id));
  if (selectedInOrder.length !== 3) return setFeedback('timeline', 'Select exactly three related observations, then arrange them chronologically.', 'bad');
  if (!verifyTimeline(selectedInOrder)) return setFeedback('timeline', 'Chain rejected. Recheck the shared session, source relevance, and observed order.', 'bad');
  award('timeline', 'The sign-in, rule, and delivery records form a bounded chain. The other two records are unrelated.');
});

byId('check-routing').addEventListener('click', () => {
  const routes = Object.fromEntries(ROUTE_PACKETS.map((packet) => [packet.id, byId(`route-${packet.id}`).value]));
  if (Object.values(routes).some((route) => !route)) return setFeedback('routing', 'Choose a lane for all four packets before dispatch.', 'bad');
  if (!verifyRouting(routes)) return setFeedback('routing', 'Policy rejected. Match each packet’s handling need to the stated lane rules.', 'bad');
  award('routing', 'Every packet stayed within its correct defensive handling lane.');
});

function checkCipher() {
  const value = byId('cipher-answer').value;
  if (!value.trim()) return setFeedback('cipher', 'Enter the decoded ASCII phrase first.', 'bad');
  if (!verifyCipher(value)) return setFeedback('cipher', 'Decode each byte pair as one ASCII character. The separator is part of the message.', 'bad');
  award('cipher', 'The strip decodes to SCOPE-FIRST. Decoding does not make the content trustworthy.');
}
byId('check-cipher').addEventListener('click', checkCipher);
byId('cipher-answer').addEventListener('keydown', (event) => { if (event.key === 'Enter') checkCipher(); });

document.querySelectorAll('input[name="channel"]').forEach((radio) => {
  radio.addEventListener('change', () => { if (radio.checked) byId('lens-shell').dataset.channel = radio.value; });
});
byId('check-bitplane').addEventListener('click', () => {
  const channel = document.querySelector('input[name="channel"]:checked')?.value;
  if (!verifyBitplane(byId('bitplane-answer').value, byId('bitplane-claim').value, channel)) {
    return setFeedback('bitplane', 'Finding not yet bounded. Inspect the revealing channel, record its label, and avoid a real-world attribution claim.', 'bad');
  }
  award('bitplane', 'The blue channel contains an annotation in synthetic art; its provenance or location is not independently established.');
});

document.querySelectorAll('[data-hint]').forEach((button) => button.addEventListener('click', () => {
  progress = advanceHint(progress, button.dataset.hint);
  persist(); refreshProgress();
}));

let resetArmed = false;
byId('reset-progress').addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    byId('reset-progress').textContent = 'CONFIRM RESET';
    byId('reset-status').textContent = 'Press again to clear the four local room badges and hints. Your browser data is otherwise untouched.';
    return;
  }
  progress = normalizeProgress(null);
  timelineOrder = TIMELINE_RECORDS.map((record) => record.id);
  selectedTimeline.clear(); renderTimeline();
  ROUTE_PACKETS.forEach((packet) => { byId(`route-${packet.id}`).value = ''; });
  byId('cipher-answer').value = '';
  byId('bitplane-answer').value = ''; byId('bitplane-claim').value = '';
  document.querySelector('input[name="channel"][value="composite"]').checked = true;
  byId('lens-shell').dataset.channel = 'composite';
  for (const id of Object.keys(HINTS)) setFeedback(id, 'Room ready for a new run.');
  persist(); refreshProgress();
  resetArmed = false;
  byId('reset-progress').textContent = 'RESET LOCAL PROGRESS';
  byId('reset-status').textContent = 'Signal Vault progress reset on this device.';
});
