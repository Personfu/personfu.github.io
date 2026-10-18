/* Original offline case artifacts. ZIP entries are stored, never executed. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CW_ASCENSION_DOWNLOADS = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function bytes(value) { return typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value); }
  function join(parts) { var out = new Uint8Array(parts.reduce(function (n, p) { return n + p.length; }, 0)), at = 0; parts.forEach(function (p) { out.set(p, at); at += p.length; }); return out; }
  function json(value) { return JSON.stringify(value, null, 2) + '\n'; }
  function crc32(data) { var crc = 0xffffffff; bytes(data).forEach(function (b) { crc ^= b; for (var j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }); return (crc ^ 0xffffffff) >>> 0; }
  function zip(files) {
    var local = [], central = [], offset = 0;
    files.forEach(function (file) {
      var name = bytes(file.name), data = bytes(file.data), crc = crc32(data), h = new Uint8Array(30), v = new DataView(h.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(10, 0, true); v.setUint16(12, 33, true); v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true); v.setUint16(26, name.length, true);
      local.push(h, name, data);
      var c = new Uint8Array(46), cv = new DataView(c.buffer); cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(14, 33, true); cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.push(c, name); offset += h.length + name.length + data.length;
    });
    var directory = join(central), end = new Uint8Array(22), ev = new DataView(end.buffer); ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, directory.length, true); ev.setUint32(16, offset, true); return join(local.concat([directory, end]));
  }
  function csv(rows) { return rows.map(function (row) { return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n') + '\r\n'; }
  function fromHex(hex) { return new Uint8Array(hex.match(/../g).map(function (pair) { return parseInt(pair, 16); })); }
  function pcap(packets) {
    var header = new Uint8Array(24), hv = new DataView(header.buffer); hv.setUint32(0, 0xa1b2c3d4, true); hv.setUint16(4, 2, true); hv.setUint16(6, 4, true); hv.setUint32(16, 65535, true); hv.setUint32(20, 101, true);
    var out = [header];
    packets.forEach(function (p, index) {
      var payload = bytes(json(p)), ip = new Uint8Array(28 + payload.length), view = new DataView(ip.buffer), destination = p.dst.split(':');
      ip[0] = 0x45; view.setUint16(2, ip.length); view.setUint16(4, index + 1); ip[8] = 64; ip[9] = 17;
      ip.set(p.src.split('.').map(Number), 12); ip.set(destination[0].split('.').map(Number), 16);
      var sum = 0; for (var i = 0; i < 20; i += 2) sum += view.getUint16(i); while (sum >>> 16) sum = (sum & 65535) + (sum >>> 16); view.setUint16(10, (~sum) & 65535);
      view.setUint16(20, 40000 + index); view.setUint16(22, Number(destination[1])); view.setUint16(24, payload.length + 8); ip.set(payload, 28);
      var record = new Uint8Array(16), rv = new DataView(record.buffer), timestamp = Number(p.time); rv.setUint32(0, Math.floor(timestamp), true); rv.setUint32(4, Math.round((timestamp % 1) * 1000000), true); rv.setUint32(8, ip.length, true); rv.setUint32(12, ip.length, true); out.push(record, ip);
    }); return join(out);
  }
  function artifacts(m) {
    var files = [{ name: 'mission-brief.txt', data: 'CYBERWORLD / OPERATION BLACK FREIGHT\nACT ' + m.act + ' / ' + m.title + '\n\n' + m.brief + '\n\nOBJECTIVE\n' + m.objective + '\n\nAll evidence is synthetic local training data. No live targets. This pack contains evidence, not an answer key. Open text files in an editor; do not run supplied pseudocode.\n' }];
    function add(name, data) { files.push({ name: name, data: data }); }
    if (m.kind === 'packets') {
      add('dispatcher-capture.pcap', pcap(m.packets)); add('packet-records.csv', csv([['time_seconds', 'source', 'destination', 'recorded_protocol', 'sequence', 'payload']].concat(m.packets.map(function (p) { return [p.time, p.src, p.dst, p.protocol, p.seq, p.payload]; })))); add('packet-records.json', json(m.packets)); add('endpoint.log', m.log + '\n');
      add('capture-format.txt', 'The valid PCAP contains six raw IPv4/UDP envelopes (LINKTYPE_RAW 101), one per displayed mission record, in arrival order. Each UDP payload is the exact original record as UTF-8 JSON, including its recorded protocol, sequence and hex payload. These are synthetic teaching envelopes, not a real HTTPS/TLS session. UDP checksums are zero, permitted for IPv4. Use packet-records.csv as the canonical protocol labels. SIM payloads are hexadecimal fragments.\n');
    } else if (m.kind === 'artifact') { add('reviewed-updater.js.txt', m.before + '\n'); add('delivered-updater.js.txt', m.after + '\n'); add('signature-status.json', json({ reviewed: 'valid', delivered: 'valid', note: 'Compare behavior independently of signature status.' })); }
    else if (m.kind === 'dns') add('resolver-observations.csv', csv([['time', 'observer', 'name', 'answer', 'cache_metadata']].concat(m.records)));
    else if (m.kind === 'crypto') { add('cipher-1.bin', fromHex(m.cipher1)); add('cipher-2.bin', fromHex(m.cipher2)); add('known-plaintext.txt', m.plain1); add('cipher-observations.json', json({ cipher1_hex: m.cipher1, cipher2_hex: m.cipher2, known_plaintext: m.plain1, operation: 'P2 = C1 XOR C2 XOR P1' })); }
    else if (m.kind === 'bounds') { add('route-parser.js.txt', m.code + '\n'); add('boundary-inputs.json', json({ routes: ['NORTH', 'EAST', 'WEST'], test_indices: [-1, 0, 2, 3, 1.5], task: 'Choose a safe predicate before reading a route. Record acceptance or rejection for each input.' })); }
    else if (m.kind === 'supply') { add('reviewed-build.bin', m.sourceArtifact); add('customer-package.bin', m.customerArtifact); add('trusted-manifest.sha256', m.expectedDigest + '  reviewed-build.bin\n'); add('custody-chain.txt', m.chain.join('\n') + '\n'); }
    else add('incident-evidence.json', json({ observations: m.evidence, task: 'Order the labeled observations chronologically. Assess attribution confidence independently.' }));
    add('artifact-manifest.json', json({ format: 'cyberworld-case-pack-v1', case_id: m.id, content_version: 1, synthetic: true, files: files.map(function (f) { var b = bytes(f.data); return { name: f.name, bytes: b.length, crc32: crc32(b).toString(16).padStart(8, '0') }; }) })); return files;
  }
  function escape(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function reward(m, completed, handle) {
    if (!completed) throw new Error('File this case before downloading its earned reward.');
    var callsign = String(handle || 'LOCAL OPERATIVE').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 32), safe = escape(callsign);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="#07161f"/><path d="M480 65 660 130 630 355 480 445 330 355 300 130Z" fill="#102d39" stroke="#5eead4" stroke-width="5"/><text x="480" y="198" text-anchor="middle" fill="#5eead4" font-family="monospace" font-size="22">CYBERWORLD</text><text x="480" y="288" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="64">' + escape(m.act) + '</text><text x="480" y="355" text-anchor="middle" fill="#5eead4" font-family="monospace" font-size="19">CASE VERIFIED</text><text x="480" y="493" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="25">' + escape(m.badge) + '</text><text x="480" y="537" text-anchor="middle" fill="#5eead4" font-family="monospace" font-size="20">' + safe + '</text><text x="480" y="597" text-anchor="middle" fill="#92a9b6" font-family="monospace" font-size="14">ORIGINAL GAME ACHIEVEMENT / NO AGENCY AFFILIATION</text></svg>';
    return [{ name: m.id + '-badge.svg', data: svg }, { name: 'achievement-certificate.txt', data: 'CYBERWORLD / INDEPENDENT GAME ACHIEVEMENT\n\nOperative: ' + callsign + '\nCase: ' + m.title + '\nAchievement: ' + m.badge + '\nModule: ' + m.reward.item + '\n\n' + m.defense + '\n\nThis original CyberWorld souvenir is not an official agency award, qualification, or certification. Local completion receipt only; not a verified online credential.\n' }, { name: 'module-receipt.json', data: json({ format: 'cyberworld-earned-module-v1', case_id: m.id, callsign: callsign, module: m.reward.item, badge: m.badge, xp: m.reward.xp, credits: m.reward.credits, completion: 'recorded-on-this-device', official_certification: false }) }];
  }
  function controls(m, completed) { return '<section class="cwas-artifact-tools" aria-label="Case files"><div><span class="cwas-eyebrow">TAKE THE EVIDENCE WITH YOU</span><p>Real files for offline analysis. Generated in your browser from this case’s evidence.</p></div><div class="cwas-actions"><button type="button" class="cwas-btn" data-action="case-download" data-value="' + m.id + '">Download mission pack / ZIP</button><button type="button" class="cwas-btn" data-action="case-inspect" data-value="' + m.id + '">Open evidence inspector</button>' + (completed ? '<button type="button" class="cwas-btn" data-action="reward-download" data-value="' + m.id + '">Download earned badge + module</button>' : '<span class="cwas-fine">Badge files unlock after you file the case.</span>') + '</div></section>'; }
  function download(win, name, content, type) { var url = win.URL.createObjectURL(new win.Blob([bytes(content)], { type: type || 'application/octet-stream' })), a = win.document.createElement('a'); a.href = url; a.download = name; win.document.body.appendChild(a); a.click(); a.remove(); win.setTimeout(function () { win.URL.revokeObjectURL(url); }, 1000); }
  function mount(win, container, m) {
    var files = artifacts(m), selected = 0, mode = 'text', query = '';
    container.innerHTML = '<div class="cwas-inspector-controls"><label class="cwas-field">Artifact<select data-evidence-file>' + files.map(function (f, i) { return '<option value="' + i + '">' + escape(f.name) + ' / ' + bytes(f.data).length + ' bytes</option>'; }).join('') + '</select></label><label class="cwas-field">Search UTF-8 evidence<input data-evidence-search type="search" maxlength="120" placeholder="Find a source, token, or observation"></label></div><div class="cwas-actions"><button type="button" class="cwas-btn" data-evidence-mode="text" aria-pressed="true">Text / UTF-8</button><button type="button" class="cwas-btn" data-evidence-mode="hex" aria-pressed="false">Hex + ASCII</button><button type="button" class="cwas-btn" data-evidence-download>Download selected file</button></div><p data-evidence-summary role="status" aria-live="polite"></p><pre class="cwas-byte-view" tabindex="0" aria-label="Selected artifact content" data-evidence-output></pre>';
    function render() {
      var file = files[selected], raw = bytes(file.data), text = new win.TextDecoder().decode(raw), output = text, hits = query ? text.toLowerCase().split(query.toLowerCase()).length - 1 : 0;
      if (mode === 'hex') { var lines = []; for (var at = 0; at < raw.length; at += 16) { var row = Array.from(raw.slice(at, at + 16)); lines.push(at.toString(16).padStart(6, '0') + '  ' + row.map(function (b) { return b.toString(16).padStart(2, '0'); }).join(' ').padEnd(47, ' ') + '  ' + row.map(function (b) { return b >= 32 && b < 127 ? String.fromCharCode(b) : '.'; }).join('')); } output = lines.join('\n'); }
      else if (query) output = text.split(/\r?\n/).map(function (line, i) { return { line: line, index: i + 1 }; }).filter(function (row) { return row.line.toLowerCase().indexOf(query.toLowerCase()) >= 0; }).map(function (row) { return row.index + ' | ' + row.line; }).join('\n') || 'No matching lines. Clear search to view the entire artifact.';
      container.querySelector('[data-evidence-output]').textContent = output;
      container.querySelector('[data-evidence-summary]').textContent = file.name + ' · ' + raw.length + ' bytes · CRC32 ' + crc32(raw).toString(16).padStart(8, '0') + (query ? ' · ' + hits + ' text matches' : '') + (mode === 'hex' ? ' · offsets are hexadecimal; all raw bytes shown' : '');
      container.querySelectorAll('[data-evidence-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.evidenceMode === mode)); });
    }
    container.querySelector('[data-evidence-file]').addEventListener('change', function (e) { selected = Number(e.target.value); render(); }); container.querySelector('[data-evidence-search]').addEventListener('input', function (e) { query = e.target.value; render(); }); container.querySelectorAll('[data-evidence-mode]').forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.evidenceMode; render(); }); }); container.querySelector('[data-evidence-download]').addEventListener('click', function () { var f = files[selected]; download(win, f.name, f.data); }); render();
  }
  return { artifacts: artifacts, reward: reward, controls: controls, mount: mount, download: download, zip: zip, crc32: crc32, pcap: pcap };
}));
