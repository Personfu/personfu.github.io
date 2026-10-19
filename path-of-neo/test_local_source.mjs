import assert from 'node:assert/strict';
import { readFileSync, openAsBlob, statSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import test from 'node:test';

const workerSource = readFileSync(new URL('./neo-local-sw.js', import.meta.url), 'utf8');
const selectorSource = readFileSync(new URL('./local-source.js', import.meta.url), 'utf8');
const scope = 'https://example.test/path-of-neo/';
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc(bytes) { let value = 0xffffffff; for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8); return (value ^ 0xffffffff) >>> 0; }
function file(bytes, name = 'game.zip', modified = 123) { return new File([bytes], name, { lastModified: modified }); }
function makeZip(entries = [{ name: 'Game/Matrix3.exe', data: 'original' }]) {
  const local = [], central = [];
  let at = 0;
  for (const item of entries) {
    const name = Buffer.from(item.name), data = Buffer.from(item.data || ''), method = item.method || 0;
    const compressed = method === 8 ? deflateRawSync(data) : data;
    const head = Buffer.alloc(30), directory = Buffer.alloc(46);
    head.writeUInt32LE(0x04034b50); head.writeUInt16LE(20, 4); head.writeUInt16LE(item.flags || 0, 6); head.writeUInt16LE(method, 8);
    head.writeUInt32LE(crc(data), 14); head.writeUInt32LE(compressed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(name.length, 26);
    directory.writeUInt32LE(0x02014b50); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt16LE(item.flags || 0, 8); directory.writeUInt16LE(method, 10);
    directory.writeUInt32LE(crc(data), 16); directory.writeUInt32LE(compressed.length, 20); directory.writeUInt32LE(data.length, 24); directory.writeUInt16LE(name.length, 28);
    directory.writeUInt32LE(item.attributes || 0, 38); directory.writeUInt32LE(at, 42);
    local.push(head, name, compressed); central.push(directory, name); at += head.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central), footer = Buffer.alloc(22);
  footer.writeUInt32LE(0x06054b50); footer.writeUInt16LE(entries.length, 8); footer.writeUInt16LE(entries.length, 10); footer.writeUInt32LE(directory.length, 12); footer.writeUInt32LE(at, 16);
  return Buffer.concat([...local, directory, footer]);
}
function peFile({ machine = 0x14c, dll = true, modified = 9 } = {}) {
  const bytes = Buffer.alloc(1024); bytes.writeUInt16LE(0x5a4d); bytes.writeUInt32LE(128, 60); bytes.writeUInt32LE(0x4550, 128); bytes.writeUInt16LE(machine, 132); bytes.writeUInt16LE(dll ? 0x2000 : 0, 150); bytes.writeUInt16LE(0x10b, 152);
  return file(bytes, 'd3dx9_27.dll', modified);
}
function runtime() {
  const stores = { settings: new Map(), cache: new Map() }, disk = new Map(), listeners = new Map();
  let writes = 0, fetches = 0;
  const notFound = () => new DOMException('Not found', 'NotFoundError');
  const directory = {
    async getFileHandle(name, options = {}) {
      if (!disk.has(name) && !options.create) throw notFound();
      return {
        kind: 'file',
        async getFile() { if (!disk.has(name)) throw notFound(); return file(disk.get(name), name); },
        async createWritable() {
          writes++; const chunks = [];
          return { async write(bytes) { chunks.push(new Uint8Array(bytes)); }, async close() { disk.set(name, Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))); }, async abort() {} };
        }
      };
    },
    async removeEntry(name) { if (!disk.delete(name)) throw notFound(); },
    async *entries() { for (const name of [...disk.keys()]) yield [name, { kind: 'file' }]; },
    async getDirectoryHandle() { return this; }
  };
  const context = vm.createContext({
    URL, Blob, File, Headers, Request, Response, ReadableStream, DecompressionStream, TextDecoder, TextEncoder, DataView, Uint8Array, Uint32Array, DOMException, crypto: webcrypto, console,
    navigator: { storage: { async getDirectory() { return directory; } } },
    self: { registration: { scope }, addEventListener(type, callback) { listeners.set(type, callback); }, async skipWaiting() {}, clients: { async claim() {} } },
    async fetch(request) { fetches++; return new Response('static', { headers: { 'X-Static': 'yes' } }); }
  });
  vm.runInContext(workerSource + '\nglobalThis.testAPI = { parseZip, entryStream, cacheEntry, getArchive, getDirectXLibrary, validateDirectXLibrary, resolveRange, route, health, reserve, metadata, leases, pending, reservations, withBudget };', context);
  context.dbOperation = async (store, operation, value, key) => {
    const data = stores[store];
    if (operation === 'get') return data.get(key);
    if (operation === 'getAll') return [...data.values()];
    if (operation === 'put') { data.set(key === undefined ? value.key : key, value); return; }
    if (operation === 'delete') data.delete(key);
  };
  async function message(type, handle) {
    let operation, reply;
    listeners.get('message')({ source: { url: scope + 'index.html' }, data: { type, handle }, ports: [{ postMessage(value) { reply = value; } }], waitUntil(value) { operation = value; } });
    await operation;
    if (!reply.ok) throw new Error(reply.error);
    return reply.result;
  }
  function event(path, method = 'GET', range) {
    const lifetime = [];
    const request = new Request(scope + path, { method, headers: range === undefined ? {} : { Range: range } });
    return { request, lifetime, waitUntil(promise) { lifetime.push(promise); } };
  }
  return { api: context.testAPI, context, stores, disk, listeners, message, event, get writes() { return writes; }, get fetches() { return fetches; } };
}

