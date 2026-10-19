# Measured browser renderer performance

Captured 2026-10-19T00:57:17.321Z using headless Chrome/Chromium 149.0.7827.55.

Fresh browser context per profile, uncompressed localhost source server, service-worker cache disabled, remote fonts/presence blocked; two-second warmup then six-second stationary Plaza rAF and renderer-counter sample.

| Profile | Viewport | First world frame (ms) | Local body KiB | Average FPS | p95 frame (ms) | Mean draw calls | Mean rendered triangles | JS heap MiB |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| desktop-high | 1440×900 / DPR 1 | 3021.8 | 2728.44 | 139.93 | 12.2 | 321.86 | 156,070 | 17.98 |
| desktop-low | 1440×900 / DPR 1 | 1228 | 2728.44 | 161.26 | 6.2 | 202 | 109,410 | 22.22 |
| mobile-high | 390×844 / DPR 2 | 801.1 | 2728.44 | 163.76 | 6.2 | 252.73 | 140,880 | 20.22 |
| mobile-low | 390×844 / DPR 2 | 913.9 | 2728.44 | 164.92 | 6.2 | 132.73 | 94,221 | 20.41 |

GPU/driver: `ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)`.

- Viewport emulation is not a physical-phone benchmark.
- Headless GPU/software driver and parallel machine workload affect frame timing.
- Fresh contexts share one browser process and GPU driver cache; later startup samples may benefit from warm shader/disk caches.
- JS heap is measured with Chrome DevTools; GPU memory, total browser process memory and physical-device thermals are not measured.
- Renderer counters include configured shadow/postprocessing passes and are not unique mesh/model counts.
- Cold first-render time is localhost parsing/initialization, not a production-network download estimate.
- This sample covers the Plaza; campaign arena and long-session memory behavior require separate measurements.

The JSON capture in `benchmarks/ascension-renderer.json` contains exact bundle hash, browser version, pixel dimensions and errors. These measured results describe the current browser scene; they are not a hardware-independent frame-rate guarantee or a commercial-production quality claim.
