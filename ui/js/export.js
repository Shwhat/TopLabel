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

// Bambu Studio and OrcaSlicer project: one object, one part per element, filament slots assigned
async function bambu3MF(meshes, opt) {
  const bed = BEDS.find(b => b.id === opt.bed) || BEDS[0];
  const B = meshBounds(meshes), cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2, hz = (B.z1 - B.z0) / 2;
  const asm = meshes.length + 1, name = xmlEsc(opt.name || 'TopLabel');
  const objs = meshes.map((m, i) => `<object id="${i + 1}" p:UUID="${uuid(i + 1)}" type="model">${meshXML(m, -cx, -cy, -B.z0 - hz)}</object>`).join('\n');
  const objModel = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">\n<metadata name="BambuStudio:3mfVersion">1</metadata>\n<resources>\n${objs}\n</resources>\n<build/>\n</model>`;
  const comps = meshes.map((m, i) => `<component p:path="/3D/Objects/object_1.model" objectid="${i + 1}" p:UUID="${uuid(asm * 100 + i)}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>`).join('');
  const tx = `1 0 0 0 1 0 0 0 1 ${f6(bed.w / 2)} ${f6(bed.h / 2)} ${f6(hz)}`;
  const today = new Date().toISOString().slice(0, 10);
  const root = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
 <metadata name="Application">BambuStudio-02.09.01.70</metadata>
 <metadata name="BambuStudio:3mfVersion">1</metadata>
 <metadata name="CreationDate">${today}</metadata>
 <metadata name="ModificationDate">${today}</metadata>
 <metadata name="Title">${name}</metadata>
 <metadata name="Designer">TopLabel ${APP_VERSION}</metadata>
 <resources>
  <object id="${asm}" p:UUID="${uuid(asm)}" type="model"><components>${comps}</components></object>
 </resources>
 <build p:UUID="${uuid(9999)}">
  <item objectid="${asm}" p:UUID="${uuid(asm + 5000)}" transform="${tx}" printable="1"/>
 </build>
</model>`;
  const parts = meshes.map((m, i) => `    <part id="${i + 1}" subtype="normal_part">
      <metadata key="name" value="${xmlEsc(m.name)}"/>
      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>
      <metadata key="extruder" value="${m.slot}"/>
      <mesh_stat face_count="${m.idx.length / 3}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>
    </part>`).join('\n');
  const settings = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="${asm}">
    <metadata key="name" value="${name}"/>
    <metadata key="extruder" value="${meshes[0] ? meshes[0].slot : 1}"/>
${parts}
  </object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value=""/>
    <metadata key="locked" value="false"/>
    <model_instance>
      <metadata key="object_id" value="${asm}"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="${100 + asm}"/>
    </model_instance>
  </plate>
  <assemble>
   <assemble_item object_id="${asm}" instance_id="0" transform="${tx}" offset="0 0 0" />
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

const EXPORT_FORMATS = [
  ['bambu', 'Bambu Studio and OrcaSlicer project (.3mf)'], ['3mf', 'Standard 3MF, one object per part (.3mf)'],
  ['stl', 'STL, one combined mesh (.stl)'], ['stlcolors', 'STL, one file per color (.zip)'],
];
function exportBaseName() {
  const st = L.set, pat = PREFS.namePattern || '{code} - {name}';
  const name = st ? fixDashes(st.name) : labelTitle(L), code = st ? st.code : '';
  let n = pat.replace(/\{code\}/g, code).replace(/\{name\}/g, name).replace(/\{rarity\}/g, L.symbol.src === 'set' ? rarityName(L.symbol.rarity) : '');
  n = n.replace(/^\s*-\s*|\s*-\s*$/g, '').trim();
  return safeFile(n || 'label');
}
// build the export file for the current label and download it
async function exportLabel(fmt = PREFS.exportFmt) {
  if (building || !MODEL) { await runBuild(); }
  if (!MESHES.length) { flash('Nothing to export'); return null; }
  const base = exportBaseName(), name = L.set ? fixDashes(L.set.name) : labelTitle(L);
  let file;
  if (fmt === 'stl') file = { name: base + '.stl', blob: new Blob([stlBinary(MESHES, name)], { type: 'model/stl' }) };
  else if (fmt === 'stlcolors') {
    const files = meshesBySlot(MESHES).map(g => ({ name: `${base} - slot ${g.slot} ${safeFile((palette()[g.slot - 1] || {}).name || '')}.stl`.replace(/ \.stl$/, '.stl'), data: stlBinary(g.meshes, name) }));
    file = { name: base + ' (STL per color).zip', blob: await makeZip(files) };
  } else if (fmt === '3mf') file = { name: base + '.3mf', blob: await standard3MF(MESHES, { bed: PREFS.bed, name }) };
  else file = { name: base + '.3mf', blob: await bambu3MF(MESHES, { bed: PREFS.bed, name, colors: PREFS.colors3mf !== false, thumb: await snapshotPNG() }) };
  download(file.name, file.blob);
  flash('Exported ' + file.name);
  return file;
}
