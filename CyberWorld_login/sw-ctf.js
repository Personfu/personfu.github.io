/* ====================================================================
   CyberWorld :: Training Service Worker  (Tier 4 // Burp-style range)
   --------------------------------------------------------------------
   Author    : Person / FLLC <https://fllc.net>
   Scope     : /CyberWorld_login/
   Purpose   : simulate a small, deliberately vulnerable backend so the
               analyst can practise web pentesting (JWT forgery, IDOR,
               path traversal, X-Forwarded-For trust, HPP, race
               conditions, and a chained master flag) entirely client-
               side. Nothing leaves the browser.

   This file is the Tier-4 challenge surface. Read it. Every line is
   intentional. Real vulnerabilities and obvious false flags coexist;
   your job is to tell them apart.
   ==================================================================== */

self.addEventListener("install", (event) => { self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });

const SCOPE       = "/CyberWorld_login/";
const API_PREFIX  = SCOPE + "api/v1/";
const ADMIN_PATH  = SCOPE + "admin";
const JWT_WEAK_KEY = "cyberworld";          // F22 hint: weak HMAC key, intentionally
const OPERATOR_HDR = "x-cw-ops";            // F30 second-factor header
const OPERATOR_VAL = "cyberworld-operator"; // F30 expected value

// ----- decoy static files served outside the API tree -----
const DECOYS = {
  [SCOPE + ".env.bak"]: {
    body: [
      "# === DO NOT COMMIT === (this file is a CTF decoy)",
      "CYBERWORLD_API_KEY=DECOY__not_a_real_key_F00",
      "CYBERWORLD_DB=postgres://decoy@example.test/decoy",
      "CYBERWORLD_JWT_SECRET=DECOY__look_at_jwt_alg_field_instead",
      "# real lesson: secrets in .env.bak are a smell, but this one is bait",
    ].join("\n") + "\n",
    type: "text/plain",
    decoy: true,
  },
  [SCOPE + ".git/HEAD"]: {
    // Fake-looking .git/HEAD. A genuine value is "ref: refs/heads/main\n".
    // This one is plausible-looking but wrong; analyst who recognises the
    // legit format spots the decoy without wasting time mirroring a repo.
    body: "ref: refs/heads/decoy-honeypot\n",
    type: "text/plain",
    decoy: true,
  },
  [SCOPE + "backup.zip"]: {
    // PK\x03\x04 is a real ZIP local-file-header magic, but everything
    // after it is junk. unzip(1) will refuse with "End-of-central-
    // directory signature not found".
    body: "PK\x03\x04DECOY_F00_no_central_directory_anywhere_here",
    type: "application/zip",
    decoy: true,
  },
  [SCOPE + "admin.php"]: {
    body: "PHP Warning: this is a static site; admin.php is bait.\n",
    type: "text/plain",
    decoy: true,
  },
  [SCOPE + "wp-admin/"]: {
    body: "<!doctype html><title>404</title>nope - no WordPress here\n",
    type: "text/html",
    decoy: true,
  },
  [SCOPE + "config.json"]: {
    body: JSON.stringify({
      _comment: "DECOY -- the real config never ships in clear text",
      api_key: "DECOY__rotate_me_F00",
      jwt_secret: "DECOY__see_alg_none_F22",
      maintenance: false,
    }, null, 2) + "\n",
    type: "application/json",
    decoy: true,
  },
};

// ----- IDOR profile table -----
const PROFILES = {
  1:    { uid: 1,    handle: "trainee",     role: "user",     joined: "2026-05-01", note: "default trainee profile" },
  2:    { uid: 2,    handle: "analyst",     role: "user",     joined: "2026-05-02", note: "another trainee" },
  7:    { uid: 7,    handle: "lattice",     role: "user",     joined: "2026-05-04", note: "neighbour profile" },
  42:   { uid: 42,   handle: "cw-operator", role: "operator", joined: "2024-12-19", note: "F25 IDOR: this profile should not be visible to a 'user'",
          ctf_flag: "CTF_FLAG{F25_idor_uid_42_operator_leak}" },
  9001: { uid: 9001, handle: "sysadmin",    role: "admin",    joined: "2024-12-19", note: "decoy admin -- check the JWT path instead" },
};

