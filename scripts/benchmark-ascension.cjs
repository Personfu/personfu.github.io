'use strict';
// Reproducible local renderer capture. No cloud profiles, scores or database
// writes: public presence and third-party fonts are blocked for repeatability.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const scenarios = [
  { id: 'desktop-high', width: 1440, height: 900, dpr: 1, quality: 'high', mobile: false },
  { id: 'desktop-low', width: 1440, height: 900, dpr: 1, quality: 'low', mobile: false },
  { id: 'mobile-high', width: 390, height: 844, dpr: 2, quality: 'high', mobile: true },
  { id: 'mobile-low', width: 390, height: 844, dpr: 2, quality: 'low', mobile: true },
];
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, bytes) => { if (error) { res.writeHead(404).end(); return; } res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(bytes); });
});
function round(value, digits = 2) { return Number(Number(value).toFixed(digits)); }
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const bundled = 'C:\\Users\\P\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe';
  const executablePath = process.env.PW_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync(bundled) ? bundled : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : { channel: 'chrome' }) });
  const results = [];
  try {
    for (const scenario of scenarios) {
      const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height }, deviceScaleFactor: scenario.dpr, isMobile: scenario.mobile, hasTouch: scenario.mobile, serviceWorkers: 'block' });
      await context.route(/https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|[^/]*supabase\.co)\//, route => route.abort());
      await context.routeWebSocket(/supabase\.co/, route => route.close({ code: 1000, reason: 'Local performance capture' }));
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:' + server.address().port + '/CyberWorld/ascension.html', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__cwWorld?.snapshot().diagnostics?.drawCalls > 0 && window.__cwAscensionShell, null, { timeout: 25000 });
      const firstRenderedWorldMs = await page.evaluate(() => performance.now());
      await page.locator('#cwas-begin').click();
      await page.locator('#cwas-handle').fill('LOCAL-RENDER-QA');
      await page.locator('#cwas-creator-form button[type=submit]').click();
      await page.waitForFunction(() => document.body.dataset.phase === 'playing');
      await page.evaluate(quality => { window.__cwWorld.setGraphicsQuality(quality); window.__cwWorld.setReducedMotion(false); }, scenario.quality);
      await page.waitForTimeout(2000);
      const frameSample = await page.evaluate(() => new Promise(resolve => {
        const durations = [], scenes = []; let start = null, previous = null;
        function tick(timestamp) {
          if (start === null) start = timestamp;
          if (previous !== null) durations.push(timestamp - previous);
          previous = timestamp;
          if (durations.length % 15 === 0) scenes.push(window.__cwWorld.snapshot().diagnostics);
          if (timestamp - start >= 6000) {
            durations.sort((a, b) => a - b);
            resolve({ durationMs: timestamp - start, frames: durations.length, averageFps: durations.length / ((timestamp - start) / 1000), medianFrameMs: durations[Math.floor(durations.length * .5)], p95FrameMs: durations[Math.floor(durations.length * .95)], scenes });
          } else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }));
      const resources = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const local = performance.getEntriesByType('resource').filter(entry => new URL(entry.name).origin === location.origin);
        const canvas = document.getElementById('cwg-canvas'), gl = canvas.getContext('webgl2');
        const extension = gl?.getExtension('WEBGL_debug_renderer_info');
        return { domContentLoadedMs: navigation.domContentLoadedEventEnd, documentBytes: navigation.encodedBodySize,
          localAssetBytes: local.reduce((sum, entry) => sum + entry.encodedBodySize, 0), localRequests: local.length,
          gpu: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl ? gl.getParameter(gl.RENDERER) : null,
          canvasPixels: { width: canvas.width, height: canvas.height }, pixelRatio: devicePixelRatio,
          presenceStatus: window.__cwAscensionNet.status(),
        };
      });
      const cdp = await context.newCDPSession(page); await cdp.send('Performance.enable');
      const metrics = (await cdp.send('Performance.getMetrics')).metrics;
      const metric = name => metrics.find(item => item.name === name)?.value ?? null;
      const calls = frameSample.scenes.map(item => item.drawCalls), triangles = frameSample.scenes.map(item => item.triangles);
      const average = list => list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
      const result = { ...scenario, firstRenderedWorldMs: round(firstRenderedWorldMs), domContentLoadedMs: round(resources.domContentLoadedMs),
        totalSameOriginBodyBytes: resources.documentBytes + resources.localAssetBytes, localRequests: resources.localRequests + 1,
        sampleDurationMs: round(frameSample.durationMs), sampledFrames: frameSample.frames, averageFps: round(frameSample.averageFps), medianFrameMs: round(frameSample.medianFrameMs), p95FrameMs: round(frameSample.p95FrameMs),
        averageDrawCalls: round(average(calls)), averageTriangles: Math.round(average(triangles)), maximumTriangles: Math.max(...triangles),
        jsHeapUsedBytes: metric('JSHeapUsedSize'), jsHeapTotalBytes: metric('JSHeapTotalSize'), gpu: resources.gpu, canvasPixels: resources.canvasPixels,
        presenceMode: resources.presenceStatus.mode, pageErrors: errors };
      results.push(result);
      console.log(scenario.id + ': ' + result.averageFps + ' FPS, ' + result.averageDrawCalls + ' calls, ' + result.averageTriangles + ' triangles, ' + round(result.jsHeapUsedBytes / 1024 / 1024) + ' MiB JS heap.');
      await context.close();
    }
    const report = { capturedAt: new Date().toISOString(), browser: await browser.version(), headless: true,
      worldBundleSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'CyberWorld/ascension-world3d.js'))).digest('hex'),
      method: 'Fresh browser context per profile, uncompressed localhost source server, service-worker cache disabled, remote fonts/presence blocked; two-second warmup then six-second stationary Plaza rAF and renderer-counter sample.',
      limitations: ['Viewport emulation is not a physical-phone benchmark.', 'Headless GPU/software driver and parallel machine workload affect frame timing.', 'Fresh contexts share one browser process and GPU driver cache; later startup samples may benefit from warm shader/disk caches.', 'JS heap is measured with Chrome DevTools; GPU memory, total browser process memory and physical-device thermals are not measured.', 'Renderer counters include configured shadow/postprocessing passes and are not unique mesh/model counts.', 'Cold first-render time is localhost parsing/initialization, not a production-network download estimate.', 'This sample covers the Plaza; campaign arena and long-session memory behavior require separate measurements.'], results };
    fs.mkdirSync(path.join(root, 'docs/benchmarks'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs/benchmarks/ascension-renderer.json'), JSON.stringify(report, null, 2) + '\n');
    const rows = results.map(r => '| ' + r.id + ' | ' + r.width + '×' + r.height + ' / DPR ' + r.dpr + ' | ' + round(r.firstRenderedWorldMs) + ' | ' + round(r.totalSameOriginBodyBytes / 1024) + ' | ' + r.averageFps + ' | ' + r.p95FrameMs + ' | ' + r.averageDrawCalls + ' | ' + r.averageTriangles.toLocaleString('en-US') + ' | ' + round(r.jsHeapUsedBytes / 1024 / 1024) + ' |').join('\n');
    fs.writeFileSync(path.join(root, 'docs/ASCENSION-PERFORMANCE.md'), '# Measured browser renderer performance\n\nCaptured ' + report.capturedAt + ' using headless Chrome/Chromium ' + report.browser + '.\n\n' + report.method + '\n\n| Profile | Viewport | First world frame (ms) | Local body KiB | Average FPS | p95 frame (ms) | Mean draw calls | Mean rendered triangles | JS heap MiB |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n' + rows + '\n\nGPU/driver: `' + results[0].gpu + '`.\n\n' + report.limitations.map(item => '- ' + item).join('\n') + '\n\nThe JSON capture in `benchmarks/ascension-renderer.json` contains exact bundle hash, browser version, pixel dimensions and errors. These measured results describe the current browser scene; they are not a hardware-independent frame-rate guarantee or a commercial-production quality claim.\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
