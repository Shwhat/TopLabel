// Version 0.5.0: Export many builds from the open item, a saved label or a divider shape, and takes
// sets, basic lands and watermarks together.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-batch-'));
const py = (code, file) => JSON.parse(execFileSync('python3', ['-c', code, file]).toString());
const save = d => { const f = path.join(tmp, d.name); fs.writeFileSync(f, d.bytes); return f; };
// object names in a Bambu project
const NAMES = `import sys,zipfile,json
import xml.etree.ElementTree as E
r=E.fromstring(zipfile.ZipFile(sys.argv[1]).read('Metadata/model_settings.config'))
print(json.dumps(sorted(o.find("metadata[@key='name']").get('value') for o in r.iter('object'))))`;
// width and height of every STL in a zip
const STLSIZE = `import sys,zipfile,json,struct
z=zipfile.ZipFile(sys.argv[1]);out={}
for n in sorted(z.namelist()):
  b=z.read(n);c=struct.unpack('<I',b[80:84])[0];xs=[];ys=[]
  for i in range(c):
    v=struct.unpack('<12f',b[84+i*50:84+i*50+48])
    xs+=v[3::3];ys+=v[4::3]
  out[n]=[round(max(xs)-min(xs),1),round(max(ys)-min(ys),1)]
print(json.dumps(out))`;
const tab = (t, k) => t.page.click(`#bxtabs [data-bxtab="${k}"]`);

