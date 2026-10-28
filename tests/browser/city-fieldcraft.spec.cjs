const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
async function walk(page,x,z) {
  await page.evaluate(async({x,z})=>{
    const start=performance.now(),angle=.25;
    await new Promise((resolve,reject)=>{
      function step(){
        const p=window.__cwWorld.snapshot().world,dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
        if(d<.28){window.__cwWorld.setMovement(0,0);resolve();return;}
        if(performance.now()-start>18000){window.__cwWorld.setMovement(0,0);reject(new Error('Route blocked at '+p.x+','+p.z+' toward '+x+','+z));return;}
        window.__cwWorld.setMovement((dx*Math.cos(angle)-dz*Math.sin(angle))/d,(dx*Math.sin(angle)+dz*Math.cos(angle))/d);
        requestAnimationFrame(step);
      }step();
    });
  },{x,z});
}
test('physical field route, rooftop discovery and remembered quartermaster transaction',async({page})=>{
  test.setTimeout(180000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/CyberWorld/ascension.html');
  await page.waitForFunction(()=>window.__cwCity&&window.__cwAscensionShell);
  await page.locator('#cwas-begin').click();await page.locator('#cwas-handle').fill('FIELD-QA');await page.locator('#cwas-creator-form button[type=submit]').click();
  if (await page.locator('#cwr-dismiss').isVisible()) await page.locator('#cwr-dismiss').click();
  await page.keyboard.down('Shift');
  await walk(page,-9.5,14);await page.keyboard.press('e');
  await expect(page.locator('#cwas-city-title')).toContainText('Patch');
  await page.locator('[data-city-action=train]').click();
  await walk(page,-4,12);await page.keyboard.press('e');
  expect(await page.evaluate(()=>window.__cwCity.state().beacons)).toEqual(['trace-one']);
  for(const point of [[-14,15],[-28,15],[-28,-2]])await walk(page,...point);
  await page.keyboard.press('e');
  expect(await page.evaluate(()=>window.__cwCity.state().beacons.length)).toBe(2);
  for(const point of [[-28,16],[5,16],[9,11],[13,11],[13,24],[21,29]])await walk(page,...point);
  expect(await page.evaluate(()=>window.__cwWorld.snapshot().world.y)).toBeGreaterThan(4);
  await page.keyboard.press('e');
  expect(await page.evaluate(()=>window.__cwCity.state().beacons.length)).toBe(3);
  expect(await page.evaluate(()=>window.__cwGameplay.state().inventory['FIELD-RECORDER'])).toBe(1);
  await walk(page,17,27);await page.keyboard.press('e');
  await expect(page.locator('#cwas-city-title')).toContainText('forgotten relay');await page.locator('[data-city-action=close]').click();
  const credits=await page.evaluate(()=>window.__cwGameplay.state().credits);
  await page.evaluate(()=>window.__cwWorld.toPlaza());await walk(page,7.5,17);await page.keyboard.press('e');
  await expect(page.locator('#cwas-city-title')).toContainText('Lyra');
  await page.locator('[data-city-action=buy-focus]').click();
  expect(await page.evaluate(()=>window.__cwGameplay.state().credits)).toBe(credits-25);
  expect(await page.evaluate(()=>window.__cwAscension.state().overclock)).toBe(80);
  await page.locator('[data-city-action=close]').click();await page.keyboard.up('Shift');
  await page.reload();await page.waitForFunction(()=>window.__cwCity);await page.locator('#cwas-continue').click();
  expect(await page.evaluate(()=>window.__cwCity.state().discovered)).toBe(true);
  expect(await page.evaluate(()=>window.__cwGameplay.state().inventory['ARCHIVE-ECHO'])).toBe(1);
  await page.evaluate(()=>window.__cwCity.talk('vendor'));await expect(page.locator('#cwas-modal')).toContainText('Back again');
  expect(errors).toEqual([]);
});
test('shipped authoring pack validates and rejects executable or ambiguous content',async({page})=>{
  await page.goto('/tools/quest-studio.html');await page.locator('#load').click();
  await expect(page.locator('#result')).toContainText('STRUCTURE VALID');
  await page.locator('#draft').evaluate(el=>{const draft=JSON.parse(el.value);draft.missions[1].id=draft.missions[0].id;draft.missions[2].kind='eval';draft.missions[3].reward.xp=999999;el.value=JSON.stringify(draft);});
  await page.locator('#validate').click();
  await expect(page.locator('#result')).toContainText('id must be unique');
  await expect(page.locator('#result')).toContainText('unregistered validator');
  await expect(page.locator('#result')).toContainText('bounded whole numbers');
});
