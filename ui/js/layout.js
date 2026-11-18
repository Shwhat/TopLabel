// ---------- layout: from a label document to positioned outlines and parts ----------
// The label is centred on the origin, x to the right, y up, in millimetres. The base sits on z = 0.
const fixDashes = s => String(s || '').replace(/\s*[\u2012\u2013\u2014\u2015]\s*/g, ' - ');

// the text lines a label shows, in order, with empty lines left out
function resolveLines(l) {
  const st = l.set, out = [];
  for (const ln of l.text.lines || []) {
    let v = '';
    switch (ln.src) {
      case 'name': v = st ? fixDashes(st.name) : (l.name || ''); break;
      case 'code': v = st ? st.code : ''; break;
      case 'year': v = st && st.date ? st.date.slice(0, 4) : ''; break;
      case 'date': v = st && st.date ? st.date : ''; break;
      case 'type': v = st ? typeName(st.type) : ''; break;
      case 'rarity': v = (l.symbol.src === 'set' && st && st.src === 'vectors') ? rarityName(l.symbol.rarity) : ''; break;
      case 'count': v = st && st.count ? `${st.count} cards` : ''; break;
      default: v = fixDashes(ln.text || '');
    }
    v = String(v).replace(/\s+/g, ' ').trim();
    if (l.text.upper) v = v.toUpperCase();
    if (v) out.push(v);
  }
  return out;
}

// split a line that is too wide: at a colon or a spaced dash first, otherwise at the space nearest the middle
function wrapLine(measure, str, maxW) {
  if (measure(str) <= maxW || !/\s/.test(str)) return [str];
  for (const sep of [': ', ' - ']) {
    const i = str.indexOf(sep);
    if (i > 0) return [str.slice(0, i).trim(), str.slice(i + sep.length).trim()].filter(Boolean);
  }
  const words = str.split(' '); let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '); const w = Math.max(measure(a), measure(b));
    if (!best || w < best.w) best = { w, parts: [a, b] };
  }
  return best.parts;
}

// a block of text lines at a size; returns outlines with the first baseline at y = 0
function textBlock(font, lines, size, align, spacing, fake) {
  const all = []; let maxW = 0;
  lines.forEach((str, i) => {
    const t = textLine(font, str, size, fake);
    const x = align === 'left' ? 0 : align === 'right' ? -t.width : -t.width / 2;
    all.push(...gXform(t.paths, 1, x, -i * size * spacing)); maxW = Math.max(maxW, t.width);
  });
  return { paths: gUnion(all), width: maxW };
}

const region = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });

// the area the content is arranged in: the label minus its margin, or on a divider the solid top band minus the margin
function contentArea(l) {
  const { w, h } = l.size, m = num(l.arr.margin, 7);
  if (l.kind === 'divider') {
    const band = clamp(num(l.div.band, 12), 2, h), mm = clamp(m, 0, Math.min(w / 2, band / 2) - 0.5);
    return region(-w / 2 + mm, h / 2 - band + mm, w / 2 - mm, h / 2 - mm);
  }
  const mm = clamp(m, 0, Math.min(w, h) / 2 - 1);
  return region(-w / 2 + mm, -h / 2 + mm, w / 2 - mm, h / 2 - mm);
}
function regionsFor(l, hasSymbol, hasText) {
  const a = l.arr, g = Math.max(0, num(a.gap, 4));
  const inner = contentArea(l);
  let kind = a.kind;
  if (!hasSymbol && hasText) kind = 'text';
  if (!hasText && hasSymbol) kind = 'symbol';
  const band = clamp(num(a.band, 27), 5, 95) / 100;
  let sym = null, txt = null;
  if (kind === 'stack') { const bh = inner.h * band; txt = region(inner.x0, inner.y0, inner.x1, inner.y0 + bh); sym = region(inner.x0, Math.min(inner.y1, inner.y0 + bh + g), inner.x1, inner.y1); }
  else if (kind === 'stackrev') { const bh = inner.h * band; txt = region(inner.x0, inner.y1 - bh, inner.x1, inner.y1); sym = region(inner.x0, inner.y0, inner.x1, Math.max(inner.y0, inner.y1 - bh - g)); }
  else if (kind === 'side') { const tw = inner.w * band; sym = region(inner.x0, inner.y0, Math.max(inner.x0, inner.x1 - tw - g), inner.y1); txt = region(inner.x1 - tw, inner.y0, inner.x1, inner.y1); }
  else if (kind === 'symbol') sym = inner;
  else txt = inner;
  return { inner, sym: hasSymbol ? sym : null, txt: hasText ? txt : null, kind };
}

