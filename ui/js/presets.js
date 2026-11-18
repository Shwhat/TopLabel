// ---------- presets: sizes, depth profiles, arrangements, palette, rarities, lands ----------
const SIZE_PRESETS = [
  { id: 'toploader', name: 'Toploader replacement', w: 76, h: 100, t: 2 },
  { id: 'card', name: 'Card size', w: 63, h: 88, t: 2 },
  { id: 'smallcard', name: 'Small card', w: 59, h: 86, t: 2 },
  { id: 'square', name: 'Square tile', w: 50, h: 50, t: 2 },
  { id: 'mini', name: 'Mini tile', w: 35, h: 35, t: 2 },
];
// raise: height above the top of the base; sink: depth into the base; engrave: cut only, no part.
// sync: the symbol and the text use the same depth.
const DEPTH_PROFILES = [
  { id: 'standard', name: 'Standard', t: 2, sync: true, symbol: { raise: 1, sink: 0.5, engrave: false }, text: { raise: 1, sink: 0.5, engrave: false } },
  { id: 'low', name: 'Low', t: 1.6, sync: true, symbol: { raise: 0.6, sink: 0.4, engrave: false }, text: { raise: 0.6, sink: 0.4, engrave: false } },
  { id: 'bold', name: 'Bold', t: 2, sync: true, symbol: { raise: 1.5, sink: 0.5, engrave: false }, text: { raise: 1.5, sink: 0.5, engrave: false } },
  { id: 'inlay', name: 'Flush inlay', t: 2, sync: true, symbol: { raise: 0, sink: 0.5, engrave: false }, text: { raise: 0, sink: 0.5, engrave: false } },
  { id: 'engraved', name: 'Engraved', t: 2, sync: true, symbol: { raise: 0, sink: 0.5, engrave: true }, text: { raise: 0, sink: 0.5, engrave: true } },
];
// ---------- layouts: rows from top to bottom, each holding items side by side ----------
// items: { t: 'symbol' } | { t: 'text', lines: [{ src, text }], slot } | { t: 'mana', syms: [{ c, slot, style }], size }
const ITEM_TYPES = [['symbol', 'Set symbol'], ['text', 'Text'], ['code', 'Set code'], ['mana', 'Mana symbols']];
const symItem = () => ({ t: 'symbol' });
const textItem = (src = 'name', slot = 2) => ({ t: 'text', lines: [{ src, text: '' }], slot });
const manaItem = () => ({ t: 'mana', syms: [], size: 8 });
function newItem(type, l) {
  const slot = l && l.text ? l.text.slot : 2;
  if (type === 'symbol') return symItem();
  if (type === 'code') return textItem('code', slot);
  if (type === 'mana') return manaItem();
  return textItem(l && l.set ? 'name' : 'custom', slot);
}
const row = (...items) => ({ h: '', items });
// built-in layouts. h: '' is automatic, or a percentage of the content area
const ARRANGEMENTS = [
  { id: 'stack', name: 'Symbol over text', margin: 7, gap: 3, symPct: 90, rows: () => [row(symItem()), row(textItem('name')), row(textItem('code'))] },
  { id: 'stackrev', name: 'Text over symbol', margin: 7, gap: 3, symPct: 90, rows: () => [row(textItem('name')), row(textItem('code')), row(symItem())] },
  { id: 'symbol', name: 'Symbol only', margin: 7, gap: 3, symPct: 90, rows: () => [row(symItem())] },
  { id: 'text', name: 'Text only', margin: 7, gap: 3, symPct: 90, rows: () => [row(textItem('name')), row(textItem('code'))] },
  { id: 'side', name: 'Symbol beside text', margin: 6, gap: 4, symPct: 90, rows: () => [row(symItem(), { t: 'text', lines: [{ src: 'name', text: '' }, { src: 'code', text: '' }], slot: 2 })] },
  { id: 'divband', name: 'Divider band', margin: 1.5, gap: 2, symPct: 90, rows: () => [row(symItem(), textItem('name'))] },
];
const layoutRows = a => typeof a.rows === 'function' ? a.rows() : clone(a.rows || []);
// labels and saved arrangements from before version 0.3.0 kept a layout kind and one list of text lines
function rowsFromKind(kind, lines, showSym = true, showText = true, slot = 2) {
  const ls = showText ? (lines || []) : [];
  const textRows = ls.map(ln => row({ t: 'text', lines: [{ src: ln.src, text: ln.text || '' }], slot }));
  const sym = showSym ? [row(symItem())] : [];
  if (kind === 'stackrev') return textRows.concat(sym);
  if (kind === 'symbol') return sym.length ? sym : textRows;
  if (kind === 'text') return textRows.length ? textRows : sym;
  if (kind === 'side') { const items = (showSym ? [symItem()] : []).concat(ls.length ? [{ t: 'text', lines: clone(ls), slot }] : []); return items.length ? [row(...items)] : []; }
  return sym.concat(textRows);
}
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
// mana: default colors, and named presets that fill a mana row
const MANA_COLORS = { W: '#F4EE2A', U: '#0078BF', B: '#443089', R: '#C12E1F', G: '#057748' };
const MANA_PRESETS = [
  ['Colors', [['W', 'White'], ['U', 'Blue'], ['B', 'Black'], ['R', 'Red'], ['G', 'Green'], ['C', 'Colorless'], ['WUBRG', 'All five colors']]],
  ['Guilds', [['WU', 'Azorius'], ['UB', 'Dimir'], ['BR', 'Rakdos'], ['RG', 'Gruul'], ['GW', 'Selesnya'], ['WB', 'Orzhov'], ['UR', 'Izzet'], ['BG', 'Golgari'], ['RW', 'Boros'], ['GU', 'Simic']]],
  ['Shards', [['GWU', 'Bant'], ['WUB', 'Esper'], ['UBR', 'Grixis'], ['BRG', 'Jund'], ['RGW', 'Naya']]],
  ['Wedges', [['WBG', 'Abzan'], ['URW', 'Jeskai'], ['BGU', 'Sultai'], ['RWB', 'Mardu'], ['GUR', 'Temur']]],
];
function manaInfo(code) { return ((LIB && LIB.mana) || []).find(m => m.code === code) || null; }
function manaDefaultSlot(code) {
  const m = manaInfo(code), c = (m && m.colors && m.colors[0]) || (/^[WUBRG]$/.test(code) ? code : '');
  return nearestSlot(MANA_COLORS[c] || '#A6A9AA');
}
const newMana = code => ({ c: code, slot: manaDefaultSlot(code), style: 'pip' });
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
function arrFrom(a) { return { id: a.id, name: a.name, margin: a.margin, gap: a.gap, symPct: a.symPct, rows: a.rows ? layoutRows(a) : rowsFromKind(a.kind, (a.text && a.text.lines) || [{ src: 'name' }, { src: 'code' }]) }; }
// every text item and line of a label, in order
const textItems = l => (l.arr.rows || []).flatMap(r => r.items).filter(i => i.t === 'text');
const allLines = l => textItems(l).flatMap(i => i.lines);
function depthById(id) { return DEPTH_PROFILES.find(d => d.id === id) || ((SAVED.presets && SAVED.presets.depths) || []).find(d => d.id === id) || null; }
function sizeById(id) { return SIZE_PRESETS.find(d => d.id === id) || ((SAVED.presets && SAVED.presets.sizes) || []).find(d => d.id === id) || null; }

