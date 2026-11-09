/* GovINT / Released Record Library. Source-cited historical research, no remote runtime. */
(() => {
  "use strict";
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const url = (value) => {
    try {
      const parsed = new URL(value);
      return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  };
  const inlineIcon = (name) => {
    const paths = {
      arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
      external: '<path d="M14 4h6v6m0-6L10 14M10 4H4v16h16v-6"/>',
      search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
      copy: '<path d="M8 3h13v13M3 8h13v13H3Z"/>',
      bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
      back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
      close: '<path d="m6 6 12 12M6 18 18 6"/>',
    };
    return `<svg viewBox="0 0 24 24" class="cf-icon" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
  };
  function mount(container, suppliedData, callbacks = {}) {
    if (!(container instanceof Element))
      throw new TypeError("Casefile mount requires a container element.");
    const data = Array.isArray(suppliedData)
      ? suppliedData.filter((item) => item && typeof item.id === "string")
      : [];
    const scope = new AbortController();
    let observer;
    let state = {
      query: new URLSearchParams(location.search).get("q") || "",
      topic: new URLSearchParams(location.search).get("topic") || "",
    };
    const icons = (name) =>
      callbacks.icon
        ? callbacks.icon(name === "copy" ? "link" : name)
        : inlineIcon(name);
    const sources = (file) => (Array.isArray(file.sources) ? file.sources : []);
    const paragraphs = (section) =>
      Array.isArray(section.paragraphs) ? section.paragraphs : [];
    const sections = (file) =>
      Array.isArray(file.sections) ? file.sections : [];
    const keyFacts = (file) =>
      Array.isArray(file.keyFacts) ? file.keyFacts : [];
    const sourceNumber = (file, id) =>
      sources(file).findIndex((source) => source.id === id) + 1;
    const sourceAnchor = (id) =>
      "record-source-" + id.replace(/[^a-z0-9_-]/gi, "-");
    const citation = (file, ids = []) =>
      [...new Set(ids)]
        .filter((id) => sourceNumber(file, id) > 0)
        .map(
          (id) =>
            `<a class="cf-citation" href="#${esc(sourceAnchor(id))}" aria-label="Source ${sourceNumber(file, id)}: ${esc(sources(file).find((s) => s.id === id)?.title)}">[${sourceNumber(file, id)}]</a>`,
        )
        .join("");
    const humanDate = (value) => {
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
      const date = new Date(value + "T12:00:00Z");
      return Number.isNaN(date.valueOf())
        ? null
        : date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          });
    };
    const indexCode = (file) =>
      String(Math.max(0, data.indexOf(file)) + 1).padStart(3, "0");
    const list = (values) =>
      (Array.isArray(values) ? values : []).filter(
        (value) => typeof value === "string",
      );
    const external = (href, text, cls = "") =>
      url(href)
        ? `<a class="${cls}" href="${esc(url(href))}" target="_blank" rel="noopener noreferrer">${text}</a>`
        : `<span class="${cls}">${text}</span>`;
    const allTopics = [
      ...new Set(data.map((file) => file.topic).filter(Boolean)),
    ];
    function announce(message) {
      const target = container.querySelector("[data-cf-status]");
      if (target) target.textContent = message;
    }
    async function copyText(text) {
      try {
        if (typeof callbacks.onCopy === "function")
          await callbacks.onCopy(text);
        else await navigator.clipboard.writeText(text);
        announce("Citation copied.");
      } catch {
        announce(
          "Copy is unavailable in this browser. Select the source text to copy it manually.",
        );
      }
    }
    function beginReveal() {
      observer?.disconnect();
      const cards = container.querySelectorAll(".cf-reveal");
      if (
        matchMedia("(prefers-reduced-motion: reduce)").matches ||
        !("IntersectionObserver" in window)
      ) {
        cards.forEach((card) => card.classList.add("is-visible"));
        return;
      }
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          }),
        { threshold: 0.07 },
      );
      cards.forEach((card) => observer.observe(card));
    }
    function updateURL() {
      const params = new URLSearchParams(location.search);
      params.delete("q");
      params.delete("topic");
      if (state.query) params.set("q", state.query);
      if (state.topic) params.set("topic", state.topic);
      history.replaceState(
        null,
        "",
        location.pathname + (params.size ? "?" + params : "") + location.hash,
      );
    }
    function match(file) {
      const haystack = [
        file.title,
        file.subtitle,
        file.summary,
        file.topic,
        ...list(file.tags),
        ...keyFacts(file).map((fact) => fact.text),
        ...sections(file).flatMap((section) =>
          paragraphs(section).map((paragraph) => paragraph.text),
        ),
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!state.topic || file.topic === state.topic) &&
        state.query
          .toLowerCase()
          .trim()
          .split(/\s+/)
          .every((word) => haystack.includes(word))
      );
    }
    function card(file) {
      const fact = keyFacts(file)[0];
      const release = humanDate(file.releaseDate);
      return `<article class="cf-folder cf-reveal" style="--cf-order:${data.indexOf(file) % 3}"><div class="cf-folder-tab"><span>RECORD / ${indexCode(file)}</span><span class="cf-tab-dot"></span></div><a class="cf-folder-link" href="casefiles.html?id=${encodeURIComponent(file.id)}"><div class="cf-folder-topline"><span>${esc(file.topic || "Historical records")}</span><span class="cf-folder-arrow">${icons("arrow")}</span></div><div class="cf-folder-title"><span class="cf-period">${esc(file.period || "Historical collection")}</span><h2>${esc(file.title)}</h2><p>${esc(file.subtitle || file.summary)}</p></div>${fact ? `<div class="cf-folder-finding"><span class="cf-label">IN THE PUBLIC RECORD</span><p>${esc(fact.text)}</p></div>` : ""}<div class="cf-folder-bottom"><span>${sources(file).length} CITED RECORD${sources(file).length === 1 ? "" : "S"}</span><span>${release ? "RELEASED " + esc(release).toUpperCase() : "MULTIPLE RELEASES / SEE SOURCES"}</span></div></a></article>`;
    }
    function indexResults() {
      const files = data.filter(match);
      const target = container.querySelector("[data-cf-results]");
      if (!target) return;
      target.innerHTML = files.length
        ? files.map(card).join("")
        : `<div class="cf-empty"><span class="cf-label">NO MATCHING FILES</span><h2>Try another thread.</h2><p>Search a program name, institution, topic or phrase from the record.</p><button class="cf-action" data-cf-reset>Reset the library ${icons("arrow")}</button></div>`;
      container.querySelector("[data-cf-count]").textContent =
        `${files.length} OF ${data.length} CASE FILES`;
      container
        .querySelectorAll("[data-cf-topic]")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(button.dataset.cfTopic === state.topic),
          ),
        );
      updateURL();
      beginReveal();
    }
    function renderIndex() {
      const uniquePublishers = new Set(
        data.flatMap((file) => sources(file).map((source) => source.publisher)),
      ).size;
      const sourceTotal = data.reduce(
        (total, file) => total + sources(file).length,
        0,
      );
      container.innerHTML = `<section class="cf-library" aria-labelledby="cf-library-title"><header class="cf-library-hero"><div class="cf-library-intro"><div class="cf-kicker"><span class="cf-kicker-square"></span>THE RELEASED RECORD / SPECIAL COLLECTION</div><h1 id="cf-library-title">The files were real.<br><span>So were the questions.</span></h1><p class="cf-library-description">Go inside the public record of intelligence programs, official investigations and decisions made behind closed doors. Read what the released evidence establishes, with the sources attached.</p><div class="cf-library-statline"><span><strong>${data.length}</strong> CASE FILES</span><span><strong>${sourceTotal}</strong> CITED RECORDS</span><span><strong>${uniquePublishers}</strong> PUBLISHERS</span></div></div><div class="cf-register-graphic" aria-hidden="true"><div class="cf-graphic-sheet cf-sheet-back"></div><div class="cf-graphic-sheet cf-sheet-mid"></div><div class="cf-graphic-sheet cf-sheet-front"><div class="cf-graphic-class">PUBLIC RECORD</div><div class="cf-graphic-word">EVIDENCE<br>REGISTER.</div><div class="cf-graphic-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="cf-graphic-stamp">RELEASED<br>FOR RESEARCH</div><div class="cf-graphic-footer">GOVINT / ${String(data.length).padStart(3, "0")} FILES</div></div><div class="cf-graphic-cross cf-cross-one">+</div><div class="cf-graphic-cross cf-cross-two">+</div></div></header><div class="cf-library-controls"><label class="cf-search"><span class="cf-sr-only">Search historical case files</span>${icons("search")}<input type="search" data-cf-search placeholder="Search a program, institution or passage…" autocomplete="off" value="${esc(state.query)}"><kbd>/</kbd></label><div class="cf-control-note"><span class="cf-label">SOURCE-CITED HISTORICAL RESEARCH</span><span>Public documents. Explicit limits.</span></div></div><div class="cf-topics" aria-label="Filter case file topic"><button data-cf-topic="" aria-pressed="${!state.topic}">All files</button>${allTopics.map((topic) => `<button data-cf-topic="${esc(topic)}" aria-pressed="${state.topic === topic}">${esc(topic)}</button>`).join("")}</div><div class="cf-register-heading"><span class="cf-label">COLLECTION INDEX</span><span data-cf-count role="status" aria-live="polite"></span></div><div class="cf-folders" data-cf-results></div><div class="cf-library-footnote"><span class="cf-footnote-mark">[ i ]</span><p>“Declassified” describes a release status. It does not make every statement in a historical record accurate. Each case separates documented facts, contemporary claims and unresolved questions.</p></div><div class="cf-status cf-sr-only" data-cf-status role="status" aria-live="polite"></div></section>`;
      container.querySelector("[data-cf-search]").addEventListener(
        "input",
        (event) => {
          state.query = event.target.value;
          indexResults();
        },
        { signal: scope.signal },
      );
      indexResults();
    }
    function sourceRegister(file) {
      return `<section class="cf-source-register" id="record-sources"><div class="cf-section-heading"><span class="cf-label">THE EVIDENCE REGISTER</span><span>${sources(file).length} CITED SOURCES</span></div>${sources(
        file,
      )
        .map(
          (source, i) =>
            `<article class="cf-source-entry" id="${esc(sourceAnchor(source.id))}"><div class="cf-source-number">${String(i + 1).padStart(2, "0")}</div><div class="cf-source-content"><div class="cf-source-publisher">${esc(source.publisher || "Publisher not supplied")}<span>${esc(source.documentType || "Public record")}</span></div><h3>${external(source.url, esc(source.title || source.url))}</h3>${source.verificationNotes ? `<p>${esc(source.verificationNotes)}</p>` : ""}<div class="cf-source-linkline">${external(source.url, `Open publisher record ${icons("external")}`, "cf-text-link")}${source.checkedAt ? `<span>ENTRY CHECK / ${esc(source.checkedAt)}</span>` : ""}</div></div><button class="cf-copy-source" data-cf-copy-source="${esc(source.id)}" aria-label="Copy citation for source ${i + 1}">${icons("copy")}</button></article>`,
        )
        .join("")}</section>`;
    }
    function renderDetail(file) {
      const release = humanDate(file.releaseDate);
      const related = list(file.relatedDossiers);
      const sectionList = sections(file);
      const facts = keyFacts(file);
      document.title = `${file.title} — GovINT released records`;
      container.innerHTML = `<article class="cf-record"><nav class="cf-record-breadcrumb" aria-label="Case file navigation"><a href="casefiles.html">${icons("back")}THE RELEASED RECORD</a><span>FILE / ${indexCode(file)}</span></nav><header class="cf-record-header"><div class="cf-kicker"><span class="cf-kicker-square"></span>${esc(file.topic || "HISTORICAL RECORDS")}<span class="cf-record-status">PUBLIC / RELEASED RECORDS</span></div><h1>${esc(file.title)}</h1><p class="cf-record-subtitle">${esc(file.subtitle || "")}</p><div class="cf-record-meta"><div><span class="cf-label">PERIOD EXAMINED</span><strong>${esc(file.period || "See individual records")}</strong></div><div><span class="cf-label">RELEASE CONTEXT</span><strong>${release ? esc(release) : "Multiple records / see source register"}</strong></div><div><span class="cf-label">SOURCE BASE</span><strong>${sources(file).length} cited records · ${sectionList.length} research sections</strong></div></div></header><div class="cf-record-layout"><nav class="cf-reading-nav" aria-label="On this case file"><span class="cf-label">IN THIS FILE</span><a href="#record-summary">01 <span>The record</span></a><a href="#record-findings">02 <span>Established facts</span></a>${sectionList.map((section, i) => `<a href="#record-section-${i + 1}">${String(i + 3).padStart(2, "0")} <span>${esc(section.heading)}</span></a>`).join("")}<a href="#record-sources">${String(sectionList.length + 3).padStart(2, "0")} <span>Evidence register</span></a></nav><div class="cf-record-reading"><section class="cf-record-summary" id="record-summary"><div class="cf-label">THE RECORD / CONTEXT & SIGNIFICANCE</div><p>${esc(file.summary || "")}</p></section><section class="cf-key-findings" id="record-findings"><div class="cf-section-heading"><span class="cf-label">WHAT THE RECORD ESTABLISHES</span><span>${facts.length} KEY FINDINGS</span></div>${facts.map((fact, i) => `<div class="cf-finding"><span class="cf-finding-index">${String(i + 1).padStart(2, "0")}</span><p>${esc(fact.text)} ${citation(file, [fact.sourceId])}</p></div>`).join("")}</section>${sectionList
        .map(
          (section, i) =>
            `<section class="cf-narrative-section" id="record-section-${i + 1}"><div class="cf-section-number">${String(i + 1).padStart(2, "0")} / THE DOCUMENTARY TRAIL</div><h2>${esc(section.heading)}</h2>${paragraphs(
              section,
            )
              .map(
                (paragraph) =>
                  `<p>${esc(paragraph.text)} ${citation(file, Array.isArray(paragraph.sourceIds) ? paragraph.sourceIds : [])}</p>`,
              )
              .join("")}</section>`,
        )
        .join(
          "",
        )}${sourceRegister(file)}<div class="cf-record-end"><span>END OF FILE / ${indexCode(file)}</span><a href="casefiles.html">Return to the collection ${icons("arrow")}</a></div></div><aside class="cf-evidence-aside"><div class="cf-aside-card"><span class="cf-label">WORK WITH THIS FILE</span><button class="cf-action cf-action-primary" data-cf-copy-file>${icons("copy")}Copy source bibliography</button><button class="cf-action" data-cf-download>${icons("download")}Export case file JSON</button>${typeof callbacks.onSaveNote === "function" ? `<button class="cf-action" data-cf-save>${icons("bookmark")}Save research lead</button>` : ""}<a class="cf-action" href="connections.html?trail=${encodeURIComponent(related[0] || "paper-trail")}">Explore source connections ${icons("arrow")}</a></div>${
        list(file.limitations).length
          ? `<section class="cf-aside-card cf-evidence-limits"><div class="cf-aside-marker">!</div><h2>Where the record stops.</h2><ul>${list(
              file.limitations,
            )
              .map((limitation) => `<li>${esc(limitation)}</li>`)
              .join("")}</ul></section>`
          : ""
      }${
        list(file.openQuestions).length
          ? `<section class="cf-aside-card cf-open-questions"><span class="cf-label">QUESTIONS STILL OPEN</span><ol>${list(
              file.openQuestions,
            )
              .map((question) => `<li>${esc(question)}</li>`)
              .join("")}</ol></section>`
          : ""
      }${related.length ? `<section class="cf-aside-card"><span class="cf-label">KEEP INVESTIGATING</span>${related.map((id) => `<a class="cf-related-trail" href="dossiers.html?id=${encodeURIComponent(id)}">${esc(id.replaceAll("-", " "))} ${icons("arrow")}</a>`).join("")}</section>` : ""}<div class="cf-aside-note"><span>[ i ]</span><p>This is source-cited historical research, not access to classified systems or a claim of a current intelligence operation.</p></div></aside></div><div class="cf-status" data-cf-status role="status" aria-live="polite"></div></article>`;
    }
    const fileID = new URLSearchParams(location.search).get("id");
    const selected = data.find((file) => file.id === fileID);
    if (fileID && !selected) {
      container.innerHTML = `<div class="cf-empty"><span class="cf-label">FILE NOT FOUND</span><h1>This record is not in the collection.</h1><p>Return to the released record library to choose an available case file.</p><a class="cf-action" href="casefiles.html">Open the collection ${icons("arrow")}</a></div>`;
    } else if (selected) renderDetail(selected);
    else renderIndex();
    container.addEventListener(
      "click",
      async (event) => {
        const topic = event.target.closest("[data-cf-topic]");
        if (topic) {
          state.topic = topic.dataset.cfTopic;
          indexResults();
          return;
        }
        if (event.target.closest("[data-cf-reset]")) {
          state = { query: "", topic: "" };
          container.querySelector("[data-cf-search]").value = "";
          indexResults();
          return;
        }
        if (!selected) return;
        const copySource = event.target.closest("[data-cf-copy-source]");
        const bibliography = sources(selected)
          .map(
            (source, i) =>
              `[${i + 1}] ${source.publisher || ""}. “${source.title || ""}.” ${source.documentType || "Public record"}. ${source.url || ""}${source.checkedAt ? " Entry point checked " + source.checkedAt + "." : ""}`,
          )
          .join("\n\n");
        if (copySource) {
          const source = sources(selected).find(
            (source) => source.id === copySource.dataset.cfCopySource,
          );
          if (source)
            await copyText(
              `${source.publisher || ""}. “${source.title || ""}.” ${source.documentType || "Public record"}. ${source.url || ""}`,
            );
        }
        if (event.target.closest("[data-cf-copy-file]"))
          await copyText(
            `${selected.title}\n${location.href}\n\n${bibliography}`,
          );
        if (event.target.closest("[data-cf-download]")) {
          const blob = new Blob([JSON.stringify(selected, null, 2) + "\n"], {
            type: "application/json",
          });
          const blobURL = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = blobURL;
          anchor.download = "govint-casefile-" + selected.id + ".json";
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(blobURL), 1000);
          announce("Case file JSON exported.");
        }
        if (
          event.target.closest("[data-cf-save]") &&
          typeof callbacks.onSaveNote === "function"
        ) {
          try {
            await callbacks.onSaveNote(selected);
            announce("Research lead saved to your workspace.");
          } catch {
            announce(
              "The research lead could not be saved. Export the case file to retain a copy.",
            );
          }
        }
      },
      { signal: scope.signal },
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "/" &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.target.closest(
            'input,textarea,select,[contenteditable="true"]',
          ) &&
          !document.querySelector("dialog[open]")
        ) {
          const input = container.querySelector("[data-cf-search]");
          if (input) {
            event.preventDefault();
            input.focus();
          }
        }
      },
      { signal: scope.signal },
    );
    return {
      destroy() {
        scope.abort();
        observer?.disconnect();
        container.replaceChildren();
      },
    };
  }
  window.GovINTCasefiles = { mount };
})();
