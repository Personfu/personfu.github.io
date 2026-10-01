// Signal Vault is an original, browser-only fictional training puzzle set.
// Nothing here contacts a host or represents a real person, service, or event.

export const PUZZLE_IDS = Object.freeze(['timeline', 'routing', 'cipher', 'bitplane']);

export const TIMELINE_RECORDS = Object.freeze([
  { id: 'browser', time: '09:03', source: 'Kiosk browser', text: 'A public kiosk changes its theme preference. Different device; no shared session.' },
  { id: 'relay', time: '08:42', source: 'Identity relay', text: 'Session S-17 signs in to the fictional Orion mailbox.' },
  { id: 'backup', time: '08:39', source: 'Backup scheduler', text: 'The isolated archival host completes an approved backup.' },
  { id: 'delivery', time: '08:55', source: 'Delivery trace', text: 'Session S-17 forwards a copy of one message through the new rule.' },
  { id: 'rule', time: '08:47', source: 'Mail audit', text: 'Session S-17 creates a forwarding rule on the same mailbox.' },
]);

const TIMELINE_SOLUTION = Object.freeze(['relay', 'rule', 'delivery']);

export const ROUTE_RULES = Object.freeze([
  { id: 'identity', label: 'IDENTITY', rule: 'One-time account recovery tokens stay on the trusted identity lane.' },
  { id: 'cache', label: 'EDGE CACHE', rule: 'Public, immutable status art may be served from the edge.' },
  { id: 'vault', label: 'EVIDENCE VAULT', rule: 'Signed audit records must retain provenance and chain of custody.' },
  { id: 'quarantine', label: 'QUARANTINE', rule: 'Unknown executables are isolated until reviewed.' },
]);

export const ROUTE_PACKETS = Object.freeze([
  { id: 'audit', label: 'Signed audit export', detail: 'Timestamped, source-linked evidence bundle.', route: 'vault' },
  { id: 'token', label: 'Recovery token', detail: 'Single-use account recovery code.', route: 'identity' },
  { id: 'attachment', label: 'Unknown executable', detail: 'Untrusted file from a fictional training mailbox.', route: 'quarantine' },
  { id: 'poster', label: 'Public status tile', detail: 'Immutable image with no user data.', route: 'cache' },
]);

export const CIPHER_HEX = '53 43 4F 50 45 2D 46 49 52 53 54';
const BITPLANE_LABEL = 'NODE-7';

export const HINTS = Object.freeze({
  timeline: [
    'A related chain needs the same session and mailbox. An earlier timestamp alone does not make a record relevant.',
    'Keep the identity sign-in, rule creation, and delivery event. Put them in observed time order.',
    'The three IDs are relay → rule → delivery; the backup and kiosk records are noise.',
  ],
  routing: [
    'Read the policy lanes before routing by file name. Match the handling need, not the packet color.',
    'The token needs identity handling; the executable needs isolation. Which lanes preserve audit evidence and serve public art?',
    'Audit → evidence vault; token → identity; executable → quarantine; public tile → edge cache.',
  ],
  cipher: [
    'These are hexadecimal byte values, not a substitution cipher. Decode each pair as one ASCII character.',
    '53 43 4F 50 45 spells SCOPE. The 2D byte is a hyphen.',
    'The complete phrase is SCOPE-FIRST.',
  ],
  bitplane: [
    'A crowded composite can hide a low-contrast annotation. Compare individual color channels.',
    'The blue channel exposes the annotation. It is an artifact of this synthetic image, not a real-world location.',
    'The blue-channel label is NODE-7. Choose the bounded interpretation, not a GPS or actor claim.',
  ],
});

const canonical = (value) => String(value ?? '').trim().toUpperCase().replace(/[\s_]+/g, '-');

export function verifyTimeline(ids) {
  return Array.isArray(ids) && ids.length === TIMELINE_SOLUTION.length
    && ids.every((id, index) => id === TIMELINE_SOLUTION[index]);
}

export function verifyRouting(assignments) {
  if (!assignments || typeof assignments !== 'object' || Array.isArray(assignments)) return false;
  return Object.keys(assignments).length === ROUTE_PACKETS.length
    && ROUTE_PACKETS.every((packet) => assignments[packet.id] === packet.route);
}

export function decodeHexBytes(hex) {
  if (typeof hex !== 'string' || !/^(?:[0-9a-fA-F]{2})(?:\s+[0-9a-fA-F]{2})*$/.test(hex.trim())) return null;
  const bytes = hex.trim().split(/\s+/).map((byte) => Number.parseInt(byte, 16));
  if (bytes.some((byte) => byte < 32 || byte > 126)) return null;
  return String.fromCharCode(...bytes);
}

export function verifyCipher(answer) {
  return canonical(answer) === decodeHexBytes(CIPHER_HEX);
}

export function verifyBitplane(answer, interpretation, visibleChannel) {
  return canonical(answer) === BITPLANE_LABEL && interpretation === 'bounded' && visibleChannel === 'blue';
}

export function normalizeProgress(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const solved = Array.isArray(source.solved) ? [...new Set(source.solved.filter((id) => PUZZLE_IDS.includes(id)))] : [];
  const hints = Object.fromEntries(PUZZLE_IDS.map((id) => {
    const level = Number(source.hints?.[id]);
    return [id, Number.isInteger(level) ? Math.min(HINTS[id].length, Math.max(0, level)) : 0];
  }));
  return { solved, hints };
}

export function completePuzzle(progress, id) {
  const normalized = normalizeProgress(progress);
  if (!PUZZLE_IDS.includes(id) || normalized.solved.includes(id)) return normalized;
  return { ...normalized, solved: [...normalized.solved, id] };
}

export function advanceHint(progress, id) {
  const normalized = normalizeProgress(progress);
  if (!PUZZLE_IDS.includes(id)) return normalized;
  return { ...normalized, hints: { ...normalized.hints, [id]: Math.min(HINTS[id].length, normalized.hints[id] + 1) } };
}
