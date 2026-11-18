// The Sets panel: search, filters, sorting, keyboard, Scryfall icons, sets without a symbol, lands and watermarks.
const codes = t => t.eval(() => [...document.querySelectorAll('#setspanel .srow')].map(r => r.dataset.set));
export const tests = {
  'main sets by date, newest first; tokens and promos only under All set types': async t => {
    await t.open();
    const c = await codes(t);
    t.eq(c, ['ZZN', 'ZZT', 'HOB', 'SOS', 'ECL', 'TLA', 'FDN', 'BLB', 'LTR', 'NEO', 'CON']);
    await t.page.selectOption('#settypes', 'all');
    t.ok((await codes(t)).includes('TFDN') && (await codes(t)).includes('PNEO'), 'all types');
    await t.page.selectOption('#settypes', 'token');
    t.eq(await codes(t), ['TFDN']);
  },
  'search by name or code, exact code first; year filter; with symbol': async t => {
    await t.open();
    await t.page.fill('#setsearch', 'neo'); await t.page.waitForTimeout(250);
    t.eq(await codes(t), ['NEO']);
    await t.page.fill('#setsearch', 'the'); await t.page.waitForTimeout(250);
    t.eq((await codes(t)).sort(), ['HOB', 'LTR', 'TLA']);
    await t.page.fill('#setsearch', ''); await t.page.waitForTimeout(250);
    await t.page.selectOption('#setyear', '2024');
    t.eq(await codes(t), ['FDN', 'BLB']);
    await t.page.selectOption('#setyear', '');
    await t.page.check('#setsym');
    t.ok(!(await codes(t)).includes('ZZN'), 'sets without a symbol hidden');
  },
  'sorting by column and direction is remembered': async t => {
    await t.open();
    await t.page.click('#setspanel th[data-sort="code"]');
    t.eq((await codes(t)).slice(0, 3), ['BLB', 'CON', 'ECL']);
    await t.page.click('#setspanel th[data-sort="code"]');
    t.eq((await codes(t))[0], 'ZZT');
    t.eq(await t.eval(() => PREFS.setSort), { col: 'code', dir: -1 });
  },
  'keyboard: / to search, arrows and Enter to pick': async t => {
    await t.open();
    await t.page.click('#workhead .whname'); await t.key('/');
    t.ok(await t.eval(() => document.activeElement.id === 'setsearch'), 'search focused');
    await t.page.keyboard.type('foun'); await t.page.waitForTimeout(250);
    await t.key('ArrowDown'); await t.key('Enter'); await t.built();
    t.eq(await t.eval(() => L.set.code), 'FDN');
    t.ok(await t.eval(() => $('#setspanel tr.active').dataset.set === 'FDN'), 'active row');
  },
  'aliases and routes: Conflux uses the CONF folder, promos use their main symbol': async t => {
    await t.open();
    await t.pickSet('CON');
    t.eq(await t.eval(() => [L.set.src, L.set.folder, MODEL.parts.map(p => p.key)]), ['vectors', 'CONF', ['base', 'symbol', 'text']]);
    await t.page.selectOption('#settypes', 'all'); await t.pickSet('PNEO');
    t.eq(await t.eval(() => [L.set.folder, resolveLines(L)]), ['NEO', ['Kamigawa: Neon Dynasty Promos', 'PNEO']]);
  },
  'a set with only a Scryfall icon, and a set without a symbol': async t => {
    await t.open();
    await t.pickSet('ZZT');
    t.eq(await t.eval(() => [L.set.src, MODEL.parts.map(p => p.key), MODEL.warnings]), ['scryfall', ['base', 'symbol', 'text'], []]);
    t.ok(await t.eval(() => !document.querySelector('#props [data-p="symbol.rarity"]')), 'no rarity list');
    await t.pickSet('ZZN');
    t.eq(await t.eval(() => [MODEL.parts.map(p => p.key), MODEL.warnings]), [['base', 'text'], ['This set has no symbol in the library.']]);
  },
  'rarity falls back to common when the new set lacks it': async t => {
    await t.open(); await t.pickSet('TLA'); await t.prop('symbol.rarity', 'RED');
    await t.pickSet('NEO');
    t.eq(await t.eval(() => L.symbol.rarity), 'C');
  },
  'lands and watermarks': async t => {
    await t.open(); await t.act('showWatermarks');
    t.eq(await t.eval(() => [...document.querySelectorAll('[data-land]')].map(x => x.dataset.land)), ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes']);
    await t.page.click('[data-land="swamp"]'); await t.built();
    t.eq(await t.eval(() => [L.set, L.symbol.wm, L.symbol.slot, resolveLines(L), labelTitle(L)]), [null, 'swamp', 6, ['SWAMP'], 'Swamp']);
    await t.page.click('[data-wm="azorius"]'); await t.built();
    t.eq(await t.eval(() => [L.symbol.wm, resolveLines(L)]), ['azorius', ['Azorius']]);
    await t.act('showSets'); await t.pickSet('BLB');
    t.eq(await t.eval(() => resolveLines(L)), ['Bloomburrow', 'BLB'], 'set lines come back after custom-only lines');
  },
};
