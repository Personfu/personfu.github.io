/* ================================================================
   FURIOS-INT // CYBER BACKGROUND ENGINE  v1.0
   Lightweight inner-page background: matrix rain + lorenz trails.
   Used on all non-index pages. Attach to <canvas id="cyber-bg-canvas">
   ================================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('cyber-bg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, T = 0;

  /* ── Katakana + hex matrix chars ── */
  var CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF!#@'.split('');

  /* ── Matrix rain ── */
  var drops = [];
  var COL_W = 18;

  /* ── Lorenz attractor (2 particles) ── */
  var LRZ = [];
  (function () {
    var s = 10, r = 28, b = 8 / 3;
    LRZ = [
      { x: 0.1, y: 0, z: 0, trail: [], hue: 160 },
      { x: -0.1, y: 0.1, z: 0.5, trail: [], hue: 195 }
    ];
    var dt = 0.006;
    for (var i = 0; i < 800; i++) {
      LRZ.forEach(function (p) {
        var dx = s * (p.y - p.x), dy = p.x * (r - p.z) - p.y, dz = p.x * p.y - b * p.z;
        p.x += dx * dt; p.y += dy * dt; p.z += dz * dt;
      });
    }
  }());

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    var cols = Math.floor(W / COL_W);
    drops = [];
    for (var i = 0; i < cols; i++) drops.push(Math.random() * -H / 14);
  }

  function updateLorenz() {
    var s = 10, r = 28, b = 8 / 3, dt = 0.007;
    LRZ.forEach(function (p) {
      var dx = s * (p.y - p.x), dy = p.x * (r - p.z) - p.y, dz = p.x * p.y - b * p.z;
      p.x += dx * dt; p.y += dy * dt; p.z += dz * dt;
      var sx = W / 2 + p.x * (W / 60), sy = H / 2 + p.z * (H / 60) - H / 5;
      p.trail.push([sx, sy]);
      if (p.trail.length > 120) p.trail.shift();
    });
  }

  function drawLorenz() {
    LRZ.forEach(function (p) {
      var t = p.trail;
      if (t.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(t[0][0], t[0][1]);
      for (var i = 1; i < t.length; i++) {
        var alpha = i / t.length * 0.18;
        ctx.strokeStyle = 'hsla(' + p.hue + ',100%,60%,' + alpha + ')';
        ctx.lineWidth = 0.8;
        ctx.lineTo(t[i][0], t[i][1]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(t[i][0], t[i][1]);
      }
    });
  }

  function drawMatrix() {
    ctx.font = '13px "Courier New", monospace';
    drops.forEach(function (y, i) {
      if (Math.random() > 0.04) return; /* sparse — inner pages, not overwhelming */
      var ch = CHARS[Math.floor(Math.random() * CHARS.length)];
      var x = i * COL_W;
      /* head: bright cyan */
      ctx.fillStyle = 'rgba(0,232,255,0.45)';
      ctx.fillText(ch, x, y * 14);
      /* tail character: dim */
      ctx.fillStyle = 'rgba(0,255,65,0.08)';
      if (y > 1) ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, (y - 1) * 14);
    });
    drops = drops.map(function (y) {
      if (y * 14 > H && Math.random() > 0.97) return Math.random() * -30;
      return y + 0.3;
    });
  }

  function render() {
    T++;
    /* fade trail */
    ctx.fillStyle = 'rgba(2,4,8,0.18)';
    ctx.fillRect(0, 0, W, H);

    updateLorenz();
    drawLorenz();
    if (T % 2 === 0) drawMatrix(); /* halve matrix refresh rate for perf */

    requestAnimationFrame(render);
  }

  window.addEventListener('resize', resize);
  resize();
  render();
}());
