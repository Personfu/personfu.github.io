/* Local end-to-end campaign verification; run with node from the repository. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('@playwright/test');
const data = require('../CyberWorld/ascension-data.js');
const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};

async function run() {
  const server = http.createServer((req,res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file,(error,body) => { if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(body); });
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({headless:true,channel:'chrome'});
    const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'no-preference',serviceWorkers:'block'});
    const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Campaign browser error:',e.message);});
    await page.goto(`http://127.0.0.1:${server.address().port}/CyberWorld/ascension.html`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__cwAscension&&window.__cwAscensionShell);
    await page.locator('#cwas-begin').click();
    await page.locator('#cwas-creator-form').waitFor({state:'visible'});
    await page.locator('#cwas-handle').fill('CAMPAIGN-QA');
    await page.locator('#cwas-creator-form button[type=submit]').click();
    await page.waitForFunction(()=>document.body.dataset.phase==='playing');
    await page.evaluate(()=>window.__cwAscension.talkZero());
    await page.locator('[data-action=enter-soc]').click();
    assert.equal(await page.evaluate(()=>window.__cwWorld.snapshot().district),'soc');
    async function open(id) {
      await page.evaluate(id=>window.__cwAscension.startMission(id),id);
      await page.locator('[data-action=investigate]').click();
    }
    async function submit() { await page.locator('[data-puzzle] button[type=submit]').click(); }
    async function file() { await page.locator('[data-action=complete]').click(); }
    let capturedArena=false;
    async function recover() {
      await page.waitForFunction(()=>{const canvas=document.getElementById('cwas-response-canvas');return canvas&&canvas.dataset.renderer==='three-webgl'&&canvas.getContext('webgl2')&&canvas.getContext('webgl2').drawingBufferWidth>0;});
      assert.equal(await page.locator('.cwas-arena-label').count(),5,'The WebGL response arena exposes five projected 3D infrastructure labels');
      if(!capturedArena){fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await page.screenshot({path:path.join(root,'test-results/ascension-containment-3d.png')});capturedArena=true;}
      await page.locator('[data-action=respond][data-value=isolate]').click();
      assert.match(await page.locator('#cwas-status').innerText(),/Preserve/);
      await page.locator('[data-action=respond][data-value=snapshot]').click();
      await page.locator('[data-action=target][data-value=subnet]').click();
      await page.locator('[data-action=respond][data-value=isolate]').click();
      assert.match(await page.locator('#cwas-status').innerText(),/essential delivery/);
      await page.locator('[data-action=target][data-value=dispatcher]').click();
      for(const action of ['isolate','rotate','restore','verify']) await page.locator(`[data-action=respond][data-value=${action}]`).click();
      await page.waitForFunction(()=>document.querySelector('.cwas-arena-label')&&Array.from(document.querySelectorAll('.cwas-arena-label')).some(label=>label.textContent.includes('RECOVERED')));
      await page.locator('[data-action=debrief]').click();
    }
    await open('route-zero');
    await page.locator('[name=source]').selectOption('10.77.4.23');
    await page.locator('[name=order]').fill('1,2,3');
    await page.locator('[data-action=decode-packets]').click();
    assert.match(await page.locator('#cwas-tool-result').innerText(),/ROUTE OVERRIDE/);
    await page.locator('[name=message]').fill('ROUTE OVERRIDE');
    await page.locator('[name=evidence]').selectOption('dns');
    await submit();
    assert.match(await page.locator('#cwas-status').innerText(),/not yet supported/);
    await page.locator('[name=evidence]').selectOption('unauthorized');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__cwAscension);
    await page.evaluate(()=>window.__cwAscension.startMission());
    assert.equal(await page.locator('[name=message]').inputValue(),'ROUTE OVERRIDE','Refresh preserves verified entered evidence from the submitted checkpoint');
    await page.locator('[name=evidence]').selectOption('unauthorized');
    await submit();await recover();await file();
    assert.equal(await page.evaluate(()=>window.__cwAscension.state().count),1);
    const reward=await page.evaluate(()=>window.__cwGameplay.state().inventory['TRAFFIC-LENS']);
    await page.evaluate(()=>window.__cwAscension.syncRewards());
    assert.equal(await page.evaluate(()=>window.__cwGameplay.state().inventory['TRAFFIC-LENS']),reward,'Reward synchronization is idempotent');
    await open('trusted-package');
    await page.locator('[name=boundary]').selectOption('origin');await page.locator('[name=patch]').selectOption('both');await submit();await file();
    await open('ghost-route');
    await page.locator('[name=address]').fill('198.51.100.42');await page.locator('[name=cause]').selectOption('cache');await submit();await file();
    await open('repeated-machine');
    await page.locator('[data-action=xor]').click();assert.match(await page.locator('#cwas-tool-result').innerText(),/HOLD WEST/);
    await page.locator('[name=message]').fill('HOLD WEST');await page.locator('[name=failure]').selectOption('reuse');await submit();await file();
    await open('bounds-of-trust');
    await page.locator('[name=policy]').selectOption('inclusive');await page.locator('[data-action=bounds-test]').click();assert.match(await page.locator('#cwas-tool-result').innerText(),/FAIL/);
    await page.locator('[name=policy]').selectOption('strict');await page.locator('[data-action=bounds-test]').click();assert.doesNotMatch(await page.locator('#cwas-tool-result').innerText(),/FAIL/);await submit();await file();
    await open('assembly-line');
    await page.locator('[data-action=hash]').click();await page.waitForFunction(()=>window.__cwAscension.state().records['assembly-line'].hashesCompared);
    await page.locator('[name=digest]').fill(data.missions[5].expectedDigest);await page.locator('[name=edge]').selectOption('build-package');await submit();await file();
    await open('hold-the-grid');
    await page.locator('[name=order]').fill('B,A,C,D');await page.locator('[name=confidence]').selectOption('uncertain');await submit();await recover();await file();
    const state=await page.evaluate(()=>window.__cwAscension.state());
    assert.equal(state.count,7);assert.equal(state.xp,1910);assert.equal(state.inventory.length,7);
    await page.evaluate(()=>window.__cwAscension.openDeck('academy'));
    await page.locator('[data-action=lab-decode]').click();assert.equal(await page.locator('#cwas-lab-result').innerText(),'OK');await page.locator('[name=labanswer]').fill('OK');await page.locator('[data-action=lab-check]').click();
    await page.evaluate(()=>window.__cwAscension.openDeck('journal'));await page.locator('#cwas-notes').fill('QA: facts and hypotheses separated.');await page.locator('[data-action=save-notes]').click();
    const exported=await page.evaluate(()=>window.__cwAscension.exportState());assert.equal(exported.notes,'QA: facts and hypotheses separated.');
    await page.evaluate(save=>window.__cwAscension.importState(save),exported);assert.equal(await page.evaluate(()=>window.__cwAscension.state().count),7);
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.__cwAscension.openDeck('missions'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Mobile page must not overflow horizontally');
    assert.equal(await page.locator('#cwas-modal').getAttribute('aria-labelledby'),'cwas-dialog-title');
    assert.deepEqual(errors,[],'Campaign flow should have no unhandled JavaScript errors');
    console.log('Ascension browser: operative creation, SOC travel, all seven acts, actual tools, reversible recovery, reload resume, idempotent rewards, Academy, journal, export/import, and mobile layout passed.');
  } finally { if(browser)await browser.close();await new Promise(resolve=>server.close(resolve)); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
