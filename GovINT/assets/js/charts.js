/* FLLC // PERSONFU — Charts Module (Canvas-based, no dependencies) */
(function () {
  'use strict';

  function drawBarChart(canvasId, data, opts) {
    opts = opts || {};
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width = canvas.parentElement.clientWidth || 400;
    var H = canvas.height = opts.height || 200;
    var pad = { top: 20, right: 20, bottom: 50, left: 50 };
    var labels = Object.keys(data);
    var values = Object.values(data);
    var max = Math.max.apply(null, values) || 1;
    var barW = Math.max(8, (W - pad.left - pad.right) / labels.length - 4);

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = pad.top + (H - pad.top - pad.bottom) * (1 - i / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#555';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(max * i / 4), pad.left - 6, y + 3);
    }

    // Bars
    var colors = opts.colors || ['#cc0000', '#00ccff', '#00cc66', '#ffaa00', '#ff6600', '#ff00ff', '#8888ff', '#44ffaa', '#ffdd44', '#ff4488'];
    labels.forEach(function (lbl, idx) {
      var val = values[idx];
      var barH = (val / max) * (H - pad.top - pad.bottom);
      var x = pad.left + idx * ((W - pad.left - pad.right) / labels.length) + 2;
      var y = H - pad.bottom - barH;
      ctx.fillStyle = colors[idx % colors.length];
      ctx.fillRect(x, y, barW, barH);

      // Label
      ctx.save();
      ctx.translate(x + barW / 2, H - pad.bottom + 8);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#888';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(lbl.length > 14 ? lbl.slice(0, 12) + '..' : lbl, 0, 0);
      ctx.restore();
    });
  }

  function drawPieChart(canvasId, data, opts) {
    opts = opts || {};
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var size = opts.size || 180;
    canvas.width = size;
    canvas.height = size;
    var cx = size / 2, cy = size / 2, r = size / 2 - 10;
    var labels = Object.keys(data);
    var values = Object.values(data);
    var total = values.reduce(function (a, b) { return a + b; }, 0) || 1;
    var colors = opts.colors || ['#cc0000', '#00ccff', '#00cc66', '#ffaa00', '#ff6600', '#ff00ff', '#8888ff', '#44ffaa', '#ffdd44', '#ff4488'];
    var angle = -Math.PI / 2;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, size, size);

    labels.forEach(function (lbl, i) {
      var slice = (values[i] / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      angle += slice;
    });

    // Center hole
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();
  }

  window.GovCharts = {
    drawBarChart: drawBarChart,
    drawPieChart: drawPieChart
  };
})();
