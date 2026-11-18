// Dividers: shape, patterns, top band content, both faces, saved shapes.
const closedEdges = t => t.eval(() => MESHES.map(m => { const c = new Map(); for (let i = 0; i < m.idx.length; i += 3) for (const [a, b] of [[m.idx[i], m.idx[i + 1]], [m.idx[i + 1], m.idx[i + 2]], [m.idx[i + 2], m.idx[i]]]) { const k = a < b ? a + ',' + b : b + ',' + a; c.set(k, (c.get(k) || 0) + 1); } return [m.name, [...c.values()].filter(n => n !== 2).length]; }).filter(x => x[1]));

export const tests = {
  'New divider keeps the set and matches the example divider': async t => {
    await t.open(); await t.pickSet('NEO');
    await t.page.click('.rb[data-act="newDivider"]'); await t.built();
    t.eq(await t.eval(() => [L.kind, L.set.code, L.size.w, L.size.h, L.size.t, L.div.shape, L.arr.id, L.depth.id, L.div.back.mode, resolveLines(L)]), ['divider', 'NEO', 71.92, 72, 2.16, 'catalog', 'divband', 'inlay', 'flush', ['Kamigawa: Neon Dynasty']]);
    const b = await t.eval(() => gBounds(MODEL.outline));
    t.eq([b.w, b.h], [71.92, 72], 'outline');
    t.ok(await t.eval(() => MODEL.info.pattern.holes) >= 50, 'about 52 holes like the example');
    t.eq(await t.eval(() => MODEL.parts.map(p => p.key)), ['base', 'symbol', 'text', 'symbol_b', 'text_b']);
    t.eq(await t.eval(() => MODEL.warnings), []);
    t.eq(await closedEdges(t), [], 'closed meshes');
    t.ok(await t.eval(() => $('#props').textContent.includes('Tab inset')), 'divider fields');
  },
  'content stays in the top band; the tab is narrower; back is mirrored and flush': async t => {
    await t.open(); await t.pickSet('LTR'); await t.act('newDivider');
    const r = await t.eval(() => {
      const pb = k => gBounds(MODEL.parts.find(p => p.key === k).paths), z = k => { const s = MODEL.parts.find(p => p.key === k).slabs[0]; return [s.z0, s.z1]; };
      const bottom = MODEL.outline.flat().filter(q => q.Y / GU < -36 + 5).map(q => Math.abs(q.X / GU));
      return { sym: pb('symbol'), symb: pb('symbol_b'), txt: pb('text'), zs: z('symbol'), zb: z('symbol_b'), tabHalf: Math.max(...bottom) };
    });
    t.ok(r.sym.y0 >= 36 - 12 - 1e-6 && r.txt.y0 >= 36 - 12 - 1e-6, 'inside the 12 mm band');
    t.near(r.symb.x0, -r.sym.x1, 0.01, 'back mirrored');
    t.eq([r.zs, r.zb], [[1.66, 2.16], [0, 0.5]], 'flush 0.5 mm on both faces');
    t.near(r.tabHalf, 71.92 / 2 - 2.5, 0.01, 'tab inset 2.5 mm');
    await t.prop('div.back.mode', 'off');
    t.eq(await t.eval(() => MODEL.parts.map(p => p.key)), ['base', 'symbol', 'text']);
    await t.prop('depth.id', 'standard');
    t.eq(await t.eval(() => [MODEL.height, L.size.t]), [2.16 + 1, 2.16], 'front can be raised; thickness stays');
  },
  'every pattern builds a closed divider': async t => {
    await t.open(); await t.pickSet('FDN'); await t.act('newDivider');
    for (const k of ['circle', 'square', 'diamond', 'slot', 'solid', 'hex']) {
      await t.prop('div.pattern.kind', k);
      const n = await t.eval(() => MODEL.info.pattern.holes);
      t.ok(k === 'solid' ? n === 0 : n > 10, k + ' holes ' + n);
      t.eq(await closedEdges(t), [], k + ' closed');
    }
    t.eq(await t.eval(() => L.div.shape), 'custom');
    await t.prop('div.pattern.cx', 14);
    t.ok(await t.eval(() => MODEL.info.pattern.holes) < 40, 'wider column spacing, fewer holes');
  },
  'front and back too deep keeps 0.2 mm of plate': async t => {
    await t.open(); await t.pickSet('BLB'); await t.act('newDivider');
    await t.prop('depth.symbol.sink', 1.5); await t.prop('div.back.sink', 1.5);
    t.ok(await t.eval(() => MODEL.warnings.some(w => w.includes('0.2 mm of plate'))), 'warning');
    t.eq(await closedEdges(t), [], 'still closed');
  },
  'divider shapes are saved, chosen again and listed; saved dividers reopen': async t => {
    await t.open(); await t.pickSet('SOS'); await t.act('newDivider');
    await t.prop('size.w', 80); await t.prop('div.pattern.kind', 'circle');
    await t.act('saveDivider'); await t.page.fill('#dlg input[name=name]', 'Wide circles'); await t.enter();
    await t.page.waitForFunction(() => SAVED.presets.dividers.length === 1);
    await t.prop('div.shape', 'catalog');
    t.eq(await t.eval(() => [L.size.w, L.div.pattern.kind]), [71.92, 'hex']);
    await t.prop('div.shape', await t.eval(() => SAVED.presets.dividers[0].id));
    t.eq(await t.eval(() => [L.size.w, L.div.pattern.kind]), [80, 'circle']);
    await t.key('Control+s'); await t.page.fill('#dlg input[name=name]', 'SOS divider'); await t.enter();
    await t.page.waitForFunction(() => !dirty);
    t.ok(await t.eval(() => $('#labelspanel').textContent.includes('divider')), 'badge in the panel');
    await t.act('newLabel'); await t.page.click('#labelspanel tr:has-text("SOS divider")'); await t.built();
    t.eq(await t.eval(() => [L.kind, L.size.w, L.div.pattern.kind]), ['divider', 80, 'circle']);
  },
  'divider exports as one closed object with its parts': async t => {
    await t.open(); await t.pickSet('NEO');
    await t.key('Control+Shift+n'); await t.built();
    const d = await t.download(() => t.eval(() => exportLabel('bambu')));
    t.ok(d.name.endsWith('.3mf') && d.bytes.length > 50000, 'file');
    t.eq(await t.eval(() => MESHES.map(m => [m.name, m.slot])), [['Divider', 1], ['Symbol', 2], ['Text', 2], ['Symbol (back)', 2], ['Text (back)', 2]]);
  },
};
