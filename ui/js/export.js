// ---------- export: zip, STL and 3MF files ----------
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const enc = s => new TextEncoder().encode(s);
async function deflateRaw(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  try { const cs = new CompressionStream('deflate-raw'); const out = new Response(new Blob([bytes]).stream().pipeThrough(cs)); return new Uint8Array(await out.arrayBuffer()); } catch (e) { return null; }
}
// files: [{ name, data: Uint8Array | string }]; returns a Blob
async function makeZip(files, mime = 'application/zip') {
  const chunks = [], central = []; let off = 0;
  const d = new Date(), dt = ((d.getFullYear() - 1980) << 9 | (d.getMonth() + 1) << 5 | d.getDate()) & 0xffff, tm = (d.getHours() << 11 | d.getMinutes() << 5 | (d.getSeconds() >> 1)) & 0xffff;
  for (const f of files) {
    const raw = typeof f.data === 'string' ? enc(f.data) : f.data, name = enc(f.name), crc = crc32(raw);
    const def = raw.length > 64 ? await deflateRaw(raw) : null, useDef = def && def.length < raw.length, body = useDef ? def : raw;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, useDef ? 8 : 0, true);
    lh.setUint16(10, tm, true); lh.setUint16(12, dt, true); lh.setUint32(14, crc, true); lh.setUint32(18, body.length, true); lh.setUint32(22, raw.length, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    chunks.push(new Uint8Array(lh.buffer), name, body);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, useDef ? 8 : 0, true);
    ch.setUint16(12, tm, true); ch.setUint16(14, dt, true); ch.setUint32(16, crc, true); ch.setUint32(20, body.length, true); ch.setUint32(24, raw.length, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), name);
    off += 30 + name.length + body.length;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: mime });
}

// ---------- STL ----------
function stlBinary(meshes, name = 'TopLabel') {
  const n = meshes.reduce((s, m) => s + m.idx.length / 3, 0);
  const buf = new ArrayBuffer(84 + n * 50), dv = new DataView(buf);
  const head = enc(('TopLabel ' + name).slice(0, 79)); new Uint8Array(buf, 0, head.length).set(head);
  dv.setUint32(80, n, true); let o = 84;
  for (const m of meshes) {
    const p = m.pos, I = m.idx;
    for (let i = 0; i < I.length; i += 3) {
      const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true); o += 12;
      for (const k of [a, b, c]) { dv.setFloat32(o, p[k], true); dv.setFloat32(o + 4, p[k + 1], true); dv.setFloat32(o + 8, p[k + 2], true); o += 12; }
      o += 2;
    }
  }
  return new Uint8Array(buf);
}
// meshes grouped by filament slot, merged into one mesh per slot
function meshesBySlot(meshes) {
  const by = new Map();
  for (const m of meshes) { if (!by.has(m.slot)) by.set(m.slot, []); by.get(m.slot).push(m); }
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([slot, list]) => ({ slot, meshes: list }));
}

