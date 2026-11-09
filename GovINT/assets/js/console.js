/* GovINT research console. Static, dependency-free, no remote runtime services. */
(() => {
  "use strict";
  const D = window.GOVINT_DATA;
  if (!D || !window.GOVINT_WORLD) {
    document.querySelector(".boot-fallback p:nth-of-type(2)").textContent =
      "The local catalog could not load. Reload the page or use the JSON catalog below.";
    return;
  }
  const icons = {
    connections:
      '<path d="M5 5 12 12 20 5M12 12 5 20m7-8 8 8"/><circle cx="5" cy="5" r="2"/><circle cx="20" cy="5" r="2"/><circle cx="12" cy="12" r="3"/><circle cx="5" cy="20" r="2"/><circle cx="20" cy="20" r="2"/>',
    casefiles: '<path d="M3 5h7l2 3h9v13H3Z"/><path d="M8 13h9M8 17h5"/>',
    eye: '<path d="M2 12 12 4l10 8-10 8Z"/><circle cx="12" cy="12" r="4"/>',
    overview:
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    sources: '<path d="M3 5h7l2 3h9v12H3Z"/><path d="M3 11h18"/>',
    atlas:
      '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/>',
    dossiers:
      '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    feeds: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    archive: '<path d="M4 8h16v13H4ZM3 3h18v5H3Z"/><path d="M9 12h6"/>',
    workspace: '<path d="M3 7h18v13H3ZM8 7V4h8v3M3 12h18M10 12v3h4v-3"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    link: '<path d="m10 7 2-2a5 5 0 0 1 7 7l-2 2m-3 3-2 2a5 5 0 0 1-7-7l2-2m1 7 8-8"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield:
      '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    grid: '<path d="M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z"/>',
    list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1"/>',
  };
  const icon = (n, cls = "") =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[n] || icons.dossiers}</svg>`;
  const esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const plain = (x) =>
    String(x ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const safeURL = (x) => {
    try {
      const u = new URL(x);
      return ["https:", "http:"].includes(u.protocol) ? u.href : "#";
    } catch {
      return "#";
    }
  };
  const ext = (url, label, cls = "") =>
    `<a class="${cls}" href="${esc(safeURL(url))}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  const sourceById = (id) => D.sources.find((s) => s.id === id);
  const category = (id) => D.categories.find((c) => c.id === id);
  const catName = (id) => category(id)?.name || id;
  const shortCat = (id) =>
    ({
      archives: "DECLASSIFIED",
      money: "FOLLOW THE MONEY",
      water: "WATER & ENVIRONMENT",
      cyber: "CYBER INTELLIGENCE",
      government: "POLICY & LEGISLATION",
      justice: "OVERSIGHT",
      arizona: "ARIZONA FIELD DESK",
      defense: "DEFENSE & SECURITY",
      geospatial: "EARTH OBSERVATION",
      transport: "TRANSPORT & BORDERS",
      economy: "GLOBAL DATA",
    })[id] || catName(id).toUpperCase();
  const regionName = (id) => D.regions.find((r) => r.id === id)?.name || id;
  const count = (n) => Number(n).toLocaleString("en-US");
  const archiveDates = [...new Set(D.archives.map((a) => a.date))];
  const view = document.body.dataset.view || "overview";
  const viewTitles = {
    casefiles: "Declassified case files",
    connections: "Source connections",
    desks: "Research desks",
    desk: "Research desk",
    overview: "Overview",
    sources: "Source directory",
    atlas: "Source atlas",
    dossiers: "Research dossiers",
    feeds: "Signal archive",
    archive: "Snapshot archive",
    workspace: "Investigations",
    methodology: "Methodology",
  };
  const query = new URLSearchParams(location.search);
  let storageAvailable = true;
  let workspace;
  try {
    workspace = JSON.parse(
      localStorage.getItem("govint.workspace.v2") || "null",
    );
  } catch {
    storageAvailable = false;
  }
  if (!workspace || typeof workspace !== "object")
    workspace = { version: 2, saved: [], notes: [] };
  workspace.saved = Array.isArray(workspace.saved)
    ? [
        ...new Set(
          workspace.saved.filter(
            (id) => typeof id === "string" && sourceById(id),
          ),
        ),
      ]
    : [];
  workspace.notes = Array.isArray(workspace.notes)
    ? workspace.notes
        .filter(
          (n) =>
            n &&
            typeof n.id === "string" &&
            typeof n.title === "string" &&
            typeof n.text === "string",
        )
        .map((n) => ({
          ...n,
          title: n.title.slice(0, 200),
          text: n.text.slice(0, 20000),
        }))
    : [];
  let toastTimer;
  function toast(message) {
    const el = document.getElementById("notifications");
    el.innerHTML = `<div class="toast">${esc(message)}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.innerHTML = "";
    }, 3500);
  }
  function persist() {
    try {
      localStorage.setItem("govint.workspace.v2", JSON.stringify(workspace));
      storageAvailable = true;
      return true;
    } catch {
      storageAvailable = false;
      toast("Storage unavailable. Export this session to keep your work.");
      return false;
    }
  }
  function isSaved(id) {
    return workspace.saved.includes(id);
  }
  function saveButton(id) {
    return `<button class="icon-btn ${isSaved(id) ? "saved" : ""}" data-save="${esc(id)}" aria-label="${isSaved(id) ? "Remove" : "Save"} ${esc(sourceById(id)?.name || "source")}" aria-pressed="${isSaved(id)}" title="${isSaved(id) ? "Remove saved source" : "Save to investigations"}">${icon("bookmark")}</button>`;
  }
  function refreshSaved() {
    document.querySelectorAll("[data-save]").forEach((b) => {
      const saved = isSaved(b.dataset.save);
      b.classList.toggle("saved", saved);
      b.setAttribute("aria-pressed", String(saved));
      b.setAttribute(
        "aria-label",
        `${saved ? "Remove" : "Save"} ${sourceById(b.dataset.save)?.name || "source"}`,
      );
      b.title = saved ? "Remove saved source" : "Save to investigations";
    });
    document
      .querySelectorAll("[data-saved-count]")
      .forEach((e) => (e.textContent = count(workspace.saved.length)));
  }
  function toggleSave(id) {
    if (!sourceById(id)) return;
    workspace.saved = isSaved(id)
      ? workspace.saved.filter((x) => x !== id)
      : [...workspace.saved, id];
    persist();
    refreshSaved();
    connectionsController?.refreshSaved();
    if (view === "workspace") renderWorkspaceSaved();
    if (view === "sources" && sourceState.saved) renderSourceResults();
    toast(
      isSaved(id)
        ? "Source saved to investigations."
        : "Source removed from investigations.",
    );
  }
  const nav = [
    ["overview", "index.html", "Mission control", ""],
    [
      "casefiles",
      "casefiles.html",
      "Declassified files",
      (window.GOVINT_CASEFILES || []).length,
    ],
    ["connections", "connections.html", "Connections", ""],
    ["sources", "sources.html", "Source directory", D.sources.length],
    ["atlas", "maps.html", "Source atlas", ""],
    ["desks", "desks.html", "Research desks", ""],
    ["dossiers", "dossiers.html", "Research dossiers", D.dossiers.length],
    ["feeds", "feeds.html", "Signal archive", ""],
    ["archive", "archive.html", "Snapshot archive", archiveDates.length],
  ];
  document.getElementById("app").innerHTML = `
<aside class="sidebar" id="sidebar" aria-label="Main navigation">
<a class="brand" href="index.html" aria-label="GovINT home"><svg class="brand-symbol" viewBox="0 0 32 32" aria-hidden="true"><path d="M2 16 16 5l14 11-14 11Z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg><div><div class="brand-name">Gov<i>INT</i></div><div class="brand-version">PUBLIC INTELLIGENCE ARCHIVE</div></div></a>
<div class="sidebar-scroll"><div class="nav-title">RESEARCH CONSOLE / ACCESS INDEX</div><nav class="nav-list">${nav.map(([id, url, title, n]) => `<a class="nav-item ${view === id ? "active" : ""}" ${view === id ? 'aria-current="page"' : ""} href="${url}">${icon(id)}${title}${n !== "" ? `<span class="count">${n}</span>` : ""}</a>`).join("")}</nav>
<div class="nav-title">RESEARCH DESKS</div><nav class="nav-list">${[
    ["archives", "Declassified records"],
    ["money", "Follow the money"],
    ["cyber", "Cyber & digital"],
    ["global", "Global affairs"],
    ["arizona", "Arizona field desk"],
  ]
    .map(
      ([id, title]) =>
        `<a class="nav-item nav-small" href="sources.html?category=${id}"><span class="nav-dot"></span>${title}<span class="count">${D.sources.filter((s) => s.category === id).length}</span></a>`,
    )
    .join("")}</nav>
<div class="nav-title">YOUR WORKSPACE</div><nav class="nav-list"><a class="nav-item ${view === "workspace" ? "active" : ""}" href="investigations.html" ${view === "workspace" ? 'aria-current="page"' : ""}>${icon("workspace")}Investigations<span class="count" data-saved-count>${workspace.saved.length}</span></a><a class="nav-item ${view === "methodology" ? "active" : ""}" href="methodology.html" ${view === "methodology" ? 'aria-current="page"' : ""}>${icon("shield")}Methodology</a></nav></div>
<div class="sidebar-note"><div class="eyebrow accent">FOLLOW THE EVIDENCE.</div><p>One document is a lead.<br>Context makes it intelligence.</p><a href="dossiers.html">Choose a research trail ${icon("arrow")}</a></div><div class="sidebar-bottom"><span class="status-dot"></span>OPEN SOURCES. OPEN QUESTIONS.</div></aside>
<div class="shell"><header class="topbar"><button class="mobile-toggle" id="mobile-menu" aria-label="Toggle navigation" aria-controls="sidebar" aria-expanded="false">${icon("menu")}</button><a class="mobile-wordmark" href="index.html">GOV<span>INT</span></a><div class="breadcrumb"><span class="workspace-label">WORKSPACE</span><span class="workspace-label">/</span><strong>${esc(viewTitles[view])}</strong></div><button class="top-search" id="open-search" aria-label="Search all sources and dossiers">${icon("search")}<span>Search the public record</span><kbd class="key">⌘ K</kbd></button><div class="header-status"><span class="status-dot"></span>PUBLIC SOURCES<span class="time"> &nbsp; / &nbsp; <time id="clock"></time></span></div></header><main class="main" id="main" tabindex="-1"></main></div>
<dialog id="source-dialog" aria-labelledby="source-dialog-title"></dialog>
<dialog id="search-dialog" aria-label="Search sources and dossiers"><div class="command-search">${icon("search")}<label class="sr-only" for="global-search">Search all sources and dossiers</label><input id="global-search" placeholder="Agencies, documents, money trails…" autocomplete="off"><button class="icon-btn" data-close="search-dialog" aria-label="Close search">${icon("close")}</button></div><div class="command-results" id="command-results"></div><div class="command-footer">Tab to navigate · Enter to open · Esc to close</div></dialog>
<dialog id="confirm-dialog" aria-labelledby="confirm-title"><div class="dialog-head"><h2 id="confirm-title">Replace this local workspace?</h2><button class="icon-btn" data-close="confirm-dialog" aria-label="Cancel import">${icon("close")}</button></div><div class="dialog-body"><p id="confirm-message"></p><div class="page-actions"><button class="btn primary" id="confirm-import">Replace workspace</button><button class="btn" data-close="confirm-dialog">Cancel</button></div></div></dialog>`;
  const main = document.getElementById("main");
  const footer = () =>
    `<footer class="footer"><span>GOVINT / FLLC · INDEPENDENT PUBLIC-SOURCE RESEARCH · CATALOG ${D.catalogedAt}</span><span><a href="documentation/index.html">Original document library</a> &nbsp; <a href="methodology.html">Methods & provenance</a> &nbsp; <a href="data/source-catalog.json" download>Open data ${icon("external")}</a></span></footer>`;
  function heading(eyebrow, title, description, actions = "") {
    return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</div>`;
  }
  function empty(title, text, action = "") {
    return `<div class="empty">${icon("sources")}<h3>${title}</h3><p>${text}</p>${action}</div>`;
  }
  function dossierCard(d, i = 0) {
    return `<a class="dossier-card" href="dossiers.html?id=${d.id}"><div class="dossier-top"><span class="tag">${esc(shortCat(d.category))}</span><span class="dossier-number">FILE / ${String(D.dossiers.indexOf(d) + 1).padStart(3, "0")}</span></div><h3>${esc(d.title)}</h3><p>${esc(d.subtitle)}</p><div class="dossier-foot"><span>${d.sources.length} LINKED SOURCES</span><span>${d.readingMinutes} MIN READ</span>${icon("arrow")}</div></a>`;
  }
  function sourceRow(s) {
    return `<div class="source-row"><span class="source-monogram" aria-hidden="true">${esc(
      s.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    )}</span><button class="source-detail" data-source="${s.id}"><div class="source-name">${esc(s.name)}</div><div class="source-meta">${esc(catName(s.category))} · ${esc(s.region)}</div></button>${saveButton(s.id)}</div>`;
  }
  function mapPanel(large = false) {
    return `<div class="panel"><div class="panel-head"><div class="eyebrow">${large ? "GEOGRAPHIC SOURCE EXPLORER" : "THE PUBLIC RECORD, MAPPED"}</div><div class="map-tabs" aria-label="Map extent"><button data-map-view="world" aria-pressed="true">World</button><button data-map-view="us" aria-pressed="false">U.S.</button><button data-map-view="az" aria-pressed="false">Arizona</button></div></div><div class="map ${large ? "atlas-large" : ""}" id="atlas-map"><div class="map-overlay"><div class="eyebrow">BUNDLED GEOGRAPHY / NO API KEY</div><b id="map-region-label">GLOBAL SOURCE COVERAGE</b></div><svg class="atlas-svg" id="atlas-svg" viewBox="0 0 1000 460" aria-label="Interactive map of research source coverage"><title>Public-source research coverage. Select a regional marker to explore sources.</title><defs><pattern id="map-grid" width="83.333" height="83.333" patternUnits="userSpaceOnUse"><path d="M83.333 0H0V83.333" fill="none" stroke="#283947" stroke-width=".6"/></pattern></defs><rect x="-5000" y="-5000" width="10000" height="10000" fill="#0c141c"/><g id="map-land"></g><rect x="0" y="0" width="1000" height="500" fill="url(#map-grid)" pointer-events="none"/><g id="map-markers"></g></svg><div class="map-controls"><button data-map-zoom="in" aria-label="Zoom in">+</button><button data-map-zoom="out" aria-label="Zoom out">−</button><button data-map-zoom="reset" aria-label="Reset map">${icon("reset")}</button></div><div class="map-coordinates" id="map-coordinates">SELECT A MARKER TO EXPLORE · DRAG TO PAN</div></div><div class="map-legend"><span><i class="legend-dot"></i>Research source coverage</span><span>Natural Earth · public domain</span>${!large ? '<a href="maps.html">Explore atlas ↗</a>' : "<span>Markers show regions, not live events</span>"}</div></div>`;
  }
  let globeController;
  let connectionsController;
  function renderOverview() {
    main.innerHTML = window.GovINTMission.render(D, {
      icon,
      esc,
      count,
      mapPanel,
      dossierCard,
      sourceRow,
      sourceById,
      footer,
    });
    initMap(false);
    globeController = window.GovINTGlobe.mount(
      document.getElementById("coverage-globe"),
      D,
    );
  }
  function renderConnections() {
    main.innerHTML =
      heading(
        "RELATIONSHIP INDEX / FOLLOW THE EVIDENCE",
        "Connect the source material.",
        "Explore the exact connections between research dossiers and their reading lists. Select a source, find where it appears, and follow the next useful question.",
      ) +
      '<div id="connections-host"></div>' +
      footer();
    connectionsController = window.GovINTConnections.mount(
      document.getElementById("connections-host"),
      D,
      { openSource, saveSource: toggleSave, isSaved, syncURL: true },
    );
  }
  function renderCasefiles() {
    window.GovINTCasefiles.mount(main, window.GOVINT_CASEFILES || [], {
      onCopy: copyText,
      onSaveNote(file) {
        const n = {
          id: crypto.randomUUID(),
          title: "Case file: " + file.title,
          text: [
            file.summary,
            "",
            ...file.sources.map((s) => s.title + " — " + s.url),
          ].join("\n"),
          sourceId: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        workspace.notes = [n, ...workspace.notes];
        persist();
        toast("Case file added to investigation notes.");
      },
    });
    main.insertAdjacentHTML("beforeend", footer());
  }
  const sourceState = {
    q: query.get("q") || "",
    category: query.get("category") || "",
    region: query.get("region") || "",
    publisher: query.get("publisher") || "",
    saved: query.get("saved") === "1",
    sort: query.get("sort") || "name",
    layout: query.get("layout") === "list" ? "list" : "grid",
    page: Math.max(1, parseInt(query.get("page") || "1", 10) || 1),
  };
  function searchMatches(s, q) {
    const hay = [
      s.name,
      s.summary,
      catName(s.category),
      s.region,
      regionName(s.region),
      s.publisherType,
      s.url,
      ...(s.recordTypes || []),
      ...(s.researchUses || []),
    ]
      .join(" ")
      .toLowerCase();
    return q
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .every((t) => hay.includes(t));
  }
  function filteredSources() {
    return D.sources
      .filter(
        (s) =>
          (!sourceState.category || s.category === sourceState.category) &&
          (!sourceState.region || s.region === sourceState.region) &&
          (!sourceState.publisher ||
            s.publisherType === sourceState.publisher) &&
          (!sourceState.saved || isSaved(s.id)) &&
          searchMatches(s, sourceState.q),
      )
      .sort((a, b) =>
        sourceState.sort === "category"
          ? catName(a.category).localeCompare(catName(b.category)) ||
            a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name),
      );
  }
  function sourceCard(s) {
    return `<article class="catalog-card"><div class="catalog-card-top"><span class="source-monogram">${esc(
      s.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    )}</span><span class="badge subtle">${esc(s.region)}</span></div><h3><button data-source="${s.id}" style="padding:0;text-align:left">${esc(s.name)}</button></h3><p class="description">${esc(s.summary)}</p><div class="meta"><span>${esc(s.publisherType)}</span><span>·</span><span>${esc(s.access)}</span></div><div class="catalog-card-actions"><button class="btn small ghost" data-source="${s.id}">Research notes ${icon("arrow")}</button>${ext(s.url, `Open ${icon("external")}`, "btn small")}${saveButton(s.id)}</div></article>`;
  }
  function renderSources() {
    main.innerHTML =
      heading(
        "DIRECTORY / 001",
        "The source behind the story.",
        "Search government records, independent research collections and official data portals. Every entry includes context, provenance and access notes.",
        `<button class="btn" id="export-sources">${icon("download")}Export results</button><button class="btn" id="share-filters">${icon("link")}Copy search link</button>`,
      ) +
      `
 <div class="filter-bar"><label class="search-field"><span class="sr-only">Search directory</span>${icon("search")}<input class="input" id="source-search" placeholder="Search sources, topics, agencies…" value="${esc(sourceState.q)}" type="search"></label><label><span class="sr-only">Research domain</span><select id="filter-category"><option value="">All research domains</option>${D.categories.map((c) => `<option value="${c.id}" ${sourceState.category === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label><label><span class="sr-only">Region</span><select id="filter-region"><option value="">All regions</option>${D.regions.map((r) => `<option value="${r.id}" ${sourceState.region === r.id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></label><label><span class="sr-only">Publisher class</span><select id="filter-publisher"><option value="">All publisher classes</option>${[...new Set(D.sources.map((s) => s.publisherType))].map((t) => `<option ${sourceState.publisher === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label></div>
 <div class="results-toolbar"><span id="result-count" role="status" aria-live="polite"></span><button class="btn small ghost" id="clear-filters">Reset filters</button><span class="spacer"></span><label class="check-label"><input id="filter-saved" type="checkbox" ${sourceState.saved ? "checked" : ""}>Saved only</label><label><span class="sr-only">Sort sources</span><select id="source-sort"><option value="name" ${sourceState.sort === "name" ? "selected" : ""}>Name A–Z</option><option value="category" ${sourceState.sort === "category" ? "selected" : ""}>Research domain</option></select></label><div class="view-toggle"><button data-layout="grid" aria-label="Card layout" aria-pressed="${sourceState.layout === "grid"}">${icon("grid")}</button><button data-layout="list" aria-label="List layout" aria-pressed="${sourceState.layout === "list"}">${icon("list")}</button></div></div><div id="catalog-results"></div><p class="catalog-note">CATALOGED ${D.catalogedAt} · Links are curated entry points. Most external availability has not been individually checked; some services require registration or have usage limits. Open research notes for details.</p>${footer()}`;
    document.getElementById("source-search").addEventListener("input", (e) => {
      sourceState.q = e.target.value;
      sourceState.page = 1;
      renderSourceResults();
    });
    ["category", "region", "publisher", "saved"].forEach((k) =>
      document.getElementById("filter-" + k).addEventListener("change", (e) => {
        sourceState[k] = k === "saved" ? e.target.checked : e.target.value;
        sourceState.page = 1;
        renderSourceResults();
      }),
    );
    document.getElementById("source-sort").onchange = (e) => {
      sourceState.sort = e.target.value;
      sourceState.page = 1;
      renderSourceResults();
    };
    document.getElementById("clear-filters").onclick = () => {
      Object.assign(sourceState, {
        q: "",
        category: "",
        region: "",
        publisher: "",
        saved: false,
        page: 1,
      });
      replaceSourceQuery();
      renderSources();
    };
    document.getElementById("share-filters").onclick = () =>
      copyText(location.href);
    document.getElementById("export-sources").onclick = () =>
      downloadJSON(
        {
          catalogedAt: D.catalogedAt,
          exportedAt: new Date().toISOString(),
          filters: { ...sourceState },
          sources: filteredSources(),
        },
        "govint-source-results.json",
      );
    document.querySelectorAll("[data-layout]").forEach(
      (b) =>
        (b.onclick = () => {
          sourceState.layout = b.dataset.layout;
          document
            .querySelectorAll("[data-layout]")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          renderSourceResults();
        }),
    );
    renderSourceResults();
  }
  function replaceSourceQuery() {
    const p = new URLSearchParams();
    for (const k of ["q", "category", "region", "publisher"])
      if (sourceState[k]) p.set(k, sourceState[k]);
    if (sourceState.saved) p.set("saved", "1");
    if (sourceState.sort !== "name") p.set("sort", sourceState.sort);
    if (sourceState.layout === "list") p.set("layout", "list");
    if (sourceState.page > 1) p.set("page", sourceState.page);
    history.replaceState(
      null,
      "",
      location.pathname + (p.size ? "?" + p : "") + location.hash,
    );
  }
  function renderSourceResults() {
    const list = filteredSources();
    const pages = Math.max(1, Math.ceil(list.length / 24));
    sourceState.page = Math.min(sourceState.page, pages);
    const first = (sourceState.page - 1) * 24;
    document.getElementById("result-count").textContent =
      `${count(list.length)} sources${list.length ? ` · ${first + 1}–${Math.min(first + 24, list.length)}` : ""}`;
    document.getElementById("catalog-results").innerHTML =
      `<div class="catalog-grid ${sourceState.layout}">${
        list.length
          ? list
              .slice(first, first + 24)
              .map(sourceCard)
              .join("")
          : empty(
              "No sources match this search.",
              "Try a broader topic or reset the filters. Saved-only results appear after you bookmark sources.",
            )
      }</div>${list.length ? `<div class="pagination"><button class="btn small" id="prev-page" ${sourceState.page === 1 ? "disabled" : ""}>← Previous</button><span>PAGE ${sourceState.page} / ${pages}</span><button class="btn small" id="next-page" ${sourceState.page === pages ? "disabled" : ""}>Next →</button></div>` : ""}`;
    document.getElementById("prev-page")?.addEventListener("click", () => {
      sourceState.page--;
      renderSourceResults();
      main.scrollIntoView({ block: "start" });
    });
    document.getElementById("next-page")?.addEventListener("click", () => {
      sourceState.page++;
      renderSourceResults();
      main.scrollIntoView({ block: "start" });
    });
    replaceSourceQuery();
  }
  function sourceProfile(s) {
    if (!s.recordTypes) return "";
    return `<section class="profile-section"><div class="eyebrow accent">${s.profileSpecific ? "SOURCE-SPECIFIC FIELD GUIDE" : "CATEGORY RESEARCH GUIDANCE"}</div><h3>What you can retrieve</h3><div class="profile-chips">${s.recordTypes.map((t) => `<span>${esc(t)}</span>`).join("")}</div><div class="source-profile-note"><p>${esc(s.searchHint)}</p></div></section><section class="profile-section"><h3>Capture the identifiers</h3><div class="profile-chips">${s.captureFields.map((t) => `<span>${esc(t)}</span>`).join("")}</div><h3 style="margin-top:22px">Research applications</h3><ul>${s.researchUses.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section><section class="profile-section"><h3>Cadence & evidence limits</h3><p>${esc(s.updateCadence)}</p><ul>${s.limitations.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>`;
  }
  function evidenceBrief(d) {
    return d.leadQuestion
      ? `<div class="evidence-brief"><div class="eyebrow">THE QUESTION TO ANSWER</div><h2>${esc(d.leadQuestion)}</h2><p><strong>Work product:</strong> ${esc(d.workProduct)}</p></div><div class="eyebrow accent" style="margin-bottom:12px">KEEP THESE IDENTIFIERS ATTACHED</div><div class="evidence-identifiers" style="margin-bottom:30px">${d.keyIdentifiers.map((x) => `<span>${esc(x)}</span>`).join("")}</div>`
      : "";
  }
  function evidencePlan(d) {
    if (!d.evidencePlan) return "";
    return `<h2 class="evidence-heading" id="evidence-plan">The source-by-source evidence plan</h2>${d.evidencePlan
      .map((step, i) => {
        const s = sourceById(step.sourceId);
        return `<article class="evidence-card"><div class="evidence-card-head"><span class="evidence-number">${String(i + 1).padStart(2, "0")}</span><div><h3><button data-source="${s.id}" style="text-align:left;padding:0">${esc(s.name)} ↗</button></h3><div class="record-type">${esc(step.recordType)}</div></div></div><dl><dt>RETRIEVE</dt><dd>${esc(step.retrieve)}</dd><dt>CAPTURE</dt><dd><div class="capture-tags">${step.capture.map((x) => `<span>${esc(x)}</span>`).join("")}</div></dd><dt>VALIDATE</dt><dd>${esc(step.validate)}</dd></dl><div class="evidence-limitation">EVIDENCE LIMIT / ${esc(step.limitation)}</div></article>`;
      })
      .join(
        "",
      )}<div class="evidence-deliverables"><h3>What to leave with</h3><ul>${d.deliverables.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><section class="questions" style="margin-bottom:26px"><h2>Analytical pitfalls</h2><ul>${d.pitfalls.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section><div class="evidence-related"><h3>Follow another connection</h3>${d.relatedDossiers
      .map((id) => {
        const next = D.dossiers.find((x) => x.id === id);
        return `<a class="related-link" href="dossiers.html?id=${id}">${esc(next.title)} ↗</a>`;
      })
      .join(
        "",
      )}<a class="btn" style="margin:15px 0 25px" href="connections.html?trail=${d.id}">${icon("connections")}Explore this source network</a></div>`;
  }

  function openSource(id) {
    const s = sourceById(id);
    if (!s) return;
    const dialog = document.getElementById("source-dialog");
    const related = D.dossiers.filter((d) => d.sources.includes(id));
    dialog.innerHTML = `<div class="dialog-head"><div><div class="eyebrow accent">${esc(catName(s.category))}</div><h2 id="source-dialog-title">${esc(s.name)}</h2></div><button class="icon-btn" data-close="source-dialog" aria-label="Close source details">${icon("close")}</button></div><div class="dialog-body"><p>${esc(s.summary)}</p><div class="source-url">${esc(s.url)}</div><dl class="meta-grid"><div><dt>PUBLISHER CLASS</dt><dd>${esc(s.publisherType)}</dd></div><div><dt>GEOGRAPHIC COVERAGE</dt><dd>${esc(regionName(s.region))}</dd></div><div><dt>ACCESS</dt><dd>${esc(s.access)}</dd></div><div><dt>CATALOGED</dt><dd>${s.catalogedAt}</dd></div><div><dt>EXTERNAL AVAILABILITY</dt><dd>${esc(s.availability)}</dd></div><div><dt>EVIDENCE NOTE</dt><dd>Evaluate the underlying record and its date.</dd></div></dl><div class="page-actions">${ext(s.url, `Open original source ${icon("external")}`, "btn primary")}${saveButton(s.id)}<button class="btn" data-copy-source="${s.id}">${icon("link")}Copy citation</button></div>${sourceProfile(s)}<h3>Use it in a research trail</h3>${related.length ? related.map((d) => `<a class="related-link" href="dossiers.html?id=${d.id}">${esc(d.title)} &nbsp; ↗</a>`).join("") : `<p>Capture the record identifier, publisher, publication date, access date and exact passage. Keep your inference separate from what the source states.</p>`}<p style="font-size:10px;margin:22px 0 0">Publisher class describes provenance, not guaranteed accuracy. Availability checks do not verify every document or function within a service.</p></div>`;
    if (!dialog.open) dialog.showModal();
  }
  function renderDossiers() {
    const id = query.get("id");
    const selected = D.dossiers.find((d) => d.id === id);
    if (id && !selected) {
      main.innerHTML =
        empty(
          "This dossier could not be found.",
          "Choose one of the research trails in the collection.",
          '<a class="btn primary" href="dossiers.html">View all dossiers</a>',
        ) + footer();
      return;
    }
    if (selected) {
      const d = selected;
      document.title = `${d.title} — GovINT`;
      main.innerHTML = `<article class="dossier-detail"><a class="back-link" href="dossiers.html">${icon("back")}ALL RESEARCH DOSSIERS</a><div class="dossier-detail-header"><div class="eyebrow accent">RESEARCH FILE / ${String(D.dossiers.indexOf(d) + 1).padStart(3, "0")} · ${esc(shortCat(d.category))}</div><h1>${esc(d.title)}</h1><p class="intro">${esc(d.intro)}</p><div class="data-status"><span class="badge subtle">EDITORIAL RESEARCH GUIDE</span><span class="eyebrow">${d.sources.length} LINKED SOURCES · ${d.readingMinutes} MIN READ</span><button class="btn small" data-save-trail="${d.id}">${icon("bookmark")}Save source pack</button><button class="btn small" id="copy-dossier">${icon("link")}Copy trail link</button></div></div><div class="dossier-detail-grid"><div>${evidenceBrief(d)}${d.steps.map((step, i) => `<section class="research-step"><div class="eyebrow">STEP ${String(i + 1).padStart(2, "0")}</div><h2>${esc(step.title)}</h2><p>${esc(step.text)}</p></section>`).join("")}${evidencePlan(d)}<section class="questions"><h2>Questions worth keeping open</h2><ul>${d.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ul></section>${d.legacy ? `<div class="notice" style="margin-top:22px">Related legacy background: <a href="${d.legacy}">read the original wiki entry</a>. Historical narrative is preserved separately and should be checked against the cited primary records.</div>` : ""}<p class="catalog-note">This guide describes a method. It does not claim that GovINT has completed the investigation or independently validated every record at the linked services.</p></div><aside class="reading-aside"><div class="panel"><div class="panel-head"><span class="eyebrow">BUILD YOUR EVIDENCE CHAIN</span></div>${d.sources.map((id) => sourceRow(sourceById(id))).join("")}</div><a class="btn" style="margin-top:15px;width:100%" href="investigations.html">${icon("workspace")}Open your investigation</a></aside></div></article>${footer()}`;
      document.getElementById("copy-dossier").onclick = () =>
        copyText(location.href);
      return;
    }
    main.innerHTML =
      heading(
        "DOSSIERS / FOLLOW A THREAD",
        "Every question has a paper trail.",
        "Go beyond a list of links. These guides connect primary records, research methods, unresolved questions and the evidence needed to support a conclusion.",
      ) +
      `<div class="results-toolbar"><span>${D.dossiers.length} EDITORIAL RESEARCH GUIDES</span><span class="spacer"></span><label><span class="sr-only">Filter dossier domain</span><select id="dossier-filter"><option value="">All domains</option>${[...new Set(D.dossiers.map((d) => d.category))].map((c) => `<option value="${c}">${esc(catName(c))}</option>`).join("")}</select></label></div><div class="dossier-grid" id="dossier-results">${D.dossiers.map(dossierCard).join("")}</div>${footer()}`;
    document.getElementById("dossier-filter").onchange = (e) => {
      document.getElementById("dossier-results").innerHTML = D.dossiers
        .filter((d) => !e.target.value || d.category === e.target.value)
        .map(dossierCard)
        .join("");
    };
  }
  let mapState;
  const azNodes = [
    {
      id: "az-state",
      name: "Arizona field desk",
      lon: -112.5,
      lat: 34.6,
      ids: () => D.sources.filter((s) => s.region === "AZ"),
    },
    {
      id: "az-phoenix",
      name: "Phoenix",
      lon: -112.074,
      lat: 33.448,
      ids: () =>
        D.sources.filter((s) =>
          [
            "city-of-phoenix",
            "maricopa-county",
            "arizona-legislature",
            "arizona-corporation-commission",
          ].includes(s.id),
        ),
    },
    {
      id: "az-tucson",
      name: "Tucson",
      lon: -110.974,
      lat: 32.222,
      ids: () =>
        D.sources.filter((s) =>
          [
            "city-of-tucson",
            "pima-county",
            "tucson-airport-authority",
          ].includes(s.id),
        ),
    },
    {
      id: "az-flagstaff",
      name: "Flagstaff",
      lon: -111.651,
      lat: 35.198,
      ids: () =>
        D.sources.filter((s) =>
          ["city-of-flagstaff", "coconino-county"].includes(s.id),
        ),
    },
    {
      id: "az-yuma",
      name: "Yuma County",
      lon: -114.627,
      lat: 32.692,
      ids: () => D.sources.filter((s) => s.id === "yuma-county"),
    },
    {
      id: "az-navajo",
      name: "Navajo Nation",
      lon: -109.1,
      lat: 36.4,
      ids: () => D.sources.filter((s) => s.id === "navajo-nation"),
    },
  ];
  const project = (lon, lat) => [
    ((lon + 180) * 1000) / 360,
    ((90 - lat) * 500) / 180,
  ];
  function geometryPath(g) {
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    let out = "";
    for (const polygon of polys)
      for (const ring of polygon) {
        let prev = null;
        let part = "";
        let split = false;
        for (const c of ring) {
          const p = project(c[0], c[1]);
          if (prev && Math.abs(c[0] - prev[0]) > 180) {
            part += " ";
            split = true;
            prev = null;
          }
          part += (prev ? "L" : "M") + p[0].toFixed(2) + "," + p[1].toFixed(2);
          prev = c;
        }
        out += part + (split ? "" : "Z");
      }
    return out;
  }
  const worldPaths = window.GOVINT_WORLD.map(
    (f) =>
      `<path d="${geometryPath(f.geometry)}"><title>${esc(f.name)}</title></path>`,
  ).join("");
  const statePaths = (window.GOVINT_STATES || [])
    .map(
      (f) =>
        `<path d="${geometryPath(f.geometry)}"><title>${esc(f.name)}</title></path>`,
    )
    .join("");
  function atlasSourceSet(node) {
    let items = node.ids
      ? node.ids()
      : D.sources.filter((s) => s.region === node.id);
    const c = document.getElementById("atlas-category")?.value;
    if (c) items = items.filter((s) => s.category === c);
    return items;
  }
  function setMapExtent(extent) {
    if (!mapState) return;
    const boxes = {
      world: [0, 5, 1000, 455],
      us: [155, 105, 225, 140],
      az: [179, 144, 28, 19],
    };
    mapState.extent = extent;
    mapState.base = boxes[extent].slice();
    mapState.box = boxes[extent].slice();
    document
      .querySelectorAll("[data-map-view]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.mapView === extent)),
      );
    document.getElementById("map-region-label").textContent = {
      world: "GLOBAL SOURCE COVERAGE",
      us: "UNITED STATES / RESEARCH COVERAGE",
      az: "ARIZONA / PUBLIC RECORDS DESK",
    }[extent];
    document.getElementById("map-land").innerHTML =
      `<g fill="#1e2e39" stroke="#526976" stroke-width=".55" stroke-linejoin="round">${worldPaths}</g>${extent !== "world" ? `<g fill="${extent === "az" ? "#172c32" : "none"}" stroke="#6b8286" stroke-width=".35">${statePaths}</g>` : ""}`;
    updateMapBox();
    drawMapMarkers();
  }
  function updateMapBox() {
    document
      .getElementById("atlas-svg")
      ?.setAttribute("viewBox", mapState.box.join(" "));
    drawMapMarkers();
  }
  function drawMapMarkers() {
    if (!mapState) return;
    const nodes = mapState.extent === "az" ? azNodes : D.regions;
    const scale = mapState.box[2] / 1000;
    const visible = nodes.filter((n) => atlasSourceSet(n).length > 0);
    document.getElementById("map-markers").innerHTML = visible
      .map((n) => {
        const [x, y] = project(n.lon, n.lat);
        const nSources = atlasSourceSet(n).length;
        const radius = (3 + Math.min(4, Math.sqrt(nSources) / 2)) * scale;
        const selected = mapState.selected === n.id;
        const showLabel =
          mapState.extent !== "world" ||
          ["US", "AZ", "UK", "BR", "AU", "JP", "IN", "Global"].includes(n.id);
        return `<g class="map-marker" data-map-region="${n.id}" role="button" tabindex="0" aria-label="${esc(n.name)}: ${nSources} sources" aria-pressed="${selected}"><title>${esc(n.name)} · ${nSources} sources</title><circle cx="${x}" cy="${y}" r="${radius * 2.3}" fill="#c4f76b" opacity=".07" stroke="none"/><circle cx="${x}" cy="${y}" r="${radius}" fill="${selected ? "#f1ffd8" : n.id === "AZ" ? "#d99aaf" : "#c4f76b"}" stroke="#0b1418" stroke-width="1.3"/>${showLabel ? `<text x="${x + radius + 5 * scale}" y="${y + 2.5 * scale}" style="font-size:${8 * scale}px;stroke-width:${2 * scale}px">${esc(mapState.extent === "az" ? n.name : n.id === "Global" ? "GLOBAL" : n.id)}</text>` : ""}</g>`;
      })
      .join("");
  }
  function selectMapRegion(id) {
    const node = [...D.regions, ...azNodes].find((r) => r.id === id);
    if (!node) return;
    const focusedMarker = document.activeElement?.closest("[data-map-region]");
    mapState.selected = id;
    drawMapMarkers();
    if (focusedMarker) {
      document
        .querySelector(`[data-map-region="${CSS.escape(id)}"]`)
        ?.focus({ preventScroll: true });
    }
    document.getElementById("map-coordinates").textContent =
      `${node.name.toUpperCase()} · ${Math.abs(node.lat).toFixed(1)}°${node.lat >= 0 ? "N" : "S"} / ${Math.abs(node.lon).toFixed(1)}°${node.lon >= 0 ? "E" : "W"} · REGIONAL REFERENCE`;
    if (!mapState.large) {
      location.href = "maps.html?region=" + encodeURIComponent(id);
      return;
    }
    const items = atlasSourceSet(node);
    document.getElementById("atlas-selection").innerHTML =
      `<div class="atlas-selection"><div class="eyebrow accent">RESEARCH COVERAGE</div><h2>${esc(node.name)}</h2><p>${items.length} source${items.length === 1 ? "" : "s"} in the selected research domain. Marker locations represent regions or public-government desks.</p><a class="btn small" href="sources.html?region=${id.startsWith("az-") ? "AZ" : id}${document.getElementById("atlas-category").value ? "&category=" + document.getElementById("atlas-category").value : ""}">Explore directory ${icon("arrow")}</a></div>${items.length ? items.slice(0, 30).map(sourceRow).join("") : empty("No sources in this domain.", "Choose a different research domain or regional marker.")}${items.length > 30 ? '<div class="panel-inner"><p class="eyebrow">First 30 sources shown. Open the directory for the full set.</p></div>' : ""}`;
    document
      .querySelectorAll("[data-region-quick]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.regionQuick === id)),
      );
  }
  function initMap(large) {
    const svg = document.getElementById("atlas-svg");
    mapState = {
      large,
      extent: "world",
      box: [0, 5, 1000, 455],
      base: [0, 5, 1000, 455],
      selected: null,
    };
    setMapExtent("world");
    let drag = null;
    let dragged = false;
    let dragEnded = 0;
    svg.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest(".map-marker")) return;
      drag = { x: e.clientX, y: e.clientY, box: mapState.box.slice() };
      dragged = false;
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
      const bounds = svg.getBoundingClientRect();
      const ratio = Math.max(
        drag.box[2] / bounds.width,
        drag.box[3] / bounds.height,
      );
      mapState.box = [
        drag.box[0] - dx * ratio,
        drag.box[1] - dy * ratio,
        drag.box[2],
        drag.box[3],
      ];
      svg.setAttribute("viewBox", mapState.box.join(" "));
    });
    const endDrag = () => {
      if (dragged) dragEnded = Date.now();
      drag = null;
    };
    svg.addEventListener("pointerup", endDrag);
    svg.addEventListener("pointercancel", endDrag);
    svg.addEventListener("click", (e) => {
      const node = e.target.closest("[data-map-region]");
      if (node && Date.now() - dragEnded > 250)
        selectMapRegion(node.dataset.mapRegion);
    });
    svg.addEventListener("keydown", (e) => {
      const marker = e.target.closest("[data-map-region]");
      if (marker && ["Enter", " "].includes(e.key)) {
        e.preventDefault();
        selectMapRegion(marker.dataset.mapRegion);
      } else if (["+", "=", "-", "0"].includes(e.key)) {
        e.preventDefault();
        zoomMap(e.key === "0" ? "reset" : e.key === "-" ? "out" : "in");
      }
    });
    svg.addEventListener(
      "wheel",
      (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        zoomMap(e.deltaY < 0 ? "in" : "out");
      },
      { passive: false },
    );
    document
      .querySelectorAll("[data-map-view]")
      .forEach((b) => (b.onclick = () => setMapExtent(b.dataset.mapView)));
    document
      .querySelectorAll("[data-map-zoom]")
      .forEach((b) => (b.onclick = () => zoomMap(b.dataset.mapZoom)));
    if (large) {
      document.getElementById("atlas-category").onchange = () => {
        drawMapMarkers();
        if (mapState.selected) selectMapRegion(mapState.selected);
      };
      document.querySelectorAll("[data-region-quick]").forEach(
        (b) =>
          (b.onclick = () => {
            if (b.dataset.regionQuick === "AZ") setMapExtent("az");
            else setMapExtent("world");
            selectMapRegion(b.dataset.regionQuick);
          }),
      );
      const r = query.get("region");
      if (r) {
        if (r === "AZ" || r.startsWith("az-")) setMapExtent("az");
        selectMapRegion(r);
      }
    }
  }
  function zoomMap(direction) {
    if (!mapState) return;
    if (direction === "reset") {
      setMapExtent(mapState.extent);
      return;
    }
    const b = mapState.box;
    const ratio = direction === "in" ? 0.75 : 1.333333;
    const w = Math.max(2, Math.min(2000, b[2] * ratio));
    const h = (w * b[3]) / b[2];
    mapState.box = [b[0] + (b[2] - w) / 2, b[1] + (b[3] - h) / 2, w, h];
    updateMapBox();
  }
  function renderAtlas() {
    main.innerHTML =
      heading(
        "ATLAS / PUBLIC SOURCE COVERAGE",
        "A world of open records.",
        "Explore research collections by geography. Select a marker to inspect sources, switch to the Arizona desk, or filter by research domain.",
      ) +
      `<div class="results-toolbar"><span class="badge">NO API KEY REQUIRED</span><span class="muted">Bundled map · drag to pan · buttons or Ctrl + scroll to zoom</span><span class="spacer"></span><label><span class="sr-only">Map research domain</span><select id="atlas-category" style="width:210px"><option value="">All research domains</option>${D.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label></div><div class="atlas-layout">${mapPanel(true)}<aside class="panel atlas-aside" id="atlas-selection"><div class="atlas-selection"><div class="eyebrow accent">CHOOSE A REGIONAL MARKER</div><h2>Start anywhere.<br>Follow the record.</h2><p>The atlas maps source coverage. It is a geographic index of research portals, not a display of active incidents.</p><p>Select a marker with your mouse or use Tab and Enter. The list below the map provides another way to choose a region.</p></div><div class="panel-inner"><div class="eyebrow">${D.regions.length} REGIONAL COLLECTIONS</div><p style="font-size:11px;margin-top:12px">Global institutions are grouped separately. Arizona includes local-government reference points.</p></div></aside></div><div class="region-buttons" aria-label="Choose a source region">${D.regions.map((r) => `<button data-region-quick="${r.id}" aria-pressed="false">${esc(r.name)} <span class="muted">${D.sources.filter((s) => s.region === r.id).length}</span></button>`).join("")}</div><p class="catalog-note">BOUNDARY NOTE · Small-scale Natural Earth geometry is approximate and intended for reference. Marker positions represent broad coverage or public-government desks. No third-party tiles, geolocation permission or API credentials are required.</p>${footer()}`;
    initMap(true);
  }
  function freshness(f) {
    if (!f.fetchedAt)
      return {
        text: "Collection date unavailable",
        age: null,
        label: "UNDATED DATASET",
      };
    const d = new Date(f.fetchedAt);
    if (Number.isNaN(d.getTime()))
      return {
        text: "Collection date unavailable",
        age: null,
        label: "UNDATED DATASET",
      };
    const age = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
    return {
      text: `${d.toISOString().slice(0, 10)} · ${age} days since collection`,
      age,
      label: age > 7 ? "HISTORICAL SNAPSHOT" : "RECENT SNAPSHOT",
    };
  }
  function renderFeeds() {
    main.innerHTML =
      heading(
        "SIGNALS / INSPECT THE COLLECTION",
        "The date is part of the evidence.",
        "Explore stored public-source feed snapshots. Collection time, original publication dates and missing data stay visible.",
      ) +
      `<div class="notice">These are repository snapshots, not a live monitoring feed. A collected item has not been independently verified by GovINT. Use the original publisher for current information.</div><div class="feed-layout"><aside class="panel feed-list" aria-label="Select a stored feed">${D.feeds.map((f) => `<button class="feed-choice" data-feed="${f.id}" aria-pressed="false">${esc(f.title)}<span>${f.shape === "items" ? `${f.itemCount} STORED ITEMS` : f.recordCount != null ? `${count(f.recordCount)} DATASET RECORDS` : "STRUCTURED DATASET"}</span></button>`).join("")}</aside><section class="panel" id="feed-content" aria-live="polite"></section></div>${footer()}`;
    document
      .querySelectorAll("[data-feed]")
      .forEach((b) => (b.onclick = () => showFeed(b.dataset.feed)));
    showFeed(query.get("feed") || "cisa_advisories");
  }
  function showFeed(id) {
    const f = D.feeds.find((x) => x.id === id) || D.feeds[0];
    const status = freshness(f);
    document
      .querySelectorAll("[data-feed]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.feed === f.id)),
      );
    history.replaceState(
      null,
      "",
      location.pathname + "?feed=" + encodeURIComponent(f.id),
    );
    document.getElementById("feed-content").innerHTML =
      `<div class="feed-summary"><h2>${esc(f.title)}</h2><div class="meta">COLLECTED ${esc(status.text)}</div><div class="data-status"><span class="badge amber">${status.label}</span><a class="btn small" href="${f.path}" target="_blank" rel="noopener">View stored JSON ${icon("external")}</a><a class="btn small" href="archive.html?feed=${f.id}">${icon("archive")}Previous snapshots</a></div></div>${f.shape !== "items" ? `<div class="panel-inner"><h3>Structured reference dataset</h3><p style="font-size:12px">This file stores structured records rather than a news-item list${f.recordCount != null ? ` (${count(f.recordCount)} reported records)` : ""}. Inspect the stored JSON for the source metadata and field definitions. ${f.fetchedAt ? "Collection time does not establish the age of every underlying record." : "The collection date is absent from this dataset; freshness cannot be established."}</p></div>` : f.items.length ? f.items.map((item) => `<article class="feed-article"><div class="meta">PUBLISHED ${esc(item.published || "date not supplied")} · STORED SNAPSHOT</div><h3>${ext(item.url, esc(plain(item.title)))}</h3>${item.summary ? `<p>${esc(plain(item.summary)).slice(0, 1800)}</p>` : ""}${ext(item.url, `Open original publication ${icon("external")}`, "btn small")}</article>`).join("") : empty("No items were collected.", "An empty stored feed does not establish that no events occurred. Check the publisher and collection process before drawing a conclusion.", '<a class="btn" href="sources.html">Find original publishers</a>')}`;
  }
  let archiveState = {
    date: query.get("date") || "",
    feed: query.get("feed") || "",
    page: 1,
  };
  function renderArchive() {
    const feeds = [...new Set(D.archives.map((a) => a.feed))];
    main.innerHTML =
      heading(
        "ARCHIVE / PRESERVED SNAPSHOTS",
        "Go back to the source.",
        "Browse the actual dated files preserved in the repository. Compare collection days, inspect the raw JSON and keep a copy of the evidence.",
        `<button class="btn" id="archive-export">${icon("download")}Export index</button>`,
      ) +
      `<div class="stats">${[
        [D.archives.length, "SNAPSHOT FILES"],
        [archiveDates.length, "COLLECTION DAYS"],
        [feeds.length, "ARCHIVED FEEDS"],
        [archiveDates.at(-1), "EARLIEST COLLECTION"],
      ]
        .map(
          ([n, t]) =>
            `<div class="stat"><div class="stat-top">${t}</div><strong style="font-size:${typeof n === "string" ? 20 : 30}px">${count(n) === "NaN" ? n : count(n)}</strong></div>`,
        )
        .join(
          "",
        )}</div><div class="filter-bar" style="grid-template-columns:1fr 1fr"><label><span class="sr-only">Collection date</span><select id="archive-date"><option value="">All collection dates</option>${archiveDates.map((d) => `<option ${d === archiveState.date ? "selected" : ""}>${d}</option>`).join("")}</select></label><label><span class="sr-only">Archived feed</span><select id="archive-feed"><option value="">All archived feeds</option>${feeds
        .sort()
        .map(
          (f) =>
            `<option value="${f}" ${f === archiveState.feed ? "selected" : ""}>${esc(f.replaceAll("_", " "))}</option>`,
        )
        .join(
          "",
        )}</select></label></div><div id="archive-results" aria-live="polite"></div><p class="catalog-note">A dated directory records when a file was archived. Read each file’s internal collection and publication metadata before assigning an event date. Identical snapshots can occur on different days.</p>${footer()}`;
    document.getElementById("archive-date").onchange = (e) => {
      archiveState.date = e.target.value;
      archiveState.page = 1;
      renderArchiveResults();
    };
    document.getElementById("archive-feed").onchange = (e) => {
      archiveState.feed = e.target.value;
      archiveState.page = 1;
      renderArchiveResults();
    };
    document.getElementById("archive-export").onclick = () =>
      downloadJSON(
        {
          note: "Archive directory dates are collection snapshots, not event dates.",
          files: archiveItems(),
        },
        "govint-archive-index.json",
      );
    renderArchiveResults();
  }
  function archiveItems() {
    return D.archives.filter(
      (a) =>
        (!archiveState.date || a.date === archiveState.date) &&
        (!archiveState.feed || a.feed === archiveState.feed),
    );
  }
  function renderArchiveResults() {
    const files = archiveItems();
    const pages = Math.max(1, Math.ceil(files.length / 30));
    archiveState.page = Math.min(pages, archiveState.page);
    const q = new URLSearchParams();
    if (archiveState.date) q.set("date", archiveState.date);
    if (archiveState.feed) q.set("feed", archiveState.feed);
    history.replaceState(null, "", location.pathname + (q.size ? "?" + q : ""));
    document.getElementById("archive-results").innerHTML =
      `<div class="results-toolbar">${files.length} FILES MATCH · PAGE ${archiveState.page} / ${pages}</div>${
        files.length
          ? `<div class="table-wrap"><table><thead><tr><th>COLLECTION DAY</th><th>DATASET</th><th>FILE SIZE</th><th>ORIGINAL FILE</th></tr></thead><tbody>${files
              .slice((archiveState.page - 1) * 30, archiveState.page * 30)
              .map(
                (a) =>
                  `<tr><td>${a.date}</td><td>${esc(a.feed.replaceAll("_", " "))}</td><td>${(a.bytes / 1024).toFixed(1)} KB</td><td><a href="${a.path}" target="_blank" rel="noopener">View JSON ↗</a> &nbsp; <a href="${a.path}" download aria-label="Download ${esc(a.feed)} ${a.date}">↓ Download</a></td></tr>`,
              )
              .join(
                "",
              )}</tbody></table></div><div class="pagination"><button class="btn small" id="archive-prev" ${archiveState.page === 1 ? "disabled" : ""}>← Previous</button><span>${archiveState.page} / ${pages}</span><button class="btn small" id="archive-next" ${archiveState.page === pages ? "disabled" : ""}>Next →</button></div>`
          : empty(
              "No snapshots match.",
              "Choose another feed or collection date.",
            )
      }`;
    document.getElementById("archive-prev")?.addEventListener("click", () => {
      archiveState.page--;
      renderArchiveResults();
    });
    document.getElementById("archive-next")?.addEventListener("click", () => {
      archiveState.page++;
      renderArchiveResults();
    });
  }
  let pendingImport = null;
  function renderWorkspace() {
    main.innerHTML =
      heading(
        "WORKSPACE / LOCAL INVESTIGATIONS",
        "Keep the thread. Build the case.",
        "Save useful sources, write research notes and export a portable investigation file. Your workspace stays in this browser.",
        `<button class="btn" id="export-workspace">${icon("download")}Export workspace</button><label class="btn import-label">${icon("upload")}Import JSON<input type="file" id="import-workspace" accept="application/json,.json" aria-label="Import a workspace JSON file"></label>`,
      ) +
      `${storageAvailable ? "" : '<div class="notice">Browser storage is unavailable. Your current session works, but you must export your workspace to retain it.</div>'}<div class="workspace-grid"><div><div class="section-title"><h2>${icon("bookmark")}Saved sources <span class="muted" data-saved-count>${workspace.saved.length}</span></h2><a href="sources.html">Find more sources ↗</a></div><div id="workspace-saved"></div><div class="section-title" style="margin-top:29px"><h2>${icon("dossiers")}Research notes</h2><span class="eyebrow" id="note-count"></span></div><div id="workspace-notes"></div></div><aside class="workspace-aside"><div class="panel"><div class="panel-head"><span class="eyebrow" id="note-form-title">NEW RESEARCH NOTE</span></div><form class="panel-inner note-form" id="note-form"><input type="hidden" id="note-id"><label for="note-title">NOTE TITLE</label><input class="input" id="note-title" placeholder="What are you investigating?" maxlength="200" required><label for="note-source">LINKED SOURCE (OPTIONAL)</label><select id="note-source"><option value="">No source selected</option>${D.sources.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select><label for="note-text" style="margin-top:16px">EVIDENCE, QUESTIONS & NEXT STEPS</label><textarea id="note-text" placeholder="Record the document ID, date, exact passage and what still needs checking…" maxlength="20000" required></textarea><div class="page-actions"><button class="btn primary" type="submit">${icon("plus")}Save note</button><button class="btn" type="button" id="cancel-note" hidden>Cancel edit</button></div></form></div><div class="panel"><div class="panel-inner"><div class="eyebrow accent">A PORTABLE PAPER TRAIL</div><p style="margin-top:11px">Saved sources and notes are stored locally. They are not sent to a server or synchronized across devices.</p><p style="margin-bottom:0">Export regularly. Importing a workspace replaces the local copy only after you confirm the file details.</p></div></div></aside></div>${footer()}`;
    renderWorkspaceSaved();
    renderWorkspaceNotes();
    document.getElementById("note-form").onsubmit = (e) => {
      e.preventDefault();
      const title = document.getElementById("note-title").value.trim(),
        text = document.getElementById("note-text").value.trim();
      if (!title || !text) {
        toast("Add a title and note text.");
        return;
      }
      const existing = workspace.notes.find(
        (n) => n.id === document.getElementById("note-id").value,
      );
      const note = {
        id: existing?.id || crypto.randomUUID(),
        title,
        text,
        sourceId: document.getElementById("note-source").value,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      workspace.notes = existing
        ? workspace.notes.map((n) => (n.id === note.id ? note : n))
        : [note, ...workspace.notes];
      persist();
      renderWorkspaceNotes();
      resetNoteForm();
      toast("Research note saved.");
    };
    document.getElementById("cancel-note").onclick = resetNoteForm;
    document.getElementById("export-workspace").onclick = () =>
      downloadJSON(
        {
          ...workspace,
          exportedAt: new Date().toISOString(),
          savedSources: workspace.saved.map(sourceById),
        },
        "govint-investigation.json",
      );
    document.getElementById("import-workspace").onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        if (file.size > 2000000)
          throw new Error("Choose a workspace file smaller than 2 MB.");
        const data = JSON.parse(await file.text());
        if (
          !data ||
          typeof data !== "object" ||
          data.version !== 2 ||
          !Array.isArray(data.saved) ||
          !Array.isArray(data.notes)
        )
          throw new Error("This is not a GovINT v2 workspace file.");
        if (data.saved.length > 2000 || data.notes.length > 1000)
          throw new Error("This file exceeds the workspace import limits.");
        if (
          !data.saved.every((id) => typeof id === "string") ||
          !data.notes.every(
            (n) =>
              n &&
              typeof n.id === "string" &&
              typeof n.title === "string" &&
              typeof n.text === "string" &&
              n.title.length <= 200 &&
              n.text.length <= 20000,
          )
        )
          throw new Error(
            "The workspace contains invalid notes or source identifiers.",
          );
        const now = new Date().toISOString();
        pendingImport = {
          version: 2,
          saved: [...new Set(data.saved.filter(sourceById))],
          notes: [
            ...new Map(
              data.notes.map((n) => [
                n.id,
                {
                  id: n.id.slice(0, 100),
                  title: n.title,
                  text: n.text,
                  sourceId: sourceById(n.sourceId) ? n.sourceId : "",
                  createdAt: Number.isNaN(Date.parse(n.createdAt))
                    ? now
                    : new Date(n.createdAt).toISOString(),
                  updatedAt: Number.isNaN(Date.parse(n.updatedAt))
                    ? now
                    : new Date(n.updatedAt).toISOString(),
                },
              ]),
            ).values(),
          ],
        };
        document.getElementById("confirm-message").textContent =
          `“${file.name}” contains ${pendingImport.saved.length} recognized sources and ${pendingImport.notes.length} notes. Replacing will remove the current ${workspace.saved.length} saved sources and ${workspace.notes.length} notes. Export your current workspace first if you want to keep both.`;
        document.getElementById("confirm-dialog").showModal();
      } catch (err) {
        toast(
          err instanceof SyntaxError
            ? "This file is not valid JSON."
            : err.message,
        );
      } finally {
        e.target.value = "";
      }
    };
  }
  function renderWorkspaceSaved() {
    const el = document.getElementById("workspace-saved");
    if (!el) return;
    el.innerHTML = workspace.saved.length
      ? `<div class="panel">${workspace.saved.map((id) => sourceRow(sourceById(id))).join("")}</div>`
      : empty(
          "Your first lead starts here.",
          "Save sources from the directory, atlas or dossier reading lists. They will appear in this investigation workspace.",
          '<a class="btn primary" href="sources.html">Explore the source directory →</a>',
        );
    refreshSaved();
  }
  function renderWorkspaceNotes() {
    document.getElementById("note-count").textContent =
      `${workspace.notes.length} NOTES`;
    document.getElementById("workspace-notes").innerHTML = workspace.notes
      .length
      ? workspace.notes
          .map(
            (n) =>
              `<article class="note"><div class="note-head"><h3>${esc(n.title)}</h3><div class="page-actions"><button class="icon-btn" data-edit-note="${esc(n.id)}" aria-label="Edit note ${esc(n.title)}">${icon("dossiers")}</button><button class="icon-btn" data-delete-note="${esc(n.id)}" aria-label="Delete note ${esc(n.title)}">${icon("trash")}</button></div></div><div class="meta">${esc(n.updatedAt?.slice(0, 10) || "UNDATED")} ${n.sourceId && sourceById(n.sourceId) ? `· <button data-source="${esc(n.sourceId)}" style="font:inherit;color:var(--green);padding:0">${esc(sourceById(n.sourceId).name)}</button>` : ""}</div><p style="margin:12px 0 0">${esc(n.text)}</p></article>`,
          )
          .join("")
      : empty(
          "Keep questions alongside the evidence.",
          "Add a note with a document identifier, a source passage, an alternative explanation or the next research step.",
        );
  }
  function resetNoteForm() {
    document.getElementById("note-form").reset();
    document.getElementById("note-id").value = "";
    document.getElementById("note-form-title").textContent =
      "NEW RESEARCH NOTE";
    document.getElementById("cancel-note").hidden = true;
  }
  function editNote(id) {
    const n = workspace.notes.find((n) => n.id === id);
    if (!n) return;
    document.getElementById("note-id").value = n.id;
    document.getElementById("note-title").value = n.title;
    document.getElementById("note-text").value = n.text;
    document.getElementById("note-source").value = n.sourceId || "";
    document.getElementById("note-form-title").textContent =
      "EDIT RESEARCH NOTE";
    document.getElementById("cancel-note").hidden = false;
    document.getElementById("note-title").focus();
    document.getElementById("note-form").scrollIntoView({ block: "center" });
  }
  function renderMethodology() {
    main.innerHTML =
      heading(
        "METHODS / CONTEXT BEFORE CONCLUSIONS",
        "Show your sources. Keep your doubts.",
        "GovINT is an independent directory and research workspace for publicly available records. These are the rules behind the console.",
      ) +
      `<div class="method-grid">${[
        [
          "01 / PROVENANCE",
          "Know who published it.",
          "Government and institutional records are distinguished from independent research and reference collections. A publisher class is not a truth score.",
        ],
        [
          "02 / TIME",
          "Keep every date visible.",
          "Document creation, publication, release and collection dates answer different questions. Stored feeds are labeled according to collection age.",
        ],
        [
          "03 / UNCERTAINTY",
          "Separate fact from inference.",
          "Record what the source says, what it supports and what remains unproven. Repeated copies of one source do not create independent corroboration.",
        ],
      ]
        .map(
          ([e, t, p]) =>
            `<div class="method-card"><div class="eyebrow">${e}</div><h3>${t}</h3><p>${p}</p></div>`,
        )
        .join(
          "",
        )}</div><article class="prose"><h2>What is in the catalog?</h2><p>The bundled directory contains ${D.sources.length} distinct source URLs across ${D.categories.length} research domains. The state portals cover all 50 U.S. states; Arizona is counted once in its dedicated field desk. Sources include government publishers, international bodies, academic collections and independent research services. Entries describe a useful starting point rather than mirroring all of its records.</p><p>Catalog date: <strong>${D.catalogedAt}</strong>. Individual source details distinguish checked entry points from those whose availability has not been individually tested. Some services require an account, paid access, API credentials or acceptance of their terms for specific functions. The GovINT console itself requires none of these.</p><h2>Read a record before scoring a claim.</h2><p>Earlier wiki entries may use a numerical reliability scale. The console uses publisher classes and explicit evidence notes instead of treating official publication as proof. A government announcement may report an allegation; an archival document may record a mistaken assessment; a dataset may have limited coverage.</p><ol><li>Preserve the publisher, stable identifier and relevant date.</li><li>Capture the exact passage, table or observation that supports the claim.</li><li>Read definitions, scope, missing pages, redactions and revisions.</li><li>Look for independent corroboration and plausible alternative explanations.</li><li>State what the evidence does and does not establish.</li></ol><h2>The map is an index, not a sensor.</h2><p>The atlas uses locally bundled, public-domain <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a> country and U.S. state geometry at 1:110 million scale. Regional markers represent source coverage or public-government research desks. They do not represent active incidents, collection locations or live operational information. Borders are approximate cartographic reference data.</p><p>The map works without an API key, third-party tile server or geolocation access. Use the World, U.S. and Arizona controls, drag to pan, and use zoom buttons or Ctrl + scroll. Every region is also available as a labeled button below the full map.</p><h2>Stored feeds and archive limits</h2><p>Feed files retain their original collection metadata. A snapshot collected more than seven days ago is labeled historical; an absent timestamp is labeled undated. An empty item list means that the stored collector returned no items. It does not establish the absence of events.</p><p>The archive includes ${D.archives.length} files from ${archiveDates.length} dated directories. Folder dates are snapshot dates, and files may repeat. The console does not claim ${D.archives.length} distinct events or validated reports. Read the raw JSON before using a stored item as evidence.</p><h2>Your workspace and privacy</h2><p>Saved sources and notes live in browser local storage under <code>govint.workspace.v2</code>. No account, analytics, remote note storage or automatic synchronization is used. Clearing browser storage removes this local workspace. Export a JSON copy to retain or move it. Imports are validated before a replacement is offered.</p><h2>A citation you can retrace</h2><div class="panel panel-inner"><p style="font-family:var(--mono);font-size:11px;margin:0">Publisher. “Document title.” Record identifier. Created / published / released date as applicable. Exact page or table. Original URL. Accessed date. Notes on revisions and limitations.</p></div><h2>Explore the underlying files</h2><p><a href="data/source-catalog.json">Full source catalog (JSON)</a> · <a href="archive.html">Dated snapshot browser</a> · <a href="feeds.html">Stored feed inspector</a> · <a href="docs/map-data.md">Map provenance</a> · <a href="https://github.com/Personfu/GovINT" target="_blank" rel="noopener noreferrer">Project repository</a></p></article>${footer()}`;
  }
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("JSON export downloaded.");
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied to clipboard.");
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      toast(
        ok
          ? "Copied to clipboard."
          : "Copy was blocked by this browser. Copy the page address manually.",
      );
    }
  }
  function openSearch() {
    const dialog = document.getElementById("search-dialog");
    if (!dialog.open) dialog.showModal();
    document.getElementById("global-search").focus();
    renderSearch(document.getElementById("global-search").value);
  }
  function renderSearch(q) {
    const target = document.getElementById("command-results");
    if (!q.trim()) {
      target.innerHTML = `<div class="eyebrow" style="padding:10px 12px">GO TO A RESEARCH DESK</div>${[
        ["archives", "Declassified records"],
        ["money", "Follow the money"],
        ["arizona", "Arizona field desk"],
        ["cyber", "Cyber intelligence"],
      ]
        .map(
          ([id, t]) =>
            `<a class="command-result" href="sources.html?category=${id}">${icon("sources")}<div>${t}<small>SOURCE COLLECTION</small></div></a>`,
        )
        .join("")}`;
      return;
    }
    const sources = D.sources.filter((s) => searchMatches(s, q)).slice(0, 8);
    const dossiers = D.dossiers
      .filter((d) =>
        (d.title + " " + d.subtitle + " " + d.intro)
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
      .slice(0, 4);
    target.innerHTML =
      sources.length || dossiers.length
        ? `${dossiers.map((d) => `<a class="command-result" href="dossiers.html?id=${d.id}">${icon("dossiers")}<div>${esc(d.title)}<small>RESEARCH DOSSIER · ${d.sources.length} SOURCES</small></div></a>`).join("")}${sources.map((s) => `<button class="command-result" data-search-source="${s.id}">${icon("sources")}<div>${esc(s.name)}<small>${esc(catName(s.category))} · ${esc(s.region)}</small></div></button>`).join("")}<a class="command-result" href="sources.html?q=${encodeURIComponent(q)}">${icon("arrow")}View all directory matches</a>`
        : empty(
            "No matches yet.",
            "Try an agency name, a country or a broader research topic.",
          );
  }
  document.addEventListener("click", (e) => {
    const save = e.target.closest("[data-save]");
    if (save) {
      e.preventDefault();
      toggleSave(save.dataset.save);
      return;
    }
    const source = e.target.closest("[data-source]");
    if (source) {
      e.preventDefault();
      openSource(source.dataset.source);
      return;
    }
    const close = e.target.closest("[data-close]");
    if (close) {
      document.getElementById(close.dataset.close)?.close();
      return;
    }
    const searchSource = e.target.closest("[data-search-source]");
    if (searchSource) {
      document.getElementById("search-dialog").close();
      openSource(searchSource.dataset.searchSource);
      return;
    }
    const citation = e.target.closest("[data-copy-source]");
    if (citation) {
      const s = sourceById(citation.dataset.copySource);
      copyText(
        `${s.name}. ${s.url} Source entry point cataloged ${s.catalogedAt}. Citation copied ${new Date().toISOString().slice(0, 10)}. GovINT catalog note: ${s.summary}`,
      );
      return;
    }
    const trail = e.target.closest("[data-save-trail]");
    if (trail) {
      const d = D.dossiers.find((d) => d.id === trail.dataset.saveTrail);
      workspace.saved = [...new Set([...workspace.saved, ...d.sources])];
      persist();
      refreshSaved();
      toast(`${d.sources.length} dossier sources saved to investigations.`);
      return;
    }
    const edit = e.target.closest("[data-edit-note]");
    if (edit) {
      editNote(edit.dataset.editNote);
      return;
    }
    const del = e.target.closest("[data-delete-note]");
    if (del) {
      const n = workspace.notes.find((n) => n.id === del.dataset.deleteNote);
      workspace.notes = workspace.notes.filter(
        (n) => n.id !== del.dataset.deleteNote,
      );
      persist();
      renderWorkspaceNotes();
      if (document.getElementById("note-id")?.value === n?.id) resetNoteForm();
      toast("Research note deleted.");
      return;
    }
    if (
      document.getElementById("sidebar").classList.contains("open") &&
      !e.target.closest(".sidebar") &&
      !e.target.closest("#mobile-menu")
    ) {
      document.getElementById("sidebar").classList.remove("open");
      document
        .getElementById("mobile-menu")
        .setAttribute("aria-expanded", "false");
    }
  });
  document.getElementById("confirm-import").onclick = () => {
    if (!pendingImport) return;
    workspace = pendingImport;
    pendingImport = null;
    persist();
    document.getElementById("confirm-dialog").close();
    renderWorkspace();
    refreshSaved();
    toast("Workspace imported.");
  };
  document.getElementById("open-search").onclick = openSearch;
  document.getElementById("global-search").oninput = (e) =>
    renderSearch(e.target.value);
  document.getElementById("mobile-menu").onclick = () => {
    const opened = document.getElementById("sidebar").classList.toggle("open");
    document
      .getElementById("mobile-menu")
      .setAttribute("aria-expanded", String(opened));
  };
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openSearch();
    }
    if (e.key === "Escape") {
      document.getElementById("sidebar").classList.remove("open");
      document
        .getElementById("mobile-menu")
        .setAttribute("aria-expanded", "false");
    }
  });
  document.querySelectorAll("dialog").forEach((d) =>
    d.addEventListener("click", (e) => {
      if (e.target === d) {
        const r = d.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          d.close();
      }
    }),
  );
  const DESKS = {
    arizona: {
      title: "The Arizona field desk.",
      subtitle:
        "A state-sized paper trail: public spending, water policy, county decisions, local records and the agencies behind them.",
      category: "arizona",
      trails: ["arizona-records", "water-power", "environmental-justice"],
      legacy: [
        "az-history",
        "water-politics",
        "tribal-governance",
        "az-corruption",
        "az-mining",
        "az-election-security",
      ],
      questions: [
        "Start with the decision-making body: state agency, county board, city council or tribal government.",
        "Locate the agenda packet, minutes and adopted decision before interpreting a summary.",
        "Compare the decision date with the effective date and any later amendment.",
      ],
    },
    cyber: {
      title: "Evidence before attribution.",
      subtitle:
        "Official advisories, vulnerability records and defensive references, with a method for keeping observed behavior separate from inference.",
      category: "cyber",
      trails: ["cyber-attribution", "oversight"],
      legacy: ["arizona-cyber", "az-ics-scada", "az-election-security"],
      questions: [
        "Preserve the advisory identifier, original author and revision history.",
        "A vulnerability listing does not establish exploitation of a particular system.",
        "Keep an attribution statement at the confidence and scope used by the publisher.",
      ],
    },
    government: {
      title: "Inside the public record.",
      subtitle:
        "Find the agency, docket, statute, rule and supporting analysis behind an official decision.",
      category: "government",
      trails: ["rulemaking", "oversight", "arizona-records"],
      legacy: ["tribal-governance", "az-history"],
      questions: [
        "Identify which institution has authority over the question.",
        "Separate proposed policy, adopted text and effective implementation.",
        "Follow stable docket and document identifiers through each revision.",
      ],
    },
    defense: {
      title: "Read the strategy. Trace the budget.",
      subtitle:
        "Public defense strategy, congressional research, budget justification and historical records in one research desk.",
      category: "defense",
      trails: ["defense-budget", "paper-trail", "uap-record"],
      legacy: [
        "az-cold-war",
        "fort-huachuca",
        "davis-monthan",
        "barry-goldwater-range",
      ],
      questions: [
        "Distinguish a strategy statement from an authorized or funded program.",
        "Compare requested, enacted, obligated and spent amounts using the correct fiscal year.",
        "Use dated public records and clearly label historical context.",
      ],
    },
    borders: {
      title: "Border context, with definitions.",
      subtitle:
        "Research published trade, crossing and enforcement statistics. Keep counts, coverage and reporting periods explicit.",
      category: "transport",
      trails: ["border-context", "global-numbers"],
      legacy: ["az-border-history", "border-tech"],
      questions: [
        "Encounters, distinct individuals, vehicle crossings and wait times are different measures.",
        "Use the original dataset methodology and note reporting changes.",
        "Compare equivalent periods and preserve later revisions.",
      ],
    },
    infrastructure: {
      title: "The systems behind everyday life.",
      subtitle:
        "Energy, public utilities, regulatory dockets, communications and environmental records for infrastructure-policy research.",
      category: "energy",
      trails: ["water-power", "environmental-justice", "contract-chain"],
      legacy: ["water-politics", "az-mining", "palo-verde"],
      questions: [
        "Start with public regulatory dockets and published system-level reports.",
        "Distinguish installed capacity, actual output, consumption and modeled projections.",
        "Read the assumptions and period behind any resilience assessment.",
      ],
    },
    aviation: {
      title: "Transport leaves a data trail.",
      subtitle:
        "Aviation safety investigations, transport statistics and official traveler information without fragile third-party embeds.",
      category: "transport",
      trails: ["border-context", "contract-chain"],
      legacy: ["davis-monthan", "az-border-history"],
      questions: [
        "Check the update time at the original publisher for current operating conditions.",
        "An investigation docket may contain preliminary material that differs from the final finding.",
        "Preserve the incident identifier, dataset coverage and revision date.",
      ],
    },
    cameras: {
      title: "Go straight to the official view.",
      subtitle:
        "Public traffic and traveler-information entry points. Open the publisher’s own interface for its current imagery, access terms and update times.",
      sources: [
        "az511",
        "arizona-adot",
        "faa-nas-status",
        "cbp-border-wait-times",
        "bureau-of-transportation-statistics",
      ],
      trails: ["border-context", "earth-evidence"],
      legacy: [],
      questions: [
        "The official Arizona traffic portal is AZ511; its coverage and availability can change.",
        "A stored image or old directory is not evidence of current conditions.",
        "This desk links to original public portals rather than embedding services that may reject framing.",
      ],
    },
    threats: {
      title: "Global affairs, grounded in sources.",
      subtitle:
        "International institutions, humanitarian reporting and academic conflict research, with definitions and uncertainty kept in view.",
      category: "global",
      trails: ["global-numbers", "sanctions", "border-context"],
      legacy: ["russia-osint", "az-border-history"],
      questions: [
        "Read event definitions, inclusion thresholds and geographic coverage.",
        "An event-based dataset is not necessarily a comprehensive census.",
        "Separate an institutional designation, an allegation and an independently supported finding.",
      ],
    },
    russia: {
      title: "Russia & Eurasia research desk.",
      subtitle:
        "Read public sanctions records, archival documents, international datasets and published cyber assessments together.",
      sources: [
        "treasury-ofac",
        "ofac-sanctions-search",
        "mitre-att-ck",
        "cisa-advisories",
        "un-security-council",
        "world-bank-data",
        "sipri",
        "wilson-center-digital-archive",
        "frus-diplomatic-history",
      ],
      trails: [
        "sanctions",
        "cyber-attribution",
        "paper-trail",
        "global-numbers",
      ],
      legacy: ["russia-osint", "az-cold-war"],
      questions: [
        "Keep sanctions program identifiers and source publication dates attached to every claim.",
        "Country association does not establish an entity’s operational control or responsibility.",
        "Compare independent records and preserve contradictory evidence.",
      ],
    },
    "russia-history": {
      title: "History is a collection of records.",
      subtitle:
        "Archival entry points for the diplomatic and institutional history of Eurasia and the Cold War.",
      category: "archives",
      trails: ["paper-trail", "defense-budget"],
      legacy: ["russia-osint", "az-cold-war", "az-history"],
      questions: [
        "Distinguish the date a document was created from the date it was released.",
        "Read adjacent files, cover memoranda and later corrections.",
        "Translations and curated collections should be traced to the original holding where possible.",
      ],
    },
    "russia-networks": {
      title: "Digital evidence, with context.",
      subtitle:
        "Public cyber research and attribution methodology. Cross-reference published technical reporting and keep evidence classes separate.",
      category: "cyber",
      trails: ["cyber-attribution", "sanctions"],
      legacy: ["russia-osint", "arizona-cyber"],
      questions: [
        "A technique, shared service or geographic label is not proof of common control.",
        "Read the original technical assessment and preserve its stated confidence.",
        "Evaluate historical infrastructure references in their original time window.",
      ],
    },
    documents: {
      title: "Find the document. Read the context.",
      subtitle:
        "Declassified collections, congressional publications and archival research guides, connected to a practical evidence workflow.",
      category: "archives",
      trails: ["paper-trail", "rulemaking", "uap-record"],
      legacy: ["az-cold-war", "uap-congressional", "az-history"],
      questions: [
        "Capture the document identifier, originating office, title and date.",
        "Check whether a scan is complete and whether attachments are available.",
        "Follow references to the underlying record instead of relying on a quoted excerpt.",
      ],
    },
    reports: {
      title: "Research that opens more doors.",
      subtitle:
        "Browse the complete research-guide collection and the source libraries behind it. Missing legacy PDF links have been replaced by available material.",
      category: "archives",
      trails: [],
      legacy: ["arizona-cyber", "russia-osint", "water-politics", "az-history"],
      questions: [
        "These are editorial research guides, not claims of completed investigations.",
        "Use linked primary sources and keep your citations in the investigation workspace.",
        "Raw historical feed files remain available in the dated snapshot archive.",
      ],
    },
    domains: {
      title: "Resolve the government publisher.",
      subtitle:
        "Start with the official .gov domain inventory and agency directories. Use a current publisher record rather than a missing local CSV.",
      sources: [
        "get-gov-domain-data",
        "usa-gov-agency-index",
        "data-gov",
        "cisa-github",
        "arizona-state-portal",
      ],
      trails: ["rulemaking", "cyber-attribution"],
      legacy: [],
      questions: [
        "The Get.gov inventory identifies registered .gov domains and supplied registry metadata.",
        "A domain registration alone does not validate the accuracy of every page it publishes.",
        "Record the inventory version or access date when using a domain record as evidence.",
      ],
    },
    timelines: {
      title: "Put the record back in time.",
      subtitle:
        "A document’s creation, publication, release and collection dates can tell four different stories. Research each on its own terms.",
      category: "archives",
      trails: ["paper-trail", "rulemaking", "defense-budget"],
      legacy: ["az-history", "az-cold-war", "az-border-history"],
      questions: [
        "Choose the date that actually answers the research question.",
        "Mark gaps, uncertain dates and changes in source coverage.",
        "Do not turn a collection timestamp into an event timestamp.",
      ],
    },
    anomalies: {
      title: "Extraordinary claims. Traceable records.",
      subtitle:
        "Research UAP hearings and historical claims through original records, released reports and explicit evidence distinctions.",
      sources: [
        "aaro",
        "congress-gov",
        "govinfo",
        "national-archives-catalog",
        "foia-gov",
        "library-of-congress",
      ],
      trails: ["uap-record", "paper-trail"],
      legacy: [
        "uap-congressional",
        "phoenix-lights",
        "travis-walton",
        "kingman-crash",
      ],
      questions: [
        "A hearing transcript establishes testimony, not independent proof of every claim.",
        "Distinguish firsthand observation, hearsay, interpretation and corroborated evidence.",
        "Legacy cultural narratives are preserved as background, not adopted as verified findings.",
      ],
    },
    narco_routes: {
      title: "Transnational issues, public evidence.",
      subtitle:
        "Research published trafficking trends, official designations and international policy through aggregate public datasets and institutional reports.",
      sources: [
        "unodc",
        "treasury-ofac",
        "un-security-council",
        "cbp-statistics",
        "un-comtrade",
        "international-crisis-group",
      ],
      trails: ["border-context", "sanctions", "global-numbers"],
      legacy: ["az-border-history"],
      questions: [
        "Check the dataset’s inclusion criteria and reporting period.",
        "Distinguish a legal designation from an observed trend or a broader analytical judgment.",
        "Compare aggregate patterns without inferring an individual case from a country-level count.",
      ],
    },
  };
  const legacyTitles = {
    "az-history": "Arizona historical research",
    "water-politics": "Arizona water politics",
    "tribal-governance": "Tribal governance background",
    "az-corruption": "Arizona accountability background",
    "az-mining": "Arizona mining history",
    "az-election-security": "Election security background",
    "arizona-cyber": "Arizona cyber background",
    "az-ics-scada": "Industrial-control security context",
    "az-cold-war": "Arizona and the Cold War",
    "fort-huachuca": "Fort Huachuca historical background",
    "davis-monthan": "Davis-Monthan historical background",
    "barry-goldwater-range": "Barry Goldwater Range background",
    "az-border-history": "Arizona border history",
    "border-tech": "Border technology background",
    "palo-verde": "Palo Verde public background",
    "russia-osint": "Russia public-source background",
    "uap-congressional": "UAP congressional records",
    "phoenix-lights": "Phoenix Lights narrative",
    "travis-walton": "Travis Walton narrative",
    "kingman-crash": "Kingman claim history",
    "az-nuclear": "Arizona nuclear history and records",
  };
  function renderDeskIndex() {
    main.innerHTML =
      heading(
        "RESEARCH DESKS / EXPLORE THE COLLECTION",
        "Pick a desk. Open a file.",
        "Move from a broad subject to source entry points, research trails and preserved background. Every desk connects to the wider public record.",
      ) +
      `<div class="dossier-grid">${Object.entries(DESKS)
        .map(([id, d], i) => {
          const n = d.sources
            ? d.sources.length
            : D.sources.filter((s) => s.category === d.category).length;
          return `<a class="dossier-card" href="${id}.html"><div class="dossier-top"><span class="tag">${esc(d.category ? shortCat(d.category) : id.replaceAll("_", " ").replaceAll("-", " ").toUpperCase())}</span><span class="dossier-number">DESK / ${String(i + 1).padStart(2, "0")}</span></div><h3>${esc(d.title)}</h3><p>${esc(d.subtitle)}</p><div class="dossier-foot"><span>${n} SOURCE ENTRY POINTS</span><span>${id === "reports" ? D.dossiers.length : d.trails.length} TRAILS</span>${icon("arrow")}</div></a>`;
        })
        .join(
          "",
        )}</div><div class="section-title"><h2>${icon("archive")}The preserved wiki</h2><span class="eyebrow">21 LEGACY BACKGROUND ARTICLES</span></div><div class="notice">These original background articles are preserved for context. The console's research guides explain how to check their claims against primary records.</div><div class="two-col">${Object.entries(
        legacyTitles,
      )
        .map(
          ([id, title]) =>
            `<a class="related-link" href="content/${id}.html">${esc(title)} ↗</a>`,
        )
        .join("")}</div>${footer()}`;
  }
  function renderDesk() {
    const id = document.body.dataset.desk;
    const d = DESKS[id] || DESKS.government;
    const records = d.sources
      ? d.sources.map(sourceById).filter(Boolean)
      : D.sources.filter((s) => s.category === d.category);
    const trails =
      id === "reports"
        ? D.dossiers
        : d.trails.map((id) => D.dossiers.find((t) => t.id === id));
    main.innerHTML =
      heading(
        "RESEARCH DESK / " +
          id.replaceAll("-", " ").replaceAll("_", " ").toUpperCase(),
        esc(d.title),
        esc(d.subtitle),
        `<a class="btn primary" href="${d.category ? "sources.html?category=" + d.category : "sources.html"}">${icon("sources")}Explore the directory</a>`,
      ) +
      `<div class="method-grid">${d.questions.map((q, i) => `<div class="method-card"><div class="eyebrow">RESEARCH NOTE / 0${i + 1}</div><p>${esc(q)}</p></div>`).join("")}</div><div class="section-title"><h2>${icon("dossiers")}Follow the evidence</h2><a href="dossiers.html">All research dossiers ↗</a></div><div class="dossier-grid">${trails.map(dossierCard).join("")}</div><div class="bottom-grid"><section><div class="section-title"><h2>${icon("sources")}Source entry points</h2><span class="eyebrow">${records.length} SOURCES</span></div><div class="panel">${records.map(sourceRow).join("")}</div></section><section><div class="section-title"><h2>${icon("archive")}Context & background</h2></div><div class="panel"><div class="panel-inner"><div class="eyebrow accent">READ THE ORIGINAL RECORD</div><p style="font-size:12px;margin-top:14px">Preserve the publisher, document identifier and relevant date. Open source details for provenance and access notes, then save useful leads to your investigation.</p><a class="btn" href="investigations.html">${icon("workspace")}Open investigations</a></div>${d.legacy.length ? `<div class="panel-head"><span class="eyebrow">PRESERVED LEGACY WIKI</span><span class="badge amber">BACKGROUND</span></div>${d.legacy.map((l) => `<a class="brief-item" href="content/${l}.html"><h3>${esc(legacyTitles[l] || l)} ↗</h3><p>Historical wiki entry. Check claims against its original sources.</p></a>`).join("")}` : `<div class="panel-inner"><a class="btn" href="archive.html">${icon("archive")}Browse the snapshot archive</a></div>`}</div></section></div>${footer()}`;
  }

  const renderers = {
    connections: renderConnections,
    casefiles: renderCasefiles,
    desks: renderDeskIndex,
    desk: renderDesk,
    overview: renderOverview,
    sources: renderSources,
    atlas: renderAtlas,
    dossiers: renderDossiers,
    feeds: renderFeeds,
    archive: renderArchive,
    workspace: renderWorkspace,
    methodology: renderMethodology,
  };
  try {
    (renderers[view] || renderOverview)();
  } catch (error) {
    console.error(error);
    main.innerHTML = empty(
      "The console could not render this view.",
      "Reload the page. The complete source catalog remains available below.",
      '<a class="btn primary" href="data/source-catalog.json">Open catalog JSON</a>',
    );
  }
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "/" &&
      !e.metaKey &&
      !e.ctrlKey &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(
        document.activeElement?.tagName,
      ) &&
      !document.querySelector("dialog[open]")
    ) {
      e.preventDefault();
      const input = document.getElementById("mission-query");
      if (input) input.focus();
      else openSearch();
    }
  });
  const revealObserver = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      }),
    { threshold: 0.07 },
  );
  if (
    view === "overview" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    document
      .querySelectorAll(".mission-section,.network-teaser,.mission-bottom")
      .forEach((el) => {
        el.classList.add("reveal");
        revealObserver.observe(el);
      });
  function tick() {
    const el = document.getElementById("clock");
    if (el) el.textContent = new Date().toISOString().slice(11, 16) + " UTC";
  }
  tick();
  setInterval(tick, 30000);
  if (view === "sources" && query.get("source"))
    openSource(query.get("source"));
})();