// a new label: the toploader size, the default arrangement, standard depth
function newLabel() {
  const arr = arrangementById(PREFS.defaultArr) || ARRANGEMENTS[0];
  const d = DEPTH_PROFILES[0];
  return {
    v: 1, kind: 'label', name: '', set: null,
    size: { preset: 'toploader', w: 76, h: 100, t: d.t, r: 0 },
    arr: arrFrom(arr),
    depth: { id: d.id, sync: true, symbol: clone(d.symbol), text: clone(d.text) },
    base: { slot: 1 },
    symbol: { src: 'set', wm: '', rarity: 'C', style: 'detail', slot: 2, slot2: 3 },
    text: Object.assign({ font: DEFAULT_FONT, bold: true, italic: false, upper: false, size: 7, min: 3, spacing: 1.15, align: 'center', slot: 2 }, savedText(arr)),
  };
}
// the text settings kept with a saved layout (lines now live in the rows)
function savedText(a) { if (!a || !a.text) return {}; const t = clone(a.text); delete t.lines; return t; }
const setRef = s => s ? { code: s.code, name: s.name, date: s.date, type: s.type, count: s.count, src: s.src, folder: s.folder || '', icon: s.icon || '', rarities: s.rarities || [] } : null;
// apply a set to a label: the symbol, the rarity if the old one is missing, and the label name
function applySet(l, s) {
  l.set = setRef(s); l.name = '';
  l.symbol.src = 'set';
  const rs = l.set.src === 'vectors' ? l.set.rarities : [];
  if (rs.length && !rs.includes(l.symbol.rarity)) l.symbol.rarity = rs.includes('C') ? 'C' : rs[0];
  // a label whose text was all typed in (a land or watermark label) gets the set's name and code again
  if (allLines(l).every(x => x.src === 'custom')) l.arr.rows = defaultRows(l);
}
// land and watermark labels: the first text item becomes one custom line with the name, other text items go,
// and a symbol row is added when there is none
function setCustomText(l, txt) {
  let done = false;
  for (const r of l.arr.rows) r.items = r.items.filter(i => { if (i.t !== 'text') return true; if (done) return false; done = true; i.lines = [{ src: 'custom', text: txt }]; return true; });
  l.arr.rows = l.arr.rows.filter(r => r.items.length);
  if (!done) { const it = textItem('custom', l.text.slot); it.lines[0].text = txt; l.arr.rows.push(row(it)); }
  if (!l.arr.rows.some(r => r.items.some(i => i.t === 'symbol'))) l.arr.rows.unshift(row(symItem()));
}
function defaultRows(l) {
  const a = l.kind === 'divider' ? ARRANGEMENTS.find(x => x.id === 'divband') : (arrangementById(PREFS.defaultArr) || ARRANGEMENTS[0]);
  return arrFrom(a).rows;
}
function applyLand(l, land) {
  l.set = null; l.name = land.name;
  l.symbol.src = 'wm'; l.symbol.wm = land.id;
  l.symbol.slot = nearestSlot(land.color);
  setCustomText(l, land.name.toUpperCase());
}
function applyWatermark(l, name) {
  l.set = null; l.name = name.replace(/^./, c => c.toUpperCase());
  l.symbol.src = 'wm'; l.symbol.wm = name;
  setCustomText(l, l.name);
}

