/* GovINT source relationships. Every edge is derived from a dossier reading list. */
(() => {
  "use strict";
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  const safeURL = (value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
    } catch {
      return "#";
    }
  };
  const symbols = {
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    network:
      '<circle cx="5" cy="12" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="m7 11 9-5M7 13l9 5"/>',
    list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1"/>',
    arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
    external: '<path d="M14 3h7v7M21 3 10 14M10 3H3v18h18v-7"/>',
    save: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
    reset: '<path d="M4 9a8 8 0 1 1 0 7M3 3v6h6"/>',
    link: '<path d="m9 6 2-2a5 5 0 0 1 7 7l-2 2M8 11l-2 2a5 5 0 0 0 7 7l2-2m-7-2 8-8"/>',
  };
  const icon = (name) =>
    `<svg class="gnet-icon" viewBox="0 0 24 24" aria-hidden="true">${symbols[name] || symbols.network}</svg>`;
  function splitLabel(text, max = 26, lines = 2) {
    const words = String(text).split(/\s+/),
      result = [];
    let line = "";
    for (let i = 0; i < words.length; i++) {
      const next = line ? line + " " + words[i] : words[i];
      if (next.length > max && line) {
        result.push(line);
        line = words[i];
        if (result.length === lines - 1) {
          const remaining = words.slice(i).join(" ");
          result.push(
            remaining.length > max
              ? remaining.slice(0, max - 1).replace(/\s+\S*$/, "") + "…"
              : remaining,
          );
          return result;
        }
      } else line = next;
    }
    if (line) result.push(line);
    return result.slice(0, lines);
  }
  function mount(container, data, callbacks = {}) {
    if (!(container instanceof Element))
      throw new TypeError("A container element is required.");
    const sources = new Map(
      (data.sources || []).map((source) => [source.id, source]),
    );
    const dossiers = (data.dossiers || []).filter(
      (dossier) => dossier && Array.isArray(dossier.sources),
    );
    const categories = new Map(
      (data.categories || []).map((category) => [category.id, category]),
    );
    if (!dossiers.length) {
      container.textContent =
        "No dossier relationships are available in this catalog.";
      return {
        destroy() {
          container.replaceChildren();
        },
        refreshSaved() {},
      };
    }
    const membership = new Map();
    for (const dossier of dossiers)
      for (const id of new Set(dossier.sources)) {
        if (!sources.has(id)) continue;
        if (!membership.has(id)) membership.set(id, []);
        membership.get(id).push(dossier);
      }
    const params = new URLSearchParams(location.search);
    const requested = callbacks.initialDossierId || params.get("trail");
    const state = {
      dossierId: dossiers.some((d) => d.id === requested)
        ? requested
        : dossiers.find((d) => d.id === "contract-chain")?.id || dossiers[0].id,
      sourceId: sources.has(params.get("source")) ? params.get("source") : null,
      selectedDossierId: null,
      category: "",
      query: "",
      sharedOnly: false,
      view: window.matchMedia("(max-width: 760px)").matches ? "list" : "graph",
      box: [0, 0, 1000, 620],
      dragged: false,
    };
    const abort = new AbortController();
    const listen = (element, type, handler, options = {}) =>
      element.addEventListener(type, handler, {
        ...options,
        signal: abort.signal,
      });
    const categoryName = (id) => categories.get(id)?.name || id;
    const dossierById = (id) => dossiers.find((dossier) => dossier.id === id);
    const active = () => dossierById(state.dossierId);
    const sourceType = (source) =>
      source.publisherType?.startsWith("Government")
        ? "government"
        : source.publisherType === "Institutional"
          ? "institution"
          : "research";
    const saved = (id) => Boolean(callbacks.isSaved?.(id));
    const related = (sourceIds = active().sources) =>
      dossiers
        .filter((dossier) => dossier.id !== state.dossierId)
        .map((dossier) => ({
          ...dossier,
          shared: dossier.sources.filter(
            (id) => sourceIds.includes(id) && sources.has(id),
          ),
        }))
        .filter((dossier) => dossier.shared.length)
        .sort(
          (a, b) =>
            b.shared.length - a.shared.length || a.title.localeCompare(b.title),
        );
    const visibleSources = () =>
      active()
        .sources.map((id) => sources.get(id))
        .filter(Boolean)
        .filter((source) => {
          if (state.category && source.category !== state.category)
            return false;
          if (state.sharedOnly && (membership.get(source.id)?.length || 0) < 2)
            return false;
          return (
            source.name +
            " " +
            source.summary +
            " " +
            categoryName(source.category)
          )
            .toLowerCase()
            .includes(state.query.toLowerCase().trim());
        });
    const totalLinks = dossiers.reduce(
      (sum, dossier) =>
        sum + dossier.sources.filter((id) => sources.has(id)).length,
      0,
    );
    container.innerHTML = `<section class="gnet" aria-label="Dossier and source connections explorer">
      <div class="gnet-toolbar"><label class="gnet-trail-control"><span>START WITH A RESEARCH TRAIL</span><select class="gnet-select" data-gnet="trail" aria-label="Research trail">${dossiers.map((dossier) => `<option value="${escape(dossier.id)}" ${dossier.id === state.dossierId ? "selected" : ""}>${escape(dossier.title)}</option>`).join("")}</select></label>
      <label class="gnet-source-search"><span class="gnet-sr">Filter connected sources</span>${icon("search")}<input data-gnet="search" type="search" placeholder="Find a connected source…" aria-label="Filter connected sources"></label>
      <label class="gnet-domain-control"><span class="gnet-sr">Source domain</span><select class="gnet-select" data-gnet="category" aria-label="Source domain"><option value="">All source domains</option>${[...categories.values()].map((category) => `<option value="${escape(category.id)}">${escape(category.name)}</option>`).join("")}</select></label></div>
      <div class="gnet-summary"><div class="gnet-breadcrumb"><span class="gnet-led"></span><span data-gnet="counts" role="status" aria-live="polite"></span></div><label class="gnet-shared"><input data-gnet="shared" type="checkbox"> Shared sources only</label><div class="gnet-view-switch" aria-label="Connection view"><button data-gnet-view="graph" aria-pressed="true">${icon("network")}Graph</button><button data-gnet-view="list" aria-pressed="false">${icon("list")}Evidence list</button></div></div>
      <div class="gnet-workspace"><div class="gnet-main"><div class="gnet-graph-wrap" data-gnet="graph-wrap"><div class="gnet-canvas-label"><span>RELATIONSHIP WORKSPACE</span><span>READING-LIST CONNECTIONS</span></div><svg class="gnet-graph" data-gnet="svg" viewBox="0 0 1000 620" tabindex="0" aria-label="Connections between the selected research dossier, its source entry points and related dossiers"><defs><pattern id="gnet-dots-${escape(state.dossierId)}" x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#33433d"/></pattern></defs><rect x="-3000" y="-3000" width="7000" height="7000" fill="#0b1011"/><rect width="1000" height="620" fill="url(#gnet-dots-${escape(state.dossierId)})" pointer-events="none"/><g data-gnet="edges"></g><g data-gnet="nodes"></g></svg><div class="gnet-zoom" aria-label="Graph zoom controls"><button data-gnet-zoom="in" aria-label="Zoom connections in">+</button><button data-gnet-zoom="out" aria-label="Zoom connections out">−</button><button data-gnet-zoom="fit" aria-label="Fit connections to canvas">${icon("reset")}</button></div><div class="gnet-pan-hint">DRAG TO PAN <span>·</span> + / − TO ZOOM <span>·</span> SELECT A NODE TO INSPECT</div></div><div class="gnet-list" data-gnet="list" hidden></div><div class="gnet-legend"><span><i class="gnet-key gnet-key-trail"></i>Research dossier</span><span><i class="gnet-key gnet-key-source"></i>Source entry point</span><span class="gnet-legend-note">Lines connect dossiers to sources in their reading lists.</span></div></div><aside class="gnet-inspector" data-gnet="inspector" aria-label="Selected connection details"></aside></div>
      <div class="gnet-catalog-foot"><span>${dossiers.length} DOSSIERS <i>/</i> ${membership.size} CONNECTED SOURCES <i>/</i> ${totalLinks} READING-LIST LINKS</span><span>Source relationships are editorial references, not claims of ownership or coordination.</span></div>
      <p class="gnet-sr" data-gnet="announcement" role="status" aria-live="polite"></p>
    </section>`;
    const el = (name) => container.querySelector(`[data-gnet="${name}"]`);
    const svg = el("svg");
    function syncURL() {
      if (!callbacks.syncURL) return;
      const url = new URL(location.href);
      url.searchParams.set("trail", state.dossierId);
      if (state.sourceId) url.searchParams.set("source", state.sourceId);
      else url.searchParams.delete("source");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    function saveButton(source) {
      if (!callbacks.saveSource) return "";
      return `<button class="gnet-button ${saved(source.id) ? "gnet-is-saved" : ""}" data-gnet-save="${escape(source.id)}" aria-pressed="${saved(source.id)}">${icon("save")}${saved(source.id) ? "Saved to investigation" : "Save to investigation"}</button>`;
    }
    function renderInspector() {
      const focusSource = sources.get(state.sourceId);
      const focal = active();
      const inspectedDossier = dossierById(state.selectedDossierId) || focal;
      if (focusSource) {
        const usedBy = membership.get(focusSource.id) || [];
        let host = focusSource.url;
        try {
          host = new URL(focusSource.url).hostname.replace(/^www\./, "");
        } catch {}
        el("inspector").innerHTML =
          `<div class="gnet-inspector-label"><span>SOURCE / ${escape(sourceType(focusSource).toUpperCase())}</span><span class="gnet-source-glyph">S</span></div><h2>${escape(focusSource.name)}</h2><a class="gnet-host" href="${escape(safeURL(focusSource.url))}" target="_blank" rel="noopener noreferrer">${escape(host)} ${icon("external")}</a><p class="gnet-inspector-description">${escape(focusSource.summary)}</p><dl class="gnet-facts"><div><dt>RESEARCH DOMAIN</dt><dd>${escape(categoryName(focusSource.category))}</dd></div><div><dt>PUBLISHER</dt><dd>${escape(focusSource.publisherType || "Not specified")}</dd></div><div><dt>ACCESS</dt><dd>${escape(focusSource.access || "See publisher")}</dd></div></dl><div class="gnet-inspector-actions">${callbacks.openSource ? `<button class="gnet-button gnet-primary" data-gnet-open="${escape(focusSource.id)}">Inspect source record ${icon("arrow")}</button>` : `<a class="gnet-button gnet-primary" href="${escape(safeURL(focusSource.url))}" target="_blank" rel="noopener noreferrer">Open original source ${icon("external")}</a>`}${saveButton(focusSource)}</div><div class="gnet-inspector-section"><div class="gnet-section-label">USED IN ${usedBy.length} RESEARCH ${usedBy.length === 1 ? "TRAIL" : "TRAILS"}</div>${usedBy.map((dossier) => `<button class="gnet-reading-link ${dossier.id === focal.id ? "gnet-current" : ""}" data-gnet-trail="${escape(dossier.id)}"><span>${escape(dossier.title)}</span>${dossier.id === focal.id ? "<small>CURRENT TRAIL</small>" : icon("arrow")}</button>`).join("")}</div><div class="gnet-inspector-foot">Catalog provenance describes the publisher. Evaluate the specific document and its date before drawing a conclusion.</div>`;
      } else {
        const isCurrent = inspectedDossier.id === focal.id;
        const shared = inspectedDossier.sources.filter(
          (id) => focal.sources.includes(id) && sources.has(id),
        );
        el("inspector").innerHTML =
          `<div class="gnet-inspector-label"><span>${isCurrent ? "FOCAL RESEARCH TRAIL" : "RELATED RESEARCH TRAIL"}</span><span class="gnet-file-number">${String(dossiers.indexOf(inspectedDossier) + 1).padStart(3, "0")}</span></div><h2>${escape(inspectedDossier.title)}</h2><div class="gnet-domain-name">${escape(categoryName(inspectedDossier.category))}</div><p class="gnet-inspector-description">${escape(inspectedDossier.intro || inspectedDossier.subtitle)}</p><div class="gnet-metrics"><div><strong>${inspectedDossier.sources.filter((id) => sources.has(id)).length}</strong><span>LINKED SOURCES</span></div><div><strong>${isCurrent ? related().length : shared.length}</strong><span>${isCurrent ? "CONNECTED TRAILS" : "SHARED WITH FOCUS"}</span></div></div><div class="gnet-inspector-actions"><a class="gnet-button gnet-primary" href="dossiers.html?id=${encodeURIComponent(inspectedDossier.id)}">Read the full dossier ${icon("arrow")}</a>${!isCurrent ? `<button class="gnet-button" data-gnet-trail="${escape(inspectedDossier.id)}">Make this the focal trail ${icon("network")}</button>` : ""}</div><div class="gnet-inspector-section"><div class="gnet-section-label">${isCurrent ? "START WITH THE EVIDENCE" : "THE SHARED SOURCE BRIDGE"}</div>${(isCurrent
            ? inspectedDossier.sources
            : shared
          )
            .map((id) => sources.get(id))
            .filter(Boolean)
            .map(
              (source) =>
                `<button class="gnet-reading-link" data-gnet-source="${escape(source.id)}"><span>${escape(source.name)}</span><small>${(membership.get(source.id)?.length || 0) > 1 ? "SHARED" : "SOURCE"}</small></button>`,
            )
            .join(
              "",
            )}</div><div class="gnet-inspector-foot">${isCurrent ? "Select a source in the graph to see which other dossiers use it. Shared sources offer another research path; they do not independently corroborate a claim." : "These dossiers reference the same source entry points. Follow the specific records to determine whether the underlying evidence is independent."}</div>`;
      }
    }
    function nodeMarkup({
      id,
      type,
      x,
      y,
      width,
      height,
      title,
      subtitle,
      selected,
      label,
    }) {
      const lines = splitLabel(
        title,
        type === "focal" ? 23 : 27,
        type === "focal" ? 3 : 2,
      );
      const titleY = type === "focal" ? 46 : lines.length > 1 ? 25 : 31;
      return `<g class="gnet-node gnet-node-${type}${selected ? " gnet-node-selected" : ""}" data-gnet-${type === "source" ? "source" : "inspect-trail"}="${escape(id)}" role="button" tabindex="0" aria-label="${escape(label || title)}" aria-pressed="${Boolean(selected)}" transform="translate(${x},${y})"><title>${escape(title)}</title><rect class="gnet-node-hit" x="-5" y="-4" width="${width + 10}" height="${height + 8}" rx="8"/><rect class="gnet-node-card" width="${width}" height="${height}" rx="5"/>${type === "focal" ? `<text class="gnet-node-kicker" x="17" y="23">FOCAL DOSSIER</text>` : `<circle class="gnet-node-dot" cx="16" cy="${lines.length > 1 ? 27 : 28}" r="3"/>`}<text class="gnet-node-title" x="${type === "focal" ? 17 : 29}" y="${titleY}">${lines.map((line, i) => `<tspan x="${type === "focal" ? 17 : 29}" dy="${i ? 16 : 0}">${escape(line)}</tspan>`).join("")}</text>${subtitle ? `<text class="gnet-node-meta" x="${type === "focal" ? 17 : 29}" y="${height - 13}">${escape(subtitle)}</text>` : ""}<path class="gnet-node-arrow" d="m${width - 24} ${height - 18}h9m-4-4 4 4-4 4"/></g>`;
    }
    function renderGraph() {
      const list = visibleSources();
      const branches = related(list.map((source) => source.id));
      const focal = active();
      el("counts").textContent =
        `${list.length} SOURCE${list.length === 1 ? "" : "S"} · ${branches.length} CONNECTED TRAIL${branches.length === 1 ? "" : "S"}`;
      if (!list.length) {
        el("edges").innerHTML = "";
        el("nodes").innerHTML =
          `<text class="gnet-no-results" x="500" y="285" text-anchor="middle">No source connections match these filters.</text><text class="gnet-no-results-sub" x="500" y="315" text-anchor="middle">Broaden the domain or clear the source search.</text>`;
        return;
      }
      const layout = {
        focal: { x: 35, y: 244, width: 225, height: 130 },
        source: new Map(),
        branch: new Map(),
      };
      const spread = (index, length, nodeHeight) =>
        length === 1
          ? 310 - nodeHeight / 2
          : 106 + index * (410 / (length - 1)) - nodeHeight / 2;
      list.forEach((source, i) =>
        layout.source.set(source.id, {
          x: 367,
          y: spread(i, list.length, 77),
          width: 230,
          height: 77,
        }),
      );
      branches.forEach((dossier, i) =>
        layout.branch.set(dossier.id, {
          x: 725,
          y: spread(i, branches.length, 58),
          width: 240,
          height: 58,
        }),
      );
      let edges = "";
      const curve = (from, to, highlighted, faint = false) =>
        `<path class="gnet-edge${highlighted ? " gnet-edge-highlight" : ""}${faint ? " gnet-edge-muted" : ""}" d="M${from[0]},${from[1]} C${from[0] + 60},${from[1]} ${to[0] - 60},${to[1]} ${to[0]},${to[1]}"/>`;
      for (const source of list) {
        const pos = layout.source.get(source.id),
          highlighted = state.sourceId === source.id;
        const focalPos = layout.focal;
        edges += curve(
          [focalPos.x + focalPos.width, focalPos.y + focalPos.height / 2],
          [pos.x, pos.y + pos.height / 2],
          highlighted,
          Boolean(state.sourceId && !highlighted),
        );
        for (const dossier of branches.filter((d) =>
          d.shared.includes(source.id),
        )) {
          const target = layout.branch.get(dossier.id);
          edges += curve(
            [pos.x + pos.width, pos.y + pos.height / 2],
            [target.x, target.y + target.height / 2],
            highlighted || state.selectedDossierId === dossier.id,
            Boolean(state.sourceId && !highlighted),
          );
        }
      }
      el("edges").innerHTML = edges;
      el("nodes").innerHTML =
        `<text class="gnet-column-label" x="36" y="49">01 / THE RESEARCH QUESTION</text><text class="gnet-column-label" x="368" y="49">02 / SOURCE ENTRY POINTS</text><text class="gnet-column-label" x="725" y="49">03 / FOLLOW ANOTHER THREAD</text>${nodeMarkup({ id: focal.id, type: "focal", ...layout.focal, title: focal.title, subtitle: `${focal.sources.filter((id) => sources.has(id)).length} LINKED SOURCES`, selected: !state.sourceId && !state.selectedDossierId, label: `${focal.title}, focal dossier. Select to inspect.` })}${list.map((source) => nodeMarkup({ id: source.id, type: "source", ...layout.source.get(source.id), title: source.name, subtitle: `${source.region} · ${membership.get(source.id)?.length || 0} ${(membership.get(source.id)?.length || 0) === 1 ? "TRAIL" : "TRAILS"}`, selected: source.id === state.sourceId, label: `${source.name}, source referenced by ${membership.get(source.id)?.length || 0} dossiers. Select to inspect.` })).join("")}${branches.map((dossier) => nodeMarkup({ id: dossier.id, type: "related", ...layout.branch.get(dossier.id), title: dossier.title, selected: state.selectedDossierId === dossier.id, label: `${dossier.title}, related dossier with ${dossier.shared.length} shared sources. Select to inspect.` })).join("")}${!branches.length ? '<text class="gnet-no-results-sub" x="725" y="290">No other dossier currently uses</text><text class="gnet-no-results-sub" x="725" y="309">these selected source entry points.</text>' : ""}`;
    }
    function renderList() {
      const list = visibleSources();
      el("list").innerHTML = list.length
        ? `<div class="gnet-list-head"><span>SOURCE ENTRY POINT</span><span>ALSO USED IN</span></div>${list
            .map(
              (source) =>
                `<article class="gnet-source-record"><div><span class="gnet-source-category">${escape(categoryName(source.category))}</span><h3><button data-gnet-source="${escape(source.id)}">${escape(source.name)}</button></h3><p>${escape(source.summary)}</p><div class="gnet-list-actions">${callbacks.openSource ? `<button data-gnet-open="${escape(source.id)}">Inspect source ${icon("arrow")}</button>` : `<a href="${escape(safeURL(source.url))}" target="_blank" rel="noopener noreferrer">Open publisher ${icon("external")}</a>`}${callbacks.saveSource ? `<button data-gnet-save="${escape(source.id)}" aria-pressed="${saved(source.id)}">${icon("save")}${saved(source.id) ? "Saved" : "Save"}</button>` : ""}</div></div><div class="gnet-shared-trails">${
                  (membership.get(source.id) || [])
                    .filter((dossier) => dossier.id !== state.dossierId)
                    .map(
                      (dossier) =>
                        `<button data-gnet-trail="${escape(dossier.id)}">${escape(dossier.title)} ${icon("arrow")}</button>`,
                    )
                    .join("") ||
                  "<span>No other dossier in this collection.</span>"
                }</div></article>`,
            )
            .join("")}`
        : '<div class="gnet-list-empty"><h3>No connections match.</h3><p>Broaden the source domain, clear the search or choose a different research trail.</p></div>';
    }
    function render(options = {}) {
      const focused = document.activeElement?.closest(
        "[data-gnet-source], [data-gnet-inspect-trail]",
      );
      const focusKey = focused?.dataset.gnetSource
        ? ["source", focused.dataset.gnetSource]
        : focused?.dataset.gnetInspectTrail
          ? ["inspect-trail", focused.dataset.gnetInspectTrail]
          : null;
      if (
        state.sourceId &&
        !visibleSources().some((source) => source.id === state.sourceId)
      )
        state.sourceId = null;
      if (
        state.selectedDossierId &&
        !related(visibleSources().map((source) => source.id)).some(
          (dossier) => dossier.id === state.selectedDossierId,
        )
      )
        state.selectedDossierId = null;
      renderGraph();
      renderList();
      renderInspector();
      el("graph-wrap").hidden = state.view !== "graph";
      el("list").hidden = state.view !== "list";
      container
        .querySelectorAll("[data-gnet-view]")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(button.dataset.gnetView === state.view),
          ),
        );
      if (focusKey && !options.suppressFocus)
        container
          .querySelector(
            `[data-gnet-${focusKey[0]}="${CSS.escape(focusKey[1])}"]`,
          )
          ?.focus({ preventScroll: true });
      syncURL();
    }
    function setDossier(id) {
      if (!dossierById(id)) return;
      state.dossierId = id;
      state.sourceId = null;
      state.selectedDossierId = null;
      state.box = [0, 0, 1000, 620];
      el("trail").value = id;
      applyBox();
      render({ suppressFocus: true });
      el("announcement").textContent = `Now exploring ${active().title}.`;
    }
    function applyBox() {
      svg.setAttribute("viewBox", state.box.join(" "));
    }
    function zoom(direction) {
      if (direction === "fit") state.box = [0, 0, 1000, 620];
      else {
        const [x, y, w, h] = state.box,
          next = Math.max(
            400,
            Math.min(1400, w * (direction === "in" ? 0.8 : 1.25)),
          ),
          nextH = next * 0.62;
        state.box = [x + (w - next) / 2, y + (h - nextH) / 2, next, nextH];
      }
      applyBox();
    }
    listen(container, "click", (event) => {
      const button = event.target.closest("button, [role=button]");
      if (!button || !container.contains(button) || state.dragged) return;
      if (button.dataset.gnetSource) {
        state.sourceId = button.dataset.gnetSource;
        state.selectedDossierId = null;
        render();
      } else if (button.dataset.gnetInspectTrail) {
        state.sourceId = null;
        state.selectedDossierId =
          button.dataset.gnetInspectTrail === state.dossierId
            ? null
            : button.dataset.gnetInspectTrail;
        render();
      } else if (button.dataset.gnetTrail) setDossier(button.dataset.gnetTrail);
      else if (button.dataset.gnetOpen)
        callbacks.openSource?.(button.dataset.gnetOpen);
      else if (button.dataset.gnetSave) {
        callbacks.saveSource?.(button.dataset.gnetSave);
        renderInspector();
        renderList();
      } else if (button.dataset.gnetView) {
        state.view = button.dataset.gnetView;
        render({ suppressFocus: true });
      } else if (button.dataset.gnetZoom) zoom(button.dataset.gnetZoom);
    });
    listen(container, "keydown", (event) => {
      const target = event.target.closest("[role=button]");
      if (target && ["Enter", " "].includes(event.key)) {
        event.preventDefault();
        target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
    });
    listen(el("trail"), "change", (event) => setDossier(event.target.value));
    listen(el("search"), "input", (event) => {
      state.query = event.target.value;
      render({ suppressFocus: true });
    });
    listen(el("category"), "change", (event) => {
      state.category = event.target.value;
      render({ suppressFocus: true });
    });
    listen(el("shared"), "change", (event) => {
      state.sharedOnly = event.target.checked;
      render({ suppressFocus: true });
    });
    listen(svg, "keydown", (event) => {
      if (["+", "=", "-", "0"].includes(event.key)) {
        event.preventDefault();
        zoom(event.key === "0" ? "fit" : event.key === "-" ? "out" : "in");
      }
    });
    let drag = null,
      dragReset;
    listen(svg, "pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest(".gnet-node")) return;
      drag = { x: event.clientX, y: event.clientY, box: [...state.box] };
      state.dragged = false;
      svg.setPointerCapture(event.pointerId);
    });
    listen(svg, "pointermove", (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) state.dragged = true;
      const rect = svg.getBoundingClientRect(),
        ratio = Math.max(drag.box[2] / rect.width, drag.box[3] / rect.height);
      state.box = [
        drag.box[0] - dx * ratio,
        drag.box[1] - dy * ratio,
        drag.box[2],
        drag.box[3],
      ];
      applyBox();
    });
    const endDrag = () => {
      drag = null;
      clearTimeout(dragReset);
      dragReset = setTimeout(() => {
        state.dragged = false;
      }, 50);
    };
    listen(svg, "pointerup", endDrag);
    listen(svg, "pointercancel", endDrag);
    listen(
      svg,
      "wheel",
      (event) => {
        if (event.ctrlKey) {
          event.preventDefault();
          zoom(event.deltaY < 0 ? "in" : "out");
        }
      },
      { passive: false },
    );
    render();
    return {
      destroy() {
        abort.abort();
        clearTimeout(dragReset);
        container.replaceChildren();
      },
      refreshSaved() {
        renderInspector();
        renderList();
      },
      getState() {
        return {
          dossierId: state.dossierId,
          sourceId: state.sourceId,
          selectedDossierId: state.selectedDossierId,
          view: state.view,
          visibleSourceIds: visibleSources().map((source) => source.id),
        };
      },
    };
  }
  window.GovINTConnections = Object.freeze({ mount });
})();