test('ZIP manifests select a root and exclude Windows wrappers and ASI plugins', async () => {
  const r = runtime(), archive = await r.api.parseZip(file(makeZip([
    { name: 'Game/Matrix3.exe', data: 'MZ' }, { name: 'Game/Data/a.WAD', data: '123' },
    { name: 'Game/D3D9.dll' }, { name: 'Game/dinput8.dll' }, { name: 'Game/scripts/fix.ASI' },
    { name: 'Game/../escape' }, { name: 'elsewhere/private.txt' }
  ])));
  assert.deepEqual(Array.from(archive.manifest, entry => entry.path), ['Data/a.WAD', 'Matrix3.exe']);
  assert.equal(archive.total, 5); assert.equal(archive.excluded.length, 3); assert.equal(archive.rejected.length, 1);
});

test('ZIP parser rejects collisions, file/directory conflicts, unsupported methods and invalid footers', async () => {
  const r = runtime();
  await assert.rejects(r.api.parseZip(file(makeZip([{ name: 'Matrix3.exe' }, { name: 'Data' }, { name: 'data' }]))), /Ambiguous/);
  await assert.rejects(r.api.parseZip(file(makeZip([{ name: 'Matrix3.exe' }, { name: 'data' }, { name: 'DATA/a' }]))), /both a file and a directory/);
  await assert.rejects(r.api.parseZip(file(makeZip([{ name: 'Matrix3.exe', method: 12 }]))), /compression/);
  await assert.rejects(r.api.parseZip(file(Buffer.alloc(30))), /footer/);
  const zip64 = makeZip(); zip64.writeUInt16LE(0xffff, zip64.length - 12);
  await assert.rejects(r.api.parseZip(file(zip64)), /ZIP64/);
  const split = makeZip(); split.writeUInt16LE(1, split.length - 18);
  await assert.rejects(r.api.parseZip(file(split)), /Split/);
  await assert.rejects(r.api.parseZip(file(makeZip([{ name: 'Matrix3.exe', flags: 1 }]))), /not a supported regular/);
});

test('stored and raw DEFLATE entries stream into an integrity-checked OPFS cache once', async () => {
  for (const method of [0, 8]) {
    const r = runtime(), bytes = Buffer.from('original game bytes '.repeat(1000));
    const archive = { ...await r.api.parseZip(file(makeZip([{ name: 'Matrix3.exe', data: bytes, method }]))), selectionId: 'one' };
    const entry = archive.entries.get('matrix3.exe');
    const [a, b] = await Promise.all([r.api.cacheEntry(archive, entry), r.api.cacheEntry(archive, entry)]);
    assert.equal(a.key, b.key); assert.equal(r.writes, 1); assert.equal(r.api.leases.get(a.key), 2);
    assert.deepEqual(Buffer.from(await a.file.arrayBuffer()), bytes);
    r.api.leases.set(a.key, 0);
    await r.api.cacheEntry(archive, entry); assert.equal(r.writes, 1);
    assert.equal(r.api.reservations.size, 0); assert.equal(r.api.pending.size, 0);
  }
});