// ---------- dividers ----------
// hole patterns: hole width and height, column and row spacing, rows staggered by half a row in every other column
const PATTERNS = {
  hex: { name: 'Hexagon', w: 8.28, h: 6.35, cx: 9.1, cy: 8.06, stagger: true },
  circle: { name: 'Circles', w: 6, h: 6, cx: 8, cy: 8, stagger: true },
  square: { name: 'Squares', w: 6, h: 6, cx: 8, cy: 8, stagger: false },
  diamond: { name: 'Diamonds', w: 7, h: 7, cx: 5.2, cy: 7.6, stagger: true },
  slot: { name: 'Vertical slots', w: 3, h: 16, cx: 5.5, cy: 18, stagger: false },
  solid: { name: 'Solid' },
};
const PATTERN_OPTS = Object.entries(PATTERNS).map(([k, p]) => [k, p.name]);
// built-in divider shapes; saved shapes live in SAVED.presets.dividers with the same fields
const DIVIDER_SHAPES = [
  { id: 'catalog', name: 'Card catalog divider', w: 71.92, h: 72, t: 2.16, r: 0.6, band: 12, tabH: 20.4, tabInset: 2.5, pattern: Object.assign({ kind: 'hex', border: 2 }, PATTERNS.hex) },
];
function dividerShapeById(id) { return DIVIDER_SHAPES.find(d => d.id === id) || ((SAVED.presets && SAVED.presets.dividers) || []).find(d => d.id === id) || null; }
function applyDividerShape(l, d) {
  l.size = { preset: d.id, w: d.w, h: d.h, t: d.t, r: d.r };
  l.div.shape = d.id; l.div.band = d.band; l.div.tabH = d.tabH; l.div.tabInset = d.tabInset;
  l.div.pattern = clone(d.pattern);
}
function newDivider() {
  const l = newLabel();
  l.kind = 'divider';
  l.div = { shape: 'catalog', band: 12, tabH: 20.4, tabInset: 2.5, pattern: {}, back: { mode: 'flush', sink: 0.5 } };
  applyDividerShape(l, DIVIDER_SHAPES[0]);
  l.arr = arrFrom(ARRANGEMENTS.find(x => x.id === 'divband'));
  const d = DEPTH_PROFILES.find(x => x.id === 'inlay');
  l.depth = { id: d.id, sync: true, symbol: clone(d.symbol), text: clone(d.text) };
  return l;
}
