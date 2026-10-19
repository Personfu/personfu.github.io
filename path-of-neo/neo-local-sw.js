/* Local-only game archive reader. No game file is sent to a network server. */
'use strict';

const SCOPE = new URL(self.registration.scope);
const CACHE_LIMIT = 2 * 1024 * 1024 * 1024;
const LOG_LIMIT = 2 * 1024 * 1024;
const DATABASE = 'neo-local-v1:' + SCOPE.pathname;
const EXCLUDED = new Set(['d3d9.dll', 'dinput8.dll']);
let databasePromise, directoryPromise, archivePromise, metadataPromise;
let budgetTail = Promise.resolve();
let logTail = Promise.resolve();
let settingsTail = Promise.resolve();
let clearing = false;
let storageGeneration = 0;
const pending = new Map();
const reservations = new Map();
const leases = new Map();

function database() {
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('settings');
      request.result.createObjectStore('cache', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

async function dbOperation(store, operation, value, key) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, operation === 'get' || operation === 'getAll' ? 'readonly' : 'readwrite');
    const objectStore = transaction.objectStore(store);
    let request;
    if (operation === 'put') request = key === undefined ? objectStore.put(value) : objectStore.put(value, key);
    else if (operation === 'delete') request = objectStore.delete(key);
    else if (operation === 'get') request = objectStore.get(key);
    else request = objectStore.getAll();
    let result;
    request.onsuccess = () => { result = request.result; };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = transaction.onabort = () => reject(transaction.error || request.error || new Error('Local storage transaction failed.'));
  });
}

