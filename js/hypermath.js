/* ================================================================
   FURIOS-INT // HYPERMATH VISUALIZATION ENGINE  v2.0
   ================================================================
   Multi-layer mathematical background renderer for index.html.

   Layer 1: 4D Hypertorus (Clifford torus — wireframe, 4D→3D→2D)
   Layer 2: Lorenz Strange Attractor (chaotic particle streams)
   Layer 3: Cyber Network Topology (pulsing node graph + packets)
   Layer 4: Floating Hacker Equations (crypto / math formulae)
   Layer 5: Matrix Rain (hacker charset, subtle)

   All layers share one <canvas id="hypermath-canvas"> element.
   Uses requestAnimationFrame for smooth 60 fps rendering.
   ================================================================ */

(function () {
  'use strict';

  /* ─── Canvas setup ─────────────────────────────────────────── */
  var canvas = document.getElementById('hypermath-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, CX, CY;

  /* ─── Global time ──────────────────────────────────────────── */
  var T = 0;
  var lastFrame = 0;

  /* ================================================================
     LAYER 1 — 4D Hypertorus (Clifford / product torus)
     ================================================================
     The Clifford torus is the simplest flat embedding of T² in ℝ⁴:
       P(θ,φ) = R₁·(cos θ, sin θ, 0, 0) + R₂·(0, 0, cos φ, sin φ)
     i.e. the Cartesian product of two circles.
     We rotate continuously in four planes (xy, xw, yw, zw) and
     project 4D → 3D via perspective, then 3D → 2D.
  ================================================================ */
  var HT = (function () {
    var STEPS = 52;        // parametric grid resolution per axis
    var R1 = 1.4, R2 = 0.9; // major / minor radii
    var pts4d = [];        // [x,y,z,w] for each grid vertex
    var edges  = [];       // [idxA, idxB] index pairs
    var D4 = 2.8;          // 4D viewing distance (w axis)
    var D3 = 3.5;          // 3D viewing distance (z axis)
    var SIZE;              // screen scale — set in resize()

    /* Build vertices & edges once */
    function build () {
      pts4d = [];
      edges  = [];
      var N = STEPS;
      for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
          var th = (i / N) * Math.PI * 2;
          var ph = (j / N) * Math.PI * 2;
          pts4d.push([
            R1 * Math.cos(th),
            R1 * Math.sin(th),
            R2 * Math.cos(ph),
            R2 * Math.sin(ph)
          ]);
        }
      }
      for (var a = 0; a < N; a++) {
        for (var b = 0; b < N; b++) {
          var idx = a * N + b;
          edges.push([idx, ((a + 1) % N) * N + b]);   // along θ
          edges.push([idx, a * N + ((b + 1) % N)]);   // along φ
        }
      }
    }

    /* Rotate 4D point in four planes */
    function rot4 (p, aXY, aXW, aYW, aZW) {
      var x = p[0], y = p[1], z = p[2], w = p[3];
      var c, s, nx, ny;

      // xy plane
      c = Math.cos(aXY); s = Math.sin(aXY);
      nx = x * c - y * s; ny = x * s + y * c;
      x = nx; y = ny;

      // xw plane
      c = Math.cos(aXW); s = Math.sin(aXW);
      nx = x * c - w * s; var nw = x * s + w * c;
      x = nx; w = nw;

      // yw plane
      c = Math.cos(aYW); s = Math.sin(aYW);
      ny = y * c - w * s; nw = y * s + w * c;
      y = ny; w = nw;

      // zw plane
      c = Math.cos(aZW); s = Math.sin(aZW);
      var nz = z * c - w * s; nw = z * s + w * c;
      z = nz; w = nw;

      return [x, y, z, w];
    }

    /* Project 4D → screen (x,y) + depth factor for coloring */
    function project (p4, aXY, aXW, aYW, aZW) {
      var r = rot4(p4, aXY, aXW, aYW, aZW);
      var x = r[0], y = r[1], z = r[2], w = r[3];

      // 4D → 3D perspective
      var s4 = D4 / (D4 - w);
      var x3 = x * s4, y3 = y * s4, z3 = z * s4;

      // 3D → 2D perspective
      var s3 = D3 / (D3 - z3);
      return [
        CX + x3 * s3 * SIZE,
        CY + y3 * s3 * SIZE,
        s4 * s3,   // depth (brighter = closer)
        w          // 4th coordinate for hue shift
      ];
    }

    function draw (ctx) {
      var aXY = T * 0.31;
      var aXW = T * 0.53;
      var aYW = T * 0.43;
      var aZW = T * 0.67;

      var cache = pts4d.map(function (p) {
        return project(p, aXY, aXW, aYW, aZW);
      });

      var N = edges.length;

      /* ── Pass 1: standard edges ── */
      ctx.shadowBlur = 0;
      for (var i = 0; i < N; i++) {
        var e = edges[i];
        var pa = cache[e[0]];
        var pb = cache[e[1]];
        var depth = (pa[2] + pb[2]) * 0.5;
        var wVal  = (pa[3] + pb[3]) * 0.5;

        // Hue: cyan (175) → violet (265) → pink (300) based on 4th coord + time
        var hue   = 175 + (wVal * 0.5 + 0.5) * 125 + Math.sin(T * 0.7) * 15;
        var alpha = Math.min(0.9, Math.max(0.04, depth * 0.30));
        var lum   = 50 + depth * 18;

        ctx.beginPath();
        ctx.strokeStyle = 'hsla(' + hue.toFixed(0) + ',100%,' + lum.toFixed(0) + '%,' + alpha.toFixed(3) + ')';
        ctx.lineWidth = Math.min(1.5, depth * 0.6);
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
        ctx.stroke();
      }

      /* ── Pass 2: glow on closest (front-facing) edges ── */
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0,232,255,0.6)';
      for (var j = 0; j < N; j++) {
        var ej = edges[j];
        var paj = cache[ej[0]];
        var pbj = cache[ej[1]];
        var dj = (paj[2] + pbj[2]) * 0.5;
        if (dj < 1.35) continue;  // only top-depth edges glow
        var wj = (paj[3] + pbj[3]) * 0.5;
        var hj = 175 + (wj * 0.5 + 0.5) * 125 + Math.sin(T * 0.7) * 15;
        ctx.beginPath();
        ctx.strokeStyle = 'hsla(' + hj.toFixed(0) + ',100%,75%,0.18)';
        ctx.lineWidth = 1.8;
        ctx.moveTo(paj[0], paj[1]);
        ctx.lineTo(pbj[0], pbj[1]);
        ctx.stroke();
      }
      ctx.restore();
    }

    function resize () {
      SIZE = Math.min(W, H) * 0.19;
    }

    return { build: build, draw: draw, resize: resize };
  }());

  /* ================================================================
     LAYER 2 — Lorenz Strange Attractor
     ================================================================
     Classic chaotic system: dx/dt = σ(y−x), dy/dt = x(ρ−z)−y,
     dz/dt = xy − βz   with σ=10, ρ=28, β=8/3.
     We run several particles with offset ICs to create streaks.
  ================================================================ */
  var LORENZ = (function () {
    var SIG = 10, RHO = 28, BET = 8 / 3;
    var DT  = 0.006;
    var TRAIL = 260;
    var N_PARTS = 6;
    var particles = [];
    var SCALE;
    var OX, OY; // screen origin (offset to center attractor visually)

    function initParticles () {
      particles = [];
      for (var i = 0; i < N_PARTS; i++) {
        particles.push({
          x: 0.1 + (i * 0.03),
          y: 0 + (i * 0.02),
          z: 20 + i,
          trail: [],
          hue: 20 + i * 25   // orange → yellow → lime
        });
      }
    }

    function step (p) {
      var dx = SIG * (p.y - p.x);
      var dy = p.x * (RHO - p.z) - p.y;
      var dz = p.x * p.y - BET * p.z;
      p.x += dx * DT;
      p.y += dy * DT;
      p.z += dz * DT;
    }

    function draw (ctx) {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        step(p);
        p.trail.push([p.x, p.y, p.z]);
        if (p.trail.length > TRAIL) p.trail.shift();
        if (p.trail.length < 2) continue;

        ctx.beginPath();
        for (var k = 1; k < p.trail.length; k++) {
          var pt = p.trail[k];
          var px = OX + pt[0] * SCALE;
          var py = OY - (pt[2] - 25) * SCALE;
          var alpha = (k / p.trail.length) * 0.22;
          if (k === 1) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.strokeStyle = 'hsla(' + p.hue + ',100%,65%,0.15)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        /* ── Bright head dot with glow ── */
        var head = p.trail[p.trail.length - 1];
        var hx = OX + head[0] * SCALE;
        var hy = OY - (head[2] - 25) * SCALE;
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'hsla(' + p.hue + ',100%,70%,0.8)';
        ctx.beginPath();
        ctx.arc(hx, hy, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + p.hue + ',100%,85%,0.9)';
        ctx.fill();
        ctx.restore();
      }
    }

    function resize () {
      SCALE = Math.min(W, H) * 0.012;
      OX = W * 0.12;
      OY = H * 0.7;
      initParticles();
    }

    return { draw: draw, resize: resize };
  }());

  /* ================================================================
     LAYER 3 — Cyber Network Topology
     ================================================================
     Floating nodes (IPs, hostnames) connected by data-packet lines.
     Packets travel from node to node, fading in and out.
  ================================================================ */
  var NETWORK = (function () {
    var N_NODES = 28;
    var nodes = [];
    var edges = [];
    var packets = [];

    var LABELS = [
      '10.0.0.1','192.168.1.1','172.16.0.5','10.10.10.2','0x0FF',
      'NODE_A','NODE_B','RELAY-7','GATE-3','C2-9','EXFIL','PIVOT',
      'SHARD','HUB-Ω','SIG-LAB','PROXY','TOR-EXIT','RECON','SHELL'
    ];

    function initNodes () {
      nodes = [];
      edges = [];
      packets = [];
      var MARGIN = 80;
      for (var i = 0; i < N_NODES; i++) {
        nodes.push({
          x: MARGIN + Math.random() * (W - MARGIN * 2),
          y: MARGIN + Math.random() * (H - MARGIN * 2),
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r:  Math.random() * 2.5 + 2,
          pulse: Math.random() * Math.PI * 2,
          type: Math.random() > 0.75 ? 'hub' : 'node',
          label: LABELS[i % LABELS.length]
        });
      }
      // Connect nearby pairs
      for (var a = 0; a < N_NODES; a++) {
        for (var b = a + 1; b < N_NODES; b++) {
          var dx = nodes[a].x - nodes[b].x;
          var dy = nodes[a].y - nodes[b].y;
          if (Math.sqrt(dx * dx + dy * dy) < W * 0.22) {
            edges.push([a, b]);
          }
        }
      }
    }

    function spawnPacket () {
      if (edges.length === 0) return;
      var e = edges[Math.floor(Math.random() * edges.length)];
      var rev = Math.random() > 0.5;
      packets.push({
        from: rev ? e[1] : e[0],
        to:   rev ? e[0] : e[1],
        t: 0,
        speed: 0.003 + Math.random() * 0.005,
        hue: Math.random() > 0.5 ? 180 : 130
      });
    }

    function draw (ctx) {
      // Move nodes
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        n.pulse += 0.025;
        if (n.x < 40 || n.x > W - 40) n.vx *= -1;
        if (n.y < 40 || n.y > H - 40) n.vy *= -1;
      }

      // Draw edges
      ctx.lineWidth = 0.4;
      for (var j = 0; j < edges.length; j++) {
        var e = edges[j];
        var na = nodes[e[0]], nb = nodes[e[1]];
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,232,255,0.04)';
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.stroke();
      }

      // Draw nodes
      for (var k = 0; k < nodes.length; k++) {
        var nd = nodes[k];
        var ps = nd.r + Math.sin(nd.pulse) * 1.5;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, ps, 0, Math.PI * 2);
        ctx.fillStyle = nd.type === 'hub'
          ? 'rgba(255,0,234,0.3)'
          : 'rgba(0,232,255,0.18)';
        ctx.fill();

        // Hub glow ring
        if (nd.type === 'hub') {
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, ps + 5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,0,234,0.08)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Spawn & draw packets
      if (Math.random() < 0.04) spawnPacket();
      var alive = [];
      for (var p = 0; p < packets.length; p++) {
        var pk = packets[p];
        pk.t += pk.speed;
        if (pk.t >= 1) continue;
        alive.push(pk);
        var from = nodes[pk.from], to = nodes[pk.to];
        var px = from.x + (to.x - from.x) * pk.t;
        var py = from.y + (to.y - from.y) * pk.t;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + pk.hue + ',100%,70%,0.7)';
        ctx.fill();
      }
      packets = alive;
    }

    function resize () {
      initNodes();
    }

    return { draw: draw, resize: resize };
  }());

  /* ================================================================
     LAYER 4 — Floating Hacker / Math Equations
  ================================================================ */
  var EQUATIONS = (function () {
    var POOL = [
      'SHA-256(m) → {0,1}²⁵⁶',
      'e^(iπ) + 1 = 0',
      'RSA: c = mᵉ mod n',
      'AES-256-GCM',
      'P(A|B) = P(B|A)·P(A)/P(B)',
      'XOR: a ⊕ b = c',
      'ECDSA: (r,s)',
      '∇·E = ρ/ε₀',
      'H(x) = -Σ pᵢ log₂ pᵢ',
      'Σφ(n) | RSA prime',
      '2^256 > 1.16×10⁷⁷',
      'nmap -sS -sV -O',
      'SQL: \' OR \'1\'=\'1',
      'PBKDF2(pwd,salt,100k)',
      '∂x/∂t = σ(y-x)',
      'ChaCha20-Poly1305',
      'bcrypt(pwd, 12)',
      'base64(payload)',
      '/etc/shadow',
      'HMAC-SHA512',
      'CVE-2021-44228',
      'TTL=64 proto=TCP',
    ];
    var floaters = [];

    function init () {
      floaters = [];
      var N = 14;
      for (var i = 0; i < N; i++) {
        floaters.push({
          text:  POOL[i % POOL.length],
          x:     Math.random() * W,
          y:     Math.random() * H,
          vx:    (Math.random() - 0.5) * 0.35,
          vy:    (Math.random() - 0.5) * 0.25,
          alpha: Math.random() * 0.18 + 0.04,
          da:    (Math.random() * 0.003 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
          size:  Math.floor(Math.random() * 3) + 11
        });
      }
    }

    function draw (ctx) {
      ctx.textAlign = 'left';
      for (var i = 0; i < floaters.length; i++) {
        var f = floaters[i];
        f.x += f.vx; f.y += f.vy;
        f.alpha += f.da;
        if (f.alpha > 0.25 || f.alpha < 0.02) f.da *= -1;
        if (f.x > W + 200) f.x = -150;
        if (f.x < -200) f.x = W + 100;
        if (f.y > H + 50) f.y = -20;
        if (f.y < -50) f.y = H + 30;

        ctx.font = f.size + 'px "JetBrains Mono",monospace';
        // Alternate cyan / pink for variety
        var isSpecial = i % 5 === 0;
        ctx.fillStyle = isSpecial
          ? 'rgba(255,0,234,' + (f.alpha * 0.8).toFixed(3) + ')'
          : 'rgba(0,232,255,' + f.alpha.toFixed(3) + ')';
        ctx.fillText(f.text, f.x, f.y);
      }
    }

    function resize () { init(); }

    return { draw: draw, resize: resize };
  }());

  /* ================================================================
     LAYER 5 — Matrix Rain (subtle, hacker charset)
  ================================================================ */
  var MATRIX = (function () {
    var CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ!@#$%^&*<>?'.split('');
    var HEX   = '0123456789ABCDEF'.split('');
    var drops = [];
    var types = []; // 0=green, 1=cyan, 2=pink (rare)
    var COL_W = 16;

    function init () {
      var cols = Math.floor(W / COL_W);
      drops = [];
      types = [];
      for (var i = 0; i < cols; i++) {
        drops.push(Math.floor(Math.random() * H / 14) * -1);
        types.push(Math.random() < 0.1 ? 2 : (Math.random() < 0.35 ? 1 : 0));
      }
    }

    function draw (ctx) {
      ctx.font = '13px "JetBrains Mono",monospace';
      ctx.textAlign = 'left';
      for (var i = 0; i < drops.length; i++) {
        var charset = types[i] === 1 ? HEX : CHARS;
        var ch = charset[Math.floor(Math.random() * charset.length)];
        var x  = i * COL_W;
        var y  = drops[i] * 14;
        // Head: bright based on type
        if (types[i] === 2) {
          ctx.fillStyle = 'rgba(255,0,234,0.75)'; // pink column
        } else if (types[i] === 1) {
          ctx.fillStyle = 'rgba(0,232,255,0.7)';  // cyan hex column
        } else {
          ctx.fillStyle = 'rgba(0,255,65,0.8)';   // green standard
        }
        ctx.fillText(ch, x, y);
        // Dim secondary
        if (y > 28) {
          ctx.fillStyle = 'rgba(0,232,255,0.04)';
          ctx.fillText(charset[Math.floor(Math.random() * charset.length)], x, y - 14);
        }
        if (y > H && Math.random() > 0.975) {
          drops[i] = 0;
          // Randomly reassign column type on reset
          types[i] = Math.random() < 0.08 ? 2 : (Math.random() < 0.3 ? 1 : 0);
        }
        drops[i]++;
      }
    }

    function resize () { init(); }

    return { draw: draw, resize: resize };
  }());

  /* ================================================================
     LAYER 6 — Hexagonal Grid Wave
     ================================================================
     A honeycomb of hexagons that ripple with a radial sine wave.
     Very subtle — reinforces the cyber-grid aesthetic.
  ================================================================ */
  var HEXGRID = (function () {
    var HEX_R = 38;  // hex circumradius
    var hexes = []; // [{cx,cy}]
    var pulses = []; // [{cx,cy,t,maxT}] expanding rings

    function buildGrid () {
      hexes = [];
      var dx = HEX_R * 1.732;        // horizontal stride
      var dy = HEX_R * 1.5;          // vertical stride
      var cols = Math.ceil(W / dx) + 2;
      var rows = Math.ceil(H / dy) + 2;
      for (var row = -1; row < rows; row++) {
        for (var col = -1; col < cols; col++) {
          var cx = col * dx + (row % 2 === 0 ? 0 : dx * 0.5);
          var cy = row * dy;
          hexes.push({ cx: cx, cy: cy });
        }
      }
    }

    function hexPath (ctx, cx, cy, r) {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = (Math.PI / 3) * i - Math.PI / 6;
        var px = cx + r * Math.cos(a);
        var py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    var wavePhase = 0;

    function draw (ctx) {
      wavePhase += 0.012;
      // Occasionally spawn a pulse ring
      if (Math.random() < 0.007) {
        pulses.push({
          cx: Math.random() * W,
          cy: Math.random() * H,
          t: 0, maxT: 0.6 + Math.random() * 0.4,
          pink: Math.random() > 0.6
        });
      }

      // Advance pulses
      pulses = pulses.filter(function (p) { p.t += 0.008; return p.t < p.maxT; });

      for (var i = 0; i < hexes.length; i++) {
        var h = hexes[i];
        // Base ripple: radial sine from center
        var distC = Math.sqrt((h.cx - CX) * (h.cx - CX) + (h.cy - CY) * (h.cy - CY));
        var wave = Math.sin(distC * 0.018 - wavePhase) * 0.5 + 0.5;

        // Add pulse contributions
        var pBoost = 0;
        for (var p = 0; p < pulses.length; p++) {
          var pk = pulses[p];
          var pd = Math.sqrt((h.cx - pk.cx) * (h.cx - pk.cx) + (h.cy - pk.cy) * (h.cy - pk.cy));
          var pRadius = (pk.t / pk.maxT) * Math.max(W, H);
          var pDelta = Math.abs(pd - pRadius);
          if (pDelta < 40) pBoost += (1 - pDelta / 40) * (1 - pk.t / pk.maxT) * (pk.pink ? 0.6 : 0.5);
        }

        var alpha = wave * 0.022 + pBoost * 0.06;
        if (alpha < 0.005) continue;

        hexPath(ctx, h.cx, h.cy, HEX_R - 2);
        var pinkish = pBoost > 0.1 && pulses.some(function(pk){return pk.pink && Math.abs(Math.sqrt((h.cx-pk.cx)**2+(h.cy-pk.cy)**2) - (pk.t/pk.maxT)*Math.max(W,H)) < 40;});
        ctx.strokeStyle = pinkish
          ? 'rgba(255,0,234,' + alpha.toFixed(4) + ')'
          : 'rgba(0,232,255,' + alpha.toFixed(4) + ')';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    function resize () { buildGrid(); }

    return { draw: draw, resize: resize };
  }());

  /* ================================================================
     LAYER 7 — Julia Set Scan (incremental, async-style)
     ================================================================
     Renders the Julia set one strip at a time per frame, creating a
     slowly-materialising ghostly image that loops. Uses c = 0.355 +
     0.355i rotated slowly. Very low opacity — purely atmospheric.
  ================================================================ */
  var JULIA = (function () {
    var offscreen = null;
    var octx = null;
    var scanLine = 0;
    var cAngle = 0;
    var ITER = 32;
    var LINES_PER_FRAME = 4;
    var SCALE_J = 3.2;

    function init () {
      offscreen = document.createElement('canvas');
      offscreen.width = Math.floor(W / 2);
      offscreen.height = Math.floor(H / 2);
      octx = offscreen.getContext('2d');
      scanLine = 0;
    }

    function computeStrip () {
      if (!octx) return;
      var ow = offscreen.width, oh = offscreen.height;
      var img = octx.createImageData(ow, LINES_PER_FRAME);
      var cr = 0.355 * Math.cos(cAngle) - 0.355 * Math.sin(cAngle);
      var ci = 0.355 * Math.sin(cAngle) + 0.355 * Math.cos(cAngle);
      for (var py = 0; py < LINES_PER_FRAME; py++) {
        var y = scanLine + py;
        if (y >= oh) continue;
        for (var px = 0; px < ow; px++) {
          var zr = (px / ow - 0.5) * SCALE_J;
          var zi = (y / oh - 0.5) * SCALE_J;
          var n = 0;
          while (n < ITER && zr * zr + zi * zi < 4) {
            var tmp = zr * zr - zi * zi + cr;
            zi = 2 * zr * zi + ci;
            zr = tmp;
            n++;
          }
          var t = n / ITER;
          var idx = (py * ow + px) * 4;
          if (n < ITER) {
            img.data[idx]   = Math.floor(t * 0);
            img.data[idx+1] = Math.floor(t * 232);
            img.data[idx+2] = Math.floor(t * 255);
            img.data[idx+3] = Math.floor(t * 22);
          } else {
            img.data[idx+3] = 0;
          }
        }
      }
      octx.putImageData(img, 0, scanLine);
    }

    function draw (ctx) {
      if (!offscreen) return;
      var ow = offscreen.width, oh = offscreen.height;
      computeStrip();
      scanLine += LINES_PER_FRAME;
      if (scanLine >= oh) {
        scanLine = 0;
        cAngle += 0.04; // slowly rotate Julia parameter
        octx.clearRect(0, 0, ow, oh);
      }
      ctx.globalAlpha = 0.35;
      ctx.drawImage(offscreen, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    function resize () { init(); }

    return { draw: draw, resize: resize };
  }());

  /* ================================================================
     RENDER LOOP
  ================================================================ */
  function resize () {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    CX = W / 2;
    CY = H / 2;
    HT.resize();
    LORENZ.resize();
    NETWORK.resize();
    EQUATIONS.resize();
    MATRIX.resize();
    HEXGRID.resize();
    JULIA.resize();
  }

  function render (now) {
    requestAnimationFrame(render);

    var dt = Math.min((now - lastFrame) / 16.67, 3); // cap at 3x normal
    lastFrame = now;
    T += 0.004 * dt;

    // Fade-trail background (not full clear — creates motion blur)
    ctx.fillStyle = 'rgba(2,4,8,0.22)';
    ctx.fillRect(0, 0, W, H);

    JULIA.draw(ctx);
    HEXGRID.draw(ctx);
    MATRIX.draw(ctx);
    LORENZ.draw(ctx);
    NETWORK.draw(ctx);
    EQUATIONS.draw(ctx);
    HT.draw(ctx);     // hypertorus on top
  }

  /* ================================================================
     INIT
  ================================================================ */
  function init () {
    HT.build();
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
