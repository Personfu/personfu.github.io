/* FLLC // PERSONFU — Feed Loader
   Loads JSON data files and renders them into tables/cards */
(function () {
  'use strict';
  var DATA = 'data/latest/';

  /* ── HTML entity escaping to prevent XSS from feed data ── */
  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    return s == null ? '' : String(s).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; });
  }
  function escUrl(u) {
    if (!u) return '#';
    var s = String(u).trim();
    if (/^https?:\/\//i.test(s)) return esc(s);
    if (s.charAt(0) === '/') return esc(s);
    return '#';
  }

  function loadJSON(file, cb) {
    fetch(DATA + file)
      .then(function (r) { if (r.ok) return r.json(); throw r.status; })
      .then(cb)
      .catch(function () {});
  }

  /* Load from an explicit relative path (no prefix) */
  function loadFile(path, cb) {
    fetch(path)
      .then(function (r) { if (r.ok) return r.json(); throw r.status; })
      .then(cb)
      .catch(function () {});
  }

  /* ── Render advisory table ── */
  function renderAdvisoryTable(containerId, items, opts) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!items || !items.length) { el.innerHTML = '<div class="loading">No items yet</div>'; return; }
    opts = opts || {};
    var limit = opts.limit || items.length;
    var showSource = opts.showSource !== false;
    var h = '<table class="data-tbl"><thead><tr>';
    if (showSource) h += '<th>Source</th>';
    h += '<th>Title</th><th>Date</th>';
    if (opts.showTags) h += '<th>Tags</th>';
    h += '</tr></thead><tbody>';
    items.slice(0, limit).forEach(function (item) {
      h += '<tr>';
      if (showSource) {
        var src = esc(item.source || item.agency || '').toUpperCase();
        var cls = src.toLowerCase().replace(/[^a-z]/g, '');
        h += '<td><span class="src-badge ' + cls + '">' + src + '</span></td>';
      }
      h += '<td><a href="' + escUrl(item.url || item.link) + '" target="_blank" rel="noopener">' + esc(item.title || 'Untitled') + '</a></td>';
      h += '<td class="mono text-muted" style="white-space:nowrap">' + esc((item.published || item.date || '').slice(0, 10)) + '</td>';
      if (opts.showTags && item.tags) {
        h += '<td>';
        item.tags.forEach(function (t) {
          var cls = mapTagClass(t);
          h += '<span class="tag ' + cls + '">' + esc(t) + '</span> ';
        });
        h += '</td>';
      }
      h += '</tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  function mapTagClass(tag) {
    var m = {
      cybersecurity: 'tag-cyber', 'critical-infrastructure': 'tag-infra',
      'law-enforcement': 'tag-law', transportation: 'tag-transport',
      aviation: 'tag-aviation', weather: 'tag-weather',
      'domains-dns': 'tag-domains', 'public-safety': 'tag-safety',
      policy: 'tag-policy', research: 'tag-research'
    };
    return m[tag] || 'tag-research';
  }

  /* ── Render KPI from data ── */
  function setKPI(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = typeof value === 'number' ? value.toLocaleString() : value;
  }

  /* ── Render domain table ── */
  function renderDomainTable(containerId, items, limit) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!items || !items.length) { el.innerHTML = '<div class="loading">No domain data</div>'; return; }
    var h = '<table class="data-tbl"><thead><tr><th>Domain</th><th>Organization</th><th>State</th><th>Type</th></tr></thead><tbody>';
    items.slice(0, limit || 200).forEach(function (d) {
      var safeDomain = esc(d.domain);
      h += '<tr><td><a href="https://' + safeDomain + '" target="_blank" rel="noopener">' + safeDomain + '</a></td>';
      h += '<td>' + esc(d.organization_name) + '</td>';
      h += '<td>' + esc(d.state) + '</td>';
      h += '<td>' + esc(d.domain_type) + '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  /* ── Build camera image URL from data ── */
  function buildCameraSrc(cam) {
    if (cam.type === 'direct-image' && cam.baseUrl && cam.id != null) {
      return cam.baseUrl + cam.id + '?t=' + Date.now();
    }
    if (cam.snapshot_url) return cam.snapshot_url;
    return '';
  }

  /* ── Render live camera grid with auto-refresh ── */
  function renderCameras(containerId, items) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!items || !items.length) { el.innerHTML = '<div class="loading">No camera data</div>'; return; }
    el.innerHTML = '';
    items.forEach(function (cam) {
      var card = document.createElement('div');
      card.className = 'cam-card';

      var thumbDiv = document.createElement('div');
      thumbDiv.className = 'cam-thumb';

      var src = buildCameraSrc(cam);
      if (src) {
        var img = document.createElement('img');
        img.className = 'camera-thumb';
        img.alt = cam.title || cam.camera_name || '';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.src = src;
        img.addEventListener('error', function () {
          img.style.opacity = '0.35';
          img.alt = 'Camera unavailable';
          if (!img.dataset.retried) {
            img.dataset.retried = '1';
            setTimeout(function () {
              img.src = buildCameraSrc(cam);
            }, 5000);
          }
        });
        thumbDiv.appendChild(img);
        // Auto-refresh every 30s for direct-image cameras
        if (cam.type === 'direct-image') {
          setInterval(function () {
            img.src = buildCameraSrc(cam);
            img.dataset.retried = '';
          }, cam.refreshMs || 30000);
        }
      } else {
        thumbDiv.textContent = '\uD83D\uDCF9 ' + (cam.title || cam.camera_name || 'Camera');
      }
      card.appendChild(thumbDiv);

      var info = document.createElement('div');
      info.className = 'cam-info';
      info.innerHTML =
        '<div class="cam-name">' + esc(cam.title || cam.camera_name) + '</div>' +
        '<div class="cam-agency">' + esc(cam.agency) + ' &middot; ' + esc(cam.state) + '</div>' +
        '<div class="cam-link"><a href="' + escUrl(cam.page_url) + '" target="_blank" rel="noopener">View on official page &rarr;</a></div>';
      card.appendChild(info);
      el.appendChild(card);
    });
  }

  /* ── Expose ── */
  window.FeedLoader = {
    loadJSON: loadJSON,
    loadFile: loadFile,
    renderAdvisoryTable: renderAdvisoryTable,
    renderDomainTable: renderDomainTable,
    renderCameras: renderCameras,
    setKPI: setKPI
  };
})();
