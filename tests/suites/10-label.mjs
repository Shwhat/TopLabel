// Building labels: sets, symbols, text, arrangements, sizes, depth, undo.
const parts = t => t.eval(() => MODEL.parts.map(p => p.key));
const info = t => t.eval(() => MODEL.info);
const warns = t => t.eval(() => MODEL.warnings);
const bounds = (t, key) => t.eval(k => { const p = MODEL.parts.find(x => x.key === k); return p ? gBounds(p.paths) : null; }, key);

export const tests = {
  'picking a set builds symbol and text that fit inside the margins': async t => {
    await t.open();
    await t.pickSet('NEO');
    t.eq(await t.eval(() => [L.set.code, L.symbol.rarity, resolveLines(L), L.arr.rows.map(r => r.items.map(i => i.t))]), ['NEO', 'C', ['Kamigawa: Neon Dynasty', 'NEO'], [['symbol'], ['text'], ['text']]]);
    t.eq(await parts(t), ['base', 'symbol', 'text']);
    const s = await bounds(t, 'symbol'), x = await bounds(t, 'text');
    t.ok(s.x0 >= -31 - 0.01 && s.x1 <= 31 + 0.01 && s.y1 <= 43.01, 'symbol inside the margins');
    t.ok(x.y0 >= -43.01 && x.x0 >= -31.01 && x.x1 <= 31.01, 'text inside the margins');
    t.ok(s.y0 >= x.y1 + 3 - 0.01, 'gap between the symbol row and the text rows');
    t.eq((await info(t)).text.lines, 2, 'the name wraps at the colon into two lines');
    t.eq(await warns(t), []);
    t.eq(await t.eval(() => $('#whname').textContent), 'Kamigawa: Neon Dynasty');
  },
  'symbol fills 90 percent of its row': async t => {
    await t.open(); await t.pickSet('TLA');
    const r = await t.eval(() => [MODEL.info.symbol, MODEL.guides.items.find(i => i.kind === 'symbol').rect]);
    t.near(r[0].h, r[1].h * 0.9, 0.05, 'tall symbol uses 90% of its row height');
    await t.pickSet('NEO');
    t.near((await info(t)).symbol.w, 55.8, 0.05, 'wide symbol uses 90% of the 62 mm width');
  },
  'rarity and symbol styles: detailed, silhouette, two-tone': async t => {
    await t.open(); await t.pickSet('NEO');
    const rs = await t.eval(() => [...document.querySelectorAll('#props [data-p="symbol.rarity"] option')].map(o => o.value));
    t.eq(rs, ['C', 'U', 'R', 'M', 'T', 'WM']);
    await t.prop('symbol.rarity', 'R');
    const detail = await t.eval(() => gTotalArea(MODEL.parts.find(p => p.key === 'symbol').paths));
    await t.prop('symbol.style', 'silhouette');
    const sil = await t.eval(() => gTotalArea(MODEL.parts.find(p => p.key === 'symbol').paths));
    t.ok(sil > detail * 1.05, 'the silhouette includes the border');
    await t.prop('symbol.style', 'twotone');
    t.eq(await parts(t), ['base', 'symbol', 'symbol2', 'text']);
    const r = await t.eval(() => [MODEL.parts[1].slot, MODEL.parts[2].slot, gTotalArea(MODEL.parts[1].paths) + gTotalArea(MODEL.parts[2].paths)]);
    t.ok(r[0] !== r[1], 'outline and fill on different slots');
    t.near(r[2], sil, sil * 0.02, 'outline and fill together cover the silhouette');
  },
  'two-tone on a single-shape symbol warns and prints one part': async t => {
    await t.open(); await t.act('showWatermarks');
    await t.page.click('[data-land="island"]'); await t.built();
    await t.prop('symbol.style', 'twotone');
    t.eq(await parts(t), ['base', 'symbol', 'text']);
    t.ok((await warns(t)).some(w => w.includes('no separate border')), 'warning');
  },
  'text items: sources, custom text, all capitals, remove and add': async t => {
    await t.open(); await t.pickSet('FDN');
    const sel = (ri, more) => `#rows .lrow2:nth-child(${ri}) ${more}`;
    await t.page.selectOption(sel(3, '[data-li="0"][data-lf="src"]'), 'year'); await t.built();
    t.eq(await t.eval(() => resolveLines(L)), ['Foundations', '2024']);
    t.eq(await t.eval(() => [L.arr.id, L.arr.name]), ['custom', 'Custom'], 'editing rows makes the layout custom');
    await t.page.selectOption(sel(2, '[data-li="0"][data-lf="src"]'), 'custom'); await t.built();
    t.eq(await t.eval(() => L.arr.rows[1].items[0].lines[0]), { src: 'custom', text: 'Foundations' }, 'custom line starts with the old text');
    await t.page.fill(sel(2, '[data-li="0"][data-lf="text"]'), 'Core 2025'); await t.page.press(sel(2, '[data-li="0"][data-lf="text"]'), 'Enter'); await t.built();
    await t.prop('text.upper', true);
    t.eq(await t.eval(() => resolveLines(L)), ['CORE 2025', '2024']);
    await t.page.click(sel(2, '[data-liadd]')); await t.built();
    t.eq(await t.eval(() => L.arr.rows[1].items[0].lines.length), 2, 'line added to the item');
    await t.page.click(sel(3, '[data-lidel="0"]')); await t.built();
    t.eq(await t.eval(() => L.arr.rows.length), 2, 'removing the last line removes the item and its row');
    await t.page.click('#workhead .whname'); await t.key('Control+l'); await t.built();
    t.eq(await t.eval(() => L.arr.rows.map(r => r.items.map(i => i.t))), [['symbol'], ['text'], ['text']]);
    for (const [src, want] of [['type', 'CORE'], ['count', '730 CARDS'], ['rarity', 'COMMON'], ['date', '2024-11-15'], ['code', 'FDN']]) {
      await t.page.selectOption(sel(3, '[data-li="0"][data-lf="src"]'), src); await t.built();
      t.eq(await t.eval(() => resolveLines(L, L.arr.rows[2].items[0].lines)[0]), want, src);
    }
  },
  'text shrinks to fit and warns below the minimum': async t => {
    await t.open(); await t.pickSet('BLB');
    await t.page.selectOption('#rows .lrow2:nth-child(2) [data-li="0"][data-lf="src"]', 'custom'); await t.built();
    await t.page.fill('#rows .lrow2:nth-child(2) [data-li="0"][data-lf="text"]', 'Averyveryverylongwordwithoutanyspacesatallthatkeepsgoingandgoing'); await t.page.press('#rows .lrow2:nth-child(2) [data-li="0"][data-lf="text"]', 'Enter'); await t.built();
    const i = await info(t);
    t.ok(i.text.size < 7, 'shrunk below the chosen size');
    t.ok((await warns(t)).some(w => w.includes('smaller than the 3 mm minimum')), 'minimum warning');
    t.ok(await t.eval(() => $('#st-warn').textContent === '1 warning'), 'status bar count');
    await t.prop('text.min', 1);
    t.eq(await warns(t), []);
  },
  'layout presets: every preset keeps elements inside the label': async t => {
    await t.open(); await t.pickSet('LTR');
    for (const k of ['stackrev', 'symbol', 'text', 'side', 'divband', 'stack']) {
      await t.prop('arr.id', k);
      const p = await parts(t), b = await t.eval(() => MODEL.parts.filter(p => p.key !== 'base').map(p => gBounds(p.paths)));
      t.ok(b.every(x => x.x0 >= -38 && x.x1 <= 38 && x.y0 >= -50 && x.y1 <= 50), k + ' inside');
      if (k === 'symbol') t.eq(p, ['base', 'symbol']); else if (k === 'text') t.eq(p, ['base', 'text']); else t.eq(p.length, 3, k);
    }
    await t.prop('arr.id', 'stackrev');
    const s = await bounds(t, 'symbol'), x = await bounds(t, 'text');
    t.ok(x.y0 > s.y1, 'text over symbol');
    await t.prop('arr.id', 'side');
    t.ok((await bounds(t, 'text')).x0 > (await bounds(t, 'symbol')).x1, 'symbol beside text');
  },
  'rows: add, move and remove rows and items; row height': async t => {
    await t.open(); await t.pickSet('SOS');
    await t.page.click('#rows .lrow2:nth-child(1) [data-rowdel]'); await t.built();
    t.eq(await parts(t), ['base', 'text']);
    await t.page.selectOption('#rows .lrow2:nth-child(1) [data-additem]', 'symbol'); await t.built();
    const order = () => t.eval(() => { const it = MODEL.guides.items.slice(0, 2); return [it.map(i => i.kind), it[0].rect.x1 <= it[1].rect.x0]; });
    t.eq(await order(), [['text', 'symbol'], true], 'symbol added to the right of the text');
    await t.page.click('#rows .lrow2:nth-child(1) .litem[data-ii="1"] [data-ileft]'); await t.built();
    t.eq(await order(), [['symbol', 'text'], true], 'moved left');
    await t.page.click('#rows .lrow2:nth-child(2) [data-rowup]'); await t.built();
    t.eq(await t.eval(() => L.arr.rows.map(r => r.items.map(i => i.t))), [['text'], ['symbol', 'text']]);
    await t.page.fill('#rows .lrow2:nth-child(1) [data-rf="h"]', '40'); await t.page.press('#rows .lrow2:nth-child(1) [data-rf="h"]', 'Enter'); await t.built();
    t.near(await t.eval(() => MODEL.guides.items[0].rect.h), 86 * 0.4, 0.01, 'row 1 is 40% of the content height');
    await t.page.selectOption('#rows [data-addrow]', 'code'); await t.built();
    t.eq(await t.eval(() => resolveLines(L).pop()), 'SOS');
    await t.act('addRowSymbol');
    t.eq(await t.eval(() => L.arr.rows.length), 4, 'Insert, Symbol row');
  },
  'mana symbols: presets, any number evenly spaced, each with its own color and style': async t => {
    await t.open(); await t.pickSet('NEO');
    await t.page.selectOption('#rows [data-addrow]', 'mana'); await t.built();
    t.ok((await warns(t)).length === 0 && (await parts(t)).length === 3, 'an empty mana row shows nothing');
    const last = '#rows .lrow2:nth-last-child(2)';
    await t.page.selectOption(`${last} [data-mpreset]`, 'BR'); await t.built();
    t.eq(await t.eval(() => L.arr.rows[3].items[0].syms), [{ c: 'B', slot: 6, style: 'pip' }, { c: 'R', slot: 3, style: 'pip' }], 'Rakdos: black on purple, red on red');
    t.eq(await parts(t), ['base', 'symbol', 'text', 'mana_s6', 'mana_s3']);
    const b6 = await bounds(t, 'mana_s6'), b3 = await bounds(t, 'mana_s3');
    t.near(b6.w, 8, 0.05, '8 mm pips'); t.near(b3.x0 - b6.x1, 2, 0.05, 'spaced a quarter of their size'); t.near((b6.x0 + b3.x1) / 2, 0, 0.05, 'centred');
    const pip = await t.eval(() => gTotalArea(MODEL.parts.find(p => p.key === 'mana_s6').paths));
    await t.page.selectOption(`${last} [data-mi="0"][data-mf="style"]`, 'icon'); await t.built();
    t.ok(await t.eval(() => gTotalArea(MODEL.parts.find(p => p.key === 'mana_s6').paths)) < pip * 0.8, 'icon is the glyph alone');
    await t.page.selectOption(`${last} [data-madd]`, 'G'); await t.built();
    await t.page.selectOption(`${last} [data-mi="2"][data-mf="slot"]`, '5'); await t.built();
    t.eq(await t.eval(() => L.arr.rows[3].items[0].syms.map(m => [m.c, m.slot, m.style])), [['B', 6, 'icon'], ['R', 3, 'pip'], ['G', 5, 'pip']]);
    t.ok(await t.eval(() => MODEL.parts.some(p => p.key === 'mana_s5')), 'own color');
    await t.page.selectOption(`${last} [data-mpreset]`, 'WUBRG'); await t.built();
    t.eq(await t.eval(() => [L.arr.rows[3].items[0].syms.map(m => m.c).join(''), MODEL.info.mana]), ['WUBRG', 5]);
    await t.page.click(`${last} [data-midel="0"]`); await t.built();
    t.eq(await t.eval(() => MODEL.info.mana), 4);
  },
  'sizes: presets, custom values, corner radius and scaling': async t => {
    await t.open(); await t.pickSet('ECL');
    await t.prop('size.preset', 'card');
    t.eq(await t.eval(() => [L.size.w, L.size.h, L.size.t]), [63, 88, 2]);
    t.eq(await t.eval(() => gBounds(MODEL.outline)), { x0: -31.5, y0: -44, x1: 31.5, y1: 44, w: 63, h: 88 });
    await t.prop('size.w', 70);
    t.eq(await t.eval(() => L.size.preset), 'custom');
    await t.prop('size.w', 63);
    t.eq(await t.eval(() => L.size.preset), 'card', 'matching values select the preset again');
    await t.prop('size.r', 5);
    t.ok(await t.eval(() => gTotalArea(MODEL.outline) < 63 * 88 - 20), 'rounded corners remove area');
    await t.act('sizeDlg');
    await t.page.fill('#dlg input[name=scale]', '50'); await t.enter();
    t.eq(await t.eval(() => [L.size.w, L.size.h, L.size.r, L.text.size, L.arr.margin]), [31.5, 44, 2.5, 3.5, 3.5]);
    t.ok((await t.eval(() => $('#st-size').textContent)).startsWith('31.5 x 44 mm'), 'status bar');
  },
  'depth: profiles set heights, pockets and engraving': async t => {
    await t.open(); await t.pickSet('FDN');
    const z = () => t.eval(() => Object.fromEntries(MODEL.parts.map(p => [p.key, [Math.min(...p.slabs.map(s => s.z0)), Math.max(...p.slabs.map(s => s.z1))]])));
    t.eq(await z(t), { base: [0, 2], symbol: [1.5, 3], text: [1.5, 3] }, 'standard');
    await t.prop('depth.id', 'inlay');
    t.eq(await z(t), { base: [0, 2], symbol: [1.5, 2], text: [1.5, 2] }, 'flush inlay');
    await t.prop('depth.id', 'engraved');
    t.eq(await parts(t), ['base'], 'engraved parts are only cut');
    t.ok(await t.eval(() => MODEL.engraved.length === 2), 'two engraved outlines');
    await t.prop('depth.id', 'low');
    t.eq(await z(t), { base: [0, 1.6], symbol: [1.2, 2.2], text: [1.2, 2.2] }, 'low');
    await t.prop('depth.sync', false);
    await t.prop('depth.text.raise', 0); await t.prop('depth.text.sink', 0);
    t.eq(await t.eval(() => L.depth.id), 'custom');
    t.ok((await warns(t)).some(w => w.includes('Text has no height')), 'no height warning');
    await t.prop('depth.symbol.sink', 5);
    t.ok((await warns(t)).some(w => w.includes('0.2 mm of base')), 'too deep warning');
  },
  'same depth for symbol and text: on by default, linked, separate when off': async t => {
    await t.open(); await t.pickSet('NEO');
    t.eq(await t.eval(() => [L.depth.sync, L.depth.id, MODEL.height]), [true, 'standard', 3]);
    t.ok(await t.eval(() => !document.querySelector('#props [data-p="depth.text.raise"]')), 'one set of fields while linked');
    await t.prop('depth.symbol.raise', 0.6);
    t.eq(await t.eval(() => [L.depth.text.raise, L.depth.id]), [0.6, 'custom'], 'text follows');
    await t.prop('depth.sync', false);
    await t.prop('depth.text.raise', 1.2);
    t.eq(await t.eval(() => [L.depth.symbol.raise, L.depth.text.raise]), [0.6, 1.2], 'separate');
    await t.prop('depth.sync', true);
    t.eq(await t.eval(() => L.depth.text.raise), 0.6, 'turning it on copies the symbol depth to the text');
    t.eq(await t.eval(() => normalizeLabel({ depth: { symbol: { raise: 1, sink: 0, engrave: false }, text: { raise: 0.5, sink: 0.5, engrave: false } } }).depth.sync), false, 'older labels with different depths stay separate');
    t.ok(await t.eval(() => !SIZE_PRESETS.some(s => s.name === 'Box divider')), 'Box divider preset removed');
  },
  'labels and layouts from earlier versions become rows': async t => {
    await t.open();
    const r = await t.eval(() => [
      normalizeLabel({ arr: { id: 'side', kind: 'side', margin: 6, gap: 4, band: 55, symPct: 90 }, text: { lines: [{ src: 'name' }, { src: 'code' }], show: true, slot: 4 }, symbol: { show: true } }).arr.rows.map(r => r.items.map(i => i.t + (i.lines ? i.lines.length + ':' + i.slot : ''))),
      normalizeLabel({ arr: { id: 'stack', kind: 'stack' }, text: { lines: [{ src: 'custom', text: 'PLAINS' }], show: true }, symbol: { show: false } }).arr.rows.map(r => r.items.map(i => i.t)),
      arrFrom({ id: 'a_old', name: 'Old', kind: 'stackrev', margin: 5, gap: 4, symPct: 80, text: { lines: [{ src: 'name' }] } }).rows.map(r => r.items.map(i => i.t)),
    ]);
    t.eq(r, [[['symbol', 'text2:4']], [['text']], [['text'], ['symbol']]]);
  },
  'every part is a closed mesh in every depth profile': async t => {
    await t.open(); await t.pickSet('TLA');
    for (const d of ['standard', 'inlay', 'engraved', 'bold']) {
      await t.prop('depth.id', d);
      const bad = await t.eval(() => MESHES.map(m => { const c = new Map(); for (let i = 0; i < m.idx.length; i += 3) for (const [a, b] of [[m.idx[i], m.idx[i + 1]], [m.idx[i + 1], m.idx[i + 2]], [m.idx[i + 2], m.idx[i]]]) { const k = a < b ? a + ',' + b : b + ',' + a; c.set(k, (c.get(k) || 0) + 1); } return [m.name, [...c.values()].filter(n => n !== 2).length]; }).filter(x => x[1]));
      t.eq(bad, [], d + ': edges not shared by exactly two triangles');
    }
  },
  'undo and redo every change; title shows unsaved changes': async t => {
    await t.open(); await t.pickSet('NEO'); await t.pickSet('BLB');
    await t.prop('size.w', 80);
    await t.key('Control+z'); await t.built();
    t.eq(await t.eval(() => [L.size.w, L.set.code]), [76, 'BLB']);
    await t.key('Control+z'); await t.built();
    t.eq(await t.eval(() => L.set.code), 'NEO');
    await t.key('Control+y'); await t.built();
    t.eq(await t.eval(() => L.set.code), 'BLB');
    t.ok(await t.eval(() => document.title.startsWith('* ')), 'title marks changes');
    await t.act('resetLabel');
    t.eq(await t.eval(() => [L.set.code, L.size.w]), ['BLB', 76], 'reset keeps the set');
  },
};
