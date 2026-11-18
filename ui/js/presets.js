// ---------- presets: sizes, depth profiles, arrangements, palette, rarities, lands ----------
const SIZE_PRESETS = [
  { id: 'toploader', name: 'Toploader replacement', w: 76, h: 100, t: 2 },
  { id: 'card', name: 'Card size', w: 63, h: 88, t: 2 },
  { id: 'smallcard', name: 'Small card', w: 59, h: 86, t: 2 },
  { id: 'square', name: 'Square tile', w: 50, h: 50, t: 2 },
  { id: 'mini', name: 'Mini tile', w: 35, h: 35, t: 2 },
  { id: 'divider', name: 'Box divider', w: 70, h: 95, t: 1.6 },
];
// raise: height above the top of the base; sink: depth into the base; engrave: cut only, no part
const DEPTH_PROFILES = [
  { id: 'standard', name: 'Standard', t: 2, symbol: { raise: 1, sink: 0, engrave: false }, text: { raise: 0.5, sink: 0.5, engrave: false } },
  { id: 'low', name: 'Low', t: 1.6, symbol: { raise: 0.6, sink: 0, engrave: false }, text: { raise: 0.4, sink: 0.4, engrave: false } },
  { id: 'bold', name: 'Bold', t: 2, symbol: { raise: 1.5, sink: 0, engrave: false }, text: { raise: 1, sink: 0.5, engrave: false } },
  { id: 'inlay', name: 'Flush inlay', t: 2, symbol: { raise: 0, sink: 0.6, engrave: false }, text: { raise: 0, sink: 0.6, engrave: false } },
  { id: 'engraved', name: 'Engraved', t: 2, symbol: { raise: 0, sink: 0.6, engrave: true }, text: { raise: 0, sink: 0.6, engrave: true } },
];
// kind: stack (symbol over text), stackrev (text over symbol), symbol, text, side (symbol beside text)
const ARRANGEMENTS = [
  { id: 'stack', name: 'Symbol over text', kind: 'stack', margin: 7, gap: 4, band: 27, symPct: 90 },
  { id: 'stackrev', name: 'Text over symbol', kind: 'stackrev', margin: 7, gap: 4, band: 27, symPct: 90 },
  { id: 'symbol', name: 'Symbol only', kind: 'symbol', margin: 7, gap: 4, band: 0, symPct: 90 },
  { id: 'text', name: 'Text only', kind: 'text', margin: 7, gap: 4, band: 100, symPct: 90 },
  { id: 'side', name: 'Symbol beside text', kind: 'side', margin: 6, gap: 4, band: 55, symPct: 90 },
];
const ARR_KINDS = [['stack', 'Symbol over text'], ['stackrev', 'Text over symbol'], ['symbol', 'Symbol only'], ['text', 'Text only'], ['side', 'Symbol beside text']];
const DEFAULT_PALETTE = [
  { name: 'Black', color: '#161616' }, { name: 'White', color: '#FFFFFF' }, { name: 'Red', color: '#C12E1F' }, { name: 'Blue', color: '#0078BF' },
  { name: 'Yellow', color: '#F4EE2A' }, { name: 'Purple', color: '#443089' }, { name: 'Green', color: '#057748' }, { name: 'Grey', color: '#A6A9AA' },
];
const RARITY_NAMES = { C: 'Common', U: 'Uncommon', R: 'Rare', M: 'Mythic', S: 'Special', T: 'Timeshifted', WM: 'Watermark' };
const RARITY_COLORS = { C: '#1a1a1a', U: '#a6a9aa', R: '#e3cd99', M: '#dc7725', S: '#632e77', T: '#632e77', WM: '#1a1a1a' };
const rarityName = r => RARITY_NAMES[r] || 'Variant ' + r;
const LANDS = [
  { id: 'plains', name: 'Plains', color: '#F4EE2A' }, { id: 'island', name: 'Island', color: '#0078BF' }, { id: 'swamp', name: 'Swamp', color: '#443089' },
  { id: 'mountain', name: 'Mountain', color: '#C12E1F' }, { id: 'forest', name: 'Forest', color: '#057748' }, { id: 'wastes', name: 'Wastes', color: '#A6A9AA' },
];
const SET_TYPES = { core: 'Core', expansion: 'Expansion', masters: 'Masters', alchemy: 'Alchemy', masterpiece: 'Masterpiece', arsenal: 'Arsenal', from_the_vault: 'From the Vault', spellbook: 'Spellbook', premium_deck: 'Premium deck', duel_deck: 'Duel deck', draft_innovation: 'Draft innovation', treasure_chest: 'Treasure chest', commander: 'Commander', planechase: 'Planechase', archenemy: 'Archenemy', vanguard: 'Vanguard', funny: 'Funny', starter: 'Starter', box: 'Box', promo: 'Promo', token: 'Token', memorabilia: 'Memorabilia', minigame: 'Minigame', eternal: 'Eternal' };
const typeName = t => SET_TYPES[t] || String(t || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
// set types shown by default ("Main sets"): the ones people usually store cards from
const MAIN_TYPES = new Set(['core', 'expansion', 'masters', 'draft_innovation', 'commander', 'funny', 'starter', 'eternal', 'spellbook', 'from_the_vault', 'premium_deck', 'duel_deck', 'arsenal', 'masterpiece', 'planechase', 'archenemy', 'box']);
const LINE_SOURCES = [['name', 'Set name'], ['code', 'Set code'], ['year', 'Release year'], ['date', 'Release date'], ['type', 'Set type'], ['rarity', 'Rarity'], ['count', 'Card count'], ['custom', 'Custom text']];
const DEFAULT_FONT = 'comic-neue';
const SYMBOL_STYLES = [['detail', 'Detailed'], ['silhouette', 'Silhouette with border'], ['twotone', 'Two-tone']];

function palette() { return (PREFS.palette && PREFS.palette.length) ? PREFS.palette : DEFAULT_PALETTE; }
function slotColor(n) { const p = palette(); return (p[n - 1] || p[0] || { color: '#888' }).color; }
function slotName(n) { const p = palette(); return p[n - 1] ? `${n} ${p[n - 1].name}` : `${n}`; }
// the palette slot whose color is closest to a color
function nearestSlot(hex, skip = 0) {
  const rgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); const v = m ? parseInt(m[1], 16) : 0; return [v >> 16, (v >> 8) & 255, v & 255]; };
  const [a, b, c] = rgb(hex); let best = 1, bd = 1e9;
  palette().forEach((s, i) => { if (i + 1 === skip) return; const [x, y, z] = rgb(s.color); const d = (x - a) ** 2 + (y - b) ** 2 + (z - c) ** 2; if (d < bd) { bd = d; best = i + 1; } });
  return best;
}
function arrangementById(id) { return ARRANGEMENTS.find(a => a.id === id) || (SAVED.arrangements || []).find(a => a.id === id) || null; }
function depthById(id) { return DEPTH_PROFILES.find(d => d.id === id) || ((SAVED.presets && SAVED.presets.depths) || []).find(d => d.id === id) || null; }
function sizeById(id) { return SIZE_PRESETS.find(d => d.id === id) || ((SAVED.presets && SAVED.presets.sizes) || []).find(d => d.id === id) || null; }