async function digest(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function cacheDirectory() {
  if (!directoryPromise) directoryPromise = (async () => {
    const root = await navigator.storage.getDirectory();
    const application = await root.getDirectoryHandle('neo-local-player-v1', { create: true });
    const directory = await application.getDirectoryHandle((await digest(SCOPE.href)).slice(0, 32), { create: true });
    // A terminated worker can leave an uncommitted cache file without metadata.
    // Remove those files before any new writer starts; never touch source handles.
    const records = await metadata();
    for await (const [name, handle] of directory.entries()) {
      if (handle.kind === 'file' && /^[a-f0-9]{64}\.bin$/.test(name) && !records.has(name)) await directory.removeEntry(name);
    }
    return directory;
  })();
  return directoryPromise;
}

async function metadata() {
  if (!metadataPromise) metadataPromise = dbOperation('cache', 'getAll').then(records => new Map(records.map(record => [record.key, record])));
  return metadataPromise;
}

function withBudget(callback) {
  const operation = budgetTail.then(callback);
  budgetTail = operation.catch(() => {});
  return operation;
}

async function removeCache(record) {
  const dir = await cacheDirectory();
  try { await dir.removeEntry(record.key); } catch (error) { if (error.name !== 'NotFoundError') throw error; }
  (await metadata()).delete(record.key);
  await dbOperation('cache', 'delete', undefined, record.key);
}

async function reserve(key, size) {
  return withBudget(async () => {
    if (size > CACHE_LIMIT) throw new Error('This archive entry exceeds the 2 GiB local cache limit.');
    const records = await metadata();
    let used = Array.from(records.values()).reduce((sum, item) => sum + item.size, 0);
    const reserved = Array.from(reservations.values()).reduce((sum, bytes) => sum + bytes, 0);
    for (const record of Array.from(records.values()).sort((a, b) => a.lastAccess - b.lastAccess)) {
      if (used + reserved + size <= CACHE_LIMIT) break;
      if (pending.has(record.key) || (leases.get(record.key) || 0) > 0) continue;
      await removeCache(record);
      used -= record.size;
    }
    if (used + reserved + size > CACHE_LIMIT) throw new Error('The local cache is busy. Close other game tabs and try again.');
    reservations.set(key, size);
  });
}

function cleanPath(path) {
  if (!path || path.startsWith('/') || /[\\:\0]/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Unsafe or ambiguous archive path.');
  }
  return path;
}

function zipName(bytes, flags) {
  if (flags & 0x800) return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (bytes.some(byte => byte > 127)) throw new Error('This ZIP uses unsupported legacy filename encoding. Use an ASCII or UTF-8 archive.');
  return String.fromCharCode(...bytes);
}

function zipTime(date, time) {
  const month = (date >>> 5) & 15, day = date & 31;
  const hour = time >>> 11, minute = (time >>> 5) & 63, second = (time & 31) * 2;
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return 0;
  return Date.UTC(1980 + (date >>> 9), month - 1, day, hour, minute, second) / 1000;
}

async function parseZip(file) {
  if (file.size < 22) throw new Error('The selected file is not a ZIP archive.');
  const tailStart = Math.max(0, file.size - 65557);
  const tail = new Uint8Array(await file.slice(tailStart).arrayBuffer());
  const tailView = new DataView(tail.buffer);
  let end = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tailView.getUint32(i, true) === 0x06054b50 && i + 22 + tailView.getUint16(i + 20, true) === tail.length) { end = i; break; }
  }
  if (end < 0) throw new Error('ZIP directory footer was not found.');
  const count = tailView.getUint16(end + 10, true);
  const centralSize = tailView.getUint32(end + 12, true);
  const centralOffset = tailView.getUint32(end + 16, true);
  if (count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new Error('ZIP64 archives are not supported by this player.');
  if (tailView.getUint16(end + 4, true) || tailView.getUint16(end + 6, true) || tailView.getUint16(end + 8, true) !== count) throw new Error('Split ZIP archives are not supported.');
  if (centralSize > 32 * 1024 * 1024 || centralOffset + centralSize !== tailStart + end) throw new Error('Invalid or oversized ZIP directory.');
  const bytes = new Uint8Array(await file.slice(centralOffset, centralOffset + centralSize).arrayBuffer());
  if (bytes.length !== centralSize) throw new Error('ZIP directory is incomplete.');
  const view = new DataView(bytes.buffer);
  const files = [];
  let offset = 0;
  for (let index = 0; index < count; index++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Invalid ZIP directory entry.');
    const flags = view.getUint16(offset + 8, true);
    const nameLength = view.getUint16(offset + 28, true);
    const next = offset + 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    if (next > bytes.length) throw new Error('ZIP entry extends outside its directory.');
    const name = zipName(bytes.subarray(offset + 46, offset + 46 + nameLength), flags);
    const entry = { name, flags, method: view.getUint16(offset + 10, true), crc: view.getUint32(offset + 16, true), compressedSize: view.getUint32(offset + 20, true), size: view.getUint32(offset + 24, true), offset: view.getUint32(offset + 42, true), attributes: view.getUint32(offset + 38, true), mtime: zipTime(view.getUint16(offset + 14, true), view.getUint16(offset + 12, true)) };
    if (view.getUint16(offset + 34, true) || [entry.size, entry.compressedSize, entry.offset].includes(0xffffffff)) throw new Error('ZIP64 or split entries are not supported.');
    if (!name.endsWith('/')) files.push(entry);
    offset = next;
  }
  if (offset !== bytes.length) throw new Error('Unexpected ZIP directory data.');
  let candidates = files.filter(entry => /^(matrix3|matrix|pathofneo)\.exe$/i.test(entry.name.split('/').pop()));
  if (!candidates.length) candidates = files.filter(entry => /path of neo/i.test(entry.name) && /\.exe$/i.test(entry.name));
  candidates.sort((a, b) => a.name.split('/').length - b.name.split('/').length || a.name.length - b.name.length);
  if (!candidates.length) throw new Error('The ZIP does not contain the original game executable.');
  const executable = candidates[0].name;
  const prefix = executable.includes('/') ? executable.slice(0, executable.lastIndexOf('/') + 1) : '';
  const entries = new Map(), excluded = [], rejected = [];
  for (const entry of files) {
    if (!entry.name.startsWith(prefix)) continue;
    let path;
    try {
      path = cleanPath(entry.name.slice(prefix.length));
      if (entry.flags & 0x2041 || ((entry.attributes >>> 16) & 0xf000) === 0xa000) throw new Error('Unsupported encrypted or symbolic-link entry.');
    } catch { rejected.push(entry.name); continue; }
    const basename = path.split('/').pop().toLowerCase();
    if (EXCLUDED.has(basename) || basename.endsWith('.asi')) { excluded.push(path); continue; }
    if (entry.method !== 0 && entry.method !== 8) throw new Error('Unsupported ZIP compression method for ' + path);
    if (entry.method === 0 && entry.size !== entry.compressedSize) throw new Error('Stored ZIP entry has inconsistent sizes.');
    if (entry.size > CACHE_LIMIT) throw new Error('A game file exceeds the 2 GiB local cache limit: ' + path);
    if (entry.offset + 30 + entry.compressedSize > centralOffset) throw new Error('ZIP file data extends outside the archive.');
    const folded = path.toLowerCase();
    if (entries.has(folded)) throw new Error('Ambiguous case-insensitive ZIP path: ' + path);
    entries.set(folded, { ...entry, path });
  }
  for (const path of entries.keys()) {
    const parts = path.split('/');
    for (let index = 1; index < parts.length; index++) if (entries.has(parts.slice(0, index).join('/'))) throw new Error('ZIP path is both a file and a directory: ' + path);
  }
  if (!entries.has(executable.slice(prefix.length).toLowerCase())) throw new Error('The game executable is not a supported regular ZIP entry.');
  const manifest = Array.from(entries.values()).map(entry => ({ path: entry.path, size: entry.size, mtime: entry.mtime })).sort((a, b) => a.path.toLowerCase().localeCompare(b.path.toLowerCase()));
  return { file, entries, manifest, prefix, excluded, rejected, centralOffset, total: manifest.reduce((sum, entry) => sum + entry.size, 0) };
}

