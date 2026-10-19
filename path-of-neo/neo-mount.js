/* Local integration for the original game. Boxedwine itself is GPLv2+. */
(function () {
  'use strict';
  const localSource = window.NeoLocalSource || null;
  const sourceUrl = path => localSource ? new URL(path, localSource.baseURL).href : '/' + path;
  const graphicsLog = window.location && new URLSearchParams(window.location.search).get('graphicsLog') === '1';
  const sehLog = window.location && new URLSearchParams(window.location.search).get('sehLog') === '1';
  const diagnostic = window.location && new URLSearchParams(window.location.search).get('diagnostic') === '1';
  const builtinEffects = window.location && new URLSearchParams(window.location.search).get('effectLibrary') === 'builtin';
  const d3d9Probe = window.location && new URLSearchParams(window.location.search).get('probe') === 'd3d9';
  const preloader = window.location && new URLSearchParams(window.location.search).get('preloader') === '1';
  const captureStacks = !graphicsLog && !preloader && window.location && new URLSearchParams(window.location.search).get('captureStacks') === '1';
  if (typeof REGISTRY_PRESETS !== 'undefined') {
    // This changes only the emulated Wine prefix, which lives in this tab.
    REGISTRY_PRESETS.neodebug = 'reg add "HKCU\\Software\\Wine\\WineDbg" /v ShowCrashDialog /t REG_DWORD /d 0 /f';
  }
  if ((graphicsLog || sehLog || diagnostic || captureStacks || builtinEffects || preloader) && typeof getEmulatorParams === 'function') {
    const originalParams = getEmulatorParams;
    getEmulatorParams = function () {
      const params = originalParams().slice();
      if (builtinEffects) {
        const override = params.findIndex(value => typeof value === 'string' && value.startsWith('WINEDLLOVERRIDES='));
        if (override >= 0) {
          const libraries = params[override].slice('WINEDLLOVERRIDES='.length).split(';').filter(value => !/^d3dx9_27=/i.test(value));
          libraries.push('d3dx9_27=b');
          params[override] = 'WINEDLLOVERRIDES=' + libraries.join(';');
        } else {
          const wine = params.indexOf('/bin/wine');
          const loader = wine >= 0 ? wine : preloader ? params.indexOf('/bin/sh') : -1;
          if (loader >= 0) params.splice(loader, 0, '-env', 'WINEDLLOVERRIDES=d3dx9_27=b');
        }
      }
      const wine = params.indexOf('/bin/wine');
      const program = wine >= 0 ? wine : (captureStacks || preloader) ? params.indexOf('/bin/sh') : -1;
      if (program >= 0 && (graphicsLog || sehLog || diagnostic || captureStacks)) {
        const wineDebug = sehLog
          ? 'WINEDEBUG=-all,err+all,trace+seh,warn+seh' + (graphicsLog
            ? ',warn+d3d,fixme+d3d,warn+d3d_shader,fixme+d3d_shader' + (d3d9Probe ? ',warn+debugstr' : '')
            : '')
          : graphicsLog
          ? 'WINEDEBUG=-all,err+all,warn+d3d,fixme+d3d,warn+d3d_shader,fixme+d3d_shader' + (d3d9Probe ? ',warn+debugstr' : '')
          : captureStacks ? 'WINEDEBUG=err+all' : 'WINEDEBUG=+seh';
        params.splice(program, 0, '-env', wineDebug);
      }
      return params;
    };
  }
  const baseConsole = {};
  let pending = [];
  let loggedMessages = 0;
  for (const level of ['log', 'warn', 'error']) {
    baseConsole[level] = console[level].bind(console);
    console[level] = function (...args) {
      baseConsole[level](...args);
      loggedMessages++;
      pending.push(level + ': ' + args.map(x => typeof x === 'string' ? x : String(x)).join(' '));
      if (pending.length >= 25) flush();
    };
  }
  function flush() {
    if (!pending.length) return;
    const bytes = new TextEncoder().encode(pending.splice(0).join('\n') + '\n');
    let offset = 0;
    while (offset < bytes.length) {
      let end = Math.min(offset + 12000, bytes.length);
      // Keep UTF-8 code points intact, below the server's 16 KiB request cap.
      while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
      navigator.sendBeacon(sourceUrl('api/log'), bytes.slice(offset, end));
      offset = end;
    }
  }
  setInterval(flush, 1000);
  window.addEventListener('pagehide', flush);
  window.addEventListener('error', e => { console.error(e.message); flush(); });
  const initialBuild = buildBrowserFileSystem;
  const cache = new Map();
  const opened = new Set();
  const CHUNK = 256 * 1024;
  const MAX_CHUNKS = 128;
  const mmxFix = window.location && new URLSearchParams(window.location.search).get('mmxFix') === '1';
  // The source-backed CPU workaround is opt-in and specific to this executable.
  // PEXTRW must zero-extend; build 96's common MMX helper sign-extends instead.
  // These audited SHR instructions only consume the extracted word's high byte.
  // MOVZX EAX,AH gives the correct result in both emulators; flags are overwritten
  // before any consumer. See diagnostics/mmx-fault-analysis.txt for the audit.
  const mmxSites = [
    [0x24862e, '0fc5c000c1e808'], [0x24865d, '0fc5c200c1e808'],
    [0x248674, '0fc5c400c1e808'], [0x248683, '0fc5c500c1e808'],
    [0x2486ae, '0fc5c001c1e808'], [0x2486de, '0fc5c201c1e808'],
    [0x24872d, '0fc5c002c1e808'], [0x24875d, '0fc5c202c1e808'],
    [0x248774, '0fc5c401c1e808'], [0x248783, '0fc5c501c1e808'],
    [0x2487ae, '0fc5c003c1e808'], [0x2487de, '0fc5c203c1e808'],
    [0x24882d, '0fc5c100c1e808'], [0x24885d, '0fc5c300c1e808'],
    [0x248874, '0fc5c402c1e808'], [0x248883, '0fc5c502c1e808'],
    [0x2488ae, '0fc5c101c1e808'], [0x2488de, '0fc5c301c1e808'],
    [0x24892d, '0fc5c102c1e808'], [0x24895d, '0fc5c302c1e808'],
    [0x248974, '0fc5c403c1e808'], [0x248983, '0fc5c503c1e808'],
    [0x2489ae, '0fc5c103c1e808'], [0x2489de, '0fc5c303c1e808']
  ];
  async function applyMmxFix(entries, mount) {
    if (!mmxFix) return;
    const path = 'Matrix3W32S.bin';
    const entry = entries.find(item => item.path === path);
    if (!entry || entry.size !== 23052288) throw new Error('MMX workaround requires the verified original executable.');
    Module.setStatus('Checking the CPU compatibility workaround…');
    const bytes = new Uint8Array(entry.size);
    if (readRange(path, entry.size, bytes, 0, bytes.length, 0) !== bytes.length) throw new Error('Incomplete executable for MMX verification.');
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const hash = Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
    if (hash !== '3d1ee3070537bc228287fe3a4194e5fc7b229a69e0bf67b30cf1ef56f596d7aa') throw new Error('MMX executable SHA-256 mismatch; no patch applied.');
    for (const [offset, context] of mmxSites) {
      for (let i = 0; i < context.length / 2; i++) {
        if (bytes[offset - 4 + i] !== parseInt(context.slice(i * 2, i * 2 + 2), 16)) throw new Error('MMX instruction guard mismatch; no patch applied.');
      }
    }
    for (const [offset] of mmxSites) bytes.set([0x0f, 0xb6, 0xc4], offset);
    const node = FS.lookupPath(mount + '/' + path).node;
    node.contents = bytes;
    node.usedBytes = bytes.length;
    node.neoMaterialized = true;
    console.log('[NEO compatibility] Verified executable SHA-256; applied 24 MMX high-byte corrections in browser memory only. Original archive unchanged.');
  }
  function configurePreloader(mount, probe) {
    if (!preloader) return;
    const guestDirectory = '/home/username/.wine/dosdevices/d:/neo';
    // These paths are fixed local diagnostic/game entry points, never URL text.
    const program = probe ? 'D:\\neo\\d3d9-probe.exe' : 'D:\\neo\\Matrix3.exe';
    const script = [
      '#!/bin/sh',
      'unset WINELOADERNOEXEC',
      "cd '" + guestDirectory + "' || exit 1",
      "echo '[NEO guest] Wine exec enabled inside the browser'",
      "exec /bin/wine '" + program + "'",
      ''
    ].join('\n');
    FS.writeFile(mount + '/neo-launch.sh', script);
    Config.runLinux = true;
    Config.Program = '/bin/sh';
    Config.ProgramArgs = [guestDirectory + '/neo-launch.sh'];
    Config.WorkingDir = guestDirectory;
  }
  function getChunk(path, start, size) {
    const key = path + ':' + start;
    if (cache.has(key)) {
      const value = cache.get(key); cache.delete(key); cache.set(key, value); return value;
    }
    const request = new XMLHttpRequest();
    request.open('GET', sourceUrl('game/' + path.split('/').map(encodeURIComponent).join('/')), false);
    request.overrideMimeType('text/plain; charset=x-user-defined');
    request.setRequestHeader('Range', 'bytes=' + start + '-' + Math.min(size - 1, start + CHUNK - 1));
    request.send();
    if (request.status !== 206 && request.status !== 200) throw new Error('Game data request failed: ' + path + ' HTTP ' + request.status);
    const text = request.responseText;
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 255;
    cache.set(key, bytes);
    while (cache.size > MAX_CHUNKS) cache.delete(cache.keys().next().value);
    return bytes;
  }
  function readRange(path, size, target, offset, length, position) {
    if (!opened.has(path)) {
      opened.add(path);
      if (opened.size <= 150) console.log('[NEO file] ' + path + ' (' + size + ' bytes)');
    }
    let count = 0;
    length = Math.min(length, Math.max(0, size - position));
    while (count < length) {
      const at = position + count;
      const start = Math.floor(at / CHUNK) * CHUNK;
      const chunk = getChunk(path, start, size);
      const within = at - start;
      const n = Math.min(length - count, chunk.length - within);
      if (n <= 0) throw new Error('Short game data response for ' + path);
      target.set(chunk.subarray(within, within + n), offset + count);
      count += n;
    }
    return count;
  }
  buildBrowserFileSystem = async function () {
    try {
      const mount = Config.d_drive + '/neo';
      if (localSource && !d3d9Probe) await localSource.ready();
      if (d3d9Probe) {
        Module.setStatus('Loading the browser graphics diagnostic…');
        const response = await fetch(sourceUrl('diagnostics/d3d9-probe.exe'));
        if (!response.ok) throw new Error('Graphics diagnostic HTTP ' + response.status);
        FS.mkdirTree(mount);
        FS.writeFile(mount + '/d3d9-probe.exe', new Uint8Array(await response.arrayBuffer()));
        console.log('[NEO] Mounted the original Direct3D 9 diagnostic only; no game archive or native DirectX library read.');
        configurePreloader(mount, true);
        initialBuild();
        return true;
      }
      Module.setStatus('Connecting your original game files…');
      const response = await fetch(sourceUrl('api/manifest'));
      if (!response.ok) throw new Error('Archive manifest HTTP ' + response.status);
      const entries = await response.json();
      FS.mkdirTree(mount);
      for (const entry of entries) {
        const path = mount + '/' + entry.path;
        FS.mkdirTree(path.slice(0, path.lastIndexOf('/')));
        FS.createDataFile(path, null, new Uint8Array(0), true, true);
        const node = FS.lookupPath(path).node;
        const normal = node.stream_ops;
        node.usedBytes = entry.size;
        node.contents = null;
        node.timestamp = entry.mtime * 1000 || Date.now();
        function materialize(clear) {
          if (node.neoMaterialized) return;
          if (!clear && entry.size > 2 * 1024 * 1024) throw new FS.ErrnoError(63);
          node.contents = new Uint8Array(clear ? 0 : entry.size);
          if (!clear) readRange(entry.path, entry.size, node.contents, 0, entry.size, 0);
          node.usedBytes = node.contents.length;
          node.neoMaterialized = true;
          console.log('[NEO session write] ' + entry.path);
        }
        const normalNodeOps = node.node_ops;
        node.node_ops = Object.assign({}, normalNodeOps, {
          setattr(target, attr) {
            if (attr.size !== undefined && !node.neoMaterialized) materialize(attr.size === 0);
            return normalNodeOps.setattr(target, attr);
          }
        });
        node.stream_ops = Object.assign({}, normal, {
          read(stream, buffer, offset, length, position) {
            if (node.neoMaterialized) return normal.read(stream, buffer, offset, length, position);
            return readRange(entry.path, entry.size, buffer, offset, length, position);
          },
          write(stream, buffer, offset, length, position, canOwn) {
            materialize(false);
            return normal.write(stream, buffer, offset, length, position, canOwn);
          },
          mmap(stream, length, position, prot, flags) {
            if (node.neoMaterialized) return normal.mmap(stream, length, position, prot, flags);
            // MEMFS's implementation assumes contents is a typed array. Lazy
            // assets instead copy only the requested mapping into guest memory.
            // mmapAlloc supplies zeroed, page-aligned storage, including EOF tail.
            const ptr = mmapAlloc(length);
            if (!ptr) throw new FS.ErrnoError(48);
            readRange(entry.path, entry.size, HEAP8, ptr >>> 0, length, position);
            return { ptr, allocated: true };
          },
          msync(stream, buffer, offset, length, mmapFlags) {
            // A private mapping must never write its modifications back.
            if (mmapFlags & 2) return 0;
            // Route shared writes through the same session-only storage as write.
            // Large preserving writes retain the adapter's bounded-memory limit.
            materialize(false);
            normal.write(stream, buffer, 0, length, offset, false);
            return 0;
          }
        });
      }
      await applyMmxFix(entries, mount);
      // Compatibility settings are in browser memory; the supplied ZIP is read-only.
      const configPath = mount + '/MatrixConfig.INI';
      if (FS.analyzePath(configPath).exists) FS.unlink(configPath);
      const compileShaders = window.location && new URLSearchParams(window.location.search).get('compileShaders') === '1' ? 1 : 0;
      FS.writeFile(configPath, '[RENDERING]\r\nQUALITY=5\r\nCOMPILE_SHADERS=' + compileShaders + '\r\nFULLSCREEN=0\r\nRESOLUTION=0\r\n[CONTROLS]\r\nMOUSE_SENSITIVITY=10\r\n[AUDIO]\r\nEAX_ENABLED=0\r\n');
      if (!builtinEffects) {
        const directx = await fetch(sourceUrl('native/d3dx9_27.dll'));
        if (!directx.ok) throw new Error('Local DirectX compatibility library is unavailable.');
        FS.writeFile(mount + '/d3dx9_27.dll', new Uint8Array(await directx.arrayBuffer()));
      }
      FS.mkdirTree(mount + '/SAVES');
      console.log('[NEO] Mounted ' + entries.length + ' original files on D:\\neo; 32 MiB bounded read cache; archive unchanged.');
      configurePreloader(mount, false);
      initialBuild();
      return true;
    } catch (error) {
      console.error('[NEO] Mount failed', error.stack || error);
      Module.setStatus(d3d9Probe ? 'Graphics diagnostic could not be loaded. See the console.' : 'Game files could not be mounted. See the console.');
      flush();
      return false;
    }
  };
  const oldPrint = Module.print;
  const oldPrintErr = Module.printErr;
  function printToConsole(original, level, args) {
    const before = loggedMessages;
    original(...args);
    if (loggedMessages === before) console[level]('[wine]', ...args);
    const output = document.getElementById('output');
    if (output && typeof output.value === 'string' && output.value.length > 65536) {
      output.value = output.value.slice(-32768);
    }
  }
  Module.print = function (...args) { printToConsole(oldPrint, 'log', args); };
  Module.printErr = function (...args) { printToConsole(oldPrintErr, 'error', args); };
})();