test('bad local headers and corrupt data fail without committing cached bytes', async () => {
  const r = runtime(), bad = makeZip([{ name: 'Matrix3.exe', data: 'payload' }]);
  bad[30 + 'Matrix3.exe'.length] ^= 1;
  const archive = { ...await r.api.parseZip(file(bad)), selectionId: 'bad' };
  await assert.rejects(r.api.cacheEntry(archive, archive.entries.get('matrix3.exe')), /CRC integrity/);
  assert.equal(r.disk.size, 0); assert.equal(r.stores.cache.size, 0); assert.equal(r.api.reservations.size, 0);
  const headerBad = makeZip(); headerBad.writeUInt32LE(0, 14);
  const parsed = await r.api.parseZip(file(headerBad));
  await assert.rejects(r.api.entryStream(parsed, parsed.entries.get('matrix3.exe')), /local sizes or CRC/);
});

test('ranges include suffix, clamping, empty-file GET and strict 416 cases', () => {
  const r = runtime();
  assert.deepEqual({ ...r.api.resolveRange('bytes=2-4', 10) }, { start: 2, stop: 5, partial: true });
  assert.deepEqual({ ...r.api.resolveRange('bytes=-50', 10) }, { start: 0, stop: 10, partial: true });
  assert.deepEqual({ ...r.api.resolveRange('bytes=8-', 10) }, { start: 8, stop: 10, partial: true });
  assert.deepEqual({ ...r.api.resolveRange(null, 0) }, { start: 0, stop: 0, partial: false });
  for (const range of ['bytes=-0', 'bytes=-', 'bytes=10-', 'bytes=3-2', 'bytes=1-2,4-5', 'bytes=999999999999999999-']) assert.throws(() => r.api.resolveRange(range, 10));
  assert.throws(() => r.api.resolveRange('bytes=0-', 0));
});

test('game 206/HEAD/416 routes are local, release leases and preserve isolation headers', async () => {
  const r = runtime(), zip = file(makeZip([{ name: 'Matrix3.exe', data: 'abcdefghij' }]));
  await r.message('SET_ZIP', { kind: 'file', async getFile() { return zip; } });
  const request = r.event('game/Matrix3.exe', 'GET', 'bytes=2-4');
  const response = await r.api.route(request, 'game/Matrix3.exe');
  assert.equal(response.status, 206); assert.equal(await response.text(), 'cde'); await Promise.all(request.lifetime);
  assert.equal(response.headers.get('Content-Range'), 'bytes 2-4/10'); assert.equal(response.headers.get('Content-Length'), '3');
  assert.equal(response.headers.get('Cross-Origin-Embedder-Policy'), 'require-corp');
  assert.equal([...r.api.leases.values()].reduce((a, b) => a + b, 0), 0);
  const writes = r.writes;
  const head = await r.api.route(r.event('game/Matrix3.exe', 'HEAD', 'bytes=-2'), 'game/Matrix3.exe');
  assert.equal(head.status, 206); assert.equal(head.body, null); assert.equal(head.headers.get('Content-Length'), '2'); assert.equal(r.writes, writes);
  const invalid = await r.api.route(r.event('game/Matrix3.exe', 'GET', 'bytes=10-'), 'game/Matrix3.exe');
  assert.equal(invalid.status, 416); assert.equal(invalid.headers.get('Content-Range'), 'bytes */10');
  assert.equal((await r.api.route(r.event('game/no-file'), 'game/no-file')).status, 404);
  await assert.rejects(r.api.route(r.event('game/%2e%2e/secret'), 'game/%2e%2e/secret'), /Unsafe/);
  assert.equal(r.fetches, 0);
});

