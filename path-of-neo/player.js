(function () {
  'use strict';
  const source = window.NeoLocalSource;
  const byId = id => document.getElementById(id);
  const status = byId('status');
  let busy = false;

  function message(text, error) {
    status.textContent = text;
    status.classList.toggle('error', Boolean(error));
  }
  function render(state) {
    byId('play').disabled = busy || !state.archiveReady;
    if (state.archiveReady) {
      message(state.archiveName + ' · ' + Number(state.files).toLocaleString() + ' game files ready.');
      byId('choose-zip').textContent = 'Change game ZIP';
    } else if (state.permissionRequired) {
      message('Choose your game ZIP again to restore read access.');
    } else {
      message('Choose the original game ZIP. It is read locally, with a private cache of up to 2 GB.');
    }
    byId('library-status').textContent = state.directXLibrary
      ? 'Your selected DirectX library will be read locally.'
      : 'Built-in DirectX library selected.';
  }
  async function select(action, pending) {
    if (busy) return;
    busy = true;
    byId('play').disabled = true;
    message(pending);
    let failure = null;
    try {
      // Invoke the picker before the first await so browser user activation survives.
      const result = action();
      render(await result);
    } catch (error) {
      if (error.name !== 'AbortError') failure = error;
    } finally {
      busy = false;
      try { render(await source.status()); } catch (error) { message(error.message, true); }
      if (failure) message(failure.message || String(failure), true);
    }
  }
  byId('choose-zip').addEventListener('click', () => select(() => source.chooseGameZip(), 'Opening your game ZIP…'));
  byId('choose-dll').addEventListener('click', () => select(() => source.chooseDirectXLibrary(), 'Choosing your local DirectX library…'));
  byId('clear').addEventListener('click', () => select(() => source.clear(), 'Clearing this player’s local cache…'));
  byId('play').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    byId('play').disabled = true;
    try {
      const state = await source.ready();
      const mode = byId('mode').value === 'SingleThreaded' ? 'SingleThreaded' : 'SingleThreadedJit';
      const url = new URL(mode + '/boxedwine.html', source.baseURL);
      const values = {
        rootBase: '../', root: 'boxedwine', storage: 'memory', rootfs: 'memory',
        storageKey: 'neo', auto: 'true', graphicsLog: '1', mmxFix: '1',
        p: 'D:\\neo\\Matrix3.exe', w: 'd:/neo', resolution: '640x480',
        env: '"WINEDLLOVERRIDES:d3dx9_27=n,b;dinput8=b;mscoree,mshtml="'
      };
      if (mode === 'SingleThreadedJit') values['safe-memory'] = 'true';
      if (!state.directXLibrary) values.effectLibrary = 'builtin';
      for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value);
      const frame = document.createElement('iframe');
      frame.title = 'Path of Neo browser player';
      frame.allow = 'autoplay; fullscreen; gamepad';
      frame.allowFullscreen = true;
      frame.src = url.href;
      byId('screen').replaceChildren(frame);
      byId('setup').hidden = true;
      byId('player').hidden = false;
      byId('running-status').textContent = 'Loading your game locally — the first start can take several minutes';
      frame.addEventListener('load', () => { byId('running-status').textContent = 'Game session · ' + state.archiveName; });
      byId('player').scrollIntoView({ block: 'start' });
    } catch (error) {
      message(error.message || String(error), true);
    } finally {
      busy = false;
      byId('play').disabled = false;
    }
  });
  byId('stop').addEventListener('click', () => {
    byId('screen').replaceChildren();
    byId('player').hidden = true;
    byId('setup').hidden = false;
  });
  byId('fullscreen').addEventListener('click', async () => {
    try { await byId('player').requestFullscreen(); }
    catch (_) { byId('running-status').textContent = 'Full screen is unavailable in this browser panel.'; }
  });
  if (!source) {
    message('The local file reader could not be loaded. Reload the page.', true);
    byId('choose-zip').disabled = true;
    return;
  }
  source.status().then(render).catch(error => {
    message(error.message || String(error), true);
    byId('choose-zip').disabled = true;
  });
}());
