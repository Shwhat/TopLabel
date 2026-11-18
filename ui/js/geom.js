// ---------- geometry: outlines as polygons, unions and differences, SVG and text to outlines ----------
// Outlines are lists of closed rings in integer units of 1/1000 mm (Clipper paths of {X, Y}), y up.
const GU = 1000; // units per millimetre
const CL = ClipperLib;

function clip(type, subj, clipPaths, fill = CL.PolyFillType.pftNonZero) {
  const c = new CL.Clipper(); const out = new CL.Paths();
  if (subj && subj.length) c.AddPaths(subj, CL.PolyType.ptSubject, true);
  if (clipPaths && clipPaths.length) c.AddPaths(clipPaths, CL.PolyType.ptClip, true);
  c.Execute(type, out, fill, fill);
  return out;
}
const gUnion = (a, fill) => clip(CL.ClipType.ctUnion, a, null, fill);
const gDiff = (a, b) => (a && a.length) ? (b && b.length ? clip(CL.ClipType.ctDifference, a, b) : gUnion(a)) : [];
const gInter = (a, b) => (a && a.length && b && b.length) ? clip(CL.ClipType.ctIntersection, a, b) : [];
function gOffset(paths, mm, join = CL.JoinType.jtRound) {
  if (!paths.length || !mm) return paths;
  const co = new CL.ClipperOffset(2, 0.02 * GU); const out = new CL.Paths();
  co.AddPaths(paths, join, CL.EndType.etClosedPolygon); co.Execute(out, mm * GU); return out;
}
function gStroke(lines, closedFlags, widthMm) {
  const co = new CL.ClipperOffset(2, 0.02 * GU); const out = new CL.Paths();
  lines.forEach((p, i) => co.AddPath(p, CL.JoinType.jtRound, closedFlags[i] ? CL.EndType.etClosedLine : CL.EndType.etOpenRound));
  co.Execute(out, widthMm * GU / 2); return out;
}
function gBounds(paths) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of paths) for (const q of p) { if (q.X < x0) x0 = q.X; if (q.X > x1) x1 = q.X; if (q.Y < y0) y0 = q.Y; if (q.Y > y1) y1 = q.Y; }
  if (x0 === Infinity) return null;
  return { x0: x0 / GU, y0: y0 / GU, x1: x1 / GU, y1: y1 / GU, w: (x1 - x0) / GU, h: (y1 - y0) / GU };
}
// move and scale outlines: x' = x * s + dx (mm), y' = y * s + dy
const gXform = (paths, s, dx, dy) => paths.map(p => p.map(q => ({ X: Math.round(q.X * s + dx * GU), Y: Math.round(q.Y * s + dy * GU) })));
const gArea = p => { let a = 0; for (let i = 0, n = p.length; i < n; i++) { const j = (i + 1) % n; a += p[i].X * p[j].Y - p[j].X * p[i].Y; } return a / 2; };
const gTotalArea = paths => paths.reduce((s, p) => s + gArea(p), 0) / (GU * GU);

// rectangle with optional rounded corners, centred on the origin
function gRect(w, h, r = 0, x = 0, y = 0) {
  const pts = []; r = Math.max(0, Math.min(r, w / 2 - 0.01, h / 2 - 0.01));
  if (r <= 0) return [[[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]].map(([a, b]) => ({ X: Math.round(a * GU), Y: Math.round(b * GU) }))];
  const seg = Math.max(6, Math.ceil(r * 3));
  const corners = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= seg; i++) { const a = (a0 + 90 * i / seg) * Math.PI / 180; pts.push({ X: Math.round((x + cx + r * Math.cos(a)) * GU), Y: Math.round((y + cy + r * Math.sin(a)) * GU) }); }
  return [pts];
}

