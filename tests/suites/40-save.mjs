// Saving labels, reopening, the open label after a reload, saved arrangements, presets and colors.
export const tests = {
  'save, save as, rename, open from the panel, delete': async t => {
    await t.open(); await t.pickSet('NEO');
    await t.key('Control+s'); await t.page.waitForSelector('#dlg[open] input[name=name]');
    t.eq(await t.page.inputValue('#dlg input[name=name]'), 'Kamigawa: Neon Dynasty');
    await t.page.fill('#dlg input[name=name]', 'Neon'); await t.enter();
    await t.page.waitForFunction(() => !dirty && SAVED.labels.length === 1);
    t.ok(await t.eval(() => $('#docname').textContent === 'Kamigawa: Neon Dynasty'), 'saved title');
    await t.prop('size.w', 70);
    t.ok(await t.eval(() => $('#docname').textContent.endsWith('(changed)')), 'changed');
    await t.key('Control+s'); await t.page.waitForFunction(() => !dirty);
    await t.key('Control+Shift+s'); await t.page.fill('#dlg input[name=name]', 'Neon wide'); await t.enter();
    await t.page.waitForFunction(() => SAVED.labels.length === 2 && !dirty);
    await t.pickSet('BLB');
    await t.page.click('#labelspanel tr[data-label] >> text=Neon'); await t.built();
    t.eq(await t.eval(() => [L.set.code, L.size.w, SAVED.labels.find(x => x.id === labelId).name]), ['NEO', 70, 'Neon']);
    await t.act('renameLabel'); await t.page.fill('#dlg input[name=name]', 'Neon 70'); await t.enter();
    await t.page.waitForFunction(() => SAVED.labels.some(x => x.name === 'Neon 70'));
    await t.page.click('#labelspanel tr:has-text("Neon wide") [data-dellabel]');
    await t.page.waitForFunction(() => SAVED.labels.length === 1);
    const r = await t.page.request.get(t.url + '/api/data/labels.json'); t.eq((await r.json()).map(x => x.name), ['Neon 70'], 'saved on the server');
  },
  'the open label, preferences and panels come back after a reload': async t => {
    await t.open(); await t.pickSet('LTR'); await t.prop('size.h', 90);
    await t.act('toggleGuides'); await t.act('view2d'); await t.act('panelBottom');
    await t.page.waitForTimeout(2200);
    await t.open();
    t.eq(await t.eval(() => [L.set.code, L.size.h, PREFS.guides, PREFS.view, $('#dock-bottom').classList.contains('hidden'), dirty]), ['LTR', 90, false, '2d', true, true]);
  },
  'saved arrangements are shared, include text settings, and one can be the default': async t => {
    await t.open(); await t.pickSet('SOS');
    await t.prop('arr.id', 'stackrev'); await t.prop('arr.margin', 5); await t.prop('text.font', 'cinzel');
    await t.act('saveArrangement'); await t.page.fill('#dlg input[name=name]', 'Top text Cinzel'); await t.enter();
    await t.page.waitForFunction(() => SAVED.arrangements.length === 1);
    await t.act('setDefaultArr');
    await t.act('newLabel');
    t.eq(await t.eval(() => [L.arr.name, L.arr.rows[0].items[0].t, L.arr.rows[2].items[0].t, L.arr.margin, L.text.font]), ['Top text Cinzel', 'text', 'symbol', 5, 'cinzel']);
    const second = await t.page.context().browser().newContext(); const p2 = await second.newPage();
    await p2.request.post(t.url + '/api/signup', { headers: t.H, data: { name: 'other' + Date.now() % 100000, password: 'password123' } });
    const shared = await (await p2.request.get(t.url + '/api/data/arrangements.json')).json();
    t.eq(shared.map(a => [a.name, a.text.font]), [['Top text Cinzel', 'cinzel']], 'shared with other accounts');
    await second.close();
    await t.prop('arr.id', 'stack'); await t.prop('arr.id', shared[0].id);
    t.eq(await t.eval(() => L.text.font), 'cinzel', 'choosing it applies its text settings');
    await t.act('manageArrangements'); await t.page.click('#dlg [data-del]'); await t.page.click('#dlgbtns .primary');
    t.eq(await t.eval(() => [SAVED.arrangements.length, PREFS.defaultArr]), [0, 'stack']);
  },
  'size presets, depth profiles and color sets': async t => {
    await t.open();
    await t.prop('size.w', 80); await t.prop('size.h', 30);
    await t.act('saveSize'); await t.page.fill('#dlg input[name=name]', 'Shelf strip'); await t.enter();
    await t.prop('depth.symbol.raise', 2);
    await t.act('saveDepth'); await t.page.fill('#dlg input[name=name]', 'Tall symbol'); await t.enter();
    await t.page.waitForFunction(() => SAVED.presets.sizes.length === 1 && SAVED.presets.depths.length === 1);
    await t.prop('size.preset', 'toploader'); await t.prop('depth.id', 'standard');
    await t.prop('size.preset', await t.eval(() => SAVED.presets.sizes[0].id));
    await t.prop('depth.id', await t.eval(() => SAVED.presets.depths[0].id));
    t.eq(await t.eval(() => [L.size.w, L.size.h, L.depth.symbol.raise]), [80, 30, 2]);
    await t.act('paletteDlg');
    await t.page.fill('#dlg input[data-n="1"]', 'Silk white'); await t.page.dispatchEvent('#dlg input[data-n="1"]', 'input');
    await t.page.click('#dlg [data-add]');
    await t.page.fill('#palname', 'My AMS'); await t.page.click('#dlg [data-savep]');
    await t.confirm();
    t.eq(await t.eval(() => [palette().length, palette()[1].name, SAVED.presets.palettes[0].name, slotOpts()[1][1]]), [9, 'Silk white', 'My AMS', '2 Silk white']);
    await t.act('managePresets');
    t.eq(await t.eval(() => document.querySelectorAll('#dlg [data-del]').length), 3);
    await t.page.click('#dlgbtns .primary');
  },
  'unsaved changes are protected': async t => {
    await t.open(); await t.pickSet('HOB');
    let asked = '';
    t.page.removeAllListeners('dialog'); t.page.on('dialog', d => { asked = d.message(); d.dismiss(); });
    await t.eval(() => ACTIONS.newLabel());
    t.ok(asked.includes('not saved'), 'asked before discarding');
    t.eq(await t.eval(() => L.set.code), 'HOB', 'label kept after answering no');
  },
};
