// ---------- layout: from a label document to positioned outlines and parts ----------
// The label is centred on the origin, x to the right, y up, in millimetres. The base sits on z = 0.
const fixDashes = s => String(s || '').replace(/\s*[\u2012\u2013\u2014\u2015]\s*/g, ' - ');

// the text lines of one text item (or of the whole label), in order, with empty lines left out
function resolveLines(l, lines = allLines(l)) {
  const st = l.set, out = [];
  for (const ln of lines || []) {
    let v = '';
    switch (ln.src) {
      case 'name': v = st ? fixDashes(st.name) : (l.name || ''); break;
      case 'short': v = st ? shortName(st) : (l.name || ''); break;
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

// move, scale and rotate an item's outlines about the centre of its space; rot is in degrees, clockwise
function itemXform(paths, it, cx, cy) {
  const s = clamp(num(it.scale, 100), 5, 1000) / 100, a = -num(it.rot, 0) * Math.PI / 180, dx = num(it.x, 0), dy = num(it.y, 0);
  if (s === 1 && !a && !dx && !dy) return paths;
  const c = Math.cos(a) * s, sn = Math.sin(a) * s, X0 = cx * GU, Y0 = cy * GU;
  return paths.map(p => p.map(q => { const x = q.X - X0, y = q.Y - Y0; return { X: Math.round(X0 + x * c - y * sn + dx * GU), Y: Math.round(Y0 + x * sn + y * c + dy * GU) }; }));
}
// the symbol source of a symbol item: the label's own symbol, another set, a land or watermark, or an upload
const ownSym = it => !it.src || it.src === 'label';
function symStyle(l, it) { return it.t !== 'grid' && ownSym(it) ? l.symbol : { style: it.style || 'detail', slot: it.slot || 2, slot2: it.slot2 || 3 }; }
function symName(l, it) {
  if (ownSym(it)) return 'Symbol';
  if (it.src === 'set') return 'Symbol ' + (it.set || '');
  if (it.src === 'wm') return 'Symbol ' + (it.wm || '');
  const u = uploadById(it.up); return 'Symbol ' + (u ? u.name : 'upload');
}
// the top edge of the base: insets of the rings that step the edge in, from the full outline to the top face
function edgeSteps(l) {
  const e = l.size.edge || 'none', t = Math.max(0.2, num(l.size.t, 2));
  if (e === 'none') return null;
  const r = clamp(num(l.size.edgeR, 0.5), 0, Math.min(t - 0.1, Math.min(num(l.size.w, 76), num(l.size.h, 100)) / 4));
  if (r < 0.05) return null;
  const n = clamp(Math.round(r / 0.1), 2, 12), out = [];
  for (let k = 0; k < n; k++) {
    const f = k / (n - 1), d = e === 'chamfer' ? r * f : r * (1 - Math.sqrt(Math.max(0, 1 - f * f)));
    out.push({ z: k ? Math.round((t - r + r * k / n) * 1e4) / 1e4 : 0, d });
  }
  return { r, steps: out, t };
}
const outerOnly = paths => paths.filter(p => gArea(p) > 0);
function insetOutline(outline, d) { return d > 1e-6 ? gInter(outline, gOffset(outerOnly(outline), -d)) : outline; }

let BUILD_SEQ = 0;
// build the label: returns { parts, outline, guides, warnings, info }. Parts carry slabs of outlines with z ranges.
async function buildLabel(l) {
  const warnings = [];
  const size = l.size, t = Math.max(0.2, num(size.t, 2));
  const isDiv = l.kind === 'divider';
  const shape = isDiv ? dividerOutline(l) : gRect(num(size.w, 76), num(size.h, 100), num(size.r, 0));
  const pat = isDiv ? dividerHoles(l) : { holes: [] };
  const outline = pat.holes.length ? gDiff(shape, pat.holes) : shape;
  const edge = edgeSteps(l);
  // sources: the symbol, mana and font files the rows need
  const rows = (l.arr && l.arr.rows) || [];
  const items = rows.flatMap(r => r.items);
  const svgText = {}, warned = new Set();
  const warnOnce = m => { if (!warned.has(m)) { warned.add(m); warnings.push(m); } };
  const symURL = it => {
    if (ownSym(it)) {
      const url = symbolURL(l);
      if (!url && l.symbol.src === 'set' && l.set && l.set.src === 'none') warnOnce('This set has no symbol in the library.');
      return url;
    }
    if (it.src === 'set') { const st = SETS_BY_CODE.get(it.set); if (!it.set) return ''; if (!st) { warnOnce(`The set ${it.set} is not in the library.`); return ''; } if (st.src === 'none') { warnOnce(`The set ${it.set} has no symbol in the library.`); return ''; } }
    if (it.src === 'upload' && !uploadById(it.up)) { warnOnce('An uploaded symbol is no longer on the server. Pick another symbol.'); return ''; }
    return symbolURL(l, it);
  };
  const gridSrc = (it, code) => ({ src: 'set', set: code, rarity: it.rarity || 'C', style: it.style, slot: it.slot, slot2: it.slot2 });
  const urls = new Set();
  for (const it of items) {
    if (it.t === 'symbol') { const u = symURL(it); if (u) urls.add(u); }
    if (it.t === 'grid') for (const c of it.codes || []) { const u = symURL(gridSrc(it, c)); if (u) urls.add(u); }
  }
  for (const u of urls) { try { svgText[u] = await fetchText(u); } catch (e) { warnOnce(u.startsWith('/api/uploads') ? 'An uploaded symbol could not be loaded.' : 'The symbol file could not be loaded. Refresh the library or pick another rarity.'); } }
  const shapeCache = {};
  const shapesFor = (it, style) => {
    const u = symURL(it); if (!u || !svgText[u]) return null;
    const k = u + '|' + style; if (!(k in shapeCache)) { const sh = symbolShapes(svgText[u], style); const b = sh.all.length ? gBounds(sh.all) : null; shapeCache[k] = b ? Object.assign(sh, { b }) : null; }
    return shapeCache[k];
  };
  const manaSvg = {};
  const codes = [...new Set(items.filter(i => i.t === 'mana').flatMap(i => i.syms.map(m => m.c)))];
  if (codes.length && !(LIB.mana || []).length) warnings.push('The library has no mana symbols yet. Refresh the library to download them.');
  else for (const c of codes) { try { manaSvg[c] = await fetchText(`/api/library/mana/${encodeURIComponent(c)}.svg`); } catch (e) { warnings.push(`The mana symbol ${c} could not be loaded. Refresh the library.`); } }
  let font = null, fake = {};
  if (items.some(i => i.t === 'text' && resolveLines(l, i.lines).length)) {
    const info = fontInfo(l.text.font);
    if (!info) warnings.push('No fonts are available.');
    else {
      const key = fontKey(info, l.text.bold, l.text.italic);
      try { font = await loadFont(info.id, key); } catch (e) { warnings.push('The font could not be loaded.'); }
      fake = { fakeBold: l.text.bold && !key.startsWith('700'), fakeItalic: l.text.italic && !key.endsWith('i') };
    }
  }
  const manaCache = {};
  const manaShape = (c, style) => { const k = c + ':' + style; if (!(k in manaCache)) manaCache[k] = manaSvg[c] ? manaShapes(manaSvg[c], style) : null; return manaCache[k]; };

  // the rows that have something to show
  const sp = clamp(num(l.text.spacing, 1.15), 0.7, 3), size0 = clamp(num(l.text.size, 7), 0.5, 200), align = l.text.align || 'center';
  const measure = str => font.getAdvanceWidth(str, size0, { kerning: true }) * (fake.fakeBold ? 1.03 : 1);
  const isSym = i => i.t === 'symbol' || i.t === 'grid';
  const live = rows.map((r, ri) => ({ pct: num(r.h, 0), items: r.items.map((it, ii) => {
    let o = null;
    if (it.t === 'symbol') { const ss = symStyle(l, it), sh = shapesFor(it, ss.style); if (sh) { o = { t: 'symbol', aspect: sh.b.w / sh.b.h, sh, ss }; if (ss.style === 'twotone' && !sh.border) warnOnce('This symbol has no separate border, so two-tone prints it in one color.'); } }
    else if (it.t === 'grid') {
      const ss = symStyle(l, it), cells = (it.codes || []).map(c => shapesFor(gridSrc(it, c), ss.style));
      const n = cells.length;
      if (cells.some(Boolean)) { const cols = clamp(Math.round(num(it.cols, 0)) || Math.ceil(Math.sqrt(n)), 1, n), rowsN = Math.ceil(n / cols); o = { t: 'grid', cells, cols, rowsN, aspect: cols / rowsN, ss }; }
    }
    else if (it.t === 'text') { const ls = font ? resolveLines(l, it.lines) : []; if (ls.length) o = { t: 'text', lines: ls, slot: it.slot || l.text.slot }; }
    else if (it.t === 'mana') { const ms = it.syms.filter(m => manaShape(m.c, m.style)); if (ms.length) o = { t: 'mana', syms: ms, size: Math.max(1, num(it.size, 8)) }; }
    return o ? Object.assign(o, { it, ri, ii }) : null;
  }).filter(Boolean) })).filter(r => r.items.length);
  const C = contentArea(l), g = Math.max(0, num(l.arr.gap, 3)), elements = [], info = {}, guides = { inner: C, items: [] };
  const manaW = (n, s) => n * s + (n - 1) * s * 0.25;
  const pct = clamp(num(l.arr.symPct, 90), 5, 100) / 100;
  // a symbol scaled into a box (pct of it), centred; returns { outline, fill } in mm
  const fitSym = (sh, box, k = pct) => {
    const b = sh.b, s = Math.min(box.w * k / b.w, box.h * k / b.h);
    const place = paths => gXform(paths.map(p => p.map(q => ({ X: q.X, Y: -q.Y }))), s, box.cx - (b.x0 + b.w / 2) * s, box.cy + (b.y0 + b.h / 2) * s);
    return { outline: place(sh.outline), fill: sh.fill.length ? place(sh.fill) : [], w: b.w * s, h: b.h * s };
  };
  if (live.length) {
    // row heights: percentage rows are fixed; rows with a symbol share what is left; text and mana rows take what they need
    const avail = Math.max(1, C.h - g * (live.length - 1));
    for (const r of live) {
      r.flex = r.pct <= 0 && r.items.some(isSym);
      const fixedW = r.items.reduce((s, i) => s + (i.t === 'mana' ? manaW(i.syms.length, i.size) : 0), 0) + g * (r.items.length - 1);
      const textW = Math.max(5, (C.w - fixedW) * (r.items.some(isSym) ? 0.6 : 1) / Math.max(1, r.items.filter(i => i.t === 'text').length));
      r.need = r.pct > 0 ? r.pct / 100 * C.h : Math.max(0, ...r.items.map(i => i.t === 'text' ? i.lines.flatMap(x => wrapLine(measure, x, textW)).length * size0 * sp : i.t === 'mana' ? i.size : 0));
    }
    const flex = live.filter(r => r.flex), fixed = live.filter(r => !r.flex), sum = fixed.reduce((s, r) => s + r.need, 0);
    if (flex.length) {
      let rest = avail - sum;
      if (rest < avail * 0.3) { const k = avail * 0.7 / Math.max(sum, 1e-6); fixed.forEach(r => { r.h = r.need * k; }); rest = avail * 0.3; } else fixed.forEach(r => { r.h = r.need; });
      flex.forEach(r => { r.h = rest / flex.length; });
    } else if (sum > avail) fixed.forEach(r => { r.h = r.need * avail / sum; });
    else { const auto = fixed.filter(r => r.pct <= 0), extra = (avail - sum) / Math.max(1, auto.length); fixed.forEach(r => { r.h = r.need + (r.pct <= 0 ? extra : 0); }); if (!auto.length) fixed.forEach(r => { r.h = r.need * avail / sum; }); }
    // place the rows from the top, and the items of each row from the left
    let y = C.y1, symMax = null;
    const add = (key, name, slot, paths, d, kind) => { const e = elements.find(x => x.key === key); if (e) e.paths = e.paths.concat(paths); else elements.push({ key, name, slot, paths, d, kind }); };
    for (const r of live) {
      const rr = region(C.x0, y - r.h, C.x1, y); y -= r.h + g;
      const want = r.items.map(i => isSym(i) ? Math.min(rr.w, rr.h * i.aspect) : i.t === 'mana' ? manaW(i.syms.length, Math.min(i.size, rr.h)) : 0);
      const nText = r.items.filter(i => i.t === 'text').length, gaps = g * (r.items.length - 1);
      let fixedSum = want.reduce((a, b) => a + b, 0), textW = 0;
      if (nText) { textW = (rr.w - gaps - fixedSum) / nText; if (textW < rr.w * 0.25) { const k = Math.max(0.05, (rr.w * 0.75 - gaps) / Math.max(fixedSum, 1e-6)); for (let i = 0; i < want.length; i++) want[i] *= k; fixedSum *= k; textW = (rr.w - gaps - fixedSum) / nText; } }
      else if (fixedSum + gaps > rr.w) { const k = Math.max(0.05, (rr.w - gaps) / fixedSum); for (let i = 0; i < want.length; i++) want[i] *= k; fixedSum *= k; }
      let x = nText ? rr.x0 : rr.cx - (fixedSum + gaps) / 2;
      r.items.forEach((it, idx) => {
        const src = it.it, w = it.t === 'text' ? textW : want[idx], box = region(x, rr.y0, x + w, rr.y1); x += w + g;
        const X = paths => itemXform(paths, src, box.cx, box.cy);
        guides.items.push({ kind: it.t, rect: box, ri: it.ri, ii: it.ii, x: num(src.x, 0), y: num(src.y, 0), scale: num(src.scale, 100), rot: num(src.rot, 0) });
        const d = l.depth.symbol;
        if (it.t === 'symbol') {
          const own = ownSym(src), ss = it.ss, f = fitSym(it.sh, box), key = own ? 'symbol' : `sym_${it.ri}_${it.ii}`, nm = symName(l, src);
          if (ss.style === 'twotone' && f.fill.length) { add(key, nm + ' outline', ss.slot, X(f.outline), d, 'symbol'); add(own ? 'symbol2' : key + '_2', nm + ' fill', ss.slot2, X(f.fill), d, 'symbol'); }
          else add(key, nm, ss.slot, X(f.outline), d, 'symbol');
          if (own) symMax = symMax || { w: r2(f.w), h: r2(f.h) };
        } else if (it.t === 'grid') {
          // square cells, the block centred in the item's space
          const ss = it.ss, cw = Math.min(box.w / it.cols, box.h / it.rowsN), ch = cw, outl = [], fill = [], key = `grid_${it.ri}_${it.ii}`;
          const gx0 = box.cx - cw * it.cols / 2, gy1 = box.cy + ch * it.rowsN / 2;
          it.cells.forEach((sh, k) => {
            if (!sh) return;
            const cx = k % it.cols, cy = Math.floor(k / it.cols), inRow = Math.min(it.cols, it.cells.length - cy * it.cols), off = (it.cols - inRow) * cw / 2;
            const f = fitSym(sh, region(gx0 + off + cx * cw, gy1 - (cy + 1) * ch, gx0 + off + (cx + 1) * cw, gy1 - cy * ch));
            if (ss.style === 'twotone' && f.fill.length) { outl.push(...f.outline); fill.push(...f.fill); } else outl.push(...f.outline);
          });
          add(key, 'Symbol grid', ss.slot, X(outl), d, 'symbol');
          if (fill.length) add(key + '_2', 'Symbol grid fill', ss.slot2, X(fill), d, 'symbol');
          info.grid = (info.grid || 0) + it.cells.filter(Boolean).length;
        } else if (it.t === 'text') {
          const wrapped = it.lines.flatMap(str => wrapLine(measure, str, box.w));
          const blk = textBlock(font, wrapped, size0, align, sp, fake), b = gBounds(blk.paths);
          if (!b) return;
          const k = Math.min(1, box.w / b.w, box.h / b.h);
          const ax = align === 'left' ? box.x0 - b.x0 * k : align === 'right' ? box.x1 - b.x1 * k : box.cx - (b.x0 + b.w / 2) * k;
          const firstSlot = (elements.find(e => e.kind === 'text') || {}).slot, key = firstSlot === undefined || firstSlot === it.slot ? 'text' : 'text_s' + it.slot;
          add(key, key === 'text' ? 'Text' : `Text, slot ${it.slot}`, it.slot, X(gXform(blk.paths, k, ax, box.cy - (b.y0 + b.h / 2) * k)), l.depth.text, 'text');
          if (!info.text) info.text = { size: r2(size0 * k), lines: wrapped.length };
          if (size0 * k < num(l.text.min, 3) - 1e-6) warnings.push(`The text is ${r2(size0 * k)} mm, smaller than the ${num(l.text.min, 3)} mm minimum. Shorten the text, make the label larger or lower the minimum.`);
        } else {
          const n = it.syms.length, s = Math.min(it.size, box.h, box.w / (n + (n - 1) * 0.25)), step = s * 1.25;
          let mx = box.cx - (n * s + (n - 1) * s * 0.25) / 2 + s / 2;
          for (const m of it.syms) {
            const sh = manaShape(m.c, m.style), mb = gBounds(sh.all), k = s / Math.max(mb.w, mb.h);
            const placed = gXform(sh.paths.map(p => p.map(q => ({ X: q.X, Y: -q.Y }))), k, mx - (mb.x0 + mb.w / 2) * k, box.cy + (mb.y0 + mb.h / 2) * k);
            add('mana_s' + m.slot, `Mana, slot ${m.slot}`, m.slot, X(placed), l.depth.symbol, 'mana');
            mx += step;
          }
          info.mana = (info.mana || 0) + n;
        }
      });
    }
    if (symMax) info.symbol = symMax;
  }
  for (const e of elements) e.paths = gUnion(e.paths);
  const R = guides;

  // keep every element inside the label (a divider's content stays in its solid top band)
  let keep = isDiv ? gInter(shape, gRect(size.w, num(l.div.band, 12), 0, 0, size.h / 2 - num(l.div.band, 12) / 2)) : outline;
  if (edge) keep = gInter(keep, insetOutline(outline, edge.r + 0.05));
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
  const zs = [...new Set([0, t, ...cutters.flatMap(c => [c.z0, c.z1]), ...(edge ? edge.steps.map(s => s.z) : [])])].sort((a, b) => a - b);
  const insetAt = z => { if (!edge) return outline; let d = 0; for (const s of edge.steps) if (z >= s.z - 1e-9) d = s.d; return insetOutline(outline, d); };
  const baseSlabs = [];
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i], zb = zs[i + 1];
    const cut = cutters.filter(c => c.z0 <= za + 1e-9 && c.z1 >= zb - 1e-9).flatMap(c => c.paths);
    const ol = insetAt(za), paths = cut.length ? gDiff(ol, gUnion(cut)) : ol;
    if (paths.length) baseSlabs.push({ z0: za, z1: zb, paths });
  }
  parts.push({ key: 'base', name: isDiv ? 'Divider' : 'Base', slot: l.base.slot, slabs: baseSlabs, paths: outline, solid: { outline, t, edge, pockets: cutters.map(c => ({ z: c.side === 'top' ? c.z0 : c.z1, side: c.side, paths: c.paths })) } });
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
