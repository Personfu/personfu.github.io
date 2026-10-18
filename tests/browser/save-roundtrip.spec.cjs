const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const campaign = require('../../CyberWorld/ascension-campaign.js');

test.use({serviceWorkers:'block',reducedMotion:'reduce'});

const legacy = {
  callsign:'LEGACY-OP', level:8, xp:321, credits:4567, hp:140,maxHp:140,shield:50,maxShield:50,
  inventory:{'LEGACY-DECK':2,'ROUTE-TROPHY':1},completed:{'legacy-escort':1720000000000},
  flags:{path:'sysadmin',tutorialDone:true,run:{active:false,missionId:null}},field:{clears:12,bestRoute:9},
  look:{suit:'#48ffd5',frame:'sentinel'},email:'private@example.invalid',oauthToken:'DO-NOT-EXPORT'
};
function completedFirstAct() {
  const save=campaign.freshSave();save.active='route-zero';save.completed['route-zero']=true;save.seenZero=true;save.overclock=65;
  save.notes='Facts and hypotheses kept separate.';
  save.records['route-zero']={stage:'complete',mistakes:0,hints:0,answer:{source:'10.77.4.23',order:'1,2,3',message:'ROUTE OVERRIDE',evidence:'unauthorized'},containment:{snapshot:true,isolated:true,rotated:true,restored:true,verified:true},testsPassed:false,hashesCompared:false};
  return save;
}
async function seed(page, {operative=legacy,save=null,pending=null}={}) {
  await page.addInitScript(({operative,save,pending})=>{
    if(localStorage.getItem('qa.save.seeded'))return;
    localStorage.setItem('qa.save.seeded','1');
    localStorage.setItem('cw.ascension.settings.v1',JSON.stringify({sound:false,reducedMotion:true,quality:'low'}));
    localStorage.setItem('cw.operative.v1',JSON.stringify(operative));
    if(save)localStorage.setItem('cw.ascension.v1',JSON.stringify(save));
    if(pending)localStorage.setItem('cw.ascension.restore.pending.v1',JSON.stringify(pending));
  },{operative,save,pending});
}
async function initialize(page,name='RESTORE-QA') {
  await page.goto('/CyberWorld/ascension.html');
  await page.waitForFunction(()=>window.__cwAscensionShell&&window.__cwAscension&&window.__cwWorld);
  await page.locator('#cwas-begin').click();await page.locator('#cwas-handle').fill(name);
  await page.locator('#cwas-creator-form button[type=submit]').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase','playing');
}
async function exportFromSettings(page) {
  await page.locator('#cwas-settings').click();
  const downloading=page.waitForEvent('download');await page.locator('#cwas-save-export').click();
  const download=await downloading;return JSON.parse(fs.readFileSync(await download.path(),'utf8'));
}
async function importFile(page,value,name='ascension-save.json') {
  await page.locator('#cwas-save-import').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
}
async function storedGame(page) {
  return page.evaluate(()=>Object.fromEntries(['cw.operative.v1','cw.ascension.v1','cw.ascension.profile.v1','cw.net.v1'].map(key=>[key,localStorage.getItem(key)])));
}

test('legacy gear and progress survive creation, shell download, restoration and refresh',async({page})=>{
  await seed(page,{save:completedFirstAct()});await initialize(page);
  const before=await page.evaluate(()=>window.__cwGameplay.state());
  expect(before.level).toBe(8);expect(before.xp).toBe(501);expect(before.credits).toBe(4657);
  expect(before.inventory['LEGACY-DECK']).toBe(2);expect(before.inventory['TRAFFIC-LENS']).toBe(1);
  expect(before.completed['legacy-escort']).toBe(legacy.completed['legacy-escort']);expect(before.field.clears).toBe(12);
  await page.locator('[data-deck=inventory]').click();await expect(page.locator('#cwas-modal')).toContainText('LEGACY-DECK × 2');await page.keyboard.press('Escape');
  const exported=await exportFromSettings(page);
  expect(exported.format).toBe('cyberworld-ascension');expect(exported.campaign.completed['route-zero']).toBe(true);
  expect(JSON.stringify(exported)).not.toContain('DO-NOT-EXPORT');expect(exported.operative.email).toBeUndefined();expect(exported.operative.oauthToken).toBeUndefined();
  const receipts=await page.evaluate(()=>{const original=Storage.prototype.setItem,writes=[];Storage.prototype.setItem=function(key,value){if(key==='cw.operative.v1')writes.push(JSON.parse(value));return original.call(this,key,value);};window.__cwGameplay.completeMission('qa-atomic-reward',{xp:7,credits:11,item:'ATOMIC-ITEM'});Storage.prototype.setItem=original;return writes;});
  expect(receipts).toHaveLength(1);expect(receipts[0].completed['qa-atomic-reward']).toBeTruthy();expect(receipts[0].inventory['ATOMIC-ITEM']).toBe(1);expect(receipts[0].credits).toBe(exported.operative.credits+11);expect(receipts[0].xp).toBe(exported.operative.xp+7);
  await page.evaluate(()=>{window.__cwGameplay.gainCredits(999);window.__cwGameplay.gainItem('AFTER-EXPORT',1);});
  await importFile(page,exported);
  await expect(page.locator('#cwas-toast')).toContainText('Progress restored');
  const after=await page.evaluate(()=>window.__cwGameplay.state());
  expect(after.xp).toBe(exported.operative.xp);expect(after.level).toBe(exported.operative.level);expect(after.credits).toBe(exported.operative.credits);
  expect(after.inventory['LEGACY-DECK']).toBe(2);expect(after.inventory['TRAFFIC-LENS']).toBe(1);expect(after.inventory['AFTER-EXPORT']).toBeUndefined();
  expect(await page.evaluate(()=>window.__cwAscension.state().notes)).toBe(exported.campaign.notes);
  expect(await page.evaluate(()=>!!localStorage.getItem('cw.ascension.restore.backup.v1'))).toBe(true);
  await page.reload();await page.waitForFunction(()=>window.__cwAscensionShell);await page.locator('#cwas-continue').click();
  const reloaded=await page.evaluate(()=>window.__cwGameplay.state());
  expect(reloaded.inventory['LEGACY-DECK']).toBe(2);expect(reloaded.inventory['TRAFFIC-LENS']).toBe(1);expect(reloaded.xp).toBe(after.xp);
  expect(await page.evaluate(()=>window.__cwAscension.state().count)).toBe(1);
});