export const tests = {
  'export many takes sets, basic lands and watermarks together from three tabs': async t => {
    await t.open(); await t.pickSet('NEO');
    await t.act('batchDlg');
    t.ok(await t.page.isVisible('#bxlist [data-bxg="sets"]') && await t.page.isHidden('#bxlist [data-bxg="lands"]'), 'the Sets tab is shown first');
    await t.page.check('#bxlist input[value="set:BLB"]');
    await tab(t, 'lands');
    t.eq(await t.eval(() => $$('#bxlist [data-bxg="lands"] input').map(x => x.value)), ['land:plains', 'land:island', 'land:swamp', 'land:mountain', 'land:forest', 'land:wastes']);
    await t.page.click('#dlgbody [data-bx="all"]');
    await tab(t, 'wm');
    t.eq(await t.eval(() => $$('#bxlist [data-bxg="wm"] input').map(x => x.value)), ['wm:azorius', 'wm:izzet', 'wm:phyrexian']);
    await t.page.fill('#bxq', 'izz'); await t.page.click('#dlgbody [data-bx="all"]');
    t.eq(await t.eval(() => $$('#bxlist input:checked').map(x => x.value).filter(v => v.startsWith('wm:'))), ['wm:izzet'], 'choose all shown only ticks the filtered items of the tab shown');
    t.eq(await t.page.textContent('#bxcount'), '9 chosen', 'the count covers all tabs');
    t.eq(await t.eval(() => $$('#bxtabs [data-bxn]').map(x => x.textContent)), ['(2)', '(6)', '(1)']);
    await t.page.click('#dlgbody [data-bx="none"]');
    t.eq(await t.page.textContent('#bxcount'), '8 chosen', 'choose none clears the tab shown only');
    await t.page.fill('#bxq', '');
    await tab(t, 'lands'); await t.page.click('#dlgbody [data-bx="none"]'); await t.page.check('#bxlist input[value="land:island"]');
    await tab(t, 'wm'); await t.page.check('#bxlist input[value="wm:azorius"]');
    const d = await t.download(() => t.page.click('#dlgbtns .primary'));
    t.eq(py(NAMES, save(d)), ['Azorius', 'BLB Bloomburrow', 'Island', 'NEO Kamigawa: Neon Dynasty']);
    t.eq(await t.eval(() => PREFS.batchTab), 'wm', 'the tab shown is remembered');
    t.eq(await t.eval(() => { const it = batchItem(batchTemplate('open'), 'land:island'); return [it.l.symbol.wm, it.l.symbol.slot === nearestSlot('#0078BF'), allLines(it.l).map(x => x.text)]; }), ['island', true, ['ISLAND']], 'a land as in the Sets panel');
    t.eq(await t.eval(() => L.set.code), 'NEO', 'the open label is unchanged');
  },
  'export many builds dividers from a divider shape while a label is open': async t => {
    await t.open(); await t.pickSet('NEO');
    await t.eval(() => commit(() => { L.text.font = LIB.fonts[1] ? LIB.fonts[1].id : L.text.font; L.base.slot = 4; }));
    const r = await t.eval(() => { const l = batchTemplate('d:catalog'); return [l.kind, l.arr.id, l.text.font === L.text.font, JSON.stringify(l.depth) === JSON.stringify(L.depth), l.base.slot, l.size.w]; });
    t.eq(r, ['divider', 'divband', true, true, 4, 71.92]);
    await t.act('batchDlg');
    t.eq(await t.eval(() => [...$('#dlg select[name=build]').options].map(o => o.value)), ['open', 'd:catalog']);
    await t.page.selectOption('#dlg select[name=build]', 'd:catalog');
    await t.page.selectOption('#dlg select[name=mode]', 'files'); await t.page.selectOption('#dlg select[name=fmt]', 'stl');
    await tab(t, 'lands'); await t.page.check('#bxlist input[value="land:forest"]');
    const d = await t.download(() => t.page.click('#dlgbtns .primary'));
    t.eq(py(STLSIZE, save(d)), { 'Forest.stl': [71.9, 72], 'NEO - Kamigawa Neon Dynasty.stl': [71.9, 72] });
    t.eq(await t.eval(() => [PREFS.batchBuild, L.kind]), ['d:catalog', 'label'], 'remembered, and the open label stays a label');
  },
  'export many builds from a saved label, and falls back to the open label when it is deleted': async t => {
    await t.open(); await t.pickSet('NEO');
    await t.eval(() => { const l = clone(L); l.size.w = 60; l.size.h = 80; SAVED.labels.push({ id: 'l_small', name: 'Small label', updated: '', label: l }); });
    await t.act('batchDlg');
    t.ok(await t.eval(() => [...$('#dlg select[name=build]').options].some(o => o.value === 'l:l_small' && o.text === 'Saved label: Small label')), 'listed');
    await t.page.selectOption('#dlg select[name=build]', 'l:l_small');
    await t.page.selectOption('#dlg select[name=mode]', 'files'); await t.page.selectOption('#dlg select[name=fmt]', 'stl');
    await t.page.check('#bxlist input[value="set:BLB"]');
    const d = await t.download(() => t.page.click('#dlgbtns .primary'));
    t.eq(py(STLSIZE, save(d)), { 'BLB - Bloomburrow.stl': [60, 80], 'NEO - Kamigawa Neon Dynasty.stl': [60, 80] });
    await t.eval(() => { SAVED.labels = SAVED.labels.filter(x => x.id !== 'l_small'); });
    await t.act('batchDlg');
    t.eq(await t.eval(() => $('#dlg select[name=build]').value), 'open');
    t.eq(await t.eval(() => $('#dlg select[name=build]').options[0].text), 'The open label');
    await t.page.keyboard.press('Escape');
  },
  'export many with nothing ticked asks for an item': async t => {
    await t.open(); await t.pickSet('NEO');
    await t.act('batchDlg'); await t.page.uncheck('#bxlist input[value="set:NEO"]');
    let msg = ''; t.page.removeAllListeners('dialog'); t.page.on('dialog', d => { msg = d.message(); d.accept(); });
    await t.page.click('#dlgbtns .primary'); await t.page.waitForTimeout(100);
    t.eq(msg, 'Choose at least one set, land or watermark.');
    t.ok(await t.eval(() => $('#dlg').open), 'the dialog stays open');
  },
};
