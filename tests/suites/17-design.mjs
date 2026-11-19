// Version 0.4.0: symbol items with their own source, uploads, symbol grids, moving items, edges, short names,
// the back of a divider, new export formats, batch export and docking panels.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const STAR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 1l2.6 6 6.4.6-4.8 4.3 1.4 6.3L10 15l-5.6 3.2 1.4-6.3L1 7.6 7.4 7z" fill="#111"/></svg>';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-design-'));
const py = (code, file) => JSON.parse(execFileSync('python3', ['-c', code, file]).toString());
const save = d => { const f = path.join(tmp, d.name); fs.writeFileSync(f, d.bytes); return f; };
// item controls in the rows editor: row ri, item ii
const item = (ri, ii, sel) => `#rows .lrow2[data-ri="${ri}"] .litem[data-ii="${ii}"] ${sel}`;
async function field(t, ri, ii, f, v) {
  const sel = item(ri, ii, `[data-if="${f}"]`);
  if ((await t.page.evaluate(s => document.querySelector(s).tagName, sel)) === 'SELECT') await t.page.selectOption(sel, String(v));
  else { await t.page.fill(sel, String(v)); await t.page.press(sel, 'Enter'); }
  await t.built();
}
const part = (t, key) => t.eval(k => { const p = MODEL.parts.find(x => x.key === k); if (!p) return null; const b = gBounds(p.paths); return { name: p.name, slot: p.slot, w: r2(b.w), h: r2(b.h), cx: r2(b.x0 + b.w / 2), cy: r2(b.y0 + b.h / 2) }; }, key);
const openEdges = t => t.eval(() => MESHES.map(m => { const c = new Map(); for (let i = 0; i < m.idx.length; i += 3) for (const [a, b] of [[m.idx[i], m.idx[i + 1]], [m.idx[i + 1], m.idx[i + 2]], [m.idx[i + 2], m.idx[i]]]) { const k = a < b ? a + ',' + b : b + ',' + a; c.set(k, (c.get(k) || 0) + 1); } return [...c.values()].filter(v => v !== 2).length; }));