// ----- pretend filesystem for the path-traversal demo -----
const FILES = {
  "etc/cyberworld.flag":         "CTF_FLAG{F26_path_traversal_etc_cyberworld_flag}\n",
  "etc/cyberworld.motd":         "Welcome, operator. Today's DEFCON_CYBER::3.\n",
  "var/log/cw-auth.log":         "2026-05-26T00:00:00Z  INFO  trainee logged in\n",
  "var/cache/decoy":             "(this file is bait -- see X-CTF-Decoy header)\n",
};

// ----- race-counter state for /api/v1/redeem -----
let _redeemCount = 0;
const REDEEM_THRESHOLD = 5;

// ----- Tier-5 state -----
// RSA public PEM published at /api/v1/auth/keys.pub.
// The JWT verifier on /api/v1/internal/super accepts HS256 signed with the
// bytes of this PEM as the HMAC key (the classic key-confusion vulnerability
// described in RFC 8725 sec. 3.1).
const RS256_PUB_PEM = [
  "-----BEGIN PUBLIC KEY-----",
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAioOWY1x0C7p8oa1s37Y9",
  "YQ25FNPaiUDUsP1f2Vvs1GHW9ae0ED9fbOQrDsGrNiMZhJUAQw0JMzIedvqJ9+ej",
  "7YcNNS+SF0u9OTFsr3XYWLZYCy43FB2jsj3cm0Zbck0pTCtXVnGGf1tMmkPQ9zKI",
  "2LCwiWcoNHC/771FGFz4Zr2BvYEV7Qtm8ZTkj8LrCWIFesh4OByUdIMrsIwysRdT",
  "m05KbteqKkonMSkP49T9QgCI/8wwiruQNRAjoXpi9a6x5DcfXrLXvEKcVR+g31uJ",
  "Neod30Hx2JRu5sNkByD2a9y8z3WBICaUvaMTFYtUxU5un9LqPoAGPwrybkC9KxPh",
  "eQIDAQAB",
  "-----END PUBLIC KEY-----",
  "",
].join("\n");

// Vulnerable deep merge -- recurses into __proto__ when present as an own
// property in the source (which JSON.parse does produce). After this runs
// with a malicious body, Object.prototype is polluted.
// CWE-1321; OWASP Web Top-10 2021 A06 (Vulnerable & Outdated Components).
function vulnerableDeepMerge(dst, src) {
  for (const k in src) {                 // intentionally NOT hasOwnProperty
    const v = src[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if (!dst[k]) dst[k] = {};          // for k=__proto__ this is Object.prototype
      vulnerableDeepMerge(dst[k], v);
    } else {
      dst[k] = v;
    }
  }
  return dst;
}

// In-memory poisonable cache (F33). No authentication on write.
const swPoisonableCache = new Map();

