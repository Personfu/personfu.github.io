# Measured browser renderer performance

Captured 2026-10-18T22:50:35.364Z using headless Chrome/Chromium 149.0.7827.55.

Fresh browser context per profile, uncompressed localhost source server, service-worker cache disabled, remote fonts/presence blocked; two-second warmup then six-second stationary Plaza rAF and renderer-counter sample.

| Profile | Viewport | First world frame (ms) | Local body KiB | Average FPS | p95 frame (ms) | Mean draw calls | Mean rendered triangles | JS heap MiB |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| desktop-high | 1440×900 / DPR 1 | 2324 | 2517.31 | 162.92 | 6.2 | 240.88 | 142,838 | 21.85 |
| desktop-low | 1440×900 / DPR 1 | 1258.1 | 2517.31 | 163.42 | 6.2 | 149 | 98,214 | 19.91 |
| mobile-high | 390×844 / DPR 2 | 856.1 | 2517.31 | 155.59 | 12 | 210 | 136,232 | 23.98 |
| mobile-low | 390×844 / DPR 2 | 841.7 | 2517.31 | 164.92 | 6.2 | 118 | 91,608 | 18.74 |

GPU/driver: `ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)`.

- Viewport emulation is not a physical-phone benchmark.
- Headless GPU/software driver and parallel machine workload affect frame timing.
- Fresh contexts share one browser process and GPU driver cache; later startup samples may benefit from warm shader/disk caches.
- JS heap is measured with Chrome DevTools; GPU memory, total browser process memory and physical-device thermals are not measured.
- Renderer counters include configured shadow/postprocessing passes and are not unique mesh/model counts.
- Cold first-render time is localhost parsing/initialization, not a production-network download estimate.
- This sample covers the Plaza; campaign arena and long-session memory behavior require separate measurements.

The JSON capture in `benchmarks/ascension-renderer.json` contains exact bundle hash, browser version, pixel dimensions and errors. These measured results describe the current browser scene; they are not a hardware-independent frame-rate guarantee or a commercial-production quality claim.