export const tests = {
  'symbol items from another set, a watermark and an uploaded SVG, each in its own color': async t => {
    await t.open(); await t.pickSet('NEO');
    await t.act('addRowSymbol');
    await field(t, 3, 0, 'src', 'set');
    t.eq(await t.eval(() => L.arr.rows[3].items[0].set), 'NEO', 'starts with the label set');
    await field(t, 3, 0, 'set', 'blb'); await field(t, 3, 0, 'slot', 5);
    t.eq(await part(t, 'sym_3_0').then(p => [p.name, p.slot]), ['Symbol BLB', 5]);
    t.ok(await part(t, 'symbol'), 'the label symbol stays');
    await field(t, 3, 0, 'src', 'wm'); await field(t, 3, 0, 'wm', 'izzet');
    t.eq((await part(t, 'sym_3_0')).name, 'Symbol izzet');
    await field(t, 3, 0, 'style', 'twotone');
    t.ok(await t.eval(() => MODEL.parts.some(p => p.key === 'sym_3_0_2') || MODEL.warnings.some(w => w.includes('no separate border'))), 'two-tone of its own');
    // uploads
    const bad = await t.page.request.post(t.url + '/api/uploads?kind=svg&name=Bad', { headers: t.H, data: 'hello' });
    t.eq([bad.status(), (await bad.json()).error], [400, 'The file is not an SVG image.']);
    const up = await (await t.page.request.post(t.url + '/api/uploads?kind=svg&name=Star', { headers: t.H, data: STAR })).json();
    await t.eval(() => host.uploads().then(render)); await t.built();
    await field(t, 3, 0, 'src', 'upload'); await field(t, 3, 0, 'up', up.id);
    t.eq((await part(t, 'sym_3_0')).name, 'Symbol Star');
    await t.act('manageUploads'); t.ok(await t.page.isVisible('#dlg >> text=Star'), 'listed in Uploads');
    await t.page.click(`#dlg [data-delup="${up.id}"]`); await t.page.waitForFunction(() => !UPLOADS.length);
    await t.page.click('#dlgbtns .primary'); await t.built();
    t.ok(await t.eval(() => MODEL.warnings.includes('An uploaded symbol is no longer on the server. Pick another symbol.')), 'warning after delete');
  },
  'uploaded fonts are listed under Uploaded and print the text': async t => {
    await t.open(); await t.pickSet('NEO');
    const woff2 = await t.page.request.post(t.url + '/api/uploads?kind=font&name=X', { headers: t.H, data: Buffer.from('wOF2aaaaaaaa') });
    t.eq((await woff2.json()).error, 'WOFF2 fonts cannot be used. Upload the TTF, OTF or WOFF file of the font.');
    const bytes = fs.readFileSync(path.join(t.root, 'assets', 'fonts', 'anton', '400.woff'));
    const up = await (await t.page.request.post(t.url + '/api/uploads?kind=font&name=' + encodeURIComponent('My Font'), { headers: t.H, data: bytes })).json();
    await t.open();
    t.ok(await t.eval(() => $$('#props [data-p="text.font"] optgroup[label="Uploaded"] option').map(o => o.textContent).includes('My Font')), 'in the font list');
    await t.prop('text.font', 'u-' + up.id);
    t.eq(await t.eval(() => [MODEL.warnings.length, !!MODEL.info.text, MODEL.parts.some(p => p.key === 'text')]), [0, true, true]);
    await t.page.request.delete(t.url + '/api/uploads/' + up.id, { headers: t.H });
  },
  'symbol grids show many sets in rows and columns': async t => {
    await t.open(); await t.pickSet('NEO');
    await t.prop('arr.id', 'grid');
    t.eq(await t.eval(() => L.arr.rows.map(r => r.items[0].t)), ['grid', 'text']);
    await field(t, 0, 0, 'codes', 'neo, blb ltr; xxx');
    t.eq(await t.eval(() => [L.arr.rows[0].items[0].codes, MODEL.info.grid]), [['NEO', 'BLB', 'LTR', 'XXX'], 3]);
    t.ok(await t.eval(() => MODEL.warnings.includes('The set XXX is not in the library.')), 'unknown set warned');
    await field(t, 0, 0, 'codes', 'NEO BLB LTR FDN'); await field(t, 0, 0, 'cols', 4);
    const g = await part(t, 'grid_0_0'); t.ok(g.w / g.h > 2.5, 'four in one row: ' + JSON.stringify(g));
    t.eq(g.name, 'Symbol grid');
    await field(t, 0, 0, 'slot', 6); t.eq((await part(t, 'grid_0_0')).slot, 6);
  },
  'items move, scale and turn by fields, by dragging in the 2D layout and by arrow keys': async t => {
    await t.open(); await t.pickSet('NEO'); await t.act('view2d');
    const p0 = await part(t, 'symbol');
    await t.page.click(item(0, 0, '.ipos summary'));
    await field(t, 0, 0, 'x', 5); await field(t, 0, 0, 'y', -2);
    let p = await part(t, 'symbol'); t.near(p.cx - p0.cx, 5, 0.05, 'moved x'); t.near(p.cy - p0.cy, -2, 0.05, 'moved y');
    await field(t, 0, 0, 'scale', 50); p = await part(t, 'symbol'); t.near(p.w, p0.w / 2, 0.1, 'half size');
    await field(t, 0, 0, 'rot', 90); p = await part(t, 'symbol'); t.near(p.w, p0.h / 2, 0.2, 'turned');
    await t.page.click(item(0, 0, '[data-ireset]')); await t.built();
    p = await part(t, 'symbol'); t.eq([p.cx, p.cy, p.w], [p0.cx, p0.cy, p0.w], 'reset');
    t.eq(await t.eval(() => Object.keys(L.arr.rows[0].items[0]).filter(k => ['x', 'y', 'scale', 'rot'].includes(k))), []);
    // drag the symbol 60 px to the right
    const box = await t.page.locator('#view2d .v2item[data-ri="0"] .v2hit').boundingBox();
    await t.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await t.page.mouse.down();
    await t.page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2, { steps: 3 }); await t.page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 3 });
    await t.page.mouse.up(); await t.built();
    const it = await t.eval(() => L.arr.rows[0].items[0]);
    t.ok(it.x > 2 && Math.abs(it.y) < 0.5, 'dragged right: ' + JSON.stringify(it));
    t.ok(await t.eval(() => SEL2D && SEL2D.ri === 0 && !!$('#view2d .v2item.sel .v2h.scale')), 'picked, with handles');
    await t.key('ArrowLeft'); await t.built();
    t.near(await t.eval(() => L.arr.rows[0].items[0].x), it.x - 0.1, 0.001, 'arrow key');
    // the scale handle
    const h = await t.page.locator('#view2d .v2h.scale').boundingBox();
    await t.page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await t.page.mouse.down();
    await t.page.mouse.move(h.x + h.width / 2 + 40, h.y + h.height / 2 + 40, { steps: 4 }); await t.page.mouse.up(); await t.built();
    t.ok(await t.eval(() => L.arr.rows[0].items[0].scale > 100), 'scaled up');
    await t.key('Delete'); await t.built();
    t.eq(await t.eval(() => L.arr.rows.length), 2, 'Delete removes the picked item');
    await t.key('Control+z'); await t.built(); t.eq(await t.eval(() => L.arr.rows.length), 3, 'undo');
  },
  'rounded and chamfered top edges step in and keep the meshes closed': async t => {
    await t.open(); await t.pickSet('NEO');
    const flat = await t.eval(() => MESHES[0].idx.length);
    await t.prop('size.edge', 'round');
    t.ok(await t.page.isVisible('#props [data-p="size.edgeR"]'), 'edge size shown');
    t.eq(await openEdges(t), await t.eval(() => MESHES.map(() => 0)), 'closed');
    const r = await t.eval(() => { const m = MESHES[0], zs = new Set(); for (let i = 2; i < m.pos.length; i += 3) zs.add(Math.round(m.pos[i] * 1000) / 1000); return { tris: m.idx.length, levels: [...zs].sort((a, b) => a - b) }; });
    t.ok(r.tris > flat, 'more triangles than a square edge');
    t.eq(r.levels.filter(z => z > 1.5 && z < 2), [1.6, 1.7, 1.8, 1.9], 'steps of the 0.5 mm edge');
    await t.prop('size.edge', 'chamfer'); await t.prop('size.edgeR', 1);
    t.eq((await openEdges(t)).every(v => v === 0), true, 'chamfer closed');
    await t.act('newDivider'); await t.prop('size.edge', 'round');
    t.eq((await openEdges(t)).every(v => v === 0), true, 'divider closed');
  },
  'short set names: automatic, and typed once for everyone': async t => {
    await t.open(); await t.pickSet('LTR');
    await t.page.selectOption(item(1, 0, '[data-lf="src"]'), 'short'); await t.built();
    t.eq(await t.eval(() => resolveLines(L, L.arr.rows[1].items[0].lines)), ['Lord of the Rings']);
    await t.pickSet('NEO');
    t.eq(await t.eval(() => resolveLines(L, L.arr.rows[1].items[0].lines)), ['Kamigawa: Neon Dynasty'], 'one word before the colon stays');
    await t.page.fill(item(1, 0, '[data-lf="text"]'), 'Neon Dynasty'); await t.page.press(item(1, 0, '[data-lf="text"]'), 'Enter');
    await t.page.waitForFunction(() => SAVED.presets.shortNames.NEO === 'Neon Dynasty'); await t.built();
    t.eq(await t.eval(() => resolveLines(L, L.arr.rows[1].items[0].lines)), ['Neon Dynasty']);
    await t.page.waitForTimeout(300);
    t.eq((await (await t.page.request.get(t.url + '/api/data/presets.json')).json()).shortNames, { NEO: 'Neon Dynasty' }, 'saved on the server');
  },
  'the 2D layout shows the back of a divider': async t => {
    await t.open(); await t.pickSet('NEO'); await t.act('newDivider');
    t.ok(await t.page.isVisible('#sidetabs'), 'Front and Back shown for dividers');
    await t.act('side2dBack');
    t.eq(await t.eval(() => [PREFS.view, $$('#view2d .v2part').map(p => p.dataset.part).every(k => k.endsWith('_b')), $$('#view2d .v2part').length > 0]), ['2d', true, true]);
    await t.act('side2dFront');
    t.ok(await t.eval(() => $$('#view2d .v2part').every(p => !p.dataset.part.endsWith('_b'))), 'front again');
    await t.act('newLabel'); t.ok(await t.page.isHidden('#sidetabs'), 'hidden for labels');
  },
  'OBJ, AMF, SVG, DXF and PNG exports': async t => {
    await t.open(); await t.pickSet('NEO');
    const obj = await t.download(() => t.act('exp_obj'));
    t.eq(obj.name, 'NEO - Kamigawa Neon Dynasty (OBJ).zip');
    t.eq(py(`import sys,zipfile,json;z=zipfile.ZipFile(sys.argv[1]);o=z.read([n for n in z.namelist() if n.endswith('.obj')][0]).decode();print(json.dumps([sorted(z.namelist()),o.count('\\no '),'usemtl slot_1' in o]))`, save(obj)), [['NEO - Kamigawa Neon Dynasty.mtl', 'NEO - Kamigawa Neon Dynasty.obj'], 3, true]);
    const amf = await t.download(() => t.act('exp_amf'));
    t.eq(py(`import sys,json;import xml.etree.ElementTree as E;r=E.parse(sys.argv[1]).getroot();print(json.dumps([r.get('unit'),len(r.findall('object')),len(r.findall('material'))]))`, save(amf)), ['millimeter', 3, 2]);
    const svg = await t.download(() => t.act('exp_svg'));
    t.eq(py(`import sys,json;import xml.etree.ElementTree as E;r=E.parse(sys.argv[1]).getroot();print(json.dumps([r.get('width'),len(r.findall('{http://www.w3.org/2000/svg}path'))]))`, save(svg)), ['78mm', 3]);
    const dxf = await t.download(() => t.act('exp_dxf'));
    const txt = dxf.bytes.toString(); t.ok(txt.startsWith('0\nSECTION') && txt.trim().endsWith('EOF') && txt.includes('\nPOLYLINE\n8\nBASE\n'), 'DXF');
    const png = await t.download(() => t.act('exp_png'));
    t.eq([png.name, png.bytes.slice(1, 4).toString(), png.bytes.readUInt32BE(16)], ['NEO - Kamigawa Neon Dynasty.png', 'PNG', 1600]);
  },
  'export many sets: a project with packed plates or one plate each, or a zip of files': async t => {
    await t.open(); await t.pickSet('NEO');
    const plates = `import sys,zipfile,json,collections
import xml.etree.ElementTree as E
z=zipfile.ZipFile(sys.argv[1]);r=E.fromstring(z.read('Metadata/model_settings.config'))
NS='{http://schemas.microsoft.com/3dmanufacturing/core/2015/02}'
m=E.fromstring(z.read('3D/Objects/object_1.model'))
bad=0
for o in m.iter(NS+'object'):
  ts=[(int(t.get('v1')),int(t.get('v2')),int(t.get('v3'))) for t in o.find(NS+'mesh').find(NS+'triangles')]
  e=collections.Counter(tuple(sorted(x)) for a,b,c in ts for x in ((a,b),(b,c),(c,a)))
  bad+=sum(1 for v in e.values() if v!=2)
print(json.dumps([[len(p.findall('model_instance')) for p in r.iter('plate')],[o.find("metadata[@key='name']").get('value') for o in r.iter('object')],bad]))`;
    await t.act('batchDlg');
    for (const c of ['BLB', 'LTR']) await t.page.check(`#bxlist input[value="${c}"]`);
    t.eq(await t.page.textContent('#bxcount'), '3 chosen');
    await t.page.fill('#bxq', 'lord'); t.eq(await t.eval(() => $$('#bxlist label:not(.hidden)').length), 1, 'filter');
    let d = await t.download(() => t.page.click('#dlgbtns .primary'));
    t.eq(py(plates, save(d)), [[3], ['BLB Bloomburrow', 'LTR The Lord of the Rings: Tales of Middle-earth', 'NEO Kamigawa: Neon Dynasty'], 0], 'packed on one H2D plate');
    await t.act('batchDlg'); await t.page.selectOption('#dlg select[name=plates]', 'plates');
    for (const c of ['BLB', 'LTR']) await t.page.check(`#bxlist input[value="${c}"]`);
    d = await t.download(() => t.page.click('#dlgbtns .primary'));
    t.eq(py(plates, save(d))[0], [1, 1, 1], 'one plate each');
    await t.act('batchDlg'); await t.page.selectOption('#dlg select[name=mode]', 'files'); await t.page.selectOption('#dlg select[name=fmt]', 'stl');
    await t.page.check('#bxlist input[value="BLB"]');
    d = await t.download(() => t.page.click('#dlgbtns .primary'));
    t.eq(py(`import sys,zipfile,json;print(json.dumps(sorted(zipfile.ZipFile(sys.argv[1]).namelist())))`, save(d)), ['BLB - Bloomburrow.stl', 'NEO - Kamigawa Neon Dynasty.stl']);
    t.eq(await t.eval(() => [PREFS.batchMode, PREFS.batchFmt]), ['files', 'stl'], 'remembered');
    t.eq(await t.eval(() => L.set.code), 'NEO', 'the open label is unchanged');
  },
  'panels move to other docks, share a dock as tabs, and go back': async t => {
    await t.open();
    await t.page.click('#dock-bottom [data-pmove="bottom"]'); await t.page.click('#dropdown [data-dockto="right"]');
    t.eq(await t.eval(() => [$('#labelspanel').parentElement.id, $$('#dock-right .dtab').map(x => x.textContent.replace(/\W+$/, '')), $('#dock-bottom').classList.contains('hidden')]), ['dock-right', ['Properties', 'Saved labels'], true]);
    t.ok(await t.page.isVisible('#labelspanel') && await t.page.isHidden('#props'), 'the moved panel is in front');
    await t.page.click('#dock-right [data-ptab="right"]', { position: { x: 8, y: 8 } }); t.ok(await t.page.isVisible('#props'), 'tab switch');
    // drag the Sets tab onto the right dock
    const a = await t.page.locator('#dock-left [data-ptab="left"]').boundingBox(), b = await t.page.locator('#dock-right').boundingBox();
    await t.page.mouse.move(a.x + 10, a.y + 8); await t.page.mouse.down(); await t.page.mouse.move(a.x + 60, a.y + 60, { steps: 4 });
    await t.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 }); await t.page.mouse.up();
    t.eq(await t.eval(() => [PREFS.dock.left, $('#dock-left').classList.contains('hidden')]), ['right', true], 'dragged');
    await t.page.waitForTimeout(500); await t.open();
    t.eq(await t.eval(() => $$('#dock-right .dtab').length), 3, 'remembered');
    await t.act('resetDock');
    t.eq(await t.eval(() => [$('#setspanel').parentElement.id, $('#props').parentElement.id, $('#labelspanel').parentElement.id]), ['dock-left', 'dock-right', 'dock-bottom']);
  },
};
