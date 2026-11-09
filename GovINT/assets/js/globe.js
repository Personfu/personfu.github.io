/* An orthographic public-source coverage globe. Geography: Natural Earth. */
window.GovINTGlobe = (() => {
  function mount(canvas, data) {
    if (!canvas || !window.GOVINT_LAND_POINTS) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const points = window.GOVINT_LAND_POINTS.map(([lon, lat]) => [
      (lon * Math.PI) / 180,
      (lat * Math.PI) / 180,
    ]);
    const regions = data.regions
      .filter((r) => r.id !== "Global")
      .map((r) => ({
        ...r,
        weight: data.sources.filter((s) => s.region === r.id).length,
      }));
    let width = 540,
      height = 450,
      ratio = 1,
      frame = 0,
      start = performance.now(),
      pointer = 0,
      visible = true,
      last = 0;
    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(performance.now());
    });
    observer.observe(canvas);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    intersection.observe(canvas);
    const pointerMove = (e) => {
      pointer = (e.clientX - canvas.getBoundingClientRect().left) / width - 0.5;
    };
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerleave", () => {
      pointer = 0;
    });
    function draw(now) {
      const t = reduced.matches ? 0 : (now - start) / 1000;
      const lon0 = ((-25 + t * 1.8 + pointer * 12) * Math.PI) / 180,
        lat0 = (18 * Math.PI) / 180;
      const R = Math.min(width * 0.37, height * 0.42),
        cx = width * 0.5,
        cy = height * 0.5;
      ctx.clearRect(0, 0, width, height);
      const proj = (lon, lat) => {
        const dl = lon - lon0;
        const z =
          Math.sin(lat0) * Math.sin(lat) +
          Math.cos(lat0) * Math.cos(lat) * Math.cos(dl);
        return [
          cx + R * Math.cos(lat) * Math.sin(dl),
          cy -
            R *
              (Math.cos(lat0) * Math.sin(lat) -
                Math.sin(lat0) * Math.cos(lat) * Math.cos(dl)),
          z,
        ];
      };
      const halo = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.3);
      halo.addColorStop(0, "rgba(161,205,104,.01)");
      halo.addColorStop(0.72, "rgba(137,182,95,.035)");
      halo.addColorStop(1, "rgba(137,182,95,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "#3c4738";
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, R + 22, 0, Math.PI * 2);
      ctx.strokeStyle = "#2a3329";
      ctx.lineWidth = 0.6;
      ctx.setLineDash([2, 7]);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let d = 0; d < 360; d += 6) {
        const a = (d * Math.PI) / 180;
        const inner = R + 27,
          outer = inner + (d % 30 === 0 ? 8 : 3);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.strokeStyle = d % 30 === 0 ? "#727e5a" : "#35412f";
        ctx.stroke();
      }
      function line(coords) {
        let active = false;
        ctx.beginPath();
        for (const [lon, lat] of coords) {
          const p = proj(lon, lat);
          if (p[2] > 0.015) {
            if (!active) ctx.moveTo(p[0], p[1]);
            else ctx.lineTo(p[0], p[1]);
            active = true;
          } else active = false;
        }
        ctx.strokeStyle = "rgba(119,145,104,.17)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      for (let lat = -60; lat <= 60; lat += 30)
        line(
          Array.from({ length: 181 }, (_, i) => [
            ((i * 2 - 180) * Math.PI) / 180,
            (lat * Math.PI) / 180,
          ]),
        );
      for (let lon = -180; lon < 180; lon += 30)
        line(
          Array.from({ length: 91 }, (_, i) => [
            (lon * Math.PI) / 180,
            ((i * 2 - 90) * Math.PI) / 180,
          ]),
        );
      for (const point of points) {
        const [x, y, z] = proj(...point);
        if (z <= 0) continue;
        ctx.beginPath();
        ctx.arc(x, y, 0.55 + z * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,189,139,${0.16 + z * 0.55})`;
        ctx.fill();
      }
      for (const r of regions) {
        const [x, y, z] = proj(
          (r.lon * Math.PI) / 180,
          (r.lat * Math.PI) / 180,
        );
        if (z < 0.06) continue;
        const size = 2 + Math.min(3, Math.sqrt(r.weight) * 0.35);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 13);
        glow.addColorStop(0, "rgba(211,253,117,.33)");
        glow.addColorStop(1, "rgba(211,253,117,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(x - 13, y - 13, 26, 26);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = "#dcff92";
        ctx.fill();
        if (["US", "UK", "BR", "AU"].includes(r.id)) {
          ctx.font = '9px "IBM Plex Mono",monospace';
          ctx.fillStyle = "#c1cea9";
          ctx.fillText(r.id, x + size + 5, y + 3);
        }
      }
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(reduced.matches ? -0.5 : t * 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, R + 39, 0, Math.PI * 0.24);
      ctx.strokeStyle = "#c5ed77";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
      ctx.font = '9px "IBM Plex Mono",monospace';
      ctx.fillStyle = "#68765c";
      ctx.fillText("90°", cx - 8, cy - R - 45);
      ctx.fillText("270°", cx - 13, cy + R + 53);
    }
    function loop(now) {
      if (visible && now - last > 33) {
        draw(now);
        last = now;
      }
      frame = requestAnimationFrame(loop);
    }
    draw(start);
    frame = requestAnimationFrame(loop);
    return {
      destroy() {
        cancelAnimationFrame(frame);
        observer.disconnect();
        intersection.disconnect();
        canvas.removeEventListener("pointermove", pointerMove);
      },
    };
  }
  return { mount };
})();