// a new label: the toploader size, the default arrangement, standard depth
function newLabel() {
  const arr = clone(arrangementById(PREFS.defaultArr) || ARRANGEMENTS[0]);
  const d = DEPTH_PROFILES[0];
  return {
    v: 1, name: '', set: null,
    size: { preset: 'toploader', w: 76, h: 100, t: d.t, r: 0 },
    arr: { id: arr.id, name: arr.name, kind: arr.kind, margin: arr.margin, gap: arr.gap, band: arr.band, symPct: arr.symPct },
    depth: { id: d.id, symbol: clone(d.symbol), text: clone(d.text) },
    base: { slot: 1 },
    symbol: { show: true, src: 'set', wm: '', rarity: 'C', style: 'detail', slot: 2, slot2: 3 },
    text: { show: true, lines: [{ src: 'name', text: '' }, { src: 'code', text: '' }], font: DEFAULT_FONT, bold: true, italic: false, upper: false, size: 7, min: 3, spacing: 1.15, align: 'center', slot: 2 },
  };
}
const setRef = s => s ? { code: s.code, name: s.name, date: s.date, type: s.type, count: s.count, src: s.src, folder: s.folder || '', icon: s.icon || '', rarities: s.rarities || [] } : null;
// apply a set to a label: the symbol, the rarity if the old one is missing, and the label name
function applySet(l, s) {
  l.set = setRef(s); l.name = '';
  l.symbol.src = 'set';
  const rs = l.set.src === 'vectors' ? l.set.rarities : [];
  if (rs.length && !rs.includes(l.symbol.rarity)) l.symbol.rarity = rs.includes('C') ? 'C' : rs[0];
  if (l.text.lines.every(x => x.src === 'custom')) l.text.lines = [{ src: 'name', text: '' }, { src: 'code', text: '' }];
}
function applyLand(l, land) {
  l.set = null; l.name = land.name;
  l.symbol.src = 'wm'; l.symbol.wm = land.id;
  l.symbol.slot = nearestSlot(land.color);
  l.text.lines = [{ src: 'custom', text: land.name.toUpperCase() }];
}
function applyWatermark(l, name) {
  l.set = null; l.name = name.replace(/^./, c => c.toUpperCase());
  l.symbol.src = 'wm'; l.symbol.wm = name;
  l.text.lines = [{ src: 'custom', text: l.name }];
}
