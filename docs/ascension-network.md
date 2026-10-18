# Ascension guest presence

`CyberWorld/ascension-net.js` provides an ephemeral social layer for the public
guest game. It creates no account and calls no database, billing, admin, tool,
reward, leaderboard or progress API. The local game remains playable if the
network is unavailable.

## Integration

After loading or creating an operative, call:

```js
const net = window.__cwAscensionNet;
net.start({ callsign, faction, role, color });
net.publishPosition({ x: avatar.x / width, y: avatar.y / height,
  zone: view + ':' + district, facing: angle, moving: true });
const unsubscribe = net.onChange(({ label, online, roster, players }) => {});
```

Positions are normalized to `[0, 1]` for x/y, with zone identifying the current
game view and district. Peers retain x/y directly; multiply them by local canvas
dimensions when rendering. The public API also exposes `stop()`, `status()`,
`peers()`, and `me()`. Each `start()` after a stop has a new random session ID;
matching callsigns never merge players. `peers()` excludes the local player.

When no older `window.__cwNet` exists, a compatibility adapter provides
`roster()`, `onRoster(cb)`, `me()`, `online()`, `status()`, `state()`, and
`positions()` keyed by session ID. Roster includes self. It does not implement
auth, cloud saves, rewards or global chat.

## Connection truth

- **LIVE GRID**: the existing Supabase project accepted the public channel join.
  Other players appear only from actual presence metadata on
  `cw-ascension-plaza-v1`.
- **THIS BROWSER**: BroadcastChannel exchanges actual live tabs on this browser
  origin. This is a local fallback and does not represent internet multiplayer.
- **SOLO MODE**: neither public channel nor local tab transport is available.

Status is never marked online at socket-open time. Channel rejection, timeout,
socket failure, missing heartbeat replies or offline events clear cloud peers
immediately. Reconnect uses bounded exponential delay. Presence departure and a
45-second local freshness limit remove stale peers; stopping releases transports
and timers. Positions coalesce to at most eight sends per second. Metadata
refreshes every 15 seconds and protocol heartbeat runs every 20 seconds.

## Security and privacy

Only bounded handle, faction, role, color, session ID and fictional world
position are exchanged. Emails, OAuth identities, auth tokens, XP, credits,
inventory, completion flags and payment data are never read or accepted here.
Incoming metadata is sanitized and capped at 128 remote peers. Positions are
display-only, untrusted guest data; an open public channel does not establish
verified identity or competitive authority. It must never award progress or
validate paid access. There is no global chat surface to moderate in this layer.

The project URL and publishable key already present in `cw-net.js` are reused.
No service-role or secret key belongs in browser code. The public Phoenix JSON
protocol avoids adding another CDN dependency or mandatory sign-in. A public
channel could be disabled by the project's operators; the fallback stays honest
and gameplay continues.

## Verification

`node scripts/test_ascension_net.cjs` covers subscription status, sanitized
metadata, session identity, tracked-peer validation, movement throttling,
presence ref replacement/departure, actual local-tab discovery, disconnect and
cleanup. A read-only ephemeral join to the existing public channel returned
`{"status":"ok","response":{"postgres_changes":[]}}` during implementation;
it did not track a player, create an account or change a database.

### Actual two-tab public presence check

A later Chrome 149 probe started two real tabs through the public game UI,
using the same saved handle and distinct session IDs. Both tabs joined the
public grid and saw the exact opposite session as a cloud peer by the
two-second sample. They remained reciprocal through the full 20-second sample;
closing one tab removed that exact session from the other by the next
two-second sample. Join and track acknowledgements were successful.

`docs/benchmarks/ascension-peer-probe.json` retains the bounded status/protocol
capture without player emails, credentials or database operations. These were
transient real guest sessions, not seeded roster entries. A prior probe saw
reciprocal discovery by four seconds. Provider batching and browser background
scheduling make immediate discovery/departure assertions inappropriate.

The browser regression test now checks reciprocal session IDs (not an arbitrary
nonzero count) and actual departed-session absence, with a bounded 20-second
provider-delivery allowance. It passed in 12.5 seconds. Its former departure
filter incorrectly used `transport === 'local'`; the actual local-tab transport
is named `browser`, so that filter could pass without checking any departure.

To repeat the live check, start `node scripts/preview-ascension.cjs`, then run
`npm run probe:peers`. The probe exits unsuccessfully if reciprocal actual cloud
sessions or bounded departure are not observed. It creates no account and
writes no database rows; the live public network must be available. Offline and
same-browser fallback behavior remains covered by the deterministic network
suite.

Protocol and presence references:

- https://supabase.com/docs/guides/realtime/protocol
- https://supabase.com/docs/guides/realtime/presence

## Existing infrastructure audit

Root `sw.js` redirects `/CyberWorld/` and legacy game routes to the FLLC member
gateway. The public Ascension route must be explicitly exempted by the main
entry/service-worker work. Existing legacy saves must be migrated locally with
their raw backups retained.

Legacy `multiplayer-server/server.js` Socket.IO lobby/chat currently emits
authenticated emails, and its progress route accepts a client XP delta. The
new presence layer deliberately does not use those routes. Existing Supabase
RPC clamping is documented in the old README but SQL migrations are absent in
this checkout; trusted progression/cloud-save claims require a separate schema
and ownership-policy review before deployment.