// ============================================================
//  pure handler: takes a Fetch Request, returns a Fetch Response.
//  Exported on self.__ctfHandler for Node smoke tests.
// ============================================================
async function ctfHandleRequest(request) {
  const url = new URL(request.url);

  // a) decoys served verbatim
  if (Object.prototype.hasOwnProperty.call(DECOYS, url.pathname)) {
    const d = DECOYS[url.pathname];
    return new Response(d.body, {
      status: 200,
      headers: {
        "Content-Type":  d.type,
        "X-CTF-Decoy":   "true",
        "X-CTF-Hint":    "this file is bait; see CHALLENGE.md Tier 4 false-flag list",
      },
    });
  }

  // b) hidden admin landing (not really hidden -- robots.txt lists it)
  if (url.pathname === ADMIN_PATH || url.pathname === ADMIN_PATH + "/") {
    const body =
      "<!doctype html><meta charset='utf-8'><title>CyberWorld :: Admin</title>" +
      "<style>body{background:#070a14;color:#00ffe7;font-family:Consolas,monospace;padding:32px;line-height:1.6}" +
      "a{color:#ff0055}code{color:#ffbf00;background:#0a121e;padding:2px 5px;border-radius:3px}</style>" +
      "<h1>CyberWorld :: Admin</h1>" +
      "<p>// CTF_RANGE::LIVE -- this surface is wired to a service-worker backend.</p>" +
      "<p>Try <code>GET /CyberWorld_login/api/v1/debug/echo</code> for header reflection,</p>" +
      "<p>or open <a href='intercept.html'>intercept.html</a> for the Tier-4 workbench.</p>" +
      "<p style='color:#666'>// provided as is for demonstration and educational purposes only</p>";
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/html", "X-CTF-Surface": "admin-landing" },
    });
  }

  // c) sitemap.xml: real + decoy URLs
  if (url.pathname === SCOPE + "sitemap.xml") {
    const urls = [
      "https://personfu.github.io/CyberWorld_login/",
      "https://personfu.github.io/CyberWorld_login/console.html",
      "https://personfu.github.io/CyberWorld_login/lab.html",
      "https://personfu.github.io/CyberWorld_login/crypto.html",
      "https://personfu.github.io/CyberWorld_login/intel.html",
      "https://personfu.github.io/CyberWorld_login/intercept.html",
      "https://personfu.github.io/CyberWorld_login/admin",
      "https://personfu.github.io/CyberWorld_login/admin.php",   // decoy
      "https://personfu.github.io/CyberWorld_login/wp-admin/",   // decoy
      "https://personfu.github.io/CyberWorld_login/.env.bak",    // decoy
      "https://personfu.github.io/CyberWorld_login/backup.zip",  // decoy
    ];
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(u => `  <url><loc>${u}</loc></url>`).join("\n") +
      "\n</urlset>\n";
    return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml" } });
  }

  // d) /api/v1/* routes
  if (!url.pathname.startsWith(API_PREFIX)) return null; // let the network handle it
  const route = url.pathname.slice(API_PREFIX.length).replace(/\/+$/, "");

  // Headers as a plain object for echoing and inspection.
  const headers = {};
  for (const [k, v] of request.headers) headers[k.toLowerCase()] = v;

  // GET /api/v1/debug/echo -- Burp-style request echo (analyst exploration tool)
  if (route === "debug/echo") {
    return jsonResponse({
      hint:    "this endpoint reflects exactly what your request sent; use it to inspect cookies + headers",
      method:  request.method,
      url:     url.pathname + url.search,
      headers,
      query:   Object.fromEntries(url.searchParams),
    });
  }

  // GET /api/v1/auth/issue -- mint a vulnerable HS256 JWT for the analyst
  // (so they don't need a JWT library to start; they can also forge alg=none from scratch).
  if (route === "auth/issue") {
    const sub = url.searchParams.get("sub") || "trainee";
    const role = url.searchParams.get("role") || "user";
    const payload = { sub, role, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 24*3600 };
    const hdr = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
    const pl  = b64url(new TextEncoder().encode(JSON.stringify(payload)));
    const sig = await hmacSha256B64(JWT_WEAK_KEY, hdr + "." + pl);
    return jsonResponse({ token: hdr + "." + pl + "." + sig, alg: "HS256", note: "weak key is published in source: 'cyberworld'" });
  }

  // GET /api/v1/auth/whoami -- decode Authorization Bearer JWT, accepting alg=none (F22 vuln)
  if (route === "auth/whoami") {
    const jwt = parseAuthorization(headers.authorization);
    if (!jwt) return jsonResponse({ error: "no bearer token", hint: "Authorization: Bearer <jwt>" }, 401);
    const claims = await verifyJwt(jwt);
    if (!claims.ok) return jsonResponse({ error: claims.error }, 401);
    const body = { sub: claims.payload.sub, role: claims.payload.role, alg: claims.header.alg };
    if (claims.header.alg === "none") {
      body.ctf_flag = "CTF_FLAG{F22_alg_none_accepted_by_whoami}";
    }
    return jsonResponse(body);
  }

  // GET /api/v1/profile?uid=X -- IDOR: any uid is returned
  if (route === "profile") {
    const uid = Number(url.searchParams.get("uid") || 1);
    const p = PROFILES[uid];
    if (!p) return jsonResponse({ error: "not found", uid }, 404);
    return jsonResponse(p);
  }

  // GET /api/v1/admin/users -- requires Bearer JWT role=admin (F24)
  if (route === "admin/users") {
    const jwt = parseAuthorization(headers.authorization);
    if (!jwt) return jsonResponse({ error: "Authorization required" }, 401);
    const claims = await verifyJwt(jwt);
    if (!claims.ok) return jsonResponse({ error: claims.error }, 401);
    if (claims.payload.role !== "admin") return jsonResponse({ error: "forbidden; role != admin", you_are: claims.payload.role }, 403);
    return jsonResponse({
      users: Object.values(PROFILES),
      ctf_flag: "CTF_FLAG{F24_jwt_forged_to_admin}",
    });
  }

  // GET /api/v1/admin/geo -- X-Forwarded-For trust gate (F27)
  if (route === "admin/geo") {
    const xff = (headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (xff === "127.0.0.1") {
      return jsonResponse({ ok: true, ctf_flag: "CTF_FLAG{F27_x_forwarded_for_localhost_bypass}" });
    }
    return jsonResponse({ error: "region restricted to internal hosts", x_forwarded_for: xff || null }, 403);
  }

  // GET /api/v1/files?name=X -- path-traversal demo (F26)
  if (route === "files") {
    const name = url.searchParams.get("name") || "";
    const norm = name.replace(/^\/+/, "").replace(/\\/g, "/");
    if (FILES[norm]) return new Response(FILES[norm], { headers: { "Content-Type": "text/plain" } });
    // Allow traversal via "../" prefix as the demo
    const stripped = norm.replace(/\.\.\//g, "");
    if (FILES[stripped]) {
      const body = FILES[stripped];
      const headers2 = { "Content-Type": "text/plain" };
      if (stripped === "etc/cyberworld.flag") headers2["X-CTF-Finding"] = "F26";
      return new Response(body, { headers: headers2 });
    }
    return jsonResponse({
      error: "file not found",
      hint:  "list of known paths: " + Object.keys(FILES).join(", "),
      tried: name,
    }, 404);
  }

  // GET /api/v1/hpp?token=user&token=admin -- HPP last-wins (F28)
  if (route === "hpp") {
    const tokens = url.searchParams.getAll("token");
    const last = tokens[tokens.length - 1];
    return jsonResponse({
      tokens_received: tokens,
      token_used:      last,
      ctf_flag: last === "admin" ? "CTF_FLAG{F28_hpp_last_value_wins}" : null,
      hint: tokens.length > 1 ? null : "try sending the parameter twice: ?token=user&token=admin",
    });
  }

  // POST /api/v1/redeem -- race condition demo (F29)
  if (route === "redeem" && request.method === "POST") {
    _redeemCount += 1;
    const current = _redeemCount;
    // Synthetic latency to widen the window for parallel requests.
    await new Promise(r => setTimeout(r, 50));
    return jsonResponse({
      count_after: current,
      ctf_flag: current >= REDEEM_THRESHOLD ? "CTF_FLAG{F29_race_condition_unbounded_redeem}" : null,
      hint: current < REDEEM_THRESHOLD
        ? "single-threaded redeems never reach " + REDEEM_THRESHOLD + " before the page reloads; try Promise.all"
        : null,
    });
  }

  // -----------------------------------------------------------------
  // Tier 5 // deeper exploit chain (F31-F33)
  // CWE-345  Insufficient verification of data authenticity (key confusion)
  // CWE-1321 Improperly Controlled Modification of Object Prototype Attributes
  // CWE-639  Authorization Bypass Through User-Controlled Key (cache confusion)
  // -----------------------------------------------------------------

  // GET /api/v1/auth/keys.pub -- publishes an RSA public key as if for RS256.
  // The classic JWT key-confusion attack: the verifier on /api/v1/internal/super
  // accepts HS256 signed with the bytes of this PEM as the HMAC key.
  // Reference: RFC 8725 sec. 3.1 (Algorithm Confusion).
  if (route === "auth/keys.pub") {
    return new Response(RS256_PUB_PEM, {
      status: 200,
      headers: { "Content-Type": "application/x-pem-file", "X-CTF-Surface": "key-confusion-target" },
    });
  }

  // GET /api/v1/internal/super -- F31 key-confusion target.
  if (route === "internal/super") {
    const jwt = parseAuthorization(headers.authorization);
    if (!jwt) return jsonResponse({ error: "Authorization required" }, 401);
    const parts = jwt.split(".");
    if (parts.length !== 3) return jsonResponse({ error: "malformed JWT" }, 401);
    let header, payload;
    try {
      header  = JSON.parse(b64urlDecode(parts[0]));
      payload = JSON.parse(b64urlDecode(parts[1]));
    } catch { return jsonResponse({ error: "JWT decode failed" }, 401); }
    // alg=none explicitly REJECTED for this endpoint -- forces key-confusion path.
    if (header.alg === "none") return jsonResponse({ error: "alg=none forbidden on this surface; raise the bar" }, 403);
    if (header.alg !== "HS256") return jsonResponse({ error: "alg must be HS256 for /internal/super" }, 401);
    // The bug: verifier blindly uses the RSA public PEM string as an HMAC key.
    const expected = await hmacSha256B64(RS256_PUB_PEM, parts[0] + "." + parts[1]);
    if (expected !== parts[2]) return jsonResponse({ error: "HS256 signature mismatch (try the public PEM as key)" }, 401);
    if (payload.role !== "admin" || payload.superadmin !== true)
      return jsonResponse({ error: "claims insufficient (need role=admin && superadmin=true)" }, 403);
    return jsonResponse({
      ctf_flag: "CTF_FLAG{F31_jwt_hs_rs_key_confusion}",
      cyberworld_grant: "superoperator",
      note: "you used the RSA public key as an HMAC secret -- classic RFC 8725 sec. 3.1 violation",
    });
  }

  // POST /api/v1/config/merge -- vulnerable deep-merge (CWE-1321).
  // The merge writes through __proto__ into Object.prototype.
  // Subsequent GET /api/v1/admin/console reads a brand-new object and
  // observes the polluted property.
  if (route === "config/merge" && request.method === "POST") {
    let body;
    try { body = await request.json(); }
    catch { return jsonResponse({ error: "JSON body required" }, 400); }
    if (typeof body !== "object" || body === null) return jsonResponse({ error: "object body required" }, 400);
    const target = {};
    vulnerableDeepMerge(target, body);
    return jsonResponse({
      merged_keys: Object.keys(target),
      proto_keys_visible_now: Object.keys({}),  // a sentinel; will list polluted keys
      hint: "if you wrote into __proto__, GET /api/v1/admin/console next",
    });
  }

  // GET /api/v1/admin/console -- reads a fresh object; if Object.prototype was
  // polluted with isAdmin=true and maintenance=false, the gate opens (F32).
  if (route === "admin/console") {
    const cfg = {};
    if (cfg.isAdmin === true && cfg.maintenance === false) {
      return jsonResponse({
        ctf_flag: "CTF_FLAG{F32_prototype_pollution_to_admin_console}",
        cyberworld_grant: "console-operator",
        runtime_console: { sessions: 0, alerts: 0, status: "armed" },
        note: "Object.prototype was polluted via deep-merge of __proto__; CWE-1321",
      });
    }
    return jsonResponse({
      error: "admin console locked",
      runtime: { isAdmin: cfg.isAdmin, maintenance: cfg.maintenance },
      hint: "POST a JSON body to /api/v1/config/merge first; the merge is deep + naive",
    }, 403);
  }

  // POST /api/v1/cache/put?key=X -- writes to the SW's in-memory cache with
  // NO authorization (intentional bug). The cache is later read before auth
  // by /api/v1/admin/cached-users.
  if (route === "cache/put" && request.method === "POST") {
    const key = (url.searchParams.get("key") || "").slice(0, 96);
    if (!key) return jsonResponse({ error: "?key=... required" }, 400);
    const body = await request.text();
    swPoisonableCache.set(key, body);
    return jsonResponse({
      ok: true, key, bytes: body.length,
      hint: key === "admin/users"
        ? "now GET /api/v1/admin/cached-users without any Authorization header"
        : null,
    });
  }

  // GET /api/v1/admin/cached-users -- reads cache BEFORE checking JWT (CWE-639
  // class: trust placed in unauthenticated cache content). When the cache for
  // "admin/users" is populated, the response carries the F33 flag verbatim.
  if (route === "admin/cached-users") {
    if (swPoisonableCache.has("admin/users")) {
      const cached = swPoisonableCache.get("admin/users");
      return jsonResponse({
        ctf_flag: "CTF_FLAG{F33_sw_cache_poisoning_pre_auth_read}",
        cached_bytes:  cached.length,
        cached_preview: cached.slice(0, 240),
        note: "the cache was read without any Authorization check",
      }, 200, { "X-CTF-Finding": "F33", "X-CTF-Cache-Hit": "true" });
    }
    return jsonResponse({ error: "cache empty -- poison it via POST /api/v1/cache/put?key=admin/users" }, 404);
  }

  // GET /api/v1/internal/flag -- chain F22 (alg=none) + F24 (role=admin) + custom op header (F30)
  if (route === "internal/flag") {
    const jwt = parseAuthorization(headers.authorization);
    if (!jwt) return jsonResponse({ error: "Authorization required" }, 401);
    const claims = await verifyJwt(jwt);
    if (!claims.ok) return jsonResponse({ error: claims.error }, 401);
    if (claims.payload.role !== "admin") return jsonResponse({ error: "role != admin" }, 403);
    if (claims.header.alg !== "none")    return jsonResponse({ error: "internal endpoints only accept emergency tokens (hint: alg=none)" }, 403);
    if (headers[OPERATOR_HDR] !== OPERATOR_VAL)
      return jsonResponse({ error: "missing operator second factor", hint: "header " + OPERATOR_HDR + ": " + OPERATOR_VAL }, 403);
    return jsonResponse({
      master_flag: "CTF_FLAG{F30_jwt_alg_none_plus_admin_plus_xcwops}",
      cyberworld_grant: "operator",
      ctf_flag: "CTF_FLAG{F30_chain_alg_none+role_admin+x_cw_ops}",
    });
  }

  // GET /api/v1/debug?secret=admin -- decoy
  if (route === "debug" && url.searchParams.get("secret") === "admin") {
    return jsonResponse({
      response: "thanks for trying ?secret=admin; this is the canonical decoy. See X-CTF-Decoy header.",
    }, 200, { "X-CTF-Decoy": "true" });
  }

  // ----- pirate-themed noise endpoints (Tier-4 atmospherics) -----
  // GET /api/v1/alarm/heartbeat -- periodic ping the page fires so the
  // analyst's Network tab fills with intimidating-looking traffic.
  if (route === "alarm/heartbeat") {
    const traceId = (crypto.getRandomValues(new Uint8Array(6))).reduce((s,b)=>s+b.toString(16).padStart(2,"0"),"");
    return jsonResponse({
      status:   "armed",
      trace_id: traceId,
      ts:       new Date().toISOString(),
      jolly_roger: "  X  ",
      note: "training heartbeat; nothing is actually being tracked",
    }, 200, {
      "X-CTF-Surface":   "training-alarm-only",
      "X-Alarm-State":   "ENGAGED",
      "X-Trace-Id":      traceId,
      "X-Jolly-Roger":   "<>--SKULL+CROSSBONES--<>",
      "X-CTF-Theatre":   "true",  // mirror of X-CTF-Decoy for atmospherics
    });
  }

  // GET /api/v1/alarm/intrusion?evt=X -- fired by the page when the
  // DevTools-open detector trips; nothing is logged or sent off-origin.
  if (route === "alarm/intrusion") {
    const evt = (url.searchParams.get("evt") || "unspecified").slice(0, 32);
    return jsonResponse({
      logged:    false,
      evt,
      sent_to:   "/dev/null",
      message:   "this is a fake alarm; the only place it goes is your own browser",
      next_step: "open CHALLENGE.md or GET /api/v1/debug/echo to start the real CTF",
    }, 200, {
      "X-CTF-Surface":   "training-alarm-only",
      "X-Alarm-State":   "INTRUSION_FAKE",
      "X-Intrusion-Evt": evt,
      "X-CTF-Theatre":   "true",
    });
  }

  // GET /api/v1/lab/sysinfo -- decoy (looks like a juicy fingerprint endpoint)
  if (route === "lab/sysinfo") {
    return jsonResponse({
      server: "nginx/1.27.0 (Ubuntu)",   // lie -- this is a service worker
      php:    "8.3.6",                   // lie -- no PHP runs anywhere
      uptime: "31d 4h 12m",              // lie -- there is no server
      _ctf_note: "this is a decoy; we are static + service-worker only",
    }, 200, { "X-CTF-Decoy": "true" });
  }

  // GET /api/v1/__proto__/polluted -- decoy
  if (route === "__proto__/polluted") {
    return jsonResponse({ ok: true, message: "no prototype pollution here, friend" }, 200, { "X-CTF-Decoy": "true" });
  }

  // catch-all 404 with discovery hint
  return jsonResponse({
    error: "endpoint not found",
    tried: route,
    discovery_hint: "GET /api/v1/debug/echo lists what you sent; sitemap.xml + robots.txt list paths",
  }, 404);
}

// ============================================================
//  utils
// ============================================================
function jsonResponse(body, status, extraHeaders) {
  const h = Object.assign({ "Content-Type": "application/json", "Cache-Control": "no-store" }, extraHeaders || {});
  return new Response(JSON.stringify(body, null, 2), { status: status || 200, headers: h });
}

function parseAuthorization(value) {
  if (typeof value !== "string") return null;
  const m = value.match(/^Bearer\s+(\S+)$/i);
  if (!m) return null;
  return m[1];
}

function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}
function b64url(uint8) {
  let s = "";
  for (const b of uint8) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
async function hmacSha256B64(key, message) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message)));
  return b64url(sig);
}