async function getArchive() {
  if (clearing) throw new Error('Local data is being cleared. Try again when it finishes.');
  const generation = storageGeneration;
  if (!archivePromise) archivePromise = (async () => {
    const record = await dbOperation('settings', 'get', undefined, 'zip');
    if (!record) throw new Error('Choose your local game ZIP first.');
    const file = await record.handle.getFile();
    if (file.size !== record.size || file.lastModified !== record.lastModified) throw new Error('The selected archive changed. Choose it again before starting.');
    return { ...await parseZip(file), selectionId: record.selectionId, record };
  })().catch(error => { archivePromise = undefined; throw error; });
  const archive = await archivePromise;
  // Handles persist across visits, but permission and the selected file can
  // change while this worker remains alive. Check before serving cached bytes.
  const file = await archive.record.handle.getFile();
  if (clearing || generation !== storageGeneration) throw new Error('Local data was cleared during this request. Choose your ZIP again.');
  if (file.size !== archive.record.size || file.lastModified !== archive.record.lastModified) {
    archivePromise = undefined;
    throw new Error('The selected archive changed. Choose it again before starting.');
  }
  return { ...archive, file };
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function updateCRC(crc, bytes) {
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return crc >>> 0;
}

async function entryStream(archive, entry) {
  const header = new DataView(await archive.file.slice(entry.offset, entry.offset + 30).arrayBuffer());
  if (header.byteLength !== 30 || header.getUint32(0, true) !== 0x04034b50 || header.getUint16(8, true) !== entry.method || header.getUint16(6, true) !== entry.flags) throw new Error('ZIP local header does not match its directory.');
  if (!(entry.flags & 8) && (header.getUint32(14, true) !== entry.crc || header.getUint32(18, true) !== entry.compressedSize || header.getUint32(22, true) !== entry.size)) throw new Error('ZIP local sizes or CRC do not match its directory.');
  const nameLength = header.getUint16(26, true);
  const nameBytes = new Uint8Array(await archive.file.slice(entry.offset + 30, entry.offset + 30 + nameLength).arrayBuffer());
  if (zipName(nameBytes, entry.flags) !== entry.name) throw new Error('ZIP local filename does not match its directory.');
  const start = entry.offset + 30 + nameLength + header.getUint16(28, true);
  if (start + entry.compressedSize > archive.centralOffset) throw new Error('Invalid ZIP data bounds.');
  const input = archive.file.slice(start, start + entry.compressedSize).stream();
  return entry.method === 8 ? input.pipeThrough(new DecompressionStream('deflate-raw')) : input;
}

async function cacheEntry(archive, entry) {
  if (clearing) throw new Error('Local data is being cleared. Try again when it finishes.');
  const generation = storageGeneration;
  const key = (await digest(archive.selectionId + ':' + entry.name + ':' + entry.crc + ':' + entry.size)) + '.bin';
  if (clearing || generation !== storageGeneration) throw new Error('Local data was cleared during this request. Choose your ZIP again.');
  if (pending.has(key)) {
    const cached = await pending.get(key);
    leases.set(key, (leases.get(key) || 0) + 1);
    return cached;
  }
  const work = (async () => {
    const records = await metadata();
    const dir = await cacheDirectory();
    const existing = records.get(key);
    if (existing) {
      try {
        const file = await (await dir.getFileHandle(key)).getFile();
        if (file.size === entry.size) {
          existing.lastAccess = Date.now();
          await dbOperation('cache', 'put', existing);
          return { key, file };
        }
      } catch (error) { if (error.name !== 'NotFoundError') throw error; }
      await withBudget(() => removeCache(existing));
    }
    await reserve(key, entry.size);
    let writer, reader;
    try {
      const handle = await dir.getFileHandle(key, { create: true });
      writer = await handle.createWritable();
      reader = (await entryStream(archive, entry)).getReader();
      let size = 0, crc = 0xffffffff;
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > entry.size) throw new Error('Inflated ZIP data exceeds its declared size.');
        crc = updateCRC(crc, next.value);
        await writer.write(next.value);
      }
      if (size !== entry.size || ((crc ^ 0xffffffff) >>> 0) !== entry.crc) throw new Error('ZIP data failed its size or CRC integrity check.');
      await writer.close();
      writer = null;
      const record = { key, size, lastAccess: Date.now(), selectionId: archive.selectionId };
      await withBudget(async () => { await dbOperation('cache', 'put', record); records.set(key, record); reservations.delete(key); });
      return { key, file: await handle.getFile() };
    } catch (error) {
      try { if (reader) await reader.cancel(); } catch {}
      try { if (writer) await writer.abort(); } catch {}
      try { await dir.removeEntry(key); } catch {}
      await withBudget(async () => { records.delete(key); try { await dbOperation('cache', 'delete', undefined, key); } finally { reservations.delete(key); } });
      throw error;
    }
  })();
  pending.set(key, work);
  try {
    const cached = await work;
    // Protect the file before resolving, including the gap before route resumes.
    leases.set(key, (leases.get(key) || 0) + 1);
    return cached;
  } finally { pending.delete(key); }
}

