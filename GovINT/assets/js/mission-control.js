window.GovINTMission = (() => {
  function render(D, ui) {
    const {
      icon,
      esc,
      count,
      mapPanel,
      dossierCard,
      sourceRow,
      sourceById,
      footer,
    } = ui;
    const files = (window.GOVINT_CASEFILES || []).slice(0, 3);
    const caseCards = files
      .map(
        (f, i) =>
          `<a class="archive-file" href="casefiles.html?id=${esc(f.id)}"><div class="file-tab">CASE FILE / ${String(i + 1).padStart(3, "0")}</div><div class="file-status"><span class="file-stamp">PUBLIC RECORD</span><span>${esc(f.period || "HISTORICAL ARCHIVE")}</span></div><div class="file-symbol" aria-hidden="true">${icon(i === 0 ? "eye" : i === 1 ? "archive" : "shield")}</div><h3>${esc(f.title)}</h3><p>${esc(f.subtitle)}</p><div class="archive-file-bottom"><span>${f.sources.length} DOCUMENT SOURCES</span>${icon("arrow")}</div></a>`,
      )
      .join("");
    return `<section class="mission-hero"><div class="hero-copy"><div class="system-kicker"><i></i>PUBLIC-SOURCE INTELLIGENCE SYSTEM<span>VOL. 02 / 2026</span></div><h1>FOLLOW THE<br><span>PAPER TRAIL.</span></h1><p>Government records. Declassified archives.<br>The connections hiding in plain sight.</p><div class="hero-actions"><a class="btn primary" href="sources.html">Enter the source directory ${icon("arrow")}</a><a class="hero-secondary" href="casefiles.html">Open the case files ${icon("external")}</a></div><div class="hero-assurance"><span class="status-dot"></span>PUBLIC RECORDS. TRACEABLE EVIDENCE. OPEN QUESTIONS.</div></div><a class="globe-stage" href="maps.html" aria-label="Explore geographic source coverage"><div class="globe-upper"><span>GEOREFERENCE / 01</span><span>33 REGIONAL COLLECTIONS</span></div><canvas id="coverage-globe" aria-hidden="true"></canvas><div class="globe-crosshair ch-one"></div><div class="globe-crosshair ch-two"></div><div class="globe-annotation ga-one"><span class="annotation-dot"></span><div><b>FEDERAL ARCHIVES</b><small>PRIMARY RECORD COLLECTIONS</small></div></div><div class="globe-annotation ga-two"><span class="annotation-dot"></span><div><b>GLOBAL SOURCE INDEX</b><small>PUBLIC DATA. NO BORDERS.</small></div></div><div class="globe-lower"><span>ORTHOGRAPHIC PROJECTION</span><span>EXPLORE THE ATLAS ↗</span></div></a></section>
  <div class="mission-register"><div class="register-label">THE COLLECTION<span>EXPLORE / CONNECT / VERIFY</span></div>${[
    [D.sources.length, "SOURCE ENTRY POINTS", "sources.html"],
    [D.categories.length, "RESEARCH DOMAINS", "desks.html"],
    [
      files.length ? window.GOVINT_CASEFILES.length : D.dossiers.length,
      files.length ? "DOCUMENTED CASE FILES" : "RESEARCH DOSSIERS",
      files.length ? "casefiles.html" : "dossiers.html",
    ],
    [D.archives.length, "PRESERVED SNAPSHOTS", "archive.html"],
  ]
    .map(
      ([n, t, url]) =>
        `<a href="${url}"><strong>${count(n)}</strong><span>${t}</span><i>↗</i></a>`,
    )
    .join("")}</div>
  <form class="mission-search" action="sources.html"><div class="mission-search-label">START WITH A QUESTION<span>01 — DISCOVER</span></div>${icon("search")}<label class="sr-only" for="mission-query">Search the public record</label><input id="mission-query" name="q" placeholder="An agency, a company, a program, a question…" autocomplete="off"><button type="submit" aria-label="Search sources">${icon("arrow")}</button><kbd>/</kbd></form>
  ${files.length ? `<section class="mission-section"><div class="section-title"><div><div class="eyebrow">RELEASED RECORDS / DEEP CONTEXT</div><h2>From the government’s own files.</h2></div><a href="casefiles.html">Explore the declassified collection ${icon("arrow")}</a></div><div class="casefile-grid">${caseCards}</div></section>` : ""}
  <section class="mission-section"><div class="section-title"><div><div class="eyebrow">THE WORLD BEHIND THE RECORD</div><h2>Follow the geography.</h2></div><a href="maps.html">Open the full atlas ${icon("arrow")}</a></div><div class="mission-atlas-grid">${mapPanel()}<aside class="atlas-sidecar"><div class="sidecar-index">33<span>REGIONAL<br>COLLECTIONS</span></div><h3>The map is only<br>the beginning.</h3><p>Go from a region to its public institutions, registries, archives and data. Then trace the record.</p><a href="maps.html?region=AZ">Arizona field desk <span>51 SOURCES ↗</span></a><a href="maps.html?region=US">United States <span>FEDERAL & STATE ↗</span></a><a href="maps.html?region=Global">Global institutions <span>CROSS-BORDER CONTEXT ↗</span></a></aside></div></section>
  <section class="network-teaser"><div class="network-mini" aria-hidden="true"><svg viewBox="0 0 320 180"><g fill="none" stroke="#668144" stroke-width="1"><path d="M45 90 120 30 230 55 280 120 165 145 45 90M120 30 165 145M45 90 230 55M120 30 280 120"/><path class="flow-line" d="M45 90 120 30 230 55 280 120 165 145 45 90"/></g>${[
    [45, 90],
    [120, 30],
    [230, 55],
    [280, 120],
    [165, 145],
  ]
    .map(
      ([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="${i === 2 ? 11 : 7}" fill="${i === 2 ? "#d0f48a" : "#263e20"}" stroke="#a9cf71"/>`,
    )
    .join(
      "",
    )}</svg></div><div><div class="eyebrow">02 — CONNECT THE EVIDENCE</div><h2>A source is a starting point.<br>A connection changes the question.</h2><p>Explore the actual links between dossiers and their source material. Find shared records, compare research paths, and keep the useful leads.</p></div><a class="btn primary" href="connections.html">Explore connections ${icon("arrow")}</a></section>
  <section class="mission-section"><div class="section-title"><div><div class="eyebrow">RESEARCH METHODS / WORKING FILES</div><h2>Build a defensible investigation.</h2></div><a href="dossiers.html">All ${D.dossiers.length} research dossiers ${icon("arrow")}</a></div><div class="dossier-grid">${["contract-chain", "cyber-attribution", "water-power"].map((id) => dossierCard(D.dossiers.find((d) => d.id === id))).join("")}</div></section>
  <div class="mission-bottom"><section><div class="section-title"><div><div class="eyebrow">PRIMARY ENTRY POINTS</div><h2>The source of the source.</h2></div><a href="sources.html">Full directory ↗</a></div><div class="panel">${["national-archives-catalog", "cia-foia-reading-room", "sec-edgar", "usaspending"].map((id) => sourceRow(sourceById(id))).join("")}</div></section><section class="collection-note"><div class="eyebrow">A NOTE ON THE RECORD</div><h3>Dates matter.<br>So do the gaps.</h3><p>The stored feed collection is historical. Every snapshot keeps its collection date; missing records and uncertainty stay visible.</p><a href="feeds.html">Inspect the signal archive ${icon("arrow")}</a><a href="methodology.html">Read the methodology ${icon("arrow")}</a></section></div>${footer()}`;
  }
  return { render };
})();