// JWT verify -- intentionally vulnerable.
// Accepts:
//   alg=none  (no signature required at all)         F22
//   alg=HS256 (signature checked against the weak published key "cyberworld")
// Anything else: rejected.
async function verifyJwt(jwt) {
  const parts = jwt.split(".");
  if (parts.length !== 3) return { ok: false, error: "malformed JWT" };
  let header, payload;
  try {
    header  = JSON.parse(b64urlDecode(parts[0]));
    payload = JSON.parse(b64urlDecode(parts[1]));
  } catch { return { ok: false, error: "JWT base64/JSON decode failed" }; }
  if (typeof header !== "object" || header === null) return { ok: false, error: "bad header" };
  if (typeof payload !== "object" || payload === null) return { ok: false, error: "bad payload" };

  if (header.alg === "none") {
    return { ok: true, header, payload, vuln: "alg=none accepted" };
  }
  if (header.alg === "HS256") {
    const expected = await hmacSha256B64(JWT_WEAK_KEY, parts[0] + "." + parts[1]);
    if (expected !== parts[2]) return { ok: false, error: "HS256 signature mismatch (key is published: 'cyberworld')" };
    return { ok: true, header, payload };
  }
  return { ok: false, error: "unsupported alg: " + header.alg };
}

// ============================================================
//  fetch event wiring
// ============================================================
self.addEventListener("fetch", (event) => {
  // Only intercept same-origin requests within our scope.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE)) return;

  event.respondWith((async () => {
    try {
      const resp = await ctfHandleRequest(event.request);
      if (resp) return resp;
    } catch (err) {
      return jsonResponse({ error: "ctf-handler-exception", message: String(err && err.message || err) }, 500);
    }
    // Fall through: let the network serve the real file (index.html, lab.html, manifest.json, etc.)
    return fetch(event.request);
  })());
});

// Expose the handler for the Node smoke test (vm context picks this up).
self.__ctfHandleRequest = ctfHandleRequest;
self.__ctfResetState = () => {
  _redeemCount = 0;
  swPoisonableCache.clear();
  // Undo any prototype pollution between smoke-test runs.
  for (const k of ["isAdmin", "maintenance", "polluted", "role"]) {
    try { delete Object.prototype[k]; } catch {}
  }
};
