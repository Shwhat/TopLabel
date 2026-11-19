// ---------- demo labels: one of each kind, built from the library ----------
const DEMOS = [
  { id: 'plains', name: 'Plains (basic land)', make: l => applyLand(l, LANDS[0]) },
  { id: 'mountain', name: 'Mountain (basic land)', make: l => applyLand(l, LANDS[3]) },
  { id: 'ltr', name: 'Lord of the Rings, custom name line', set: 'LTR', make: l => { l.arr.rows[1].items[0].lines = [{ src: 'custom', text: 'Lord of the Rings' }]; } },
  { id: 'tla', name: 'Avatar: The Last Airbender, long name wrapped', set: 'TLA' },
  { id: 'neo', name: 'Kamigawa: Neon Dynasty, two-tone rare, flush inlay', set: 'NEO', make: l => { l.symbol.rarity = 'R'; l.symbol.style = 'twotone'; l.symbol.slot = 2; l.symbol.slot2 = 5; } },
  { id: 'blb', name: 'Bloomburrow, symbol beside text on a wide label', set: 'BLB', make: l => { Object.assign(l.size, { preset: 'custom', w: 100, h: 35 }); l.arr = arrFrom(ARRANGEMENTS.find(a => a.id === 'side')); Object.assign(l.arr, { margin: 4, gap: 3, symPct: 92 }); l.text.size = 8; } },
  { id: 'fdn', name: 'Foundations, text over symbol, engraved, Cinzel', set: 'FDN', make: l => { l.arr = arrFrom(ARRANGEMENTS.find(a => a.id === 'stackrev')); l.text.font = 'cinzel'; l.text.upper = true; l.depth = { id: 'engraved', sync: true, symbol: clone(DEPTH_PROFILES[4].symbol), text: clone(DEPTH_PROFILES[4].text) }; } },
  { id: 'rakdos', name: 'Rakdos mana row under the text', set: 'SOS', mana: true, make: l => { l.arr.rows.push(row({ t: 'mana', syms: 'BR'.split('').map(newMana), size: 9 })); l.arr.id = 'custom'; l.arr.name = 'Custom'; } },
  { id: 'wubrg', name: 'All five colors, icons beside the symbol', set: 'ECL', mana: true, make: l => { l.arr.rows[0].items.push({ t: 'mana', syms: 'WUBRG'.split('').map(c => Object.assign(newMana(c), { style: 'icon' })), size: 7 }); l.arr.id = 'custom'; l.arr.name = 'Custom'; } },
  { id: 'landing', name: 'Two set symbols in their own colors, short name, rounded edge', set: 'LTR', make: l => { l.arr.rows[0].items.push({ t: 'symbol', src: 'set', set: 'HOB', rarity: 'M', style: 'detail', slot: 5, slot2: 3 }); l.arr.rows[1].items[0].lines = [{ src: 'short', text: '' }]; l.arr.id = 'custom'; l.arr.name = 'Custom'; l.size.edge = 'round'; l.size.edgeR = 0.6; } },
  { id: 'grid', name: 'Symbol grid of six sets, chamfered edge', set: 'NEO', make: l => { l.arr = arrFrom(ARRANGEMENTS.find(a => a.id === 'grid')); l.arr.rows[0].items[0].codes = ['NEO', 'BLB', 'LTR', 'FDN', 'TLA', 'SOS']; l.arr.rows[0].items[0].cols = 3; l.arr.rows[1].items[0].lines = [{ src: 'custom', text: 'MY COLLECTION' }]; l.size.edge = 'chamfer'; } },
  { id: 'tilted', name: 'Moved, scaled and turned symbol', set: 'BLB', make: l => { Object.assign(l.arr.rows[0].items[0], { x: 6, y: -3, scale: 80, rot: -15 }); l.arr.id = 'custom'; l.arr.name = 'Custom'; } },
  { id: 'divhex', name: 'Divider, hexagon pattern, both faces', set: 'NEO', divider: true },
  { id: 'divsolid', name: 'Divider, solid, front only, raised text', set: 'BLB', divider: true, make: l => { l.div.pattern = { kind: 'solid', border: 2 }; l.div.shape = 'custom'; l.div.back.mode = 'off'; l.depth = { id: 'standard', sync: true, symbol: clone(DEPTH_PROFILES[0].symbol), text: clone(DEPTH_PROFILES[0].text) }; } },
];
function demoLabel(d) {
  if (d.divider) { const l = newDivider(); const s = SETS_BY_CODE.get(d.set); if (!s) return null; applySet(l, s); if (d.make) d.make(l); return l; }
  const l = newLabel();
  l.arr = arrFrom(ARRANGEMENTS[0]);
  if (d.set) { const s = SETS_BY_CODE.get(d.set); if (!s) return null; applySet(l, s); }
  if (d.make) d.make(l);
  if (d.id === 'neo') { l.depth = { id: 'inlay', sync: true, symbol: clone(DEPTH_PROFILES[3].symbol), text: clone(DEPTH_PROFILES[3].text) }; }
  return l;
}
function demoDlg() {
  if (!LIB.ready) { flash('Refresh the library first; the demo labels use its symbols'); return; }
  const avail = DEMOS.filter(d => (!d.set || SETS_BY_CODE.has(d.set)) && (!d.mana || LIB.mana.length));
  dialog('Demo labels', [['id', 'Demo', avail[0].id, 'select', avail.map(d => [d.id, d.name])]], v => {
    const d = DEMOS.find(x => x.id === v.id); if (!d || !confirmDiscard()) return;
    const l = demoLabel(d); if (!l) { flash('That set is not in the library'); return; }
    openLabel(l, ''); flash('Demo: ' + d.name);
  }, 'Open', '<div class="note">Each demo shows a different layout, depth or symbol style. Demos open as new labels and are not saved until you save them.</div>');
}