// ---------- divider outline and pattern ----------
// the upper body at full width, the lower tab narrower by the inset on each side
function dividerOutline(l) {
  const { w, h } = l.size, r = num(l.size.r, 0), d = l.div;
  const tabH = clamp(num(d.tabH, 0), 0, h - 1), inset = clamp(num(d.tabInset, 0), 0, w / 2 - 1);
  if (tabH <= 0 || inset <= 0) return gRect(w, h, r);
  const upper = gRect(w, h - tabH, r, 0, tabH / 2), tab = gRect(w - inset * 2, tabH + r * 2, r, 0, -h / 2 + tabH / 2 + r);
  return gUnion(upper.concat(tab));
}
function holeShape(kind, w, h) {
  const P = pts => [pts.map(([x, y]) => ({ X: Math.round(x * GU), Y: Math.round(y * GU) }))];
  if (kind === 'hex') return P([[w / 2, 0], [w / 4, h / 2], [-w / 4, h / 2], [-w / 2, 0], [-w / 4, -h / 2], [w / 4, -h / 2]]);
  if (kind === 'diamond') return P([[w / 2, 0], [0, h / 2], [-w / 2, 0], [0, -h / 2]]);
  if (kind === 'circle') return P(Array.from({ length: 40 }, (_, i) => [Math.cos(i / 40 * Math.PI * 2) * w / 2, Math.sin(i / 40 * Math.PI * 2) * h / 2]));
  if (kind === 'square') return gRect(w, h, Math.min(0.5, w / 4, h / 4));
  if (kind === 'slot') return gRect(w, h, Math.min(w, h) / 2 - 0.001);
  return [];
}
// the pattern area: below the top band, inside the border, as wide as the tab allows; holes cut off by its edge
// are kept when at least a quarter of the hole remains
function dividerHoles(l) {
  const { w, h } = l.size, d = l.div, p = d.pattern || {};
  if (!p.kind || p.kind === 'solid') return { holes: [], area: null };
  const border = Math.max(0.4, num(p.border, 2)), half = w / 2 - Math.max(0, num(d.tabInset, 0)) - border;
  const area = region(-half, -h / 2 + border, half, h / 2 - clamp(num(d.band, 12), 0, h));
  const hw = Math.max(0.5, num(p.w, 6)), hh = Math.max(0.5, num(p.h, 6)), cx = Math.max(hw * 0.5, num(p.cx, 8)), cy = Math.max(0.5, num(p.cy, 8));
  if (area.w <= 1 || area.h <= 1) return { holes: [], area };
  const box = gRect(area.w, area.h, 0, area.cx, area.cy), shape = holeShape(p.kind, hw, hh), full = gTotalArea(shape);
  const holes = [];
  const nx = Math.ceil(area.w / 2 / cx) + 1, ny = Math.ceil(area.h / 2 / cy) + 2;
  for (let i = -nx; i <= nx; i++) for (let j = -ny; j <= ny; j++) {
    const x = area.cx + i * cx, y = area.cy + j * cy + (p.stagger && Math.abs(i) % 2 === 1 ? cy / 2 : 0);
    if (x + hw / 2 < area.x0 || x - hw / 2 > area.x1 || y + hh / 2 < area.y0 || y - hh / 2 > area.y1) continue;
    const piece = gInter(gXform(shape, 1, x, y), box);
    if (piece.length && gTotalArea(piece) >= full * 0.25) holes.push(...piece);
  }
  return { holes: holes.length ? gUnion(holes) : [], area, count: holes.length };
}

