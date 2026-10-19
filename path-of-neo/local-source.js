/* Browser-side selector for the read-only, local game source. */
(function () {
  'use strict';
  const scriptURL = document.currentScript && document.currentScript.src;
  const base = new URL('.', scriptURL || window.location.href);
  const workerURL = new URL('neo-local-sw.js', base);
  let bootstrap;

  async function controlledWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) throw new Error('This player needs HTTPS and service worker support.');
    if (!bootstrap) bootstrap = (async () => {
      const registration = await navigator.serviceWorker.register(workerURL.href, { scope: base.href, updateViaCache: 'none' });
      if (!registration.active) await new Promise((resolve, reject) => {
        const worker = registration.installing || registration.waiting;
        if (!worker) { reject(new Error('The local reader could not activate.')); return; }
        const timer = setTimeout(() => reject(new Error('The local reader did not activate. Reload and try again.')), 30000);
        const changed = () => {
          if (worker.state === 'activated') { clearTimeout(timer); resolve(); }
          else if (worker.state === 'redundant') { clearTimeout(timer); reject(new Error('The local reader installation was replaced. Reload and try again.')); }
        };
        worker.addEventListener('statechange', changed); changed();
      });
      if (!navigator.serviceWorker.controller || navigator.serviceWorker.controller.scriptURL !== workerURL.href) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => { navigator.serviceWorker.removeEventListener('controllerchange', changed); reject(new Error('Reload this page to finish enabling its local reader.')); }, 10000);
          function changed() {
            if (navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL === workerURL.href) { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', changed); resolve(); }
          }
          navigator.serviceWorker.addEventListener('controllerchange', changed); changed();
        });
      }
      return registration.active;
    })().catch(error => { bootstrap = undefined; throw error; });
    await bootstrap;
    // An update can replace the worker after the first call. Always use the
    // controller serving this document, rather than a redundant cached worker.
    const controller = navigator.serviceWorker.controller;
    if (!controller || controller.scriptURL !== workerURL.href) { bootstrap = undefined; throw new Error('Reload this page to finish enabling its local reader.'); }
    return controller;
  }

  async function send(type, handle) {
    const worker = await controlledWorker();
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('The local file reader did not reply. Reload and choose your ZIP again.')); }, 60000);
      channel.port1.onmessage = event => {
        clearTimeout(timer); channel.port1.close();
        if (event.data && event.data.ok) resolve(event.data.result);
        else reject(new Error(event.data && event.data.error || 'The local file reader failed.'));
      };
      try { worker.postMessage({ type, handle }, [channel.port2]); }
      catch (error) { clearTimeout(timer); channel.port1.close(); reject(error); }
    });
  }

  function openPicker(options) {
    if (!window.showOpenFilePicker) throw new Error('Choose local files in desktop Chrome or Edge. This browser does not provide the required read-only file picker.');
    // Invoke before awaiting anything: the browser requires this user gesture.
    return window.showOpenFilePicker(options);
  }

  async function chooseGameZip() {
    const handles = await openPicker({ id: 'neo-local-game', multiple: false, types: [{ description: 'Your original Path of Neo ZIP', accept: { 'application/zip': ['.zip'] } }] });
    return describe(await send('SET_ZIP', handles[0]));
  }

  async function chooseDirectXLibrary() {
    const handles = await openPicker({ id: 'neo-local-directx', multiple: false, types: [{ description: 'Optional 32-bit d3dx9_27.dll', accept: { 'application/octet-stream': ['.dll'] } }] });
    return describe(await send('SET_DLL', handles[0]));
  }

  function describe(result) {
    return { ...result, baseURL: base.href, crossOriginIsolated: window.crossOriginIsolated === true };
  }

  async function status() { return describe(await send('STATUS')); }

  async function ready() {
    const result = await status();
    if (!result.archiveReady) {
      const error = new Error(result.permissionRequired ? 'Choose your local ZIP again to grant read access for this visit.' : result.error || 'Choose your local game ZIP before starting.');
      error.code = 'NEO_LOCAL_ARCHIVE_REQUIRED';
      throw error;
    }
    return result;
  }

  window.NeoLocalSource = Object.freeze({ baseURL: base.href, ready, status, chooseGameZip, chooseDirectXLibrary, clear: async () => describe(await send('CLEAR')) });
})();