// outer rings with their holes, in millimetres, for triangulation and drawing
function gExPolys(paths) {
  const c = new CL.Clipper(); c.StrictlySimple = true;
  c.AddPaths(CL.Clipper.CleanPolygons(paths, 2), CL.PolyType.ptSubject, true);
  const tree = new CL.PolyTree(); c.Execute(CL.ClipType.ctUnion, tree, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero);
  const out = [];
  const toMm = ring => ring.map(q => [q.X / GU, q.Y / GU]);
  const walk = node => {
    for (const ch of node.Childs()) {
      if (ch.IsHole()) continue;
      let outer = ch.Contour(); if (gArea(outer) < 0) outer = outer.slice().reverse();
      const holes = ch.Childs().map(h => { let r = h.Contour(); if (gArea(r) > 0) r = r.slice().reverse(); return toMm(r); });
      if (Math.abs(gArea(outer)) > 1) out.push({ outer: toMm(outer), holes });
      for (const h of ch.Childs()) walk(h);
    }
  };
  walk(tree);
  return out;
}
const gPathD = paths => paths.map(p => 'M' + p.map(q => `${(q.X / GU).toFixed(3)} ${(-q.Y / GU).toFixed(3)}`).join('L') + 'Z').join('');

// ---------- SVG files ----------
const isVisible = s => s && s.visibility !== 'hidden' && s.opacity !== 0;
const paints = v => v !== undefined && v !== null && v !== 'none' && v !== 'transparent';
// parse an SVG into a list of filled outlines, one per drawn element in document order, in SVG units (y down)
function svgOutlines(text) {
  const data = new THREE.SVGLoader().parse(text);
  const out = [];
  const S = 1000; // SVG units are scaled by 1000 into integers here
  for (const sp of data.paths) {
    const st = (sp.userData && sp.userData.style) || {};
    if (!isVisible(st)) continue;
    const rings = [], open = [], closed = [];
    for (const sub of sp.subPaths) {
      const pts = sub.getPoints(16); if (pts.length < 2) continue;
      const ring = pts.map(p => ({ X: Math.round(p.x * S), Y: Math.round(p.y * S) }));
      rings.push(ring); open.push(ring);
      const a = pts[0], b = pts[pts.length - 1]; closed.push(sub.autoClose || (Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6));
    }
    let shape = [];
    if (paints(st.fill) && st.fillOpacity !== 0 && rings.length) {
      shape = gUnion(rings, st.fillRule === 'evenodd' ? CL.PolyFillType.pftEvenOdd : CL.PolyFillType.pftNonZero);
    }
    if (paints(st.stroke) && st.strokeOpacity !== 0 && st.strokeWidth > 0 && open.length) {
      const sw = gStroke(open, closed, st.strokeWidth * S / GU);
      shape = shape.length ? gUnion(shape.concat(sw)) : sw;
    }
    if (shape.length) out.push({ paths: shape, fill: st.fill || '', scale: S });
  }
  return out;
}
// Sort a fill into light (white, the border most symbols carry), dark (black) or color (gold, silver, gradients).
function fillClass(fill) {
  if (!fill || /^url\(/i.test(fill)) return fill ? 'color' : 'dark';
  const c = new THREE.Color(); try { c.setStyle(fill); } catch (e) { return 'dark'; }
  const hsl = {}; c.getHSL(hsl);
  if (hsl.l > 0.85 && hsl.s < 0.25) return 'light';
  if (hsl.l < 0.22 || (hsl.s < 0.12 && hsl.l < 0.5)) return 'dark';
  return 'color';
}
// The symbol outlines, worked out from what is visible when the SVG is painted (later elements cover earlier ones):
//   detail     the symbol itself: the colored parts when there are any (rare, mythic and similar symbols),
//              otherwise the black parts (common symbols); the white border and gaps are left out (default)
//   silhouette everything, border included, as one shape
//   twotone    the border and gaps as the outline, the symbol as the fill
// Returned in SVG units with y down.
function symbolShapes(text, style) {
  const els = svgOutlines(text);
  if (!els.length) return { all: [], outline: [], fill: [], border: false };
  const all = gUnion(els.flatMap(e => e.paths));
  const vis = { light: [], dark: [], color: [] };
  let covered = [];
  for (let i = els.length - 1; i >= 0; i--) {
    const v = covered.length ? gDiff(els[i].paths, covered) : els[i].paths;
    if (v.length) vis[fillClass(els[i].fill)].push(...v);
    covered = covered.length ? gUnion(covered.concat(els[i].paths)) : els[i].paths;
  }
  const area = k => vis[k].length ? gTotalArea(gUnion(vis[k])) : 0, total = gTotalArea(all);
  let glyph = all;
  if (area('color') > total * 0.02) glyph = gUnion(vis.color);
  else if (area('dark') > total * 0.02 && area('dark') < total * 0.995) glyph = gUnion(vis.dark);
  const border = glyph !== all && gTotalArea(glyph) < total * 0.995;
  if (style === 'silhouette' || !border) return { all, outline: all, fill: [], border };
  // the outline is opened slightly so hair-thin slivers between the two parts do not become paper-thin walls
  const eps = Math.max(gBounds(all).w, gBounds(all).h) * 0.0004;
  if (style === 'twotone') return { all, outline: gOffset(gOffset(gDiff(all, glyph), -eps, CL.JoinType.jtMiter), eps, CL.JoinType.jtMiter), fill: glyph, border };
  return { all: glyph, outline: glyph, fill: [], border };
}

// A Scryfall mana symbol is a colored circle with a dark glyph on it. 'pip' prints the circle with the glyph cut
// out of it, 'icon' prints the glyph alone. Returned in SVG units with y down; all is the full circle for sizing.
function manaShapes(text, style) {
  const els = svgOutlines(text);
  if (!els.length) return null;
  const all = gUnion(els.flatMap(e => e.paths));
  let covered = [], dark = [];
  for (let i = els.length - 1; i >= 0; i--) {
    const v = covered.length ? gDiff(els[i].paths, covered) : els[i].paths;
    if (v.length && fillClass(els[i].fill) === 'dark') dark.push(...v);
    covered = covered.length ? gUnion(covered.concat(els[i].paths)) : els[i].paths;
  }
  const glyph = dark.length ? gUnion(dark) : [];
  if (!glyph.length || gTotalArea(glyph) > gTotalArea(all) * 0.98) return { all, paths: all };
  return { all, paths: style === 'icon' ? glyph : gDiff(all, glyph) };
}

// ---------- text ----------
function flattenCommands(cmds, S) {
  const rings = []; let cur = null, x = 0, y = 0;
  const P = (a, b) => cur.push({ X: Math.round(a * S), Y: Math.round(-b * S) }); // y flipped: font path is y down
  for (const c of cmds) {
    if (c.type === 'M') { if (cur && cur.length > 2) rings.push(cur); cur = []; x = c.x; y = c.y; P(x, y); }
    else if (c.type === 'L') { x = c.x; y = c.y; P(x, y); }
    else if (c.type === 'Q') { for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; P(u * u * x + 2 * u * t * c.x1 + t * t * c.x, u * u * y + 2 * u * t * c.y1 + t * t * c.y); } x = c.x; y = c.y; }
    else if (c.type === 'C') { for (let i = 1; i <= 10; i++) { const t = i / 10, u = 1 - t; P(u * u * u * x + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x, u * u * u * y + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y); } x = c.x; y = c.y; }
    else if (c.type === 'Z') { if (cur && cur.length > 2) rings.push(cur); cur = null; }
  }
  if (cur && cur.length > 2) rings.push(cur);
  return rings;
}
// one line of text as outlines in mm, baseline at y = 0, starting at x = 0. Returns paths and the advance width.
function textLine(font, str, sizeMm, opts = {}) {
  const path = font.getPath(str, 0, 0, sizeMm, { kerning: true });
  let paths = gUnion(flattenCommands(path.commands, GU));
  if (opts.fakeBold) paths = gOffset(paths, sizeMm * 0.028);
  if (opts.fakeItalic) paths = paths.map(p => p.map(q => ({ X: Math.round(q.X + q.Y * 0.2), Y: q.Y })));
  return { paths, width: font.getAdvanceWidth(str, sizeMm, { kerning: true }) };
}