let BUILD_SEQ = 0;
// build the label: returns { parts, outline, guides, warnings, info }. Parts carry slabs of outlines with z ranges.
async function buildLabel(l) {
  const warnings = [];
  const size = l.size, t = Math.max(0.2, num(size.t, 2));
  const isDiv = l.kind === 'divider';
  const shape = isDiv ? dividerOutline(l) : gRect(num(size.w, 76), num(size.h, 100), num(size.r, 0));
  const pat = isDiv ? dividerHoles(l) : { holes: [] };
  const outline = pat.holes.length ? gDiff(shape, pat.holes) : shape;
  // sources
  const lines = l.text.show ? resolveLines(l) : [];
  const url = l.symbol.show ? symbolURL(l) : '';
  let svg = '';
  if (url) { try { svg = await fetchText(url); } catch (e) { warnings.push('The symbol file could not be loaded. Refresh the library or pick another rarity.'); } }
  else if (l.symbol.show && l.symbol.src === 'set' && l.set && l.set.src === 'none') warnings.push('This set has no symbol in the library.');
  let font = null, fake = {};
  if (lines.length) {
    const info = fontInfo(l.text.font);
    if (!info) warnings.push('No fonts are available.');
    else {
      const key = fontKey(info, l.text.bold, l.text.italic);
      try { font = await loadFont(info.id, key); } catch (e) { warnings.push('The font could not be loaded.'); }
      fake = { fakeBold: l.text.bold && !key.startsWith('700'), fakeItalic: l.text.italic && !key.endsWith('i') };
    }
  }
  const twoTone = l.symbol.style === 'twotone';
  const shapes = svg ? symbolShapes(svg, l.symbol.style) : null;
  const hasSymbol = !!(shapes && shapes.all.length), hasText = !!(font && lines.length);
  const R = regionsFor(l, hasSymbol, hasText);
  const elements = [], info = {};

  // symbol: scale to fit its region, centred, y flipped from SVG
  if (hasSymbol && R.sym) {
    const b = gBounds(shapes.all); // in SVG units
    const pct = clamp(num(l.arr.symPct, 90), 5, 100) / 100;
    const s = Math.min(R.sym.w * pct / b.w, R.sym.h * pct / b.h);
    const place = paths => gXform(paths.map(p => p.map(q => ({ X: q.X, Y: -q.Y }))), s, R.sym.cx - (b.x0 + b.w / 2) * s, R.sym.cy + (b.y0 + b.h / 2) * s);
    const d = l.depth.symbol;
    if (twoTone && shapes.fill.length) {
      elements.push({ key: 'symbol', name: 'Symbol outline', slot: l.symbol.slot, paths: place(shapes.outline), d });
      elements.push({ key: 'symbol2', name: 'Symbol fill', slot: l.symbol.slot2, paths: place(shapes.fill), d });
    } else elements.push({ key: 'symbol', name: 'Symbol', slot: l.symbol.slot, paths: place(shapes.outline), d });
    if (twoTone && !shapes.border) warnings.push('This symbol has no separate border, so two-tone prints it in one color.');
    info.symbol = { w: r2(b.w * s), h: r2(b.h * s) };
  }
  // text: wrap long lines, shrink to fit the region, centre vertically
  if (hasText && R.txt) {
    const sp = clamp(num(l.text.spacing, 1.15), 0.7, 3), size0 = clamp(num(l.text.size, 7), 0.5, 200), align = l.text.align || 'center';
    const measure = s => font.getAdvanceWidth(s, size0, { kerning: true }) * (fake.fakeBold ? 1.03 : 1);
    const wrapped = lines.flatMap(s => wrapLine(measure, s, R.txt.w));
    let blk = textBlock(font, wrapped, size0, align, sp, fake);
    let b = gBounds(blk.paths), k = 1;
    if (b) {
      k = Math.min(1, R.txt.w / b.w, R.txt.h / b.h);
      const ax = align === 'left' ? R.txt.x0 - b.x0 * k : align === 'right' ? R.txt.x1 - b.x1 * k : R.txt.cx - (b.x0 + b.w / 2) * k;
      const paths = gXform(blk.paths, k, ax, R.txt.cy - (b.y0 + b.h / 2) * k);
      elements.push({ key: 'text', name: 'Text', slot: l.text.slot, paths, d: l.depth.text });
      info.text = { size: r2(size0 * k), lines: wrapped.length };
      if (size0 * k < num(l.text.min, 3) - 1e-6) warnings.push(`The text is ${r2(size0 * k)} mm, smaller than the ${num(l.text.min, 3)} mm minimum. Shorten the text, make the label larger or lower the minimum.`);
    }
  }
  // keep every element inside the label (a divider's content stays in its solid top band)
  const keep = isDiv ? gInter(shape, gRect(size.w, num(l.div.band, 12), 0, 0, size.h / 2 - num(l.div.band, 12) / 2)) : outline;
  for (const e of elements) { e.paths = gInter(e.paths, keep); e.side = 'top'; }
  // a divider can carry the same content on its back, mirrored so it reads from behind, flush or engraved
  if (isDiv && l.div.back && l.div.back.mode !== 'off') {
    const bs = Math.max(0, num(l.div.back.sink, 0.5));
    for (const e of elements.slice()) elements.push({ key: e.key + '_b', name: e.name + ' (back)', slot: e.slot, side: 'bottom', paths: e.paths.map(p => p.map(q => ({ X: -q.X, Y: q.Y })).reverse()), d: { raise: 0, sink: bs, engrave: l.div.back.mode === 'engrave' } });
  }

  // parts and slabs. Pockets from the top run from (t - sink) to t, pockets from the back from 0 to sink.
  const parts = [];
  const zr = v => Math.round(v * 1e4) / 1e4;
  const topSink = Math.max(0, ...elements.filter(e => e.side === 'top').map(e => num(e.d.sink, 0)));
  let tooDeep = false;
  const cutters = elements.filter(e => num(e.d.sink, 0) > 0).map(e => {
    let s = num(e.d.sink, 0);
    if (e.side === 'bottom') { const max = t - topSink - 0.2; if (s > max) { s = Math.max(0, max); tooDeep = true; } return { z0: 0, z1: zr(s), side: 'bottom', paths: e.paths, e }; }
    if (s > t - 0.2) { s = t - 0.2; tooDeep = true; }
    return { z0: zr(t - s), z1: t, side: 'top', paths: e.paths, e };
  }).filter(c => c.z1 - c.z0 > 1e-6);
  if (tooDeep) warnings.push(isDiv ? 'The front and back are sunk deeper than the divider allows; 0.2 mm of plate is kept between them.' : 'An element is sunk deeper than the base allows; it keeps 0.2 mm of base under it.');
  const zs = [...new Set([0, t, ...cutters.flatMap(c => [c.z0, c.z1])])].sort((a, b) => a - b);
  const baseSlabs = [];
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i], zb = zs[i + 1];
    const cut = cutters.filter(c => c.z0 <= za + 1e-9 && c.z1 >= zb - 1e-9).flatMap(c => c.paths);
    const paths = cut.length ? gDiff(outline, gUnion(cut)) : outline;
    if (paths.length) baseSlabs.push({ z0: za, z1: zb, paths });
  }
  parts.push({ key: 'base', name: isDiv ? 'Divider' : 'Base', slot: l.base.slot, slabs: baseSlabs, paths: outline, solid: { outline, t, pockets: cutters.map(c => ({ z: c.side === 'top' ? c.z0 : c.z1, side: c.side, paths: c.paths })) } });
  for (const e of elements) {
    if (e.d.engrave) continue;
    const c = cutters.find(x => x.e === e);
    let z0, z1;
    if (e.side === 'bottom') { z0 = 0; z1 = c ? c.z1 : 0; }
    else { z0 = c ? c.z0 : t; z1 = zr(t + Math.max(0, num(e.d.raise, 0))); }
    if (z1 - z0 < 0.01 || !e.paths.length) { if (e.side === 'top') warnings.push(`${e.name} has no height, so it is not printed. Raise it or sink it into the base.`); continue; }
    parts.push({ key: e.key, name: e.name, slot: e.slot, side: e.side, slabs: [{ z0, z1, paths: e.paths }], paths: e.paths });
  }
  const engraved = elements.filter(e => e.d.engrave && e.side === 'top').map(e => ({ key: e.key, name: e.name, paths: e.paths }));
  if (isDiv) info.pattern = { holes: pat.count || 0 };
  return { parts, engraved, outline, guides: Object.assign(R, { pattern: pat.area || null }), warnings, info, height: Math.max(...parts.flatMap(p => p.slabs.map(s => s.z1))) };
}
