// ---------- mesh: closed triangle meshes from the parts of a built label ----------
// Each slab of outlines is extruded between its z values into a closed solid: top, bottom and side walls,
// with shared vertices, outward-facing triangles and no gaps, as slicers expect.
function triangulate(ex) {
  const V = THREE.Vector2;
  const contour = ex.outer.map(([x, y]) => new V(x, y)), holes = ex.holes.map(h => h.map(([x, y]) => new V(x, y)));
  const tris = THREE.ShapeUtils.triangulateShape(contour, holes);
  return { pts: ex.outer.concat(...ex.holes), tris };
}
// A mesh builder that joins vertices at the same position, so faces built separately share their edges.
function welder() {
  const map = new Map(), pos = [], idx = [];
  const v = (x, y, z) => { const k = `${Math.round(x * GU)},${Math.round(y * GU)},${Math.round(z * 1e4)}`; let i = map.get(k); if (i === undefined) { i = pos.length / 3; pos.push(x, y, z); map.set(k, i); } return i; };
  const tri = (a, b, c) => { if (a !== b && b !== c && a !== c) idx.push(a, b, c); };
  return { v, tri, pos, idx };
}
// flat face at height z; up = facing +z
function faceAt(W, ex, z, up) {
  const { pts, tris } = triangulate(ex);
  for (const [a, b, c] of tris) {
    const [ax, ay] = pts[a], [bx, by] = pts[b], [cx, cy] = pts[c];
    const cr = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const ccw = cr > 0;
    const A = W.v(ax, ay, z), B = W.v(bx, by, z), C = W.v(cx, cy, z);
    if (ccw === up) W.tri(A, B, C); else W.tri(A, C, B);
  }
}
// walls of every ring of an outline between z0 and z1; outward = the solid is on the left of each ring edge
function wallsOf(W, ex, z0, z1, outward) {
  for (const ring of [ex.outer, ...ex.holes]) {
    for (let i = 0, m = ring.length; i < m; i++) {
      const [ax, ay] = ring[i], [bx, by] = ring[(i + 1) % m];
      const a0 = W.v(ax, ay, z0), b0 = W.v(bx, by, z0), a1 = W.v(ax, ay, z1), b1 = W.v(bx, by, z1);
      if (outward) { W.tri(a0, b0, b1); W.tri(a0, b1, a1); } else { W.tri(a0, b1, b0); W.tri(a0, a1, b1); }
    }
  }
}
// points that lie on the straight line between their neighbours add nothing but can upset triangulation
function dropCollinear(r) {
  let out = r.slice(), changed = true;
  while (changed && out.length > 3) {
    changed = false;
    for (let i = 0; i < out.length && out.length > 3; i++) {
      const a = out[(i + out.length - 1) % out.length], b = out[i], c = out[(i + 1) % out.length];
      const cr = (b.X - a.X) * (c.Y - a.Y) - (b.Y - a.Y) * (c.X - a.X), len = Math.hypot(c.X - a.X, c.Y - a.Y) || 1;
      if (Math.abs(cr) / len < 0.5) { out.splice(i, 1); i--; changed = true; }
    }
  }
  return out;
}
// outlines as a tree of rings in mm: outers (counter-clockwise) holding holes (clockwise) holding outers again
function ringTree(paths) {
  const c = new CL.Clipper(); c.StrictlySimple = true;
  c.AddPaths(CL.Clipper.CleanPolygons(paths, 2), CL.PolyType.ptSubject, true);
  const tree = new CL.PolyTree(); c.Execute(CL.ClipType.ctUnion, tree, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero);
  const ring = (n, ccw) => { let r = n.Contour(); if ((gArea(r) > 0) !== ccw) r = r.slice().reverse(); return dropCollinear(r).map(q => [q.X / GU, q.Y / GU]); };
  const outer = n => ({ ring: ring(n, true), holes: n.Childs().filter(h => h.IsHole()).map(h => ({ ring: ring(h, false), outers: h.Childs().filter(o => !o.IsHole() && Math.abs(gArea(o.Contour())) > 1).map(outer) })) });
  return tree.Childs().filter(n => !n.IsHole() && Math.abs(gArea(n.Contour())) > 1).map(outer);
}
// a slab of outlines extruded between its z values, nested islands included
function slabSolid(W, slab) {
  const walk = o => {
    const ex = { outer: o.ring, holes: o.holes.map(h => h.ring) };
    faceAt(W, ex, slab.z0, false); faceAt(W, ex, slab.z1, true); wallsOf(W, ex, slab.z0, slab.z1, true);
    for (const h of o.holes) h.outers.forEach(walk);
  };
  ringTree(slab.paths).forEach(walk);
}
// The base as one closed solid: its outline (holes included) extruded to its thickness, with pockets cut into the
// top and into the bottom. Used when the pockets lie inside the outline, pockets on one side do not overlap, and
// pockets from both sides do not meet; otherwise null, and the base is built from stacked slabs. Faces and walls
// use the very same rings, so every edge is shared by exactly two triangles.
function baseSolid(solid) {
  const { outline, t } = solid;
  const tree = ringTree(outline); if (tree.length !== 1) return null;
  const out = tree[0]; if (out.holes.some(h => h.outers.length)) return null;
  const inner = gOffset(outline, -0.05, CL.JoinType.jtMiter);
  const regions = { top: [], bottom: [] };
  for (const side of ['top', 'bottom']) {
    const byZ = new Map(); for (const p of solid.pockets.filter(p => (p.side || 'top') === side)) byZ.set(p.z, (byZ.get(p.z) || []).concat(p.paths));
    regions[side] = [...byZ.entries()].map(([z, paths]) => ({ z, paths: gUnion(paths) })).filter(r => r.paths.length && (side === 'top' ? r.z < t - 1e-6 : r.z > 1e-6));
    const rs = regions[side];
    for (const r of rs) if (gTotalArea(gDiff(r.paths, inner)) > 1e-6) return null;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (gTotalArea(gInter(rs[i].paths, rs[j].paths)) > 1e-6) return null;
  }
  for (const a of regions.top) for (const b of regions.bottom) if (b.z >= a.z - 1e-6 && gTotalArea(gInter(a.paths, b.paths)) > 1e-6) return null;
  // a rounded or chamfered top edge: the outer wall steps in ring by ring up to the top face
  const rings = [out.ring], zs = [0];
  if (solid.edge) {
    const lim = gOffset(outerOnly(outline), -(solid.edge.r + 0.05));
    for (const r of [...regions.top, ...regions.bottom]) if (gTotalArea(gDiff(r.paths, lim)) > 1e-6) return null;
    for (const h of out.holes) if (gTotalArea(gDiff([h.ring.map(([x, y]) => ({ X: Math.round(x * GU), Y: Math.round(y * GU) }))], lim)) > 1e-6) return null;
    for (const st of solid.edge.steps.slice(1)) {
      const tr = ringTree(gOffset(outerOnly(outline), -st.d)); if (tr.length !== 1 || tr[0].holes.length) return null;
      rings.push(tr[0].ring); zs.push(st.z);
    }
  }
  const W = welder();
  const holes = out.holes.map(h => h.ring);
  zs.push(t);
  for (let k = 0; k < rings.length; k++) {
    wallsOf(W, { outer: rings[k], holes: [] }, zs[k], zs[k + 1], true);
    if (k) faceAt(W, { outer: rings[k - 1], holes: [rings[k]] }, zs[k], true);
  }
  if (holes.length) wallsOf(W, { outer: [], holes }, 0, t, true);
  for (const side of ['top', 'bottom']) {
    const top = side === 'top', zFace = top ? t : 0;
    const faces = [], pocketOuters = [];
    for (const r of regions[side]) {
      const walk = o => {
        pocketOuters.push(o.ring);
        const ex = { outer: o.ring, holes: o.holes.map(h => h.ring) };
        faceAt(W, ex, r.z, top);                          // pocket floor (top) or ceiling (bottom)
        wallsOf(W, ex, top ? r.z : 0, top ? t : r.z, false);
        for (const h of o.holes) { faces.push({ outer: h.ring.slice().reverse(), holes: h.outers.map(x => x.ring) }); h.outers.forEach(walk); }
      };
      ringTree(r.paths).forEach(walk);
    }
    const nested = new Set(faces.flatMap(f => f.holes));
    faces.push({ outer: top ? rings[rings.length - 1] : out.ring, holes: holes.concat(pocketOuters.filter(r => !nested.has(r))) });
    for (const f of faces) faceAt(W, f, zFace, top);
  }
  return W;
}
// one mesh per part: { name, slot, pos: Float32Array, idx: Uint32Array }
function partMeshes(model) {
  return model.parts.map(p => {
    let W = p.solid ? baseSolid(p.solid) : null;
    if (!W) { W = welder(); for (const s of p.slabs) slabSolid(W, s); }
    const pos = W.pos, idx = W.idx;
    return { key: p.key, name: p.name, slot: p.slot, pos: new Float32Array(pos), idx: new Uint32Array(idx) };
  }).filter(m => m.idx.length);
}
function meshStats(meshes) { return { tris: meshes.reduce((s, m) => s + m.idx.length / 3, 0), verts: meshes.reduce((s, m) => s + m.pos.length / 3, 0) }; }
