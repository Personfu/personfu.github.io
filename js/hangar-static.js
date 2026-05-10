(() => {
  'use strict';

  const embedUrl = (uid) => `https://sketchfab.com/models/${uid}/embed?autospin=1&autostart=1&preload=1&transparent=1&ui_hint=0&ui_theme=dark`;
  const PLATES = Array.from({ length: 23 }, (_, index) => `assets/hangar/desktop-wire-${String(index + 1).padStart(2, '0')}.png`);
  const DEFAULT_ASSET_ID = 'TT01';

  const SOURCES = [
    { id: 'fab-tic-a', kind: 'FAB LISTING', title: 'Tic-tac UAP / Warp Bubble', url: 'https://www.fab.com/listings/de1049d2-9da4-4db5-a5f8-96461992e526', note: 'Exact Fab source URL supplied for this project. Linked as a source, not faked as an iframe.' },
    { id: 'fab-tic-b', kind: 'FAB LISTING', title: 'Tic-Tac UAP / UFO with Warp Bubble', url: 'https://www.fab.com/listings/5e688c2c-0804-43a8-b739-41eb16e00980', note: 'Exact Fab listing URL for the Tic-Tac/UAP asset family.' },
    { id: 'fab-tr3b', kind: 'FAB LISTING', title: 'TR-3B Black Manta - OMSX', url: 'https://www.fab.com/listings/ac7187e7-cac5-46b9-9d64-ea4f522ca91f', note: 'Exact Fab source URL for the triangular black manta family.' },
    { id: 'fab-sr75', kind: 'FAB LISTING', title: 'SR-75 Penetrator', url: 'https://www.fab.com/listings/5c72acb9-c90e-4765-a367-0980805e005f', note: 'Exact Fab source URL for the hypersonic reconnaissance aircraft.' },
    { id: 'fab-orion', kind: 'FAB LISTING', title: 'NASA Orion Spacecraft - Crew and Service Modules', url: 'https://www.fab.com/listings/cbd0248f-c06c-4627-ba35-ce8f8f3368ec', note: 'Exact Fab source URL for the Orion spacecraft reference.' },
    { id: 'fab-ufo', kind: 'FAB LISTING', title: 'UFO / UAP Warp Bubble', url: 'https://www.fab.com/listings/44632a62-fe6c-4d84-bd13-a9f7e28a9873', note: 'Exact Fab source URL for the saucer/UAP warp bubble family.' },
    { id: 'sketchfab-military', kind: 'SKETCHFAB COLLECTION', title: 'Military 3D Models - Miniatures Collectors Club', url: 'http://sketchfab.com/miniatures.collectors.club/collections/military-125cf36e6d06410e98b81204dda1426f', note: 'Verified collection link for military hard-surface reference.' },
    { id: 'sketchfab-war', kind: 'SKETCHFAB COLLECTION', title: 'War 3D Models - U-47', url: 'https://sketchfab.com/U-47/collections/war-26cda5769def46529d921d58944bea5f', note: 'Verified collection link for aircraft and vehicle reference research.' }
  ];

  const ASSETS = [
    {
      id: 'F47', name: 'Boeing F-47 Thunderstorm NGAD', category: 'Seventh Gen Fighter',
      uid: 'a89532840fea44bbb7cc7ce2e6483cfb', author: 'NETRUNNER_pl', authorUrl: 'https://sketchfab.com/NETRUNNER_pl',
      modelUrl: 'https://sketchfab.com/3d-models/boeing-f-47-thunderstorm-ngad-a89532840fea44bbb7cc7ce2e6483cfb',
      sources: ['sketchfab-military', 'sketchfab-war'], plates: [3, 8, 9],
      role: 'USAF NGAD / advanced air dominance start point',
      specs: ['real Sketchfab embed', 'F-47 / NGAD source bay', 'advanced fighter reference', 'public model page verified']
    },
    {
      id: 'TR3B', name: 'TR-3B Black Manta - OMSX', category: 'UAP / ARV',
      uid: 'faaff1bb94e847d3b2efacdb458ac43a', author: 'Marius Ciulei', authorUrl: 'https://sketchfab.com/omassyx',
      modelUrl: 'https://sketchfab.com/3d-models/tr-3b-black-manta-omsx-faaff1bb94e847d3b2efacdb458ac43a',
      sources: ['fab-tr3b', 'sketchfab-military'], plates: [4, 5, 10],
      role: 'triangular black-project/UAP comparison bay',
      specs: ['real triangular model', 'central field-core study', 'corner emitter reference', 'Fab listing cross-reference']
    },
    {
      id: 'TT01', name: 'Tic-Tac UAP / UFO with Warp Bubble', category: 'UAP / Transmedium',
      uid: 'be98ae34d7dd49009164f0472c85bdd9', author: 'PARSONSARTS', authorUrl: 'https://sketchfab.com/tomparsons',
      modelUrl: 'https://sketchfab.com/3d-models/tic-tac-uap-ufo-with-warp-bubble-be98ae34d7dd49009164f0472c85bdd9',
      sources: ['fab-tic-a', 'fab-tic-b'], plates: [1, 2, 10],
      role: 'user-specified Tic-Tac model embedded directly',
      specs: ['exact requested Sketchfab UID', 'warp-bubble asset', 'capsule body profile', 'direct iframe viewer']
    },
    {
      id: 'TT02', name: 'Tic-tac UAP / Warp Bubble', category: 'UAP Variant',
      uid: '7df6080fddc34c6593449cb301458630', author: 'PARSONSARTS', authorUrl: 'https://sketchfab.com/tomparsons',
      modelUrl: 'https://sketchfab.com/3d-models/tic-tac-uap-warp-bubble-7df6080fddc34c6593449cb301458630',
      sources: ['fab-tic-a', 'fab-tic-b'], plates: [1, 10, 11],
      role: 'second verified Tic-Tac / warp-bubble model',
      specs: ['real alternate model', 'source-family comparison', 'verified author page', 'public model page verified']
    },
    {
      id: 'UAPW', name: 'UFO / UAP Warp Bubble', category: 'UAP / Saucer',
      uid: 'd4411ac4a38a4ba491de978fdf5bd2ae', author: 'PARSONSARTS', authorUrl: 'https://sketchfab.com/tomparsons',
      modelUrl: 'https://sketchfab.com/3d-models/ufo-uap-warp-bubble-d4411ac4a38a4ba491de978fdf5bd2ae',
      sources: ['fab-ufo'], plates: [4, 5, 10],
      role: 'saucer/UAP warp-bubble bay',
      specs: ['real Sketchfab model', 'saucer source asset', 'field envelope reference', 'Fab listing cross-reference']
    },
    {
      id: 'SR75', name: 'SR-75 Penetrator', category: 'Hypersonic Recon',
      uid: 'a2ead21184e6435aac3aee8dc6aa9017', author: 'Tim Samedov', authorUrl: 'https://sketchfab.com/citizensnip',
      modelUrl: 'https://sketchfab.com/3d-models/sr-75-penetrator-a2ead21184e6435aac3aee8dc6aa9017',
      sources: ['fab-sr75', 'sketchfab-military', 'sketchfab-war'], plates: [3, 9, 10],
      role: 'lesser-known hypersonic reconnaissance aircraft',
      specs: ['real SR-75 model', 'long-range recon profile', 'hypersonic aircraft study', 'verified model page']
    },
    {
      id: 'NGAD', name: 'Lockheed NGAD Prime - Concept Fighter', category: 'Sixth/Seventh Gen Fighter',
      uid: 'e18a52bd7d444a12b06359dbdff6b3f8', author: 'NETRUNNER_pl', authorUrl: 'https://sketchfab.com/NETRUNNER_pl',
      modelUrl: 'https://sketchfab.com/3d-models/lockheed-ngad-prime-concept-fighter-e18a52bd7d444a12b06359dbdff6b3f8',
      sources: ['sketchfab-military'], plates: [3, 8, 9],
      role: 'NGAD concept fighter comparison bay',
      specs: ['real NGAD concept embed', 'low-observable planform', 'advanced fighter lineup', 'verified author page']
    },
    {
      id: 'FAXX', name: 'Boeing FA-XX', category: 'Sixth Gen Naval Fighter',
      uid: 'a910120ddc034d40a8ba6158dc12626e', author: 'urgo', authorUrl: 'https://sketchfab.com/urgo',
      modelUrl: 'https://sketchfab.com/3d-models/boeing-fa-xx-a910120ddc034d40a8ba6158dc12626e',
      sources: ['sketchfab-military', 'sketchfab-war'], plates: [3, 8, 9],
      role: 'future naval fighter source bay',
      specs: ['real FA-XX model', 'naval future fighter', 'public model page verified', 'collection references']
    },
    {
      id: 'ORION', name: 'NASA Orion Spacecraft', category: 'Orbital Spacecraft',
      uid: '1b783d2e242b4021a9ccdce44a051dc3', author: 'MechLab3D', authorUrl: 'https://sketchfab.com/MechLab85',
      modelUrl: 'https://sketchfab.com/3d-models/nasa-orion-spacecraft-1b783d2e242b4021a9ccdce44a051dc3',
      sources: ['fab-orion'], plates: [10, 11, 12],
      role: 'orbital spacecraft reference bay',
      specs: ['real Orion model', 'crew/service module reference', 'orbital vehicle comparison', 'Fab listing cross-reference']
    },
    {
      id: 'DISC', name: 'NASA Discovery Space Shuttle', category: 'Orbital Reference',
      uid: '63ea4540bc3d4da6b3d82274fae7f8ef', author: 'SQUIR3D', authorUrl: 'https://sketchfab.com/SQUIR3D',
      modelUrl: 'https://sketchfab.com/3d-models/nasa-discovery-space-shuttle-63ea4540bc3d4da6b3d82274fae7f8ef',
      sources: ['fab-orion'], plates: [10, 11, 12],
      role: 'user-provided embed pattern preserved',
      specs: ['exact shuttle UID', 'real Sketchfab embed', 'orbital reference craft', 'author verified']
    }
  ];

  const defaultIndex = Math.max(0, ASSETS.findIndex((asset) => asset.id === DEFAULT_ASSET_ID));
  const state = { index: defaultIndex, mode: 'theater', plates: true };
  const root = document.getElementById('hangar-root');
  if (!root) return;

  injectStyles();
  buildApp();
  bindEvents();
  render();

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :root{color-scheme:dark;--bg:#02060a;--panel:#07111e;--panel2:#0c1725;--line:#244058;--cyan:#00d8ff;--cyan2:#75efff;--text:#e7f7ff;--muted:#8fb7cf;--dim:#4f7d99;--amber:#ffd166;--green:#6cffba;--red:#ff667d}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:var(--bg);color:var(--text);font-family:'Exo 2',Segoe UI,sans-serif}body:before{content:"";position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.03),rgba(255,255,255,.03) 1px,transparent 1px,transparent 4px);opacity:.22;z-index:20}button,a{font:inherit}.hg-app{height:100vh;display:grid;grid-template-rows:88px minmax(0,1fr);background:radial-gradient(circle at 50% 15%,rgba(0,216,255,.13),transparent 33%),linear-gradient(180deg,#02060a,#050911)}.hg-top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#08111d,#02060a)}.hg-brand{display:flex;align-items:center;gap:13px;min-width:0}.hg-mark{width:48px;height:48px;display:grid;place-items:center;border:1px solid var(--cyan);background:#061724;color:#e9fbff;font:700 17px 'Share Tech Mono',monospace;box-shadow:0 0 22px rgba(0,216,255,.22)}.hg-brand h1{margin:0;font-size:24px;line-height:1.05;color:#f3fbff;letter-spacing:0}.hg-brand p{margin:5px 0 0;color:#a6c7da;font-size:13px;max-width:820px;line-height:1.35}.hg-actions{display:flex;gap:9px;align-items:flex-start;justify-content:flex-end;flex-wrap:wrap}.hg-chip,.hg-link,.hg-cache{display:inline-flex;align-items:center;min-height:34px;border:1px solid var(--line);background:#0a1420;color:var(--text);padding:7px 11px;text-decoration:none;font-size:13px}.hg-cache{cursor:pointer;font-weight:800}.hg-cache:hover,.hg-link:hover{border-color:var(--cyan);background:#103044}.hg-chip strong{color:var(--cyan);margin-right:4px}.hg-shell{min-height:0;display:grid;grid-template-columns:324px minmax(0,1fr) 352px;border-top:1px solid #071522}.hg-left,.hg-right{min-height:0;background:rgba(7,17,30,.98);display:flex;flex-direction:column}.hg-left{border-right:1px solid var(--line)}.hg-right{border-left:1px solid var(--line)}.hg-section{padding:13px 14px;border-bottom:1px solid var(--line)}.hg-section h2,.hg-section h3{margin:0 0 8px;color:#f2fdff;font-size:15px;text-transform:uppercase;letter-spacing:.08em}.hg-section h3{font-size:13px}.hg-section p{margin:0;color:#a8d3eb;font-size:13px;line-height:1.45}.hg-roster{min-height:0;overflow:auto;padding:9px 6px;display:grid;gap:8px}.hg-asset{width:100%;display:grid;grid-template-columns:66px minmax(0,1fr);gap:10px;align-items:center;text-align:left;border:1px solid #203a52;background:#101722;color:var(--text);padding:8px;cursor:pointer}.hg-asset:hover,.hg-asset.active{border-color:var(--cyan);background:#102638;box-shadow:inset 0 0 26px rgba(0,216,255,.08)}.hg-id{height:48px;display:grid;place-items:center;border:1px solid #21495f;background:radial-gradient(circle at 50% 50%,#13394b,#07131d 70%);color:var(--cyan);font:700 12px 'Share Tech Mono',monospace;text-align:center}.hg-asset-title{display:flex;gap:8px;justify-content:space-between;align-items:flex-start}.hg-asset-title strong{font-size:15px;line-height:1.12;overflow-wrap:anywhere}.hg-asset-title span{color:var(--amber);font-size:10px;white-space:nowrap;text-transform:uppercase}.hg-asset small{display:block;margin-top:4px;color:#9ec7de;font-size:12px;line-height:1.32}.hg-main{min-width:0;min-height:0;position:relative;background:#000;overflow:hidden}.hg-main:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(rgba(0,216,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,216,255,.06) 1px,transparent 1px);background-size:56px 56px;opacity:.2;z-index:1}.hg-toolbar{position:absolute;z-index:5;left:16px;right:16px;top:16px;display:flex;justify-content:space-between;gap:12px;pointer-events:none}.hg-modes,.hg-tools{display:flex;gap:8px;flex-wrap:wrap;pointer-events:auto}.hg-mode,.hg-toggle,.hg-source-open{border:1px solid #24536b;background:rgba(5,14,22,.88);color:#e9fbff;min-height:38px;padding:0 12px;cursor:pointer;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.hg-mode.active,.hg-toggle.active,.hg-source-open:hover{border-color:var(--cyan);background:#103044;box-shadow:0 0 22px rgba(0,216,255,.18)}.hg-stage{position:absolute;inset:0;background:radial-gradient(circle at 50% 36%,#16293a 0,#030507 58%,#000 100%);display:grid}.sketchfab-embed-wrapper{position:relative;width:100%;height:100%;z-index:2}.sketchfab-embed-wrapper:before{content:"LIVE SKETCHFAB SOURCE";position:absolute;left:16px;top:70px;z-index:5;border:1px solid rgba(117,239,255,.45);background:rgba(3,9,14,.76);color:#dff8ff;padding:7px 9px;font:700 11px 'Share Tech Mono',monospace;letter-spacing:.08em;pointer-events:none}.hg-frame{width:100%;height:100%;border:0;background:#000}.hg-caption{position:absolute;left:16px;right:16px;bottom:15px;z-index:4;margin:0;padding:8px 10px;border:1px solid rgba(0,216,255,.35);background:rgba(2,8,13,.72);color:#95bdd3;font-size:12px;backdrop-filter:blur(8px)}.hg-caption a{color:var(--cyan2);font-weight:700;text-decoration:none}.hg-caption a:hover{text-decoration:underline}.hg-hud{position:absolute;left:18px;bottom:56px;z-index:4;width:min(720px,calc(100% - 36px));border:1px solid rgba(0,216,255,.42);background:rgba(4,9,15,.82);padding:13px 15px;box-shadow:0 0 30px rgba(0,0,0,.42)}.hg-hud h2{margin:0;font-size:21px;color:#fff}.hg-hud span{display:block;margin-top:4px;color:#a4c7dd;font-size:13px}.hg-specs{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.hg-specs b{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);font:400 11px 'Share Tech Mono',monospace;color:#eafaff;padding:6px 9px}.hg-plate-strip{position:absolute;left:18px;right:18px;bottom:12px;z-index:4;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;pointer-events:none}.hg-plate-strip img{width:100%;height:76px;object-fit:cover;border:1px solid rgba(0,216,255,.4);background:#03070d}.hg-dossier{min-height:0;overflow:auto;padding:16px 14px;display:grid;gap:12px}.hg-title h2{margin:0;font-size:24px;line-height:1.08;color:#fff}.hg-title span{display:block;margin-top:6px;color:#8ecfff;font-size:13px}.hg-panel{border:1px solid #22384d;background:#121821;padding:11px;color:#c8e4f5;font-size:13px;line-height:1.5}.hg-kv{display:grid;grid-template-columns:82px minmax(0,1fr);gap:6px 10px;color:#b7d7e9;font-size:12px}.hg-kv b{color:#fff;text-transform:uppercase;font-size:10px;letter-spacing:.08em}.hg-embed-code{white-space:pre-wrap;overflow:auto;max-height:150px;color:#dff8ff;font:11px 'Share Tech Mono',monospace}.hg-plates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.hg-plates img{width:100%;aspect-ratio:16/9;object-fit:cover;border:1px solid #25495e;background:#04080e}.hg-source{border:1px solid #25495e;background:#0d1723;padding:11px}.hg-source span{display:block;color:var(--amber);font:700 10px 'Share Tech Mono',monospace;letter-spacing:.08em}.hg-source strong{display:block;margin:5px 0;color:#fff;font-size:14px;line-height:1.25}.hg-source p{margin:0 0 9px;color:#9dbbd0;font-size:12px;line-height:1.45}.hg-source a{color:var(--cyan2);font-size:12px;text-decoration:none;font-weight:700;overflow-wrap:anywhere}.hg-source a:hover{text-decoration:underline}.hg-grid{position:absolute;inset:0;z-index:2;overflow:auto;padding:70px 16px 16px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;background:radial-gradient(circle at 50% 26%,#142534,#02060a 70%)}.hg-grid .hg-source{min-height:148px}.hg-plate-mode{position:absolute;inset:0;z-index:2;overflow:auto;padding:70px 16px 16px;display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:12px;background:#02060a}.hg-plate-mode img{width:100%;aspect-ratio:16/9;object-fit:cover;border:1px solid #27516a;background:#02060a}.hg-empty{align-self:center;justify-self:center;z-index:3;max-width:620px;text-align:center;border:1px solid var(--line);background:#08111a;padding:24px}.hg-empty strong{display:block;font-size:22px}.hg-empty p{color:#a9cbe0;line-height:1.5}.hg-empty a{color:var(--cyan2)}@media(max-width:1220px){body{overflow:auto}.hg-app{height:auto;min-height:100vh}.hg-shell{grid-template-columns:1fr}.hg-left,.hg-right{border:0;border-bottom:1px solid var(--line)}.hg-main{height:76vh}.hg-roster{grid-template-columns:repeat(2,minmax(0,1fr))}.hg-top{align-items:flex-start;flex-direction:column}}@media(max-width:720px){.hg-roster{grid-template-columns:1fr}.hg-grid,.hg-plate-mode{grid-template-columns:1fr}.hg-plate-strip{display:none}.hg-hud{bottom:12px}.hg-brand h1{font-size:20px}.hg-top{padding:12px}.hg-shell{border-top:0}}
    `;
    document.head.appendChild(style);
  }

  function buildApp() {
    root.innerHTML = `
      <div class="hg-app">
        <header class="hg-top">
          <div class="hg-brand">
            <div class="hg-mark">3D</div>
            <div>
              <h1>Hangar 3D Visualizer</h1>
              <p>Cyberpunk theater viewer for verified Sketchfab aircraft and UAP models, Fab source references, and local hangar plates. No ghost links, no fake replica claims.</p>
            </div>
          </div>
          <div class="hg-actions">
            <a class="hg-link" href="index.html">Desktop</a>
            <a class="hg-link" href="https://personfu.github.io/CyberWorld/?launch=dogfight">Dogfight</a>
            <button class="hg-cache" id="hg-cache-reset" type="button">Refresh Source Cache</button>
            <span class="hg-chip"><strong>${ASSETS.length}</strong> verified live models</span>
            <span class="hg-chip"><strong>${PLATES.length}</strong> local reference plates</span>
            <span class="hg-chip">Sketchfab embeds</span>
          </div>
        </header>
        <div class="hg-shell">
          <aside class="hg-left">
            <div class="hg-section"><h2>Vehicle Bay</h2><p>Select a sourced model. Orbit, zoom, fullscreen, and inspect inside the Sketchfab viewer.</p></div>
            <div id="hg-roster" class="hg-roster"></div>
          </aside>
          <main class="hg-main">
            <div class="hg-toolbar">
              <div class="hg-modes">
                <button class="hg-mode" data-mode="theater">Theater</button>
                <button class="hg-mode" data-mode="sources">Sources</button>
                <button class="hg-mode" data-mode="plates">Plates</button>
              </div>
              <div class="hg-tools">
                <button class="hg-toggle active" data-toggle="plates">plates</button>
                <a id="hg-open-model" class="hg-source-open" target="_blank" rel="nofollow noopener noreferrer">open model</a>
              </div>
            </div>
            <div id="hg-stage" class="hg-stage"></div>
            <div id="hg-plate-strip" class="hg-plate-strip"></div>
            <div class="hg-hud"><h2 id="hg-hud-name"></h2><span id="hg-hud-sub"></span><div id="hg-specs" class="hg-specs"></div></div>
          </main>
          <aside class="hg-right"><div id="hg-dossier" class="hg-dossier"></div></aside>
        </div>
      </div>`;

    document.getElementById('hg-roster').innerHTML = ASSETS.map((asset, index) => `
      <button class="hg-asset" data-index="${index}">
        <div class="hg-id">${escapeHtml(asset.id)}</div>
        <div><div class="hg-asset-title"><strong>${escapeHtml(asset.name)}</strong><span>${escapeHtml(asset.category)}</span></div><small>${escapeHtml(asset.role)}</small></div>
      </button>`).join('');
  }

  function bindEvents() {
    document.getElementById('hg-roster').addEventListener('click', (event) => {
      const button = event.target.closest('[data-index]');
      if (!button) return;
      state.index = Number(button.dataset.index);
      state.mode = 'theater';
      render();
    });

    document.querySelector('.hg-modes').addEventListener('click', (event) => {
      const button = event.target.closest('[data-mode]');
      if (!button) return;
      state.mode = button.dataset.mode;
      render();
    });

    document.querySelector('[data-toggle="plates"]').addEventListener('click', (event) => {
      state.plates = !state.plates;
      event.currentTarget.classList.toggle('active', state.plates);
      renderPlateStrip(ASSETS[state.index]);
    });

    document.getElementById('hg-cache-reset').addEventListener('click', async () => {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith('fllc-')).map((key) => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));
      }
      window.location.reload();
    });
  }

  function render() {
    const asset = ASSETS[state.index];
    document.querySelectorAll('.hg-asset').forEach((button, index) => button.classList.toggle('active', index === state.index));
    document.querySelectorAll('.hg-mode').forEach((button) => button.classList.toggle('active', button.dataset.mode === state.mode));
    document.getElementById('hg-open-model').href = asset.modelUrl;
    document.getElementById('hg-hud-name').textContent = asset.name;
    document.getElementById('hg-hud-sub').textContent = `${asset.category} / ${asset.role} / ${state.mode.toUpperCase()}`;
    document.getElementById('hg-specs').innerHTML = asset.specs.map((spec) => `<b>${escapeHtml(spec)}</b>`).join('');
    renderStage(asset);
    renderPlateStrip(asset);
    renderDossier(asset);
  }

  function renderStage(asset) {
    const stage = document.getElementById('hg-stage');
    if (state.mode === 'sources') {
      stage.innerHTML = `<div class="hg-grid">${SOURCES.map(renderSourceCard).join('')}${ASSETS.map(renderModelSourceCard).join('')}</div>`;
      return;
    }

    if (state.mode === 'plates') {
      stage.innerHTML = `<div class="hg-plate-mode">${PLATES.map((plate, index) => `<img src="${plate}" alt="hangar reference plate ${index + 1}">`).join('')}</div>`;
      return;
    }

    stage.innerHTML = asset.uid ? renderSketchfabEmbed(asset) : `<div class="hg-empty"><strong>No public embed UID</strong><p>This bay has verified source links, but no direct public Sketchfab iframe.</p><a href="${asset.modelUrl}" target="_blank" rel="nofollow noopener noreferrer">Open source</a></div>`;
  }

  function renderSketchfabEmbed(asset) {
    return `
      <div class="sketchfab-embed-wrapper">
        <iframe class="hg-frame" title="${escapeHtml(asset.name)}" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="${embedUrl(asset.uid)}"></iframe>
        <p class="hg-caption"><a href="${asset.modelUrl}?utm_medium=embed&utm_campaign=share-popup&utm_content=${asset.uid}" target="_blank" rel="nofollow noopener noreferrer">${escapeHtml(asset.name)}</a> by <a href="${asset.authorUrl}?utm_medium=embed&utm_campaign=share-popup&utm_content=${asset.uid}" target="_blank" rel="nofollow noopener noreferrer">${escapeHtml(asset.author)}</a> on <a href="https://sketchfab.com?utm_medium=embed&utm_campaign=share-popup&utm_content=${asset.uid}" target="_blank" rel="nofollow noopener noreferrer">Sketchfab</a></p>
      </div>`;
  }

  function renderPlateStrip(asset) {
    const strip = document.getElementById('hg-plate-strip');
    strip.style.display = state.plates && state.mode === 'theater' ? 'grid' : 'none';
    strip.innerHTML = asset.plates.map((plate) => `<img src="${PLATES[plate - 1]}" alt="${escapeHtml(asset.name)} reference plate ${plate}">`).join('');
  }

  function renderDossier(asset) {
    const sourceCards = asset.sources.map((sourceId) => SOURCES.find((source) => source.id === sourceId)).filter(Boolean);
    document.getElementById('hg-dossier').innerHTML = `
      <div class="hg-title"><h2>${escapeHtml(asset.name)}</h2><span>${escapeHtml(asset.category)}</span></div>
      <div class="hg-panel">${escapeHtml(asset.role)}. The main stage is a live Sketchfab iframe using the verified UID below, with source links preserved for direct inspection.</div>
      <div class="hg-panel hg-kv"><b>UID</b><span>${escapeHtml(asset.uid)}</span><b>Author</b><span><a href="${asset.authorUrl}" target="_blank" rel="nofollow noopener noreferrer" style="color:#75efff">${escapeHtml(asset.author)}</a></span><b>Source</b><span><a href="${asset.modelUrl}" target="_blank" rel="nofollow noopener noreferrer" style="color:#75efff">Open verified Sketchfab model</a></span></div>
      <div class="hg-panel hg-embed-code">${escapeHtml(embedSnippet(asset))}</div>
      <div class="hg-section" style="padding:0;border:0"><h3>Local Reference Plates</h3><p>Desktop captures remain available as local visual reference plates.</p></div>
      <div class="hg-plates">${asset.plates.map((plate) => `<img src="${PLATES[plate - 1]}" alt="reference plate ${plate}">`).join('')}</div>
      <div class="hg-section" style="padding:0;border:0"><h3>Verified Sources</h3></div>
      ${renderModelSourceCard(asset)}
      ${sourceCards.map(renderSourceCard).join('')}`;
  }

  function renderModelSourceCard(asset) {
    return `<article class="hg-source"><span>SKETCHFAB MODEL</span><strong>${escapeHtml(asset.name)}</strong><p>Canonical model page verified through Sketchfab metadata. Embedded by UID ${escapeHtml(asset.uid)}.</p><a href="${asset.modelUrl}" target="_blank" rel="nofollow noopener noreferrer">Open verified model</a></article>`;
  }

  function embedSnippet(asset) {
    return `<div class="sketchfab-embed-wrapper"> <iframe title="${asset.name}" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="${embedUrl(asset.uid)}"> </iframe> <p><a href="${asset.modelUrl}?utm_medium=embed&utm_campaign=share-popup&utm_content=${asset.uid}" target="_blank" rel="nofollow">${asset.name}</a> by <a href="${asset.authorUrl}?utm_medium=embed&utm_campaign=share-popup&utm_content=${asset.uid}" target="_blank" rel="nofollow">${asset.author}</a> on <a href="https://sketchfab.com?utm_medium=embed&utm_campaign=share-popup&utm_content=${asset.uid}" target="_blank" rel="nofollow">Sketchfab</a></p></div>`;
  }

  function renderSourceCard(source) {
    return `<article class="hg-source"><span>${escapeHtml(source.kind)}</span><strong>${escapeHtml(source.title)}</strong><p>${escapeHtml(source.note)}</p><a href="${source.url}" target="_blank" rel="nofollow noopener noreferrer">Open verified source</a></article>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
})();