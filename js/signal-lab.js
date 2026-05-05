/* =============================================================
   FURIOS-INT // SIGNAL_LAB ENGINE  v1.0  ::  Personfu  ::  2026
   -------------------------------------------------------------
   Interactive math + cryptography visualizations.
   Pure ES5, no deps, no eval, CSP-strict.
   Each module is self-contained and lazy-bound.
   ============================================================= */
(function () {
  'use strict';

  /* ----------------- shared utilities ----------------- */
  function $(id) { return document.getElementById(id); }
  function on(el, evt, fn) { if (el) el.addEventListener(evt, fn, { passive: false }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fitCanvas(c) {
    var dpr = window.devicePixelRatio || 1;
    var rect = c.getBoundingClientRect();
    c.width  = Math.max(2, Math.floor(rect.width  * dpr));
    c.height = Math.max(2, Math.floor(rect.height * dpr));
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: rect.width, h: rect.height };
  }
  function bindRange(id, vId, fmt) {
    var r = $(id), v = $(vId);
    if (!r || !v) return null;
    function paint() { v.textContent = fmt ? fmt(+r.value) : r.value; }
    on(r, 'input', paint); paint();
    return r;
  }

  /* ============================================================
     MODULE 01 :: RSA_TRACE
     ============================================================ */
  (function rsaModule(){
    var canvas = $('rsa-canvas'); if (!canvas) return;
    var hud = $('rsa-hud'), out = $('rsa-out'), btn = $('rsa-go');

    function isPrime(n){
      n = +n; if (n < 2) return false;
      if (n % 2 === 0) return n === 2;
      for (var i = 3; i*i <= n; i += 2) if (n % i === 0) return false;
      return true;
    }
    function egcd(a, b){
      if (b === 0) return [a, 1, 0];
      var r = egcd(b, a % b);
      return [r[0], r[2], r[1] - Math.floor(a / b) * r[2]];
    }
    function modInv(e, phi){
      var r = egcd(e, phi);
      if (r[0] !== 1) return null;
      return ((r[1] % phi) + phi) % phi;
    }
    function modPow(base, exp, mod){
      // step trace
      var trace = []; var result = 1; base = base % mod;
      var b = exp.toString(2);
      for (var i = 0; i < b.length; i++){
        result = (result * result) % mod;
        var label = 'sq';
        if (b[i] === '1') { result = (result * base) % mod; label = 'sq+mul'; }
        trace.push({ bit: b[i], val: result, op: label });
      }
      return { val: result, trace: trace };
    }

    function render(p, q, e, m){
      if (!isPrime(p) || !isPrime(q)) {
        out.innerHTML = '<span class="h">ERR:</span> p and q must both be prime.';
        hud.textContent = 'invalid primes'; return;
      }
      if (p === q) { out.innerHTML = '<span class="h">ERR:</span> p must differ from q.'; return; }
      var n = p * q;
      var phi = (p - 1) * (q - 1);
      if (egcd(e, phi)[0] !== 1) { out.innerHTML = '<span class="h">ERR:</span> e must be coprime to &phi;.'; return; }
      var d = modInv(e, phi);
      m = ((m % n) + n) % n;
      var c = modPow(m, e, n);
      var rec = modPow(c.val, d, n);

      out.innerHTML =
        '<span class="k">n   =</span> <span class="v">' + n + '</span>\n' +
        '<span class="k">phi =</span> <span class="v">' + phi + '</span>\n' +
        '<span class="k">d   =</span> <span class="v">' + d + '</span>\n' +
        '<span class="k">m   =</span> <span class="v">' + m + '</span>\n' +
        '<span class="k">c   =</span> <span class="v">' + c.val + '</span>  (encrypted)\n' +
        '<span class="k">m\' =</span> <span class="v">' + rec.val + '</span>  (decrypted) ' +
        (rec.val === m ? '<span class="h">[OK]</span>' : '<span class="h">[FAIL]</span>');

      // draw the encrypt ladder
      var fc = fitCanvas(canvas), ctx = fc.ctx, w = fc.w, h = fc.h;
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#7a8aa6';
      ctx.fillText('square-and-multiply ladder for c = m^e mod n', 10, 8);

      var rows = c.trace, n2 = rows.length;
      var rowH = Math.min(18, (h - 30) / Math.max(1, n2));
      for (var i = 0; i < n2; i++){
        var y = 28 + i * rowH;
        var bit = rows[i].bit, op = rows[i].op, val = rows[i].val;
        ctx.fillStyle = (bit === '1') ? '#00ff41' : '#00e8ff';
        ctx.fillText('bit[' + i + '] = ' + bit + '   ' + op, 14, y);
        ctx.fillStyle = '#ffe700';
        ctx.fillText('-> r = ' + val, 220, y);
        // bar
        var bar = (val / n) * (w - 380);
        ctx.fillStyle = (bit === '1') ? '#ff00ea' : '#1a3548';
        ctx.fillRect(370, y + 2, Math.max(1, bar), Math.max(2, rowH - 6));
      }
      hud.textContent = 'encrypt: ' + n2 + ' steps · |b| = ' + n2 + ' bits';
    }

    on(btn, 'click', function(){
      render(+$('rsa-p').value, +$('rsa-q').value, +$('rsa-e').value, +$('rsa-m').value);
    });
    render(61, 53, 17, 123);
  })();

  /* ============================================================
     MODULE 02 :: XOR_CIPHER (repeating-key stream)
     ============================================================ */
  (function xorModule(){
    var canvas = $('xor-canvas'); if (!canvas) return;
    var pt = $('xor-pt'), key = $('xor-k'), btn = $('xor-go'), out = $('xor-out'), hud = $('xor-hud');

    function toBytes(s){
      var b = []; for (var i = 0; i < s.length; i++) b.push(s.charCodeAt(i) & 0xff);
      return b;
    }
    function hex(b){ return b.map(function(x){ return ('0'+x.toString(16)).slice(-2); }).join(' '); }

    function render(){
      var P = toBytes(pt.value || '');
      var K = toBytes(key.value || 'X');
      if (!K.length) K = [0x58];
      var C = P.map(function(b, i){ return b ^ K[i % K.length]; });

      out.innerHTML =
        '<span class="k">plain (hex)</span>\n<span class="v">' + hex(P) + '</span>\n\n' +
        '<span class="k">key (hex)</span>\n<span class="v">' + hex(K) + '</span>\n\n' +
        '<span class="k">cipher (hex)</span>\n<span class="h">' + hex(C) + '</span>';

      var fc = fitCanvas(canvas), ctx = fc.ctx, w = fc.w, h = fc.h;
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
      var n = Math.max(P.length, 1);
      var bw = Math.max(2, Math.floor(w / n));
      for (var i = 0; i < n; i++){
        var p = P[i] | 0, c = C[i] | 0;
        ctx.fillStyle = '#00e8ff'; ctx.fillRect(i*bw, h - (p/255)*(h*0.45) - h*0.5, bw-1, (p/255)*(h*0.45));
        ctx.fillStyle = '#ff00ea'; ctx.fillRect(i*bw, h - (c/255)*(h*0.45),         bw-1, (c/255)*(h*0.45));
      }
      ctx.fillStyle = '#7a8aa6';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('cyan = plaintext byte', 10, 10);
      ctx.fillText('pink = ciphertext byte', 10, 26);
      hud.textContent = n + ' bytes · key|' + K.length + '|';
    }
    on(btn, 'click', render);
    on(pt, 'input', render);
    on(key, 'input', render);
    render();
  })();

  /* ============================================================
     MODULE 03 :: HASH AVALANCHE (SHA-256)
     ============================================================ */
  (function hashModule(){
    var canvas = $('hash-canvas'); if (!canvas) return;
    var aIn = $('hash-a'), bIn = $('hash-b'), btn = $('hash-go'), out = $('hash-out'), hud = $('hash-hud');

    function bufToBits(buf){
      var u = new Uint8Array(buf), bits = new Uint8Array(u.length * 8);
      for (var i = 0; i < u.length; i++){
        for (var b = 0; b < 8; b++) bits[i*8 + (7-b)] = (u[i] >> b) & 1;
      }
      return bits;
    }
    function bufHex(buf){
      var u = new Uint8Array(buf), s = '';
      for (var i = 0; i < u.length; i++) s += ('0'+u[i].toString(16)).slice(-2);
      return s;
    }
    async function digest(s){
      var enc = new TextEncoder().encode(s);
      var h = await crypto.subtle.digest('SHA-256', enc);
      return { hex: bufHex(h), bits: bufToBits(h) };
    }
    async function render(){
      try {
        var a = await digest(aIn.value);
        var b = await digest(bIn.value);
        var diff = 0; for (var i = 0; i < 256; i++) if (a.bits[i] !== b.bits[i]) diff++;
        var pct = (diff/256*100).toFixed(2);

        out.innerHTML =
          '<span class="k">SHA-256 A</span>\n<span class="v">' + a.hex + '</span>\n\n' +
          '<span class="k">SHA-256 B</span>\n<span class="v">' + b.hex + '</span>\n\n' +
          '<span class="k">bits flipped:</span> <span class="h">' + diff + ' / 256 (' + pct + '%)</span>';

        var fc = fitCanvas(canvas), ctx = fc.ctx, w = fc.w, h = fc.h;
        ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
        var cols = 64, rows = 4;
        var cw = w / cols, ch = (h - 30) / rows;
        for (var i = 0; i < 256; i++){
          var x = (i % cols) * cw, y = 28 + Math.floor(i / cols) * ch;
          var same = a.bits[i] === b.bits[i];
          ctx.fillStyle = same
            ? (a.bits[i] ? '#00e8ff' : '#08293a')
            : '#ff4444';
          ctx.fillRect(x+0.5, y+0.5, cw-1, ch-1);
        }
        ctx.fillStyle = '#7a8aa6'; ctx.font = '11px JetBrains Mono, monospace';
        ctx.fillText('256 output bits · red = differs · cyan = 1 · dark = 0', 10, 10);
        hud.textContent = 'avalanche: ' + pct + '%';
      } catch(err){
        out.innerHTML = '<span class="h">crypto.subtle unavailable</span>';
      }
    }
    on(btn, 'click', render);
    on(aIn, 'input', render);
    on(bIn, 'input', render);
    render();
  })();

  /* ============================================================
     MODULE 04 :: MANDELBROT (pan + zoom)
     ============================================================ */
  (function mandelModule(){
    var canvas = $('mandel-canvas'); if (!canvas) return;
    var iterR = bindRange('mandel-iter', 'mandel-iter-v');
    var palSel = $('mandel-pal'), reset = $('mandel-reset'), out = $('mandel-out'), hud = $('mandel-hud');

    var view = { cx: -0.5, cy: 0, scale: 3.0 }; // half-width

    function palette(name){
      var p = new Array(512);
      if (name === 'matrix'){
        for (var i = 0; i < 512; i++) {
          var t = i/512;
          p[i] = [0, Math.floor(255*Math.pow(t,0.6)), Math.floor(80*t)];
        }
      } else if (name === 'amber'){
        for (var i = 0; i < 512; i++) {
          var t = i/512;
          p[i] = [Math.floor(255*Math.pow(t,0.7)), Math.floor(180*Math.pow(t,1.2)), Math.floor(20*t)];
        }
      } else if (name === 'solar'){
        for (var i = 0; i < 512; i++) {
          var t = i/512;
          p[i] = [Math.floor(255*t), Math.floor(120*Math.sin(t*Math.PI)), Math.floor(40*(1-t))];
        }
      } else { // cyber
        for (var i = 0; i < 512; i++) {
          var t = i/512;
          var r = Math.floor(255 * Math.pow(t, 1.6));
          var g = Math.floor(232 * (1 - Math.cos(t * Math.PI * 2)) * 0.5);
          var b = Math.floor(255 * Math.pow(1-t, 0.7));
          p[i] = [r, g, b];
        }
      }
      return p;
    }

    var rendering = false, dirty = true;
    function draw(){
      if (rendering) return;
      rendering = true;
      requestAnimationFrame(function(){
        var fc = fitCanvas(canvas), ctx = fc.ctx, w = fc.w|0, h = fc.h|0;
        var img = ctx.createImageData(w, h);
        var data = img.data;
        var maxIter = +iterR.value;
        var pal = palette(palSel.value);
        var aspect = w / h;
        var halfW = view.scale, halfH = view.scale / aspect;
        var x0 = view.cx - halfW, x1 = view.cx + halfW;
        var y0 = view.cy - halfH, y1 = view.cy + halfH;
        // step downsample for perf on huge devices
        var step = (w * h > 480000) ? 2 : 1;
        for (var py = 0; py < h; py += step){
          for (var px = 0; px < w; px += step){
            var x = x0 + (px / w) * (x1 - x0);
            var y = y0 + (py / h) * (y1 - y0);
            var zx = 0, zy = 0, it = 0;
            while (zx*zx + zy*zy <= 4 && it < maxIter){
              var xt = zx*zx - zy*zy + x;
              zy = 2*zx*zy + y; zx = xt; it++;
            }
            var c;
            if (it === maxIter) c = [0,0,0];
            else {
              // smooth coloring
              var log_zn = Math.log(zx*zx + zy*zy) / 2;
              var nu = Math.log(log_zn / Math.log(2)) / Math.log(2);
              var idx = Math.floor((it + 1 - nu) * 8) & 511;
              c = pal[idx < 0 ? 0 : idx];
            }
            for (var dy = 0; dy < step; dy++){
              for (var dx = 0; dx < step; dx++){
                var p = ((py+dy) * w + (px+dx)) * 4;
                if (p < 0 || p >= data.length) continue;
                data[p]   = c[0];
                data[p+1] = c[1];
                data[p+2] = c[2];
                data[p+3] = 255;
              }
            }
          }
        }
        ctx.putImageData(img, 0, 0);
        out.textContent = 'center: (' + view.cx.toFixed(5) + ', ' + view.cy.toFixed(5) + ') · scale: ' + view.scale.toExponential(2);
        hud.textContent = 'iter ' + maxIter + ' · drag/wheel';
        rendering = false;
      });
    }

    on(iterR, 'input', draw);
    on(palSel, 'change', draw);
    on(reset, 'click', function(){ view = { cx:-0.5, cy:0, scale:3.0 }; draw(); });

    // pan
    var dragging = false, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', function(e){ dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function(e){
      if (!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var dx = (e.clientX - lx) / rect.width;
      var dy = (e.clientY - ly) / rect.height;
      var aspect = rect.width / rect.height;
      view.cx -= dx * view.scale * 2;
      view.cy -= dy * (view.scale * 2) / aspect;
      lx = e.clientX; ly = e.clientY;
      draw();
    });
    canvas.addEventListener('pointerup',   function(e){ dragging = false; });
    canvas.addEventListener('pointercancel',function(){ dragging = false; });
    canvas.addEventListener('wheel', function(e){
      e.preventDefault();
      var f = e.deltaY > 0 ? 1.2 : 1/1.2;
      // zoom centered on cursor
      var rect = canvas.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top)  / rect.height;
      var aspect = rect.width / rect.height;
      var halfW = view.scale, halfH = view.scale / aspect;
      var wx = view.cx - halfW + px * 2 * halfW;
      var wy = view.cy - halfH + py * 2 * halfH;
      view.scale *= f;
      view.scale = clamp(view.scale, 1e-13, 4.0);
      view.cx = wx + (view.cx - wx) * f;
      view.cy = wy + (view.cy - wy) * f;
      draw();
    }, { passive: false });

    window.addEventListener('resize', draw);
    draw();
  })();

  /* ============================================================
     MODULE 05 :: CONWAY'S GAME OF LIFE
     ============================================================ */
  (function lifeModule(){
    var canvas = $('life-canvas'); if (!canvas) return;
    var rateR = bindRange('life-rate', 'life-rate-v', function(v){ return v + ' hz'; });
    var seedSel = $('life-seed'), out = $('life-out'), hud = $('life-hud');
    var startB = $('life-start'), stopB = $('life-stop'), stepB = $('life-step'), clearB = $('life-clear');

    var COLS = 80, ROWS = 40;
    var cell = new Uint8Array(COLS * ROWS);
    var next = new Uint8Array(COLS * ROWS);
    var gen = 0, running = false, lastTick = 0;

    function idx(x,y){ return ((y+ROWS)%ROWS) * COLS + ((x+COLS)%COLS); }
    function pop(){ var n=0; for (var i=0;i<cell.length;i++) n+=cell[i]; return n; }

    function seed(name){
      cell.fill(0); gen = 0;
      if (name === 'random'){
        for (var i = 0; i < cell.length; i++) cell[i] = Math.random() < 0.4 ? 1 : 0;
      } else if (name === 'glider'){
        var coords = [[1,5],[1,6],[2,5],[2,6],[11,5],[11,6],[11,7],[12,4],[12,8],[13,3],[13,9],[14,3],[14,9],[15,6],[16,4],[16,8],[17,5],[17,6],[17,7],[18,6],[21,3],[21,4],[21,5],[22,3],[22,4],[22,5],[23,2],[23,6],[25,1],[25,2],[25,6],[25,7],[35,3],[35,4],[36,3],[36,4]];
        coords.forEach(function(p){ var x = p[0]+5, y = p[1]+5; if (x<COLS && y<ROWS) cell[idx(x,y)] = 1; });
      } else if (name === 'pulsar'){
        var pul = '..ooo...ooo..\n.............\no....o.o....o\no....o.o....o\no....o.o....o\n..ooo...ooo..\n.............\n..ooo...ooo..\no....o.o....o\no....o.o....o\no....o.o....o\n.............\n..ooo...ooo..';
        var rows = pul.split('\n');
        for (var y = 0; y < rows.length; y++)
          for (var x = 0; x < rows[y].length; x++)
            if (rows[y][x] === 'o') cell[idx(x+30, y+15)] = 1;
      } else if (name === 'acorn'){
        var ac = [[1,2],[3,1],[3,2],[5,2],[6,2],[7,2],[2,0]];
        ac.forEach(function(p){ cell[idx(p[0]+38, p[1]+19)] = 1; });
      }
    }

    function step(){
      for (var y = 0; y < ROWS; y++){
        for (var x = 0; x < COLS; x++){
          var n = cell[idx(x-1,y-1)] + cell[idx(x,y-1)] + cell[idx(x+1,y-1)]
                + cell[idx(x-1,y)]                       + cell[idx(x+1,y)]
                + cell[idx(x-1,y+1)] + cell[idx(x,y+1)] + cell[idx(x+1,y+1)];
          var c = cell[idx(x,y)];
          next[idx(x,y)] = (c && (n === 2 || n === 3)) ? 1 : (!c && n === 3 ? 1 : 0);
        }
      }
      var t = cell; cell = next; next = t;
      gen++;
    }

    function draw(){
      var fc = fitCanvas(canvas), ctx = fc.ctx, w = fc.w, h = fc.h;
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
      var cw = w / COLS, ch = h / ROWS;
      ctx.fillStyle = '#00ff41';
      for (var y = 0; y < ROWS; y++){
        for (var x = 0; x < COLS; x++){
          if (cell[idx(x,y)]) ctx.fillRect(x*cw, y*ch, Math.max(1, cw-1), Math.max(1, ch-1));
        }
      }
      out.textContent = 'gen: ' + gen + ' · pop: ' + pop();
    }

    function loop(t){
      if (!running) return;
      var hz = +rateR.value;
      if (t - lastTick >= 1000 / hz){
        step(); draw(); lastTick = t;
      }
      requestAnimationFrame(loop);
    }

    on(startB, 'click', function(){ if (!running){ running=true; lastTick=0; requestAnimationFrame(loop); } });
    on(stopB,  'click', function(){ running = false; });
    on(stepB,  'click', function(){ step(); draw(); });
    on(clearB, 'click', function(){ cell.fill(0); gen=0; draw(); });
    on(seedSel,'change',function(){ seed(seedSel.value); draw(); });

    canvas.addEventListener('click', function(e){
      var rect = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - rect.left) / rect.width  * COLS);
      var y = Math.floor((e.clientY - rect.top)  / rect.height * ROWS);
      if (x>=0 && y>=0 && x<COLS && y<ROWS){ cell[idx(x,y)] ^= 1; draw(); }
    });

    seed('random'); draw();
  })();

  /* ============================================================
     MODULE 06 :: FORCE-DIRECTED GRAPH
     ============================================================ */
  (function graphModule(){
    var canvas = $('graph-canvas'); if (!canvas) return;
    var nR = bindRange('graph-n', 'graph-n-v');
    var topoSel = $('graph-topo'), btn = $('graph-rebuild'), out = $('graph-out'), hud = $('graph-hud');

    var nodes = [], edges = [];

    function build(){
      var n = +nR.value;
      var topo = topoSel.value;
      var rect = canvas.getBoundingClientRect();
      nodes = []; edges = [];
      for (var i = 0; i < n; i++){
        nodes.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          vx: 0, vy: 0, deg: 0, fixed: false
        });
      }
      function addEdge(a, b){ if (a===b) return; edges.push([a,b]); nodes[a].deg++; nodes[b].deg++; }
      if (topo === 'random'){
        var p = Math.min(0.18, 6 / n);
        for (var i = 0; i < n; i++) for (var j = i+1; j < n; j++) if (Math.random() < p) addEdge(i,j);
      } else if (topo === 'ring'){
        for (var i = 0; i < n; i++) addEdge(i, (i+1)%n);
        for (var i = 0; i < n; i+=4) addEdge(i, (i+2)%n);
      } else if (topo === 'star'){
        for (var i = 1; i < n; i++) addEdge(0, i);
      } else if (topo === 'grid'){
        var c = Math.ceil(Math.sqrt(n));
        for (var i = 0; i < n; i++){
          var x = i % c, y = (i/c)|0;
          if (x+1 < c && i+1 < n)   addEdge(i, i+1);
          if (y+1 < c && i+c < n)   addEdge(i, i+c);
        }
      } else if (topo === 'scale'){
        // preferential attachment
        if (n >= 2) addEdge(0, 1);
        for (var i = 2; i < n; i++){
          var totalDeg = edges.length * 2 || 1;
          var picks = Math.min(2, i);
          var seen = {};
          for (var k = 0; k < picks; k++){
            var r = Math.floor(Math.random() * totalDeg);
            var acc = 0, target = 0;
            for (var j = 0; j < i; j++){ acc += nodes[j].deg + 1; if (acc >= r){ target = j; break; } }
            if (!seen[target]){ addEdge(i, target); seen[target] = true; }
          }
        }
      }
    }

    var dragging = -1;
    function nodeAt(mx, my){
      for (var i = nodes.length - 1; i >= 0; i--){
        var dx = nodes[i].x - mx, dy = nodes[i].y - my;
        if (dx*dx + dy*dy < 100) return i;
      }
      return -1;
    }
    canvas.addEventListener('pointerdown', function(e){
      var r = canvas.getBoundingClientRect();
      var n = nodeAt(e.clientX - r.left, e.clientY - r.top);
      if (n >= 0){ dragging = n; nodes[n].fixed = true; canvas.setPointerCapture(e.pointerId); }
    });
    canvas.addEventListener('pointermove', function(e){
      if (dragging < 0) return;
      var r = canvas.getBoundingClientRect();
      nodes[dragging].x = e.clientX - r.left;
      nodes[dragging].y = e.clientY - r.top;
    });
    canvas.addEventListener('pointerup',   function(){ if (dragging>=0) nodes[dragging].fixed=false; dragging = -1; });

    function step(){
      var rect = canvas.getBoundingClientRect();
      var w = rect.width, h = rect.height;
      var k = 60; // ideal spring
      var rep = 1500;
      for (var i = 0; i < nodes.length; i++){
        var ni = nodes[i]; ni.vx *= 0.85; ni.vy *= 0.85;
        for (var j = 0; j < nodes.length; j++){
          if (i === j) continue;
          var nj = nodes[j];
          var dx = ni.x - nj.x, dy = ni.y - nj.y;
          var d2 = dx*dx + dy*dy + 0.01;
          var d = Math.sqrt(d2);
          var f = rep / d2;
          ni.vx += (dx / d) * f;
          ni.vy += (dy / d) * f;
        }
      }
      for (var e = 0; e < edges.length; e++){
        var a = nodes[edges[e][0]], b = nodes[edges[e][1]];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.sqrt(dx*dx + dy*dy) + 0.01;
        var f = (d - k) * 0.05;
        a.vx += (dx / d) * f;  a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f;  b.vy -= (dy / d) * f;
      }
      for (var i = 0; i < nodes.length; i++){
        var n = nodes[i]; if (n.fixed) continue;
        n.x += n.vx; n.y += n.vy;
        n.x = clamp(n.x, 8, w-8);
        n.y = clamp(n.y, 8, h-8);
      }
    }

    function draw(){
      var fc = fitCanvas(canvas), ctx = fc.ctx, w = fc.w, h = fc.h;
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
      ctx.strokeStyle = 'rgba(255,231,0,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var e = 0; e < edges.length; e++){
        var a = nodes[edges[e][0]], b = nodes[edges[e][1]];
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      for (var i = 0; i < nodes.length; i++){
        var n = nodes[i];
        var r = Math.min(10, 2 + Math.sqrt(n.deg + 1));
        ctx.beginPath();
        ctx.fillStyle = n.deg > 6 ? '#ff00ea' : (n.deg > 3 ? '#ffe700' : '#00e8ff');
        ctx.arc(n.x, n.y, r, 0, Math.PI*2); ctx.fill();
      }
      var avgDeg = nodes.length ? (edges.length * 2 / nodes.length) : 0;
      out.textContent = 'edges: ' + edges.length + ' · avg deg: ' + avgDeg.toFixed(2);
    }

    function loop(){ step(); draw(); requestAnimationFrame(loop); }

    on(btn, 'click', build);
    on(topoSel, 'change', build);
    on(nR, 'change', build);

    build(); loop();
  })();

  /* ============================================================
     MODULE 07 :: SPECTRUM_FFT (naive DFT 256pt)
     ============================================================ */
  (function fftModule(){
    var canvas = $('fft-canvas'); if (!canvas) return;
    var f1 = bindRange('fft-f1', 'fft-f1-v');
    var f2 = bindRange('fft-f2', 'fft-f2-v');
    var f3 = bindRange('fft-f3', 'fft-f3-v');
    var nzR = bindRange('fft-n', 'fft-n-v', function(v){ return v + '%'; });
    var out = $('fft-out'), hud = $('fft-hud');

    var N = 256;

    function dft(re){
      var mag = new Float32Array(N/2);
      for (var k = 0; k < N/2; k++){
        var sr = 0, si = 0;
        for (var n = 0; n < N; n++){
          var ang = -2 * Math.PI * k * n / N;
          sr += re[n] * Math.cos(ang);
          si += re[n] * Math.sin(ang);
        }
        mag[k] = Math.sqrt(sr*sr + si*si) / (N/2);
      }
      return mag;
    }

    function tick(){
      var sig = new Float32Array(N);
      var nz = (+nzR.value) / 100;
      var v1 = +f1.value, v2 = +f2.value, v3 = +f3.value;
      for (var n = 0; n < N; n++){
        var t = n / N;
        var s = 0;
        if (v1 > 0) s += Math.sin(2*Math.PI * v1 * t);
        if (v2 > 0) s += 0.7 * Math.sin(2*Math.PI * v2 * t);
        if (v3 > 0) s += 0.4 * Math.sin(2*Math.PI * v3 * t);
        s += (Math.random()*2 - 1) * nz;
        sig[n] = s;
      }
      var mag = dft(sig);
      // peak detect (top 3)
      var peaks = [];
      for (var k = 1; k < mag.length-1; k++){
        if (mag[k] > mag[k-1] && mag[k] > mag[k+1]) peaks.push({ f: k, m: mag[k] });
      }
      peaks.sort(function(a,b){ return b.m - a.m; });
      peaks = peaks.slice(0, 3);

      var fc = fitCanvas(canvas), ctx = fc.ctx, w = fc.w, h = fc.h;
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
      var topH = h * 0.4, botH = h - topH - 16;
      // top: time domain
      ctx.strokeStyle = '#00ff41'; ctx.beginPath();
      for (var n = 0; n < N; n++){
        var x = (n / N) * w;
        var y = topH/2 - sig[n] * (topH/2 - 4);
        if (n === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#7a8aa6'; ctx.font = '11px JetBrains Mono';
      ctx.fillText('time domain', 8, 12);
      // separator
      ctx.fillStyle = '#1a2436'; ctx.fillRect(0, topH, w, 1);
      // bottom: freq domain
      var max = 0; for (var i = 0; i < mag.length; i++) if (mag[i] > max) max = mag[i];
      var bw = w / mag.length;
      for (var k = 0; k < mag.length; k++){
        var bh = (mag[k] / (max||1)) * (botH - 6);
        var isPeak = peaks.some(function(p){ return p.f === k; });
        ctx.fillStyle = isPeak ? '#ff00ea' : '#00e8ff';
        ctx.fillRect(k*bw, h - bh, Math.max(1, bw-1), bh);
      }
      ctx.fillStyle = '#7a8aa6'; ctx.fillText('frequency domain · pink = peak', 8, topH + 14);

      out.textContent = 'peaks: ' + peaks.map(function(p){ return p.f + 'Hz'; }).join(', ');
      hud.textContent = 'N=' + N + ' · noise=' + (nz*100|0) + '%';
    }
    [f1,f2,f3,nzR].forEach(function(r){ on(r, 'input', tick); });
    window.addEventListener('resize', tick);
    tick();
  })();

  /* ============================================================
     MODULE 08 :: BEZIER PROBE (de Casteljau)
     ============================================================ */
  (function bezModule(){
    var canvas = $('bez-canvas'); if (!canvas) return;
    var tR = bindRange('bez-t', 'bez-t-v', function(v){ return (v/1000).toFixed(3); });
    var orderSel = $('bez-order'), randB = $('bez-randomize'), out = $('bez-out'), hud = $('bez-hud');

    var pts = [];
    function rebuild(){
      var n = +orderSel.value + 1;
      var rect = canvas.getBoundingClientRect();
      pts = [];
      for (var i = 0; i < n; i++){
        pts.push({
          x: 60 + (rect.width  - 120) * (i / (n-1 || 1)) + (Math.random()*60-30),
          y: rect.height * 0.5 + (Math.random()*rect.height*0.5 - rect.height*0.25)
        });
      }
    }

    function lerp(a, b, t){ return { x: a.x + (b.x - a.x)*t, y: a.y + (b.y - a.y)*t }; }
    function deCasteljau(P, t){
      var levels = [P.slice()];
      while (levels[levels.length-1].length > 1){
        var prev = levels[levels.length-1], next = [];
        for (var i = 0; i < prev.length-1; i++) next.push(lerp(prev[i], prev[i+1], t));
        levels.push(next);
      }
      return levels;
    }

    var dragging = -1;
    canvas.addEventListener('pointerdown', function(e){
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      for (var i = 0; i < pts.length; i++){
        var dx = pts[i].x - mx, dy = pts[i].y - my;
        if (dx*dx + dy*dy < 144){ dragging = i; canvas.setPointerCapture(e.pointerId); break; }
      }
    });
    canvas.addEventListener('pointermove', function(e){
      if (dragging < 0) return;
      var r = canvas.getBoundingClientRect();
      pts[dragging].x = clamp(e.clientX - r.left, 4, r.width-4);
      pts[dragging].y = clamp(e.clientY - r.top,  4, r.height-4);
      draw();
    });
    canvas.addEventListener('pointerup', function(){ dragging = -1; });

    function draw(){
      var fc = fitCanvas(canvas), ctx = fc.ctx, w = fc.w, h = fc.h;
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
      // curve
      ctx.strokeStyle = '#ffa500'; ctx.lineWidth = 2; ctx.beginPath();
      for (var s = 0; s <= 200; s++){
        var t = s/200;
        var lv = deCasteljau(pts, t);
        var p = lv[lv.length-1][0];
        if (s === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      // hull
      ctx.strokeStyle = 'rgba(0,232,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
      for (var i = 0; i < pts.length; i++){ if (i===0) ctx.moveTo(pts[i].x, pts[i].y); else ctx.lineTo(pts[i].x, pts[i].y); }
      ctx.stroke();
      // de Casteljau intermediate at t
      var t = (+tR.value)/1000;
      var lvls = deCasteljau(pts, t);
      var palLv = ['rgba(0,232,255,0.6)', 'rgba(255,231,0,0.6)', 'rgba(255,0,234,0.6)', 'rgba(0,255,65,0.6)'];
      for (var L = 1; L < lvls.length-1; L++){
        ctx.strokeStyle = palLv[(L-1) % palLv.length]; ctx.beginPath();
        for (var i = 0; i < lvls[L].length; i++){ if (i===0) ctx.moveTo(lvls[L][i].x, lvls[L][i].y); else ctx.lineTo(lvls[L][i].x, lvls[L][i].y); }
        ctx.stroke();
        for (var i = 0; i < lvls[L].length; i++){
          ctx.fillStyle = palLv[(L-1) % palLv.length];
          ctx.beginPath(); ctx.arc(lvls[L][i].x, lvls[L][i].y, 3, 0, Math.PI*2); ctx.fill();
        }
      }
      // control points
      for (var i = 0; i < pts.length; i++){
        ctx.fillStyle = '#ffe700';
        ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.stroke();
      }
      // B(t)
      var B = lvls[lvls.length-1][0];
      ctx.fillStyle = '#ff00ea';
      ctx.beginPath(); ctx.arc(B.x, B.y, 8, 0, Math.PI*2); ctx.fill();

      out.textContent = 'B(' + t.toFixed(3) + ') = (' + B.x.toFixed(1) + ', ' + B.y.toFixed(1) + ') · order ' + orderSel.value;
      hud.textContent = pts.length + ' control pts';
    }

    on(tR, 'input', draw);
    on(orderSel, 'change', function(){ rebuild(); draw(); });
    on(randB, 'click', function(){ rebuild(); draw(); });
    window.addEventListener('resize', draw);
    rebuild(); draw();
  })();

})();
