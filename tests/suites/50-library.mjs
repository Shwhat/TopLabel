// Refreshing the library through the interface, against the fake GitHub and Scryfall started by the test runner.
export const tests = {
  'Refresh library downloads symbols, sets and icons and shows the new set': async t => {
    await t.open();
    t.ok(!(await t.eval(() => SETS_BY_CODE.has('NEW'))), 'not there before');
    await t.page.click('.rtab[data-rtab="library"]'); await t.page.click('.rb[data-act="refreshLibrary"]');
    await t.page.waitForFunction(() => /^Done\./.test($('#rfstep').textContent), null, { timeout: 30000 });
    t.ok(await t.eval(() => $('#rfstep').textContent.includes('sets')), 'summary');
    await t.page.click('#dlgbtns .primary');
    t.eq(await t.eval(() => { const s = SETS_BY_CODE.get('NEW'); return [s.name, s.src]; }), ['Brand New Set', 'scryfall']);
    t.eq(await t.eval(() => document.querySelector('#setspanel .srow').dataset.set), 'NEW', 'newest first');
    await t.pickSet('NEW');
    t.eq(await t.eval(() => MODEL.parts.map(p => p.key)), ['base', 'symbol', 'text']);
    await t.act('libraryInfo');
    t.ok(await t.eval(() => $('#dlgbody').textContent.includes('Sets with a Scryfall icon')), 'library information');
  },
  'a failed refresh keeps the library and says why': async t => {
    await t.open();
    const before = await t.eval(() => LIB.sets.length);
    t.upstream.fail = true;
    try {
      await t.act('refreshLibrary');
      await t.page.waitForFunction(() => /failed/.test($('#rfstep').textContent), null, { timeout: 30000 });
      t.ok(await t.eval(() => $('#rfstep').textContent.includes('GitHub') && $('#rfstep').textContent.includes('still in use')), 'reason shown');
    } finally { t.upstream.fail = false; }
    await t.page.click('#dlgbtns .primary');
    const r = await t.page.request.get(t.url + '/api/library'); t.eq((await r.json()).sets.length, before, 'library unchanged');
  },
};