test('invalid imports leave operative, campaign and identity unchanged',async({page})=>{
  await seed(page);await initialize(page,'UNCHANGED-QA');
  const exported=await exportFromSettings(page),before=await storedGame(page);
  const invalid={...exported,campaign:{...exported.campaign,version:999},operative:{...exported.operative,callsign:'SHOULD-NOT-APPEAR'}};
  await importFile(page,invalid);await expect(page.locator('#cwas-toast')).toContainText('Campaign save is invalid');expect(await storedGame(page)).toEqual(before);
  await importFile(page,{...exported,campaign:{...exported.campaign,oauthToken:'forbidden'}},'unknown-field.json');
  await expect(page.locator('#cwas-toast')).toContainText('Campaign save is invalid');expect(await storedGame(page)).toEqual(before);
  await page.locator('#cwas-save-import').setInputFiles({name:'oversized.json',mimeType:'application/json',buffer:Buffer.alloc(262145,32)});
  await expect(page.locator('#cwas-toast')).toContainText('exceeds 256 KB');expect(await storedGame(page)).toEqual(before);
});

test('mid-write import quota failure rolls back the complete prior save',async({page})=>{
  await seed(page,{save:completedFirstAct()});await initialize(page,'ROLLBACK-QA');
  const exported=await exportFromSettings(page),before=await storedGame(page);
  await page.evaluate(()=>{const original=Storage.prototype.setItem;let fail=true;Storage.prototype.setItem=function(key,value){if(key==='cw.ascension.v1'&&fail){fail=false;throw new DOMException('Quota test','QuotaExceededError');}return original.call(this,key,value);};});
  await importFile(page,{...exported,operative:{...exported.operative,callsign:'PARTIAL-WRITE'}});
  await expect(page.locator('#cwas-toast')).toContainText('previous progress was restored');
  expect(await storedGame(page)).toEqual(before);
  expect(await page.evaluate(()=>window.__cwGameplay.state().callsign)).toBe('ROLLBACK-QA');
  expect(await page.evaluate(()=>localStorage.getItem('cw.ascension.restore.pending.v1'))).toBeNull();
});

test('interrupted import recovers an absent old campaign without granting partial rewards',async({page})=>{
  const before={'cw.operative.v1':JSON.stringify(legacy),'cw.ascension.v1':null,'cw.ascension.profile.v1':null,'cw.net.v1':null};
  await seed(page,{operative:{...legacy,callsign:'PARTIAL-IMPORT'},save:completedFirstAct(),pending:{version:1,before}});
  await page.goto('/CyberWorld/ascension.html');await page.waitForFunction(()=>window.__cwAscensionShell&&window.__cwAscension);
  expect(await page.evaluate(()=>window.__cwAscension.state().count)).toBe(0);
  const restored=await page.evaluate(()=>window.__cwGameplay.state());
  expect(restored.callsign).toBe('LEGACY-OP');expect(restored.xp).toBe(321);expect(restored.inventory['TRAFFIC-LENS']).toBeUndefined();
  expect(await page.evaluate(()=>localStorage.getItem('cw.ascension.restore.pending.v1'))).toBeNull();
});

test('quota-blocked storage keeps a playable memory session that exports earned progress',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Storage unavailable for test','QuotaExceededError');};});
  await initialize(page,'MEMORY-QA');
  await page.evaluate(()=>{window.__cwGameplay.completeMission('qa-memory-session',{xp:60,credits:35,item:'MEMORY-TOOL'});window.__cwAscension.talkZero();});
  await page.keyboard.press('Escape');
  await expect(page.locator('#cwas-save-status')).toContainText('SAVE UNAVAILABLE');
  const exported=await exportFromSettings(page);
  expect(exported.operative.callsign).toBe('MEMORY-QA');expect(exported.operative.xp).toBe(60);expect(exported.operative.inventory['MEMORY-TOOL']).toBe(1);
  expect(exported.operative.completed['qa-memory-session']).toBeTruthy();expect(exported.campaign.seenZero).toBe(true);
  expect(await page.evaluate(()=>window.__cwGameplay.state().callsign)).toBe('MEMORY-QA');
});