test('live cached ZIP reads recheck file changes and revoked permissions; new workers restore handles', async () => {
  const r = runtime(); let current = file(makeZip(), 'game.zip', 1), denied = false;
  const handle = { kind: 'file', async getFile() { if (denied) throw new DOMException('Read denied', 'NotAllowedError'); return current; } };
  await r.message('SET_ZIP', handle); assert.equal((await r.api.health()).archiveReady, true);
  current = file(makeZip(), 'game.zip', 2);
  await assert.rejects(r.api.getArchive(), /archive changed/);
  current = file(makeZip(), 'game.zip', 1); await r.message('SET_ZIP', handle); denied = true;
  const health = await r.api.health(); assert.equal(health.archiveReady, false); assert.equal(health.permissionRequired, true);
  const restarted = runtime(); denied = false; restarted.stores.settings.set('zip', r.stores.settings.get('zip'));
  assert.equal((await restarted.api.getArchive()).manifest.length, 1);
});

test('native DLL routes require an unchanged, permission-granted PE32 DLL and support partial reads', async () => {
  const r = runtime(); let current = peFile();
  const handle = { kind: 'file', async getFile() { return current; } };
  await r.message('SET_DLL', handle); assert.equal((await r.api.health()).directXLibrary, true);
  const response = await r.api.route(r.event('native/d3dx9_27.dll', 'GET', 'bytes=0-1'), 'native/d3dx9_27.dll');
  assert.equal(response.status, 206); assert.equal(Buffer.from(await response.arrayBuffer()).toString(), 'MZ');
  current = peFile({ modified: 10 }); await assert.rejects(r.api.getDirectXLibrary(r.stores.settings.get('dll')), /library changed/);
  assert.equal((await r.api.health()).directXLibrary, false);
  await assert.rejects(r.message('SET_DLL', { kind: 'file', async getFile() { return peFile({ dll: false }); } }), /PE DLL/);
  await assert.rejects(r.message('SET_DLL', { kind: 'file', async getFile() { return peFile({ machine: 0x8664 }); } }), /PE DLL/);
  await assert.rejects(r.message('SET_DLL', undefined), /file handle/);
});

test('LRU evicts unleased files, honors reservations and rejects oversized entries', async () => {
  const r = runtime(), records = await r.api.metadata();
  const add = (key, size, lastAccess) => { const record = { key, size, lastAccess }; records.set(key, record); r.stores.cache.set(key, record); r.disk.set(key, Buffer.alloc(1)); };
  add('old.bin', 1024 ** 3, 1); add('live.bin', 1024 ** 3, 2); r.api.leases.set('live.bin', 1);
  await r.api.reserve('new.bin', 1024 ** 3); assert.equal(records.has('old.bin'), false); assert.equal(records.has('live.bin'), true);
  await assert.rejects(r.api.reserve('too-busy.bin', 1), /cache is busy/);
  await assert.rejects(r.api.reserve('huge.bin', 2 * 1024 ** 3 + 1), /2 GiB/);
  assert.equal(r.api.reservations.get('new.bin'), 1024 ** 3);
});

test('CLEAR refuses active reads then removes only owned cache and saved handles', async () => {
  const r = runtime(), zip = file(makeZip()); await r.message('SET_ZIP', { kind: 'file', async getFile() { return zip; } });
  const archive = await r.api.getArchive(), cached = await r.api.cacheEntry(archive, archive.entries.get('matrix3.exe'));
  await assert.rejects(r.message('CLEAR'), /Close game tabs/);
  r.api.leases.set(cached.key, 0); const status = await r.message('CLEAR');
  assert.equal(status.archiveReady, false); assert.equal(r.disk.size, 0); assert.equal(r.stores.cache.size, 0); assert.equal(r.stores.settings.size, 0);
});

test('CLEAR invalidates a cache request still calculating its key', async () => {
  const r = runtime(), zip = file(makeZip()); await r.message('SET_ZIP', { kind: 'file', async getFile() { return zip; } });
  const archive = await r.api.getArchive(), digest = r.context.digest;
  let resume;
  const held = new Promise(resolve => { resume = resolve; });
  r.context.digest = async text => { await held; return digest(text); };
  const reading = r.api.cacheEntry(archive, archive.entries.get('matrix3.exe'));
  const failure = assert.rejects(reading, /cleared during/);
  assert.equal(r.api.pending.size, 0);
  await r.message('CLEAR'); resume(); await failure;
  assert.equal(r.writes, 0); assert.equal(r.disk.size, 0); assert.equal(r.stores.settings.size, 0);
});