function resolveRange(header, size) {
  if (header === null) return { start: 0, stop: size, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || !size) throw new Error('Invalid byte range.');
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) throw new Error('Invalid suffix range.');
    return { start: Math.max(0, size - suffix), stop: size, partial: true };
  }
  const start = Number(match[1]), last = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(last) || start >= size || last < start) throw new Error('Range is outside the file.');
  return { start, stop: Math.min(size, last + 1), partial: true };
}

function headers(extra = {}) {
  return new Headers({ 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', ...extra });
}
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: headers({ 'Content-Type': 'application/json; charset=utf-8' }) });
}

function fileResponse(event, file, range, key) {
  const fields = { 'Content-Type': 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Content-Length': String(range.stop - range.start) };
  if (range.partial) fields['Content-Range'] = `bytes ${range.start}-${range.stop - 1}/${file.size}`;
  if (event.request.method === 'HEAD') return new Response(null, { status: range.partial ? 206 : 200, headers: headers(fields) });
  let body = file.slice(range.start, range.stop).stream();
  if (key) {
    const reader = body.getReader();
    let release;
    const lifetime = new Promise(resolve => { release = resolve; });
    let finished = false;
    const finish = () => { if (!finished) { finished = true; leases.set(key, Math.max(0, (leases.get(key) || 1) - 1)); release(); } };
    body = new ReadableStream({
      async pull(controller) {
        try { const chunk = await reader.read(); if (chunk.done) { finish(); controller.close(); } else controller.enqueue(chunk.value); }
        catch (error) { finish(); controller.error(error); }
      },
      async cancel(reason) { try { await reader.cancel(reason); } finally { finish(); } }
    });
    event.waitUntil(lifetime);
  }
  return new Response(body, { status: range.partial ? 206 : 200, headers: headers(fields) });
}

async function health() {
  const result = { ok: true, archiveReady: false, permissionRequired: false, directXLibrary: false, cacheLimitBytes: CACHE_LIMIT };
  try {
    const archive = await getArchive();
    Object.assign(result, { archiveReady: true, archiveName: archive.file.name, files: archive.manifest.length, uncompressedBytes: archive.total, excluded: archive.excluded, rejectedEntries: archive.rejected.length });
  } catch (error) {
    result.error = error.message;
    result.permissionRequired = error.name === 'NotAllowedError' || error.name === 'SecurityError';
  }
  try {
    const dll = await dbOperation('settings', 'get', undefined, 'dll');
    if (dll) { await getDirectXLibrary(dll); result.directXLibrary = true; }
  } catch { result.directXLibrary = false; }
  return result;
}

async function validateDirectXLibrary(handle) {
  if (!handle || handle.kind !== 'file') throw new Error('Choose a DirectX library file handle.');
  const file = await handle.getFile();
  if (file.name.toLowerCase() !== 'd3dx9_27.dll' || file.size < 1024 || file.size > 16 * 1024 * 1024) throw new Error('Choose the 32-bit d3dx9_27.dll file.');
  const bytes = new DataView(await file.slice(0, Math.min(file.size, 65536)).arrayBuffer());
  const pe = bytes.getUint16(0, true) === 0x5a4d ? bytes.getUint32(60, true) : -1;
  if (pe < 0 || pe + 26 > bytes.byteLength || bytes.getUint32(pe, true) !== 0x4550 || bytes.getUint16(pe + 4, true) !== 0x14c || !(bytes.getUint16(pe + 22, true) & 0x2000) || bytes.getUint16(pe + 24, true) !== 0x10b) throw new Error('The selected DirectX library must be a 32-bit Windows PE DLL.');
  return file;
}

async function getDirectXLibrary(record) {
  if (clearing) throw new Error('Local data is being cleared. Try again when it finishes.');
  const file = await validateDirectXLibrary(record.handle);
  if (file.size !== record.size || file.lastModified !== record.lastModified) throw new Error('The selected DirectX library changed. Choose it again before starting.');
  return file;
}

async function limitedBody(request, limit) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  for (;;) {
    const next = await reader.read(); if (next.done) break;
    length += next.value.length;
    if (length > limit) { await reader.cancel(); throw new Error('Diagnostic record exceeds its local limit.'); }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(length); let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
  return bytes;
}

async function route(event, path) {
  const request = event.request;
  if (path === 'api/health') return json(await health());
  if (path === 'api/log') {
    if (request.method === 'POST') {
      if (clearing) throw new Error('Local data is being cleared. Try again when it finishes.');
      const generation = storageGeneration;
      const text = new TextDecoder().decode(await limitedBody(request, 16384));
      const operation = logTail.then(async () => {
        const prior = await dbOperation('settings', 'get', undefined, 'log') || '';
        if (clearing || generation !== storageGeneration) throw new Error('Local data was cleared during this diagnostic request.');
        await dbOperation('settings', 'put', (prior + new Date().toISOString() + ' ' + text.replaceAll('\0', '') + '\n').slice(-LOG_LIMIT), 'log');
      });
      logTail = operation.catch(() => {}); await operation;
      return json({ ok: true });
    }
    if (request.method === 'GET') return new Response(await dbOperation('settings', 'get', undefined, 'log') || '', { headers: headers({ 'Content-Type': 'text/plain; charset=utf-8' }) });
    return json({ error: 'Method not supported.' }, 405);
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Read-only local file route.' }, 405);
  if (path === 'api/manifest') return json((await getArchive()).manifest);
  if (path.startsWith('game/') || path === 'native/d3dx9_27.dll') {
    let file, key, entry, archive, size;
    if (path.startsWith('game/')) {
      archive = await getArchive();
      entry = archive.entries.get(cleanPath(decodeURIComponent(path.slice(5))).toLowerCase());
      if (!entry) return json({ error: 'Game file not found.' }, 404);
      size = entry.size;
    } else {
      const record = await dbOperation('settings', 'get', undefined, 'dll');
      if (!record) return json({ error: 'No local DirectX library was selected.' }, 404);
      file = await getDirectXLibrary(record); size = file.size;
    }
    let range;
    try { range = resolveRange(request.headers.get('Range'), size); }
    catch { return new Response(null, { status: 416, headers: headers({ 'Content-Range': 'bytes */' + size, 'Content-Length': '0' }) }); }
    if (request.method === 'HEAD') return fileResponse(event, { size }, range);
    if (entry) ({ file, key } = await cacheEntry(archive, entry));
    return fileResponse(event, file, range, key);
  }
  if (path.startsWith('api/') || path.startsWith('native/')) return json({ error: 'Local endpoint not found.' }, 404);
  const response = await fetch(request);
  if (response.type === 'opaque' || response.status === 0) return response;
  const fields = new Headers(response.headers);
  fields.set('Cross-Origin-Opener-Policy', 'same-origin');
  fields.set('Cross-Origin-Embedder-Policy', 'require-corp');
  fields.set('Cross-Origin-Resource-Policy', 'same-origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: fields });
}

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  const path = url.pathname.slice(SCOPE.pathname.length);
  event.respondWith(route(event, path).catch(error => json({ error: error.message, localOnly: true }, error.name === 'NotAllowedError' ? 403 : 409)));
});

self.addEventListener('message', event => {
  const port = event.ports && event.ports[0];
  if (!port) return;
  const clientURL = event.source && event.source.url;
  if (!clientURL || new URL(clientURL).origin !== SCOPE.origin || !new URL(clientURL).pathname.startsWith(SCOPE.pathname)) { port.postMessage({ ok: false, error: 'Unexpected local source client.' }); return; }
  const execute = async () => {
    const message = event.data || {};
    if (message.type === 'SET_ZIP') {
      const handle = message.handle;
      if (!handle || handle.kind !== 'file') throw new Error('Choose a ZIP file handle.');
      const file = await handle.getFile();
      const parsed = await parseZip(file);
      const record = { handle, selectionId: crypto.randomUUID(), name: file.name, size: file.size, lastModified: file.lastModified };
      await dbOperation('settings', 'put', record, 'zip');
      archivePromise = Promise.resolve({ ...parsed, selectionId: record.selectionId, record });
      return health();
    }
    if (message.type === 'SET_DLL') {
      const handle = message.handle;
      const file = await validateDirectXLibrary(handle);
      await dbOperation('settings', 'put', { handle, name: file.name, size: file.size, lastModified: file.lastModified }, 'dll');
      return health();
    }
    if (message.type === 'STATUS') return health();
    if (message.type === 'CLEAR') {
      if (pending.size || Array.from(leases.values()).some(Boolean)) throw new Error('Close game tabs before clearing local data.');
      clearing = true;
      storageGeneration++;
      try {
        await withBudget(async () => { for (const record of Array.from((await metadata()).values())) await removeCache(record); });
        await logTail;
        for (const key of ['zip', 'dll', 'log']) await dbOperation('settings', 'delete', undefined, key);
        archivePromise = undefined;
      } finally { clearing = false; }
      return health();
    }
    throw new Error('Unknown local source request.');
  };
  // File selection and clear are serialized; clearing must not race a picker
  // response that would silently restore a just-cleared handle.
  const operation = event.data && event.data.type === 'STATUS' ? execute() : settingsTail.then(execute);
  if (!event.data || event.data.type !== 'STATUS') settingsTail = operation.catch(() => {});
  event.waitUntil(operation.then(result => port.postMessage({ ok: true, result }), error => port.postMessage({ ok: false, error: error.message })));
});
