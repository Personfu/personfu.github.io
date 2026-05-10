(() => {
  'use strict';

  const embedUrl = (uid) => `https://sketchfab.com/models/${uid}/embed?autospin=1&autostart=1&preload=1&transparent=1&ui_hint=0&ui_theme=dark`;
  const PLATES = Array.from({ length: 23 }, (_, index) => `assets/hangar/desktop-wire-${String(index + 1).padStart(2, '0')}.png`);
  const DEFAULT_ASSET_ID = 'TT01';

  const SOURCES=[{id:"fab-tic-a",kind:"FAB LISTING",title:"Tic-Tac UAP / Warp Bubble",url:"https://www.fab.com/listings/de1049d2-9da4-4db5-a5f8-96461992e526",note:"Verified Fab listing for the Tic-Tac UAP warp-bubble asset family."},{id:"fab-tic-b",kind:"FAB LISTING",title:"Tic-Tac UAP / UFO with Warp Bubble",url:"https://www.fab.com/listings/5e688c2c-0804-43a8-b739-41eb16e00980",note:"Alternate Fab entry for the Tic-Tac capsule body profile."},{id:"fab-tr3b",kind:"FAB LISTING",title:"TR-3B Black Manta – OMSX",url:"https://www.fab.com/listings/ac7187e7-cac5-46b9-9d64-ea4f522ca91f",note:"Triangular ARV reference on Fab."},{id:"fab-sr75",kind:"FAB LISTING",title:"SR-75 Penetrator",url:"https://www.fab.com/listings/5c72acb9-c90e-4765-a367-0980805e005f",note:"Hypersonic recon aircraft on Fab."},{id:"fab-orion",kind:"FAB LISTING",title:"NASA Orion Crew / Service Module",url:"https://www.fab.com/listings/cbd0248f-c06c-4627-ba35-ce8f8f3368ec",note:"Orion spacecraft reference on Fab."},{id:"fab-ufo",kind:"FAB LISTING",title:"UFO / UAP Warp Bubble",url:"https://www.fab.com/listings/44632a62-fe6c-4d84-bd13-a9f7e28a9873",note:"Saucer / UAP warp-bubble family on Fab."},{id:"sf-mil",kind:"SKETCHFAB COLLECTION",title:"Military Models — Miniatures Collectors",url:"http://sketchfab.com/miniatures.collectors.club/collections/military-125cf36e6d06410e98b81204dda1426f",note:"Verified military hard-surface 3D collection."},{id:"sf-war",kind:"SKETCHFAB COLLECTION",title:"War Models — U-47",url:"https://sketchfab.com/U-47/collections/war-26cda5769def46529d921d58944bea5f",note:"Aircraft and vehicle war models research collection."}];

  const ASSETS=[{id:"TT01",cat:"UAP",name:"Tic-Tac UAP / UFO — Warp Bubble",uid:"be98ae34d7dd49009164f0472c85bdd9",author:"PARSONSARTS",authorUrl:"https://sketchfab.com/tomparsons",modelUrl:"https://sketchfab.com/3d-models/tic-tac-uap-ufo-with-warp-bubble-be98ae34d7dd49009164f0472c85bdd9",sources:["fab-tic-a","fab-tic-b"],plates:[1,2,10],role:"Transmedium / warp-bubble capsule",specs:["Warp bubble envelope","Capsule body profile","Transmedium studies","Fab cross-reference"]},{id:"TT02",cat:"UAP",name:"Tic-Tac UAP — Warp Bubble Variant",uid:"7df6080fddc34c6593449cb301458630",author:"PARSONSARTS",authorUrl:"https://sketchfab.com/tomparsons",modelUrl:"https://sketchfab.com/3d-models/tic-tac-uap-warp-bubble-7df6080fddc34c6593449cb301458630",sources:["fab-tic-a","fab-tic-b"],plates:[1,10,11],role:"Alternate warp-bubble geometry",specs:["Alternate geometry","Field envelope study","Author verified","Collection cross-ref"]},{id:"VBUAP",cat:"UAP",name:"Virginia Beach UAP — Vacuum Balloon",uid:"c0c8c69e5ee840ab9e8147352f280101",author:"UAP3D",authorUrl:"https://sketchfab.com/search?q=virginia+beach+uap",modelUrl:"https://sketchfab.com/3d-models/virginia-beach-uap-ufo-vacuum-balloon-c0c8c69e5ee840ab9e8147352f280101",sources:["fab-ufo"],plates:[4,5,10],role:"Vacuum-balloon UAP recreation",specs:["Vacuum lift structure","2023 incident rec.","Witness-corroborated","Open-source geometry"]},{id:"CLUAP",cat:"UAP",name:"Chandelier-Looking UAP — 3D Recreation",uid:"a0db2065bad44a8e88837950e2948c48",author:"UAP3D",authorUrl:"https://sketchfab.com/search?q=chandelier+uap",modelUrl:"https://sketchfab.com/3d-models/chandelier-looking-uap-3d-recreation-a0db2065bad44a8e88837950e2948c48",sources:["fab-ufo"],plates:[4,5,11],role:"Multi-arm chandelier UAP structure",specs:["Articulated arms","Sensor-array study","Incident recreation","Open geometry"]},{id:"VIBTRI",cat:"UAP",name:"Vietnam Black Triangle UAP",uid:"68b43965dbc94909a0dfafc956b47711",author:"UAP3D",authorUrl:"https://sketchfab.com/search?q=vietnam+black+triangle",modelUrl:"https://sketchfab.com/3d-models/vietnam-black-triangle-uap-3d-recreation-68b43965dbc94909a0dfafc956b47711",sources:["sf-mil"],plates:[3,9,10],role:"Triangular low-observable UAP",specs:["Triangular planform","Corner emitters","Stealth signature","ARV comparison"]},{id:"YUKON",cat:"UAP",name:"Yukon 2023 UAP Recreation",uid:"b4c7004eb3184e2abb8fad88e807a5d5",author:"UAP3D",authorUrl:"https://sketchfab.com/search?q=yukon+uap",modelUrl:"https://sketchfab.com/3d-models/yukon-2023-uap-3d-recreation-b4c7004eb3184e2abb8fad88e807a5d5",sources:["fab-ufo"],plates:[4,5,10],role:"2023 Yukon incident 3D recreation",specs:["Incident-corroborated","Elongated hull","2023 sighting data","Public geometry"]},{id:"OUMUA",cat:"UAP",name:"Oumuamua — Comet or ET Probe?",uid:"1961d643b7024567a0a2458809674f35",author:"SpaceRef3D",authorUrl:"https://sketchfab.com/search?q=oumuamua",modelUrl:"https://sketchfab.com/3d-models/oumuamua-weird-comet-or-et-probe-1961d643b7024567a0a2458809674f35",sources:["fab-ufo"],plates:[10,11,12],role:"Interstellar object — tumbling cigar",specs:["High aspect ratio","Tumbling motion","Hyperbolic trajectory","Interstellar origin"]},{id:"TR3B",cat:"UAP",name:"TR-3B Black Manta — OMSX",uid:"faaff1bb94e847d3b2efacdb458ac43a",author:"Marius Ciulei",authorUrl:"https://sketchfab.com/omassyx",modelUrl:"https://sketchfab.com/3d-models/tr-3b-black-manta-omsx-faaff1bb94e847d3b2efacdb458ac43a",sources:["fab-tr3b","sf-mil"],plates:[4,5,10],role:"Triangular ARV / black-project UAP",specs:["Field-core propulsion","Corner emitter array","Low-observable","Fab cross-reference"]},{id:"F47",cat:"FIGHTER",name:"Boeing F-47 Thunderstorm NGAD",uid:"a89532840fea44bbb7cc7ce2e6483cfb",author:"NETRUNNER_pl",authorUrl:"https://sketchfab.com/NETRUNNER_pl",modelUrl:"https://sketchfab.com/3d-models/boeing-f-47-thunderstorm-ngad-a89532840fea44bbb7cc7ce2e6483cfb",sources:["sf-mil","sf-war"],plates:[3,8,9],role:"USAF NGAD / air dominance fighter",specs:["Next-gen planform","NGAD program","Advanced stealth","Verified embed"]},{id:"NGAD",cat:"FIGHTER",name:"Lockheed NGAD Prime — Concept",uid:"e18a52bd7d444a12b06359dbdff6b3f8",author:"NETRUNNER_pl",authorUrl:"https://sketchfab.com/NETRUNNER_pl",modelUrl:"https://sketchfab.com/3d-models/lockheed-ngad-prime-concept-fighter-e18a52bd7d444a12b06359dbdff6b3f8",sources:["sf-mil"],plates:[3,8,9],role:"NGAD concept low-observable fighter",specs:["LO planform","Concept design","Advanced avionics","Fighter program"]},{id:"FAXX",cat:"FIGHTER",name:"Boeing FA-XX Naval Fighter",uid:"a910120ddc034d40a8ba6158dc12626e",author:"urgo",authorUrl:"https://sketchfab.com/urgo",modelUrl:"https://sketchfab.com/3d-models/boeing-fa-xx-a910120ddc034d40a8ba6158dc12626e",sources:["sf-mil","sf-war"],plates:[3,8,9],role:"6th-gen carrier-based fighter",specs:["Naval future fighter","Carrier-capable","6th gen","Verified embed"]},{id:"SR75",cat:"FIGHTER",name:"SR-75 Penetrator — Hypersonic Recon",uid:"a2ead21184e6435aac3aee8dc6aa9017",author:"Tim Samedov",authorUrl:"https://sketchfab.com/citizensnip",modelUrl:"https://sketchfab.com/3d-models/sr-75-penetrator-a2ead21184e6435aac3aee8dc6aa9017",sources:["fab-sr75","sf-mil"],plates:[3,9,10],role:"Hypersonic strategic reconnaissance",specs:["Mach 6+ design","Black project","SR-71 successor","Hypersonic recon"]},{id:"MQ1",cat:"DRONE",name:"MQ-1 Predator UAV",uid:"1462ff033b4b4eda8f309087c6d7312d",author:"Sketchfab",authorUrl:"https://sketchfab.com/search?q=mq-1+predator",modelUrl:"https://sketchfab.com/3d-models/mq-1-predator-uav-1462ff033b4b4eda8f309087c6d7312d",sources:["sf-mil"],plates:[3,8,9],role:"MALE UCAV / ISR platform",specs:["MALE endurance","Hellfire capable","ISR sensors","Combat proven"]},{id:"AIM9",cat:"MUNITION",name:"AIM-9L Sidewinder Missile",uid:"76452c2776a94bb093eb598a5d1ee26d",author:"Sketchfab",authorUrl:"https://sketchfab.com/search?q=aim-9l",modelUrl:"https://sketchfab.com/3d-models/aim-9l-sidewinder-missile-76452c2776a94bb093eb598a5d1ee26d",sources:["sf-mil","sf-war"],plates:[3,8,9],role:"IR-guided air-to-air missile",specs:["IR seeker head","All-aspect","NATO standard","Combat proven"]},{id:"X37",cat:"SPACE",name:"X-37 Orbital Test Vehicle (OTV)",uid:"31cb463192074f6dba47ea22be0cd720",author:"Sketchfab",authorUrl:"https://sketchfab.com/search?q=x-37",modelUrl:"https://sketchfab.com/3d-models/x-37-orbital-test-vehicle-otv-31cb463192074f6dba47ea22be0cd720",sources:["fab-orion"],plates:[10,11,12],role:"USAF autonomous orbital vehicle",specs:["Classified payload","Long-duration orbit","Autonomous re-entry","USAF SPACECOM"]},{id:"ORIONPBR",cat:"SPACE",name:"NASA Orion — Artemis PBR",uid:"9279b0672f15454b9320a31fceb65508",author:"Sketchfab",authorUrl:"https://sketchfab.com/search?q=nasa+orion",modelUrl:"https://sketchfab.com/3d-models/nasa-orion-spacecraft-capsule-artemis-pbr-txt-9279b0672f15454b9320a31fceb65508",sources:["fab-orion"],plates:[10,11,12],role:"Artemis crew capsule PBR model",specs:["PBR textures","Crew module","Service module","Moon mission"]},{id:"DISC",cat:"SPACE",name:"NASA Discovery Space Shuttle",uid:"63ea4540bc3d4da6b3d82274fae7f8ef",author:"SQUIR3D",authorUrl:"https://sketchfab.com/SQUIR3D",modelUrl:"https://sketchfab.com/3d-models/nasa-discovery-space-shuttle-63ea4540bc3d4da6b3d82274fae7f8ef",sources:["fab-orion"],plates:[10,11,12],role:"OV-103 orbital vehicle reference",specs:["OV-103 Discovery","Orbital reference","STS heritage","Author verified"]},{id:"ATLANTIS",cat:"SPACE",name:"NASA Atlantis — Rigged Game-Ready",uid:"f71a8d1338884444bbac519736fd6bf9",author:"Sketchfab",authorUrl:"https://sketchfab.com/search?q=nasa+atlantis",modelUrl:"https://sketchfab.com/3d-models/nasa-atlantis-high-detail-rigged-game-ready-f71a8d1338884444bbac519736fd6bf9",sources:["fab-orion"],plates:[10,11,12],role:"OV-104 rigged high-detail shuttle",specs:["Rigged skeleton","Game-ready","High detail","STS heritage"]},{id:"STARSHIP",cat:"SPACE",name:"SpaceX Starship + Super Heavy",uid:"d3cf8d66721b48adb17f599b199a99bf",author:"Sketchfab",authorUrl:"https://sketchfab.com/search?q=starship",modelUrl:"https://sketchfab.com/3d-models/space-x-starship-and-super-heavy-booster-d3cf8d66721b48adb17f599b199a99bf",sources:["fab-orion"],plates:[10,11,12],role:"Full-stack Starship / Super Heavy",specs:["Raptor engines","Full stack","Reusable launch","Mars architecture"]},{id:"EARTH",cat:"SPACE",name:"Earth — High-Resolution Globe",uid:"5f9c35be31a047928eace8b415a8ee3a",author:"Sketchfab",authorUrl:"https://sketchfab.com/search?q=earth",modelUrl:"https://sketchfab.com/3d-models/earth-5f9c35be31a047928eace8b415a8ee3a",sources:["fab-orion"],plates:[10,11,12],role:"Photorealistic Earth reference",specs:["Photorealistic","Atmosphere layers","Ocean detail","Space perspective"]},{id:"ISS",cat:"SPACE",name:"International Space Station — Interior",uid:"7753b422ca8046b4ae783d44b2bd6cfc",author:"Sketchfab",authorUrl:"https://sketchfab.com/search?q=iss+interior",modelUrl:"https://sketchfab.com/3d-models/international-space-station-interior-7753b422ca8046b4ae783d44b2bd6cfc",sources:["fab-orion"],plates:[10,11,12],role:"ISS interior walk-through model",specs:["Interior modules","Lab equipment","Cupola included","Walk-through ready"]},{id:"ORION",cat:"SPACE",name:"NASA Orion Spacecraft",uid:"1b783d2e242b4021a9ccdce44a051dc3",author:"MechLab3D",authorUrl:"https://sketchfab.com/MechLab85",modelUrl:"https://sketchfab.com/3d-models/nasa-orion-spacecraft-1b783d2e242b4021a9ccdce44a051dc3",sources:["fab-orion"],plates:[10,11,12],role:"Crew and service module reference",specs:["Crew module","Service module","Orbital vehicle","Fab cross-reference"]}];
const CATS=['ALL','FIGHTER','SPACE','UAP','DRONE','MUNITION'];
const CAT_COLORS={ALL:'#00d8ff',FIGHTER:'#ff6b35',SPACE:'#a78bfa',UAP:'#22c55e',DRONE:'#fbbf24',MUNITION:'#f87171'};

  const defaultIndex=Math.max(0,ASSETS.findIndex(a=>a.id==='TT01'));
  const state={index:defaultIndex,mode:'theater',plates:true,cat:'ALL'};
  const root = document.getElementById('hangar-root');
  if (!root) return;

  injectStyles();
  buildApp();
  bindEvents();
  render();

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :root{color-scheme:dark;--bg:#02060a;--panel:#07111e;--panel2:#0c1725;--line:#244058;--cyan:#00d8ff;--cyan2:#75efff;--text:#e7f7ff;--muted:#8fb7cf;--dim:#4f7d99;--amber:#ffd166;--green:#6cffba;--red:#ff667d}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:var(--bg);color:var(--text);font-family:'Exo 2',Segoe UI,sans-serif}body:before{content:"";position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.03),rgba(255,255,255,.03) 1px,transparent 1px,transparent 4px);opacity:.22;z-index:20}button,a{font:inherit}.hg-app{height:100vh;display:grid;grid-template-rows:88px minmax(0,1fr);background:radial-gradient(circle at 50% 15%,rgba(0,216,255,.13),transparent 33%),linear-gradient(180deg,#02060a,#050911)}.hg-top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#08111d,#02060a)}.hg-brand{display:flex;align-items:center;gap:13px;min-width:0}.hg-mark{width:48px;height:48px;display:grid;place-items:center;border:1px solid var(--cyan);background:#061724;color:#e9fbff;font:700 17px 'Share Tech Mono',monospace;box-shadow:0 0 22px rgba(0,216,255,.22)}.hg-brand h1{margin:0;font-size:24px;line-height:1.05;color:#f3fbff;letter-spacing:0}.hg-brand p{margin:5px 0 0;color:#a6c7da;font-size:13px;max-width:820px;line-height:1.35}.hg-actions{display:flex;gap:9px;align-items:flex-start;justify-content:flex-end;flex-wrap:wrap}.hg-chip,.hg-link,.hg-cache{display:inline-flex;align-items:center;min-height:34px;border:1px solid var(--line);background:#0a1420;color:var(--text);padding:7px 11px;text-decoration:none;font-size:13px}.hg-cache{cursor:pointer;font-weight:800}.hg-cache:hover,.hg-link:hover{border-color:var(--cyan);background:#103044}.hg-chip strong{color:var(--cyan);margin-right:4px}.hg-shell{min-height:0;display:grid;grid-template-columns:324px minmax(0,1fr) 352px;border-top:1px solid #071522}.hg-left,.hg-right{min-height:0;background:rgba(7,17,30,.98);display:flex;flex-direction:column}.hg-left{border-right:1px solid var(--line)}.hg-right{border-left:1px solid var(--line)}.hg-section{padding:13px 14px;border-bottom:1px solid var(--line)}.hg-section h2,.hg-section h3{margin:0 0 8px;color:#f2fdff;font-size:15px;text-transform:uppercase;letter-spacing:.08em}.hg-section h3{font-size:13px}.hg-section p{margin:0;color:#a8d3eb;font-size:13px;line-height:1.45}.hg-roster{min-height:0;overflow:auto;padding:9px 6px;display:grid;gap:8px}.hg-asset{width:100%;display:grid;grid-template-columns:66px minmax(0,1fr);gap:10px;align-items:center;text-align:left;border:1px solid #203a52;background:#101722;color:var(--text);padding:8px;cursor:pointer}.hg-asset:hover,.hg-asset.active{border-color:var(--cyan);background:#102638;box-shadow:inset 0 0 26px rgba(0,216,255,.08)}.hg-id{height:48px;display:grid;place-items:center;border:1px solid #21495f;background:radial-gradient(circle at 50% 50%,#13394b,#07131d 70%);color:var(--cyan);font:700 12px 'Share Tech Mono',monospace;text-align:center}.hg-asset-title{display:flex;gap:8px;justify-content:space-between;align-items:flex-start}.hg-asset-title strong{font-size:15px;line-height:1.12;overflow-wrap:anywhere}.hg-asset-title span{color:var(--amber);font-size:10px;white-space:nowrap;text-transform:uppercase}.hg-asset small{display:block;margin-top:4px;color:#9ec7de;font-size:12px;line-height:1.32}.hg-main{min-width:0;min-height:0;position:relative;background:#000;overflow:hidden}.hg-main:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(rgba(0,216,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,216,255,.06) 1px,transparent 1px);background-size:56px 56px;opacity:.2;z-index:1}.hg-toolbar{position:absolute;z-index:5;left:16px;right:16px;top:16px;display:flex;justify-content:space-between;gap:12px;pointer-events:none}.hg-modes,.hg-tools{display:flex;gap:8px;flex-wrap:wrap;pointer-events:auto}.hg-mode,.hg-toggle,.hg-source-open{border:1px solid #24536b;background:rgba(5,14,22,.88);color:#e9fbff;min-height:38px;padding:0 12px;cursor:pointer;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.hg-mode.active,.hg-toggle.active,.hg-source-open:hover{border-color:var(--cyan);background:#103044;box-shadow:0 0 22px rgba(0,216,255,.18)}.hg-stage{position:absolute;inset:0;background:radial-gradient(circle at 50% 36%,#16293a 0,#030507 58%,#000 100%);display:grid}.sketchfab-embed-wrapper{position:relative;width:100%;height:100%;z-index:2}.sketchfab-embed-wrapper:before{content:"LIVE SKETCHFAB SOURCE";position:absolute;left:16px;top:70px;z-index:5;border:1px solid rgba(117,239,255,.45);background:rgba(3,9,14,.76);color:#dff8ff;padding:7px 9px;font:700 11px 'Share Tech Mono',monospace;letter-spacing:.08em;pointer-events:none}.hg-frame{width:100%;height:100%;border:0;background:#000}.hg-caption{position:absolute;left:16px;right:16px;bottom:15px;z-index:4;margin:0;padding:8px 10px;border:1px solid rgba(0,216,255,.35);background:rgba(2,8,13,.72);color:#95bdd3;font-size:12px;backdrop-filter:blur(8px)}.hg-caption a{color:var(--cyan2);font-weight:700;text-decoration:none}.hg-caption a:hover{text-decoration:underline}.hg-hud{position:absolute;left:18px;bottom:56px;z-index:4;width:min(720px,calc(100% - 36px));border:1px solid rgba(0,216,255,.42);background:rgba(4,9,15,.82);padding:13px 15px;box-shadow:0 0 30px rgba(0,0,0,.42)}.hg-hud h2{margin:0;font-size:21px;color:#fff}.hg-hud span{display:block;margin-top:4px;color:#a4c7dd;font-size:13px}.hg-specs{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.hg-specs b{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);font:400 11px 'Share Tech Mono',monospace;color:#eafaff;padding:6px 9px}.hg-plate-strip{position:absolute;left:18px;right:18px;bottom:12px;z-index:4;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;pointer-events:none}.hg-plate-strip img{width:100%;height:76px;object-fit:cover;border:1px solid rgba(0,216,255,.4);background:#03070d}.hg-dossier{min-height:0;overflow:auto;padding:16px 14px;display:grid;gap:12px}.hg-title h2{margin:0;font-size:24px;line-height:1.08;color:#fff}.hg-title span{display:block;margin-top:6px;color:#8ecfff;font-size:13px}.hg-panel{border:1px solid #22384d;background:#121821;padding:11px;color:#c8e4f5;font-size:13px;line-height:1.5}.hg-kv{display:grid;grid-template-columns:82px minmax(0,1fr);gap:6px 10px;color:#b7d7e9;font-size:12px}.hg-kv b{color:#fff;text-transform:uppercase;font-size:10px;letter-spacing:.08em}.hg-embed-code{white-space:pre-wrap;overflow:auto;max-height:150px;color:#dff8ff;font:11px 'Share Tech Mono',monospace}.hg-plates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.hg-plates img{width:100%;aspect-ratio:16/9;object-fit:cover;border:1px solid #25495e;background:#04080e}.hg-source{border:1px solid #25495e;background:#0d1723;padding:11px}.hg-source span{display:block;color:var(--amber);font:700 10px 'Share Tech Mono',monospace;letter-spacing:.08em}.hg-source strong{display:block;margin:5px 0;color:#fff;font-size:14px;line-height:1.25}.hg-source p{margin:0 0 9px;color:#9dbbd0;font-size:12px;line-height:1.45}.hg-source a{color:var(--cyan2);font-size:12px;text-decoration:none;font-weight:700;overflow-wrap:anywhere}.hg-source a:hover{text-decoration:underline}.hg-grid{position:absolute;inset:0;z-index:2;overflow:auto;padding:70px 16px 16px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;background:radial-gradient(circle at 50% 26%,#142534,#02060a 70%)}.hg-grid .hg-source{min-height:148px}.hg-plate-mode{position:absolute;inset:0;z-index:2;overflow:auto;padding:70px 16px 16px;display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:12px;background:#02060a}.hg-plate-mode img{width:100%;aspect-ratio:16/9;object-fit:cover;border:1px solid #27516a;background:#02060a}.hg-empty{align-self:center;justify-self:center;z-index:3;max-width:620px;text-align:center;border:1px solid var(--line);background:#08111a;padding:24px}.hg-empty strong{display:block;font-size:22px}.hg-empty p{color:#a9cbe0;line-height:1.5}.hg-empty a{color:var(--cyan2)}.hg-catbar{display:flex;gap:6px;padding:10px 12px 6px;flex-wrap:wrap;border-bottom:1px solid var(--line)}.hg-catbtn{min-height:30px;padding:4px 13px;border:1px solid var(--line);background:#0a1420;color:var(--text);font:700 10px 'Share Tech Mono',monospace;letter-spacing:.08em;cursor:pointer;transition:border-color .15s,color .15s,box-shadow .15s}.hg-catbtn:hover{border-color:var(--cyan);color:var(--cyan)}.hg-catbtn.active{color:#000;box-shadow:0 0 12px currentColor}.hg-cat-F{--cc:#ff6b35}.hg-cat-S{--cc:#a78bfa}.hg-cat-U{--cc:#22c55e}.hg-cat-D{--cc:#fbbf24}.hg-cat-M{--cc:#f87171}.hg-cat-A{--cc:#00d8ff}.hg-catbtn.active{background:var(--cc,var(--cyan));border-color:var(--cc,var(--cyan))}.hg-asset.hidden{display:none}.hg-count{font:400 10px 'Share Tech Mono',monospace;color:var(--dim);padding:6px 14px 2px}.hg-glitch{position:relative}.hg-glitch::after{content:attr(data-text);position:absolute;left:2px;top:0;color:var(--cyan);opacity:.18;clip-path:polygon(0 30%,100% 30%,100% 50%,0 50%)}@media(max-width:1220px){body{overflow:auto}.hg-app{height:auto;min-height:100vh}.hg-shell{grid-template-columns:1fr}.hg-left,.hg-right{border:0;border-bottom:1px solid var(--line)}.hg-main{height:76vh}.hg-roster{grid-template-columns:repeat(2,minmax(0,1fr))}.hg-top{align-items:flex-start;flex-direction:column}}@media(max-width:720px){.hg-roster{grid-template-columns:1fr}.hg-grid,.hg-plate-mode{grid-template-columns:1fr}.hg-plate-strip{display:none}.hg-hud{bottom:12px}.hg-brand h1{font-size:20px}.hg-top{padding:12px}.hg-shell{border-top:0}}
    `;
    document.head.appendChild(style);
  }

  function buildApp() {
    root.innerHTML = `
      <div class="hg-app">
        <header class="hg-top">
          <div class="hg-brand">
            <div class="hg-mark">3D</div>
const CAT_COLORS={ALL:'#00d8ff',FIGHTER:'#ff6b35',SPACE:'#a78bfa',UAP:'#22c55e',DRONE:'#fbbf24',MUNITION:'#f87171'};

  const defaultIndex=Math.max(0,ASSETS.findIndex(a=>a.id==='TT01'));
  const state={index:defaultIndex,mode:'theater',plates:true,cat:'ALL'};
  const root = document.getElementById('hangar-root');
  if (!root) return;

  injectStyles();
  buildApp();
  bindEvents();
  render();

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :root{color-scheme:dark;--bg:#02060a;--panel:#07111e;--panel2:#0c1725;--line:#244058;--cyan:#00d8ff;--cyan2:#75efff;--text:#e7f7ff;--muted:#8fb7cf;--dim:#4f7d99;--amber:#ffd166;--green:#6cffba;--red:#ff667d}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:var(--bg);color:var(--text);font-family:'Exo 2',Segoe UI,sans-serif}body:before{content:"";position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.03),rgba(255,255,255,.03) 1px,transparent 1px,transparent 4px);opacity:.22;z-index:20}button,a{font:inherit}.hg-app{height:100vh;display:grid;grid-template-rows:88px minmax(0,1fr);background:radial-gradient(circle at 50% 15%,rgba(0,216,255,.13),transparent 33%),linear-gradient(180deg,#02060a,#050911)}.hg-top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#08111d,#02060a)}.hg-brand{display:flex;align-items:center;gap:13px;min-width:0}.hg-mark{width:48px;height:48px;display:grid;place-items:center;border:1px solid var(--cyan);background:#061724;color:#e9fbff;font:700 17px 'Share Tech Mono',monospace;box-shadow:0 0 22px rgba(0,216,255,.22)}.hg-brand h1{margin:0;font-size:24px;line-height:1.05;color:#f3fbff;letter-spacing:0}.hg-brand p{margin:5px 0 0;color:#a6c7da;font-size:13px;max-width:820px;line-height:1.35}.hg-actions{display:flex;gap:9px;align-items:flex-start;justify-content:flex-end;flex-wrap:wrap}.hg-chip,.hg-link,.hg-cache{display:inline-flex;align-items:center;min-height:34px;border:1px solid var(--line);background:#0a1420;color:var(--text);padding:7px 11px;text-decoration:none;font-size:13px}.hg-cache{cursor:pointer;font-weight:800}.hg-cache:hover,.hg-link:hover{border-color:var(--cyan);background:#103044}.hg-chip strong{color:var(--cyan);margin-right:4px}.hg-shell{min-height:0;display:grid;grid-template-columns:324px minmax(0,1fr) 352px;border-top:1px solid #071522}.hg-left,.hg-right{min-height:0;background:rgba(7,17,30,.98);display:flex;flex-direction:column}.hg-left{border-right:1px solid var(--line)}.hg-right{border-left:1px solid var(--line)}.hg-section{padding:13px 14px;border-bottom:1px solid var(--line)}.hg-section h2,.hg-section h3{margin:0 0 8px;color:#f2fdff;font-size:15px;text-transform:uppercase;letter-spacing:.08em}.hg-section h3{font-size:13px}.hg-section p{margin:0;color:#a8d3eb;font-size:13px;line-height:1.45}.hg-roster{min-height:0;overflow:auto;padding:9px 6px;display:grid;gap:8px}.hg-asset{width:100%;display:grid;grid-template-columns:66px minmax(0,1fr);gap:10px;align-items:center;text-align:left;border:1px solid #203a52;background:#101722;color:var(--text);padding:8px;cursor:pointer}.hg-asset:hover,.hg-asset.active{border-color:var(--cyan);background:#102638;box-shadow:inset 0 0 26px rgba(0,216,255,.08)}.hg-id{height:48px;display:grid;place-items:center;border:1px solid #21495f;background:radial-gradient(circle at 50% 50%,#13394b,#07131d 70%);color:var(--cyan);font:700 12px 'Share Tech Mono',monospace;text-align:center}.hg-asset-title{display:flex;gap:8px;justify-content:space-between;align-items:flex-start}.hg-asset-title strong{font-size:15px;line-height:1.12;overflow-wrap:anywhere}.hg-asset-title span{color:var(--amber);font-size:10px;white-space:nowrap;text-transform:uppercase}.hg-asset small{display:block;margin-top:4px;color:#9ec7de;font-size:12px;line-height:1.32}.hg-main{min-width:0;min-height:0;position:relative;background:#000;overflow:hidden}.hg-main:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(rgba(0,216,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,216,255,.06) 1px,transparent 1px);background-size:56px 56px;opacity:.2;z-index:1}.hg-toolbar{position:absolute;z-index:5;left:16px;right:16px;top:16px;display:flex;justify-content:space-between;gap:12px;pointer-events:none}.hg-modes,.hg-tools{display:flex;gap:8px;flex-wrap:wrap;pointer-events:auto}.hg-mode,.hg-toggle,.hg-source-open{border:1px solid #24536b;background:rgba(5,14,22,.88);color:#e9fbff;min-height:38px;padding:0 12px;cursor:pointer;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.hg-mode.active,.hg-toggle.active,.hg-source-open:hover{border-color:var(--cyan);background:#103044;box-shadow:0 0 22px rgba(0,216,255,.18)}.hg-stage{position:absolute;inset:0;background:radial-gradient(circle at 50% 36%,#16293a 0,#030507 58%,#000 100%);display:grid}.sketchfab-embed-wrapper{position:relative;width:100%;height:100%;z-index:2}.sketchfab-embed-wrapper:before{content:"LIVE SKETCHFAB SOURCE";position:absolute;left:16px;top:70px;z-index:5;border:1px solid rgba(117,239,255,.45);background:rgba(3,9,14,.76);color:#dff8ff;padding:7px 9px;font:700 11px 'Share Tech Mono',monospace;letter-spacing:.08em;pointer-events:none}.hg-frame{width:100%;height:100%;border:0;background:#000}.hg-caption{position:absolute;left:16px;right:16px;bottom:15px;z-index:4;margin:0;padding:8px 10px;border:1px solid rgba(0,216,255,.35);background:rgba(2,8,13,.72);color:#95bdd3;font-size:12px;backdrop-filter:blur(8px)}.hg-caption a{color:var(--cyan2);font-weight:700;text-decoration:none}.hg-caption a:hover{text-decoration:underline}.hg-hud{position:absolute;left:18px;bottom:56px;z-index:4;width:min(720px,calc(100% - 36px));border:1px solid rgba(0,216,255,.42);background:rgba(4,9,15,.82);padding:13px 15px;box-shadow:0 0 30px rgba(0,0,0,.42)}.hg-hud h2{margin:0;font-size:21px;color:#fff}.hg-hud span{display:block;margin-top:4px;color:#a4c7dd;font-size:13px}.hg-specs{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.hg-specs b{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);font:400 11px 'Share Tech Mono',monospace;color:#eafaff;padding:6px 9px}.hg-plate-strip{position:absolute;left:18px;right:18px;bottom:12px;z-index:4;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;pointer-events:none}.hg-plate-strip img{width:100%;height:76px;object-fit:cover;border:1px solid rgba(0,216,255,.4);background:#03070d}.hg-dossier{min-height:0;overflow:auto;padding:16px 14px;display:grid;gap:12px}.hg-title h2{margin:0;font-size:24px;line-height:1.08;color:#fff}.hg-title span{display:block;margin-top:6px;color:#8ecfff;font-size:13px}.hg-panel{border:1px solid #22384d;background:#121821;padding:11px;color:#c8e4f5;font-size:13px;line-height:1.5}.hg-kv{display:grid;grid-template-columns:82px minmax(0,1fr);gap:6px 10px;color:#b7d7e9;font-size:12px}.hg-kv b{color:#fff;text-transform:uppercase;font-size:10px;letter-spacing:.08em}.hg-embed-code{white-space:pre-wrap;overflow:auto;max-height:150px;color:#dff8ff;font:11px 'Share Tech Mono',monospace}.hg-plates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.hg-plates img{width:100%;aspect-ratio:16/9;object-fit:cover;border:1px solid #25495e;background:#04080e}.hg-source{border:1px solid #25495e;background:#0d1723;padding:11px}.hg-source span{display:block;color:var(--amber);font:700 10px 'Share Tech Mono',monospace;letter-spacing:.08em}.hg-source strong{display:block;margin:5px 0;color:#fff;font-size:14px;line-height:1.25}.hg-source p{margin:0 0 9px;color:#9dbbd0;font-size:12px;line-height:1.45}.hg-source a{color:var(--cyan2);font-size:12px;text-decoration:none;font-weight:700;overflow-wrap:anywhere}.hg-source a:hover{text-decoration:underline}.hg-grid{position:absolute;inset:0;z-index:2;overflow:auto;padding:70px 16px 16px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;background:radial-gradient(circle at 50% 26%,#142534,#02060a 70%)}.hg-grid .hg-source{min-height:148px}.hg-plate-mode{position:absolute;inset:0;z-index:2;overflow:auto;padding:70px 16px 16px;display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:12px;background:#02060a}.hg-plate-mode img{width:100%;aspect-ratio:16/9;object-fit:cover;border:1px solid #27516a;background:#02060a}.hg-empty{align-self:center;justify-self:center;z-index:3;max-width:620px;text-align:center;border:1px solid var(--line);background:#08111a;padding:24px}.hg-empty strong{display:block;font-size:22px}.hg-empty p{color:#a9cbe0;line-height:1.5}.hg-empty a{color:var(--cyan2)}.hg-catbar{display:flex;gap:6px;padding:10px 12px 6px;flex-wrap:wrap;border-bottom:1px solid var(--line)}.hg-catbtn{min-height:30px;padding:4px 13px;border:1px solid var(--line);background:#0a1420;color:var(--text);font:700 10px 'Share Tech Mono',monospace;letter-spacing:.08em;cursor:pointer;transition:border-color .15s,color .15s,box-shadow .15s}.hg-catbtn:hover{border-color:var(--cyan);color:var(--cyan)}.hg-catbtn.active{color:#000;box-shadow:0 0 12px currentColor}.hg-cat-F{--cc:#ff6b35}.hg-cat-S{--cc:#a78bfa}.hg-cat-U{--cc:#22c55e}.hg-cat-D{--cc:#fbbf24}.hg-cat-M{--cc:#f87171}.hg-cat-A{--cc:#00d8ff}.hg-catbtn.active{background:var(--cc,var(--cyan));border-color:var(--cc,var(--cyan))}.hg-asset.hidden{display:none}.hg-count{font:400 10px 'Share Tech Mono',monospace;color:var(--dim);padding:6px 14px 2px}.hg-glitch{position:relative}.hg-glitch::after{content:attr(data-text);position:absolute;left:2px;top:0;color:var(--cyan);opacity:.18;clip-path:polygon(0 30%,100% 30%,100% 50%,0 50%)}@media(max-width:1220px){body{overflow:auto}.hg-app{height:auto;min-height:100vh}.hg-shell{grid-template-columns:1fr}.hg-left,.hg-right{border:0;border-bottom:1px solid var(--line)}.hg-main{height:76vh}.hg-roster{grid-template-columns:repeat(2,minmax(0,1fr))}.hg-top{align-items:flex-start;flex-direction:column}}@media(max-width:720px){.hg-roster{grid-template-columns:1fr}.hg-grid,.hg-plate-mode{grid-template-columns:1fr}.hg-plate-strip{display:none}.hg-hud{bottom:12px}.hg-brand h1{font-size:20px}.hg-top{padding:12px}.hg-shell{border-top:0}}
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
              <p>Advanced cyberpunk 3D model theater — 22 verified Sketchfab embeds across 5 categories. Aerospace, DoD, UAP & Space. Filter by category, inspect dossiers, zero ghost links.</p>
            </div>
          </div>
          <div class="hg-actions">
            <a class="hg-link" href="index.html">Desktop</a>
            <a class="hg-link" href="dogfight-legacy.html">Dogfight</a>
            <a class="hg-link" href="rpg/index.html">CyberWorld RPG</a>
            <button class="hg-cache" id="hg-cache-reset" type="button">Refresh Source Cache</button>
            <span class="hg-chip"><strong>${ASSETS.length}</strong> verified live models</span>
            <span class="hg-chip"><strong>${PLATES.length}</strong> local reference plates</span>
            <span class="hg-chip">Sketchfab embeds</span>
          </div>
        </header>
        <div class="hg-shell">
          <aside class="hg-left">
            <div class="hg-section"><h2>Vehicle Bay</h2><p>Select a sourced model. Orbit, zoom, fullscreen, and inspect inside the Sketchfab viewer.</p></div><div class="hg-catbar" id="hg-catbar"></div><div class="hg-count" id="hg-count"></div>
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
        <div><div class="hg-asset-title"><strong>${escapeHtml(asset.name)}</strong><span>${escapeHtml(asset.cat)}</span></div><small>${escapeHtml(asset.role)}</small></div>
      </button>`).join('');
  }

  function bindEvents() {

  // ── category filter
  const catbar=document.getElementById('hg-catbar');
  CATS.forEach(cat=>{
    const b=document.createElement('button');
    b.className='hg-catbtn hg-cat-'+cat[0]+(state.cat===cat?' active':'');
    b.textContent=cat;b.dataset.cat=cat;
    b.addEventListener('click',()=>{
      state.cat=cat;
      document.querySelectorAll('.hg-catbtn').forEach(x=>x.classList.toggle('active',x.dataset.cat===cat));
      filterRoster();
    });
    catbar.appendChild(b);
  });
  filterRoster();

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

  
function filterRoster() {
  let visible=0;
  document.querySelectorAll('.hg-asset').forEach((btn,i)=>{
    const a=ASSETS[i];
    const show=state.cat==='ALL'||a.cat===state.cat;
    btn.classList.toggle('hidden',!show);
    if(show)visible++;
  });
  const cnt=document.getElementById('hg-count');
  if(cnt)cnt.textContent=visible+' / '+ASSETS.length+' models';
}

function render() {
    const asset = ASSETS[state.index];
    document.querySelectorAll('.hg-asset').forEach((button, index) => button.classList.toggle('active', index === state.index));
    document.querySelectorAll('.hg-mode').forEach((button) => button.classList.toggle('active', button.dataset.mode === state.mode));
    document.getElementById('hg-open-model').href = asset.modelUrl;
    document.getElementById('hg-hud-name').textContent = asset.name;
    document.getElementById('hg-hud-sub').textContent = `${asset.cat} / ${asset.role} / ${state.mode.toUpperCase()}`;
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
      <div class="hg-title"><h2>${escapeHtml(asset.name)}</h2><span>${escapeHtml(asset.cat)} — ${escapeHtml(asset.role)}</span></div>
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