test('scoped static responses retain metadata and receive COOP/COEP', async () => {
  const r = runtime(), response = await r.api.route(r.event('runtime/boxedwine.js'), 'runtime/boxedwine.js');
  assert.equal(await response.text(), 'static'); assert.equal(response.headers.get('X-Static'), 'yes'); assert.equal(response.headers.get('Cross-Origin-Opener-Policy'), 'same-origin');
  let intercepted = false;
  r.listeners.get('fetch')({ request: new Request('https://elsewhere.test/game/a'), respondWith() { intercepted = true; } });
  r.listeners.get('fetch')({ request: new Request('https://example.test/path-of-neo-other/game/a'), respondWith() { intercepted = true; } });
  assert.equal(intercepted, false);
});

test('selector API normalizes results, keeps user picker first and follows controller updates', async () => {
  let registrations = 0, pickerCalls = 0, calls = [], generation = 1;
  const controller = number => ({ scriptURL: scope + 'neo-local-sw.js', postMessage(data, ports) { calls.push(data.type + ':' + number); queueMicrotask(() => ports[0].peer.onmessage({ data: { ok: true, result: { archiveReady: data.type !== 'CLEAR', generation: number } } })); } });
  const serviceWorker = { controller: controller(1), async register() { registrations++; return { active: serviceWorker.controller }; }, addEventListener() {}, removeEventListener() {} };
  class Channel { constructor() { this.port1 = { close() {} }; this.port2 = { peer: this.port1 }; } }
  const window = { isSecureContext: true, crossOriginIsolated: true, location: { href: scope }, showOpenFilePicker() { pickerCalls++; return Promise.resolve([{ kind: 'file' }]); } };
  vm.runInNewContext(selectorSource, { window, navigator: { serviceWorker }, document: { currentScript: { src: scope + 'local-source.js' } }, URL, MessageChannel: Channel, setTimeout, clearTimeout });
  const api = window.NeoLocalSource;
  assert.deepEqual(Object.keys(api), ['baseURL', 'ready', 'status', 'chooseGameZip', 'chooseDirectXLibrary', 'clear']);
  const selectedPromise = api.chooseGameZip(); assert.equal(pickerCalls, 1); assert.equal(registrations, 0);
  const selected = await selectedPromise; assert.equal(selected.baseURL, scope); assert.equal(selected.crossOriginIsolated, true);
  serviceWorker.controller = controller(++generation);
  assert.equal((await api.status()).generation, 2); assert.equal(registrations, 1); assert.equal(calls.at(-1), 'STATUS:2');
  assert.equal((await api.chooseDirectXLibrary()).baseURL, scope); assert.equal((await api.clear()).crossOriginIsolated, true);
  serviceWorker.controller.postMessage = (data, ports) => queueMicrotask(() => ports[0].peer.onmessage({ data: { ok: true, result: { archiveReady: false } } }));
  await assert.rejects(api.ready(), error => error.code === 'NEO_LOCAL_ARCHIVE_REQUIRED');
});

test('optional original ZIP smoke check reads only the directory, without extraction', { skip: !process.env.NEO_TEST_ZIP }, async () => {
  const path = process.env.NEO_TEST_ZIP, blob = await openAsBlob(path);
  Object.defineProperties(blob, { name: { value: 'original.zip' }, lastModified: { value: statSync(path).mtimeMs } });
  const archive = await runtime().api.parseZip(blob);
  assert.ok(archive.manifest.length > 1);
  assert.ok(archive.manifest.some(entry => entry.path.toLowerCase() === 'matrix3w32s.bin'));
  assert.ok(archive.total > 4 * 1024 ** 3);
  console.log('Original ZIP directory:', archive.manifest.length, 'files;', archive.total, 'uncompressed bytes; no extraction.');
});
