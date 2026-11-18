// ---------- demo labels: one of each kind, built from the library ----------
const DEMOS = [
  { id: 'plains', name: 'Plains (basic land)', make: l => applyLand(l, LANDS[0]) },
  { id: 'mountain', name: 'Mountain (basic land)', make: l => applyLand(l, LANDS[3]) },
  { id: 'ltr', name: 'Lord of the Rings, custom name line', set: 'LTR', make: l => { l.text.lines = [{ src: 'custom', text: 'Lord of the Rings' }, { src: 'code', text: '' }]; } },
  { id: 'tla', name: 'Avatar: The Last Airbender, long name wrapped', set: 'TLA' },
  { id: 'neo', name: 'Kamigawa: Neon Dynasty, two-tone rare, flush inlay', set: 'NEO', make: l => { l.symbol.rarity = 'R'; l.symbol.style = 'twotone'; l.symbol.slot = 2; l.symbol.slot2 = 5; } },
  { id: 'blb', name: 'Bloomburrow, symbol beside text on a wide label', set: 'BLB', make: l => { Object.assign(l.size, { preset: 'custom', w: 100, h: 35 }); Object.assign(l.arr, { id: 'side', name: 'Symbol beside text', kind: 'side', margin: 4, gap: 3, band: 60, symPct: 92 }); l.text.size = 8; } },
  { id: 'fdn', name: 'Foundations, text over symbol, engraved, Cinzel', set: 'FDN', make: l => { Object.assign(l.arr, { id: 'stackrev', name: 'Text over symbol', kind: 'stackrev' }); l.text.font = 'cinzel'; l.text.upper = true; l.depth = { id: 'engraved', symbol: clone(DEPTH_PROFILES[4].symbol), text: clone(DEPTH_PROFILES[4].text) }; } },
];
function demoLabel(d) {
  const l = newLabel();
  l.arr = { id: 'stack', name: 'Symbol over text', kind: 'stack', margin: 7, gap: 4, band: 27, symPct: 90 };
  if (d.set) { const s = SETS_BY_CODE.get(d.set); if (!s) return null; applySet(l, s); }
  if (d.make) d.make(l);
  if (d.id === 'neo') { l.depth = { id: 'inlay', symbol: clone(DEPTH_PROFILES[3].symbol), text: clone(DEPTH_PROFILES[3].text) }; }
  return l;
}
function demoDlg() {
  if (!LIB.ready) { flash('Refresh the library first; the demo labels use its symbols'); return; }
  const avail = DEMOS.filter(d => !d.set || SETS_BY_CODE.has(d.set));
  dialog('Demo labels', [['id', 'Demo', avail[0].id, 'select', avail.map(d => [d.id, d.name])]], v => {
    const d = DEMOS.find(x => x.id === v.id); if (!d || !confirmDiscard()) return;
    const l = demoLabel(d); if (!l) { flash('That set is not in the library'); return; }
    openLabel(l, ''); flash('Demo: ' + d.name);
  }, 'Open', '<div class="note">Each demo shows a different arrangement, depth or symbol style. Demos open as new labels and are not saved until you save them.</div>');
}
