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

function regionsFor(l, hasSymbol, hasText) {
  const { w, h } = l.size, a = l.arr, m = clamp(num(a.margin, 7), 0, Math.min(w, h) / 2 - 1), g = Math.max(0, num(a.gap, 4));
  const inner = region(-w / 2 + m, -h / 2 + m, w / 2 - m, h / 2 - m);
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

let BUILD_SEQ = 0;
// build the label: returns { parts, outline, guides, warnings, info }. Parts carry slabs of outlines with z ranges.
async function buildLabel(l) {
  const warnings = [];
  const size = l.size, t = Math.max(0.2, num(size.t, 2));
  const outline = gRect(num(size.w, 76), num(size.h, 100), num(size.r, 0));
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
  // keep every element inside the label
  for (const e of elements) e.paths = gInter(e.paths, outline);

  // parts and slabs
  const parts = [];
  const zr = v => Math.round(v * 1e4) / 1e4;
  const cutters = elements.filter(e => num(e.d.sink, 0) > 0).map(e => ({ z: zr(Math.max(0.2, t - num(e.d.sink, 0))), paths: e.paths }));
  if (elements.some(e => num(e.d.sink, 0) > t - 0.2)) warnings.push('An element is sunk deeper than the base allows; it keeps 0.2 mm of base under it.');
  const zs = [...new Set([0, t, ...cutters.map(c => c.z)])].sort((a, b) => a - b);
  const baseSlabs = [];
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i], zb = zs[i + 1];
    const cut = cutters.filter(c => c.z <= za + 1e-9).flatMap(c => c.paths);
    const paths = cut.length ? gDiff(outline, gUnion(cut)) : outline;
    if (paths.length) baseSlabs.push({ z0: za, z1: zb, paths });
  }
  parts.push({ key: 'base', name: 'Base', slot: l.base.slot, slabs: baseSlabs, paths: outline, solid: { outline, t, pockets: cutters } });
  for (const e of elements) {
    if (e.d.engrave) continue;
    const z0 = zr(Math.max(0.2, t - num(e.d.sink, 0))), z1 = zr(t + Math.max(0, num(e.d.raise, 0)));
    if (z1 - z0 < 0.01 || !e.paths.length) { warnings.push(`${e.name} has no height, so it is not printed. Raise it or sink it into the base.`); continue; }
    parts.push({ key: e.key, name: e.name, slot: e.slot, slabs: [{ z0, z1, paths: e.paths }], paths: e.paths });
  }
  const engraved = elements.filter(e => e.d.engrave).map(e => ({ key: e.key, name: e.name, paths: e.paths }));
  return { parts, engraved, outline, guides: R, warnings, info, height: Math.max(...parts.flatMap(p => p.slabs.map(s => s.z1))) };
}