// ---------- 3MF ----------
const BEDS = [
  { id: 'h2d', name: 'Bambu Lab H2D (350 x 320)', w: 350, h: 320 }, { id: 'x1', name: 'Bambu Lab X1, P1, P2 (256 x 256)', w: 256, h: 256 },
  { id: 'a1', name: 'Bambu Lab A1 (256 x 256)', w: 256, h: 256 }, { id: 'a1mini', name: 'Bambu Lab A1 mini (180 x 180)', w: 180, h: 180 },
  { id: 'mk4', name: 'Prusa MK4 (250 x 210)', w: 250, h: 210 },
];
const f6 = v => (Math.round(v * 1e6) / 1e6).toString();
const xmlEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
// mesh XML; dx, dy, dz shift the vertices
function meshXML(m, dx = 0, dy = 0, dz = 0) {
  const p = m.pos, I = m.idx, v = [], t = [];
  for (let i = 0; i < p.length; i += 3) v.push(`<vertex x="${f6(p[i] + dx)}" y="${f6(p[i + 1] + dy)}" z="${f6(p[i + 2] + dz)}"/>`);
  for (let i = 0; i < I.length; i += 3) t.push(`<triangle v1="${I[i]}" v2="${I[i + 1]}" v3="${I[i + 2]}"/>`);
  return `<mesh><vertices>${v.join('')}</vertices><triangles>${t.join('')}</triangles></mesh>`;
}
const uuid = n => (n >>> 0).toString(16).padStart(8, '0') + '-b1ec-4553-aec9-835e5b724bb4';
function meshBounds(meshes) {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const m of meshes) for (let i = 0; i < m.pos.length; i += 3) { const x = m.pos[i], y = m.pos[i + 1], z = m.pos[i + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  return { x0, y0, z0, x1, y1, z1 };
}
const CT_XML = `<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="config" ContentType="text/xml"/></Types>`;

// Bambu Studio and OrcaSlicer project. objects: [{ name, meshes, plate (0-based), x, y }] with x, y the centre of the
// object on its plate; one part per element, filament slots assigned. Plates are laid out as Bambu Studio does:
// in a square grid, each plate one fifth of its size apart.
async function bambuProject(objects, opt) {
  const bed = BEDS.find(b => b.id === opt.bed) || BEDS[0];
  const nPlates = Math.max(1, ...objects.map(o => (o.plate || 0) + 1)), cols = Math.ceil(Math.sqrt(nPlates));
  const plateOrigin = i => [(i % cols) * bed.w * 1.2, -Math.floor(i / cols) * bed.h * 1.2];
  const name = xmlEsc(opt.name || 'TopLabel');
  let meshId = 0; const meshObjs = [], asms = [];
  objects.forEach((o, oi) => {
    const B = meshBounds(o.meshes), cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2, hz = (B.z1 - B.z0) / 2;
    const ids = o.meshes.map(m => { meshId++; meshObjs.push(`<object id="${meshId}" p:UUID="${uuid(meshId)}" type="model">${meshXML(m, -cx, -cy, -B.z0 - hz)}</object>`); return meshId; });
    const [px, py] = plateOrigin(o.plate || 0);
    asms.push({ o, ids, hz, tx: `1 0 0 0 1 0 0 0 1 ${f6(px + (o.x === undefined ? bed.w / 2 : o.x))} ${f6(py + (o.y === undefined ? bed.h / 2 : o.y))} ${f6(hz)}`, name: xmlEsc(o.name || 'TopLabel') });
  });
  asms.forEach((a, i) => { a.id = meshId + 1 + i; });
  const objModel = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">\n<metadata name="BambuStudio:3mfVersion">1</metadata>\n<resources>\n${meshObjs.join('\n')}\n</resources>\n<build/>\n</model>`;
  const today = new Date().toISOString().slice(0, 10);
  const root = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
 <metadata name="Application">BambuStudio-02.09.01.70</metadata>
 <metadata name="BambuStudio:3mfVersion">1</metadata>
 <metadata name="CreationDate">${today}</metadata>
 <metadata name="ModificationDate">${today}</metadata>
 <metadata name="Title">${name}</metadata>
 <metadata name="Designer">TopLabel ${APP_VERSION}</metadata>
 <resources>
${asms.map(a => `  <object id="${a.id}" p:UUID="${uuid(a.id)}" type="model"><components>${a.ids.map((id, k) => `<component p:path="/3D/Objects/object_1.model" objectid="${id}" p:UUID="${uuid(a.id * 100 + k)}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>`).join('')}</components></object>`).join('\n')}
 </resources>
 <build p:UUID="${uuid(99999)}">
${asms.map(a => `  <item objectid="${a.id}" p:UUID="${uuid(a.id + 50000)}" transform="${a.tx}" printable="1"/>`).join('\n')}
 </build>
</model>`;
  const objSettings = asms.map(a => `  <object id="${a.id}">
    <metadata key="name" value="${a.name}"/>
    <metadata key="extruder" value="${a.o.meshes[0] ? a.o.meshes[0].slot : 1}"/>
${a.o.meshes.map((m, k) => `    <part id="${a.ids[k]}" subtype="normal_part">
      <metadata key="name" value="${xmlEsc(m.name)}"/>
      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>
      <metadata key="extruder" value="${m.slot}"/>
      <mesh_stat face_count="${m.idx.length / 3}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>
    </part>`).join('\n')}
  </object>`).join('\n');
  const plates = Array.from({ length: nPlates }, (_, pi) => `  <plate>
    <metadata key="plater_id" value="${pi + 1}"/>
    <metadata key="plater_name" value=""/>
    <metadata key="locked" value="false"/>
${asms.filter(a => (a.o.plate || 0) === pi).map(a => `    <model_instance>
      <metadata key="object_id" value="${a.id}"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="${100 + a.id}"/>
    </model_instance>`).join('\n')}
  </plate>`).join('\n');
  const settings = `<?xml version="1.0" encoding="UTF-8"?>
<config>
${objSettings}
${plates}
  <assemble>
${asms.map(a => `   <assemble_item object_id="${a.id}" instance_id="0" transform="${a.tx}" offset="0 0 0" />`).join('\n')}
  </assemble>
</config>`;
  const thumb = opt.thumb ? new Uint8Array(await opt.thumb.arrayBuffer()) : null;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>${thumb ? '\n <Relationship Target="/Metadata/plate_1.png" Id="rel-2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"/>' : ''}\n</Relationships>`;
  const modelRels = `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/Objects/object_1.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>`;
  const files = [
    { name: '[Content_Types].xml', data: CT_XML }, { name: '_rels/.rels', data: rels }, { name: '3D/3dmodel.model', data: root },
    { name: '3D/_rels/3dmodel.model.rels', data: modelRels }, { name: '3D/Objects/object_1.model', data: objModel },
    { name: 'Metadata/model_settings.config', data: settings },
  ];
  if (opt.colors) {
    const pal = palette();
    files.push({ name: 'Metadata/project_settings.config', data: JSON.stringify({ filament_colour: pal.map(s => s.color.toUpperCase()), filament_type: pal.map(() => 'PLA') }, null, 4) });
  }
  if (thumb) files.push({ name: 'Metadata/plate_1.png', data: thumb });
  return makeZip(files, 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml');
}
const bambu3MF = (meshes, opt) => bambuProject([{ name: opt.name, meshes }], opt);

// standard 3MF: one object per part, colored with the materials of the core specification
async function standard3MF(meshes, opt) {
  const bed = BEDS.find(b => b.id === opt.bed) || BEDS[0];
  const B = meshBounds(meshes), cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2;
  const slots = [...new Set(meshes.map(m => m.slot))];
  const mats = slots.map(s => `<base name="${xmlEsc(slotName(s))}" displaycolor="${slotColor(s).toUpperCase()}FF"/>`).join('');
  const objs = meshes.map((m, i) => `<object id="${i + 2}" type="model" name="${xmlEsc(m.name)}" pid="1" pindex="${slots.indexOf(m.slot)}">${meshXML(m, -cx, -cy, -B.z0)}</object>`).join('\n');
  const items = meshes.map((m, i) => `<item objectid="${i + 2}" transform="1 0 0 0 1 0 0 0 1 ${f6(bed.w / 2)} ${f6(bed.h / 2)} 0"/>`).join('');
  const model = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n<metadata name="Title">${xmlEsc(opt.name || 'TopLabel')}</metadata>\n<metadata name="Application">TopLabel ${APP_VERSION}</metadata>\n<resources>\n<basematerials id="1">${mats}</basematerials>\n${objs}\n</resources>\n<build>${items}</build>\n</model>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;
  return makeZip([{ name: '[Content_Types].xml', data: CT_XML }, { name: '_rels/.rels', data: rels }, { name: '3D/3dmodel.model', data: model }], 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml');
}

// ---------- OBJ, AMF, SVG, DXF, PNG ----------
const hex3 = c => { const v = parseInt(String(c).replace('#', ''), 16) || 0; return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; };
// OBJ with a material file: one object per part, one material per filament slot
function objFiles(meshes, base) {
  const out = [`# TopLabel ${APP_VERSION}`, `mtllib ${base}.mtl`]; let off = 1;
  for (const m of meshes) {
    out.push(`o ${m.name.replace(/\s+/g, '_')}`, `usemtl slot_${m.slot}`);
    for (let i = 0; i < m.pos.length; i += 3) out.push(`v ${f6(m.pos[i])} ${f6(m.pos[i + 1])} ${f6(m.pos[i + 2])}`);
    for (let i = 0; i < m.idx.length; i += 3) out.push(`f ${m.idx[i] + off} ${m.idx[i + 1] + off} ${m.idx[i + 2] + off}`);
    off += m.pos.length / 3;
  }
  const mtl = [...new Set(meshes.map(m => m.slot))].map(s => `newmtl slot_${s}\nKd ${hex3(slotColor(s)).map(v => v.toFixed(4)).join(' ')}\n# ${slotName(s)}`).join('\n\n');
  return [{ name: base + '.obj', data: out.join('\n') + '\n' }, { name: base + '.mtl', data: mtl + '\n' }];
}
// AMF: one object per part, each with the material of its filament slot
function amfXML(meshes, name) {
  const slots = [...new Set(meshes.map(m => m.slot))];
  const mats = slots.map(s => { const [r, g, b] = hex3(slotColor(s)); return `<material id="${s}"><metadata type="name">${xmlEsc(slotName(s))}</metadata><color><r>${r.toFixed(4)}</r><g>${g.toFixed(4)}</g><b>${b.toFixed(4)}</b></color></material>`; }).join('\n');
  const objs = meshes.map((m, i) => {
    const v = []; for (let k = 0; k < m.pos.length; k += 3) v.push(`<vertex><coordinates><x>${f6(m.pos[k])}</x><y>${f6(m.pos[k + 1])}</y><z>${f6(m.pos[k + 2])}</z></coordinates></vertex>`);
    const t = []; for (let k = 0; k < m.idx.length; k += 3) t.push(`<triangle><v1>${m.idx[k]}</v1><v2>${m.idx[k + 1]}</v2><v3>${m.idx[k + 2]}</v3></triangle>`);
    return `<object id="${i}"><metadata type="name">${xmlEsc(m.name)}</metadata><mesh><vertices>${v.join('')}</vertices><volume materialid="${m.slot}">${t.join('')}</volume></mesh></object>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<amf unit="millimeter" version="1.1">\n<metadata type="name">${xmlEsc(name)}</metadata>\n<metadata type="cad">TopLabel ${APP_VERSION}</metadata>\n${mats}\n${objs}\n</amf>\n`;
}
// the top view of the parts, in millimetres: the base, then every part on the front in its color, engraved
// parts as outlines. For cutting machines and drawings.
function svgTopView(model, name) {
  const b = gBounds(model.outline), pad = 1, w = b.w + pad * 2, h = b.h + pad * 2;
  const base = model.parts.find(p => p.key === 'base');
  const parts = model.parts.filter(p => p.key !== 'base' && p.side !== 'bottom');
  const body = [`<path id="base" d="${gPathD(model.outline)}" fill="${slotColor(base ? base.slot : 1)}" fill-rule="evenodd"><title>${xmlEsc(base ? base.name : 'Base')}</title></path>`]
    .concat(parts.map(p => `<path id="${xmlEsc(p.key)}" d="${gPathD(p.paths)}" fill="${slotColor(p.slot)}" fill-rule="evenodd"><title>${xmlEsc(p.name)}</title></path>`))
    .concat((model.engraved || []).map(e => `<path id="${xmlEsc(e.key)}_engraved" d="${gPathD(e.paths)}" fill="none" stroke="#000" stroke-width="0.1"><title>${xmlEsc(e.name)} (engraved)</title></path>`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${f6(w)}mm" height="${f6(h)}mm" viewBox="${f6(b.x0 - pad)} ${f6(-b.y1 - pad)} ${f6(w)} ${f6(h)}">\n<title>${xmlEsc(name)}</title>\n${body.join('\n')}\n</svg>\n`;
}
// DXF (AutoCAD R12, millimetres): every outline of every part as a closed polyline on a layer named after the part
function dxfText(model) {
  const o = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES'];
  const layer = n => n.replace(/[^A-Za-z0-9_-]+/g, '_').toUpperCase().slice(0, 31) || 'PART';
  const put = (paths, lay, color) => { for (const p of paths) { o.push('0', 'POLYLINE', '8', lay, '62', String(color), '66', '1', '70', '1'); for (const q of p) o.push('0', 'VERTEX', '8', lay, '10', f6(q.X / GU), '20', f6(q.Y / GU), '30', '0'); o.push('0', 'SEQEND', '8', lay); } };
  put(model.outline, 'BASE', 7);
  model.parts.filter(p => p.key !== 'base' && p.side !== 'bottom').forEach((p, i) => put(p.paths, layer(p.name), (i % 6) + 1));
  (model.engraved || []).forEach(e => put(e.paths, layer(e.name + ' engraved'), 8));
  o.push('0', 'ENDSEC', '0', 'EOF');
  return o.join('\n') + '\n';
}
// a picture of the 3D preview, 1600 pixels wide; without WebGL, a picture of the top view
async function pngImage(model, name) {
  if (V3.renderer) {
    const r = V3.renderer, el = r.domElement, w0 = el.clientWidth || 800, h0 = el.clientHeight || 600, W = 1600, H = Math.round(W * h0 / w0);
    r.setSize(W, H, false); V3.camera.aspect = W / H; V3.camera.updateProjectionMatrix(); paint3D();
    const blob = await new Promise(res => el.toBlob(res, 'image/png'));
    r.setSize(w0, h0, false); size3D(); paint3D();
    if (blob) return blob;
  }
  const svg = svgTopView(model, name), img = new Image(), b = gBounds(model.outline), k = 1600 / (b.w + 2);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const c = document.createElement('canvas'); c.width = 1600; c.height = Math.round((b.h + 2) * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, 'image/png'));
}

const EXPORT_FORMATS = [
  ['bambu', 'Bambu Studio and OrcaSlicer project (.3mf)'], ['3mf', 'Standard 3MF, one object per part (.3mf)'],
  ['stl', 'STL, one combined mesh (.stl)'], ['stlcolors', 'STL, one file per color (.zip)'],
  ['obj', 'OBJ with colors (.zip with .obj and .mtl)'], ['amf', 'AMF with colors (.amf)'], ['svg', 'SVG top view (.svg)'],
  ['dxf', 'DXF outlines (.dxf)'], ['png', 'PNG picture of the 3D preview (.png)'],
];
function exportBaseName(l = L) {
  const st = l.set, pat = PREFS.namePattern || '{code} - {name}';
  const name = st ? fixDashes(st.name) : labelTitle(l), code = st ? st.code : '';
  let n = pat.replace(/\{code\}/g, code).replace(/\{name\}/g, name).replace(/\{rarity\}/g, l.symbol.src === 'set' ? rarityName(l.symbol.rarity) : '');
  n = n.replace(/^\s*-\s*|\s*-\s*$/g, '').trim();
  return safeFile(n || 'label');
}
// one export file for a built label: { name, blob }
async function exportFile(l, model, meshes, fmt, thumb) {
  const base = exportBaseName(l), name = l.set ? fixDashes(l.set.name) : labelTitle(l);
  if (fmt === 'stl') return { name: base + '.stl', blob: new Blob([stlBinary(meshes, name)], { type: 'model/stl' }) };
  if (fmt === 'stlcolors') {
    const files = meshesBySlot(meshes).map(g => ({ name: `${base} - slot ${g.slot} ${safeFile((palette()[g.slot - 1] || {}).name || '')}.stl`.replace(/ \.stl$/, '.stl'), data: stlBinary(g.meshes, name) }));
    return { name: base + ' (STL per color).zip', blob: await makeZip(files) };
  }
  if (fmt === '3mf') return { name: base + '.3mf', blob: await standard3MF(meshes, { bed: PREFS.bed, name }) };
  if (fmt === 'obj') return { name: base + ' (OBJ).zip', blob: await makeZip(objFiles(meshes, base)) };
  if (fmt === 'amf') return { name: base + '.amf', blob: new Blob([amfXML(meshes, name)], { type: 'application/x-amf' }) };
  if (fmt === 'svg') return { name: base + '.svg', blob: new Blob([svgTopView(model, name)], { type: 'image/svg+xml' }) };
  if (fmt === 'dxf') return { name: base + '.dxf', blob: new Blob([dxfText(model)], { type: 'application/dxf' }) };
  if (fmt === 'png') return { name: base + '.png', blob: await pngImage(model, name) };
  return { name: base + '.3mf', blob: await bambu3MF(meshes, { bed: PREFS.bed, name, colors: PREFS.colors3mf !== false, thumb }) };
}
// build the export file for the current label and download it
async function exportLabel(fmt = PREFS.exportFmt) {
  if (building || !MODEL) { await runBuild(); }
  if (!MESHES.length) { flash('Nothing to export'); return null; }
  const file = await exportFile(L, MODEL, MESHES, fmt, fmt === 'bambu' ? await snapshotPNG() : null);
  download(file.name, file.blob);
  flash('Exported ' + file.name);
  return file;
}

// ---------- batch export: the open label's design for many sets ----------
// Every chosen set gets a copy of the open label with that set applied. 'project' makes one Bambu 3MF with one
// plate per label ('plates') or the labels packed onto as few plates as fit ('packed'); 'files' makes a zip with
// one file per label in the chosen format.
function packPlates(sizes, bed, gap = 4, margin = 5) {
  const out = []; let plate = 0, x = margin, y = margin, rowH = 0;
  for (const s of sizes) {
    if (s.w > bed.w - margin * 2 || s.h > bed.h - margin * 2) { if (x > margin || y > margin) { plate++; } out.push({ plate, x: bed.w / 2, y: bed.h / 2 }); plate++; x = margin; y = margin; rowH = 0; continue; }
    if (x + s.w > bed.w - margin) { x = margin; y += rowH + gap; rowH = 0; }
    if (y + s.h > bed.h - margin) { plate++; x = margin; y = margin; rowH = 0; }
    out.push({ plate, x: x + s.w / 2, y: bed.h - (y + s.h / 2) });
    x += s.w + gap; rowH = Math.max(rowH, s.h);
  }
  return out;
}
async function batchExport(codes, opt, progress = () => {}) {
  const labels = [];
  for (let i = 0; i < codes.length; i++) {
    const st = SETS_BY_CODE.get(codes[i]); if (!st) continue;
    progress(i, codes.length, st);
    const l = normalizeLabel(clone(L)); const rar = l.symbol.rarity; applySet(l, st); l.symbol.rarity = (st.rarities || []).includes(rar) ? rar : l.symbol.rarity;
    const model = await buildLabel(l), meshes = partMeshes(model);
    if (meshes.length) labels.push({ l, model, meshes });
  }
  progress(codes.length, codes.length, null);
  if (!labels.length) { flash('Nothing to export'); return null; }
  const stamp = new Date().toISOString().slice(0, 10), title = `TopLabel ${labels.length} labels ${stamp}`;
  let file;
  if (opt.mode === 'project') {
    const bed = BEDS.find(b => b.id === PREFS.bed) || BEDS[0];
    const place = opt.plates === 'packed' ? packPlates(labels.map(x => { const B = meshBounds(x.meshes); return { w: B.x1 - B.x0, h: B.y1 - B.y0 }; }), bed) : labels.map((_, i) => ({ plate: i }));
    const objects = labels.map((x, i) => Object.assign({ name: x.l.set ? `${x.l.set.code} ${fixDashes(x.l.set.name)}` : labelTitle(x.l), meshes: x.meshes }, place[i]));
    file = { name: safeFile(title) + '.3mf', blob: await bambuProject(objects, { bed: PREFS.bed, name: title, colors: PREFS.colors3mf !== false }) };
  } else {
    const files = [], used = new Set();
    for (const x of labels) {
      const f = await exportFile(x.l, x.model, x.meshes, opt.fmt === 'png' ? 'svg' : opt.fmt, null);
      let n = f.name; for (let k = 2; used.has(n); k++) n = f.name.replace(/(\.[^.]+)$/, ` (${k})$1`); used.add(n);
      files.push({ name: n, data: new Uint8Array(await f.blob.arrayBuffer()) });
    }
    file = { name: safeFile(title) + '.zip', blob: await makeZip(files) };
  }
  download(file.name, file.blob); flash('Exported ' + file.name);
  return Object.assign(file, { count: labels.length });
}
