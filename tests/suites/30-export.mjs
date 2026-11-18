// Exports: Bambu 3MF, standard 3MF, STL, STL per color. Files are unpacked and checked with Python.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const check = `
import sys, zipfile, json, struct, collections
import xml.etree.ElementTree as ET
p = sys.argv[1]; out = {}
if p.endswith('.stl'):
    b = open(p, 'rb').read(); n = struct.unpack('<I', b[80:84])[0]; out = {'tris': n, 'size_ok': len(b) == 84 + 50 * n}
else:
    z = zipfile.ZipFile(p); out['files'] = sorted(z.namelist())
    NS = '{http://schemas.microsoft.com/3dmanufacturing/core/2015/02}'
    objs = []
    for n in z.namelist():
        if n.endswith('.model'):
            r = ET.fromstring(z.read(n))
            for o in r.iter(NS + 'object'):
                m = o.find(NS + 'mesh')
                if m is None: continue
                tris = [(int(t.get('v1')), int(t.get('v2')), int(t.get('v3'))) for t in m.find(NS + 'triangles')]
                e = collections.Counter(tuple(sorted(x)) for a, b, c in tris for x in ((a, b), (b, c), (c, a)))
                zs = [float(v.get('z')) for v in m.find(NS + 'vertices')]
                objs.append({'id': o.get('id'), 'tris': len(tris), 'open_edges': sum(1 for v in e.values() if v != 2), 'zmin': round(min(zs), 3), 'zmax': round(max(zs), 3), 'pid': o.get('pindex')})
        elif n.endswith('.stl'):
            b = z.read(n); out.setdefault('stl', []).append([n, struct.unpack('<I', b[80:84])[0]])
        elif n.endswith('.config') or n.endswith('.rels') or n.endswith('.xml'):
            if 'project_settings' in n: out['project'] = json.loads(z.read(n))
            else: ET.fromstring(z.read(n))
    out['objects'] = objs
    if 'Metadata/model_settings.config' in z.namelist():
        r = ET.fromstring(z.read('Metadata/model_settings.config'))
        out['parts'] = [[x.find("metadata[@key='name']").get('value'), x.find("metadata[@key='extruder']").get('value')] for x in r.iter('part')]
        out['item'] = ET.fromstring(z.read('3D/3dmodel.model')).find(NS + 'build').find(NS + 'item').get('transform')
print(json.dumps(out))
`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-exp-'));
fs.writeFileSync(path.join(tmp, 'check.py'), check);
const inspect = (t, d) => { const f = path.join(tmp, d.name); fs.writeFileSync(f, d.bytes); return JSON.parse(execFileSync('python3', [path.join(tmp, 'check.py'), f]).toString()); };

export const tests = {
  'Bambu 3MF: parts on their filament slots, closed meshes, placed on the bed': async t => {
    await t.open(); await t.pickSet('TLA');
    const d = await t.download(() => t.page.click('.rb[data-act="exportBambu"]'));
    t.eq(d.name, 'TLA - Avatar - The Last Airbender.3mf'.replace(' - The', ': The').replace(':', ''), 'file name');
    const r = inspect(t, d);
    t.eq(r.files, ['3D/3dmodel.model', '3D/Objects/object_1.model', '3D/_rels/3dmodel.model.rels', 'Metadata/model_settings.config', 'Metadata/plate_1.png', 'Metadata/project_settings.config', '[Content_Types].xml', '_rels/.rels']);
    t.eq(r.parts, [['Base', '1'], ['Symbol', '2'], ['Text', '2']]);
    t.eq(r.objects.map(o => o.open_edges), [0, 0, 0], 'closed meshes');
    t.eq(r.item, '1 0 0 0 1 0 0 0 1 175 160 1.5', 'centred on the H2D bed, resting on it');
    t.eq(r.objects.map(o => [o.zmin, o.zmax]), [[-1.5, 0.5], [0, 1.5], [0, 1.5]]);
    t.eq(r.project.filament_colour.slice(0, 3), ['#161616', '#FFFFFF', '#C12E1F']);
  },
  'Export dialog: format, bed, colors, file name pattern are used and remembered': async t => {
    await t.open(); await t.pickSet('NEO');
    await t.key('Control+e');
    await t.page.selectOption('#dlg select[name=bed]', 'a1mini');
    await t.page.uncheck('#dlg input[name=colors]');
    await t.page.fill('#dlg input[name=pattern]', '{name} {rarity}');
    const d = await t.download(() => t.page.click('#dlgbtns .primary'));
    t.eq(d.name, 'Kamigawa Neon Dynasty Common.3mf');
    const r = inspect(t, d);
    t.ok(!r.files.includes('Metadata/project_settings.config'), 'no filament colors');
    t.ok(r.item.includes(' 90 90 '), 'centred on the A1 mini bed');
    t.eq(await t.eval(() => [PREFS.bed, PREFS.colors3mf, PREFS.namePattern]), ['a1mini', false, '{name} {rarity}']);
  },
  'standard 3MF: one colored object per part': async t => {
    await t.open(); await t.pickSet('BLB'); await t.prop('symbol.slot', 5);
    const d = await t.download(() => t.eval(() => exportLabel('3mf')));
    const r = inspect(t, d);
    t.eq(r.objects.map(o => [o.pid, o.open_edges, o.zmin]), [['0', 0, 0], ['1', 0, 1.5], ['2', 0, 1.5]]);
  },
  'STL combined and STL per color': async t => {
    await t.open(); await t.pickSet('FDN'); await t.page.selectOption('#rows .lrow2:nth-child(3) [data-if="slot"]', '3'); await t.built();
    const tris = await t.eval(() => MESHES.reduce((s, m) => s + m.idx.length / 3, 0));
    const d = await t.download(() => t.page.click('.rb[data-act="exportStl"]'));
    t.eq(inspect(t, d), { tris, size_ok: true });
    const z = await t.download(() => t.eval(() => exportLabel('stlcolors')));
    t.eq(z.name, 'FDN - Foundations (STL per color).zip');
    t.eq(inspect(t, z).stl.map(s => s[0]), ['FDN - Foundations - slot 1 Black.stl', 'FDN - Foundations - slot 2 White.stl', 'FDN - Foundations - slot 3 Red.stl']);
  },
  'two-tone inlay exports four closed parts': async t => {
    await t.open(); await t.pickSet('NEO'); await t.prop('symbol.rarity', 'R'); await t.prop('symbol.style', 'twotone'); await t.prop('depth.id', 'inlay');
    const r = inspect(t, await t.download(() => t.eval(() => exportLabel('bambu'))));
    t.eq(r.parts.map(p => p[0]), ['Base', 'Symbol outline', 'Symbol fill', 'Text']);
    t.eq(r.objects.map(o => o.open_edges), [0, 0, 0, 0]);
  },
};
