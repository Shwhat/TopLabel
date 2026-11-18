// Checks on the source itself, and that the app starts.
import fs from 'fs';
import path from 'path';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', '.git', 'build', 'vendor', 'fonts', 'fixtures'].includes(e.name)) walk(p, out); }
    else if (/\.(js|mjs|go|md|html|css|txt|py|json|yml|example)$/.test(e.name) || e.name === 'Dockerfile') out.push(p);
  }
  return out;
}

export const tests = {
  'no em dashes anywhere in the source, docs or interface text': async t => {
    const hits = walk(t.root).filter(f => fs.readFileSync(f, 'utf8').includes(String.fromCharCode(0x2014))).map(f => path.relative(t.root, f));
    t.eq(hits, [], 'em dashes found in');
  },
  'manifest lists every script exactly once, app.js last': async t => {
    const m = fs.readFileSync(path.join(t.root, 'ui', 'manifest.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
    const js = fs.readdirSync(path.join(t.root, 'ui', 'js')).map(f => 'js/' + f);
    t.eq(js.filter(f => !m.includes(f)), [], 'scripts missing from manifest');
    t.eq(m.filter((f, i) => m.indexOf(f) !== i), [], 'duplicate manifest entries');
    t.eq(m.filter(f => !fs.existsSync(path.join(t.root, 'ui', f))), [], 'manifest entries without a file');
    t.eq(m[m.length - 1], 'js/app.js', 'app.js must be last');
  },
  'version is the same in core.js, package.json and package-lock.json': async t => {
    const v = fs.readFileSync(path.join(t.root, 'ui', 'js', 'core.js'), 'utf8').match(/APP_VERSION = '([^']+)'/)[1];
    const pj = JSON.parse(fs.readFileSync(path.join(t.root, 'package.json'), 'utf8')), pl = JSON.parse(fs.readFileSync(path.join(t.root, 'package-lock.json'), 'utf8'));
    t.eq([pj.version, pl.version, pl.packages[''].version], [v, v, v]);
  },
  'About guide: bundle is current, numbering, links resolve, release notes last and current, overview lists every page': async t => {
    const dir = path.join(t.root, 'ui', 'about'), files = fs.readdirSync(dir).filter(f => /^\d+-.+\.md$/.test(f)).sort();
    const src = fs.readFileSync(path.join(t.root, 'ui', 'js', 'about-pages.js'), 'utf8');
    const pages = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
    t.eq(pages.map(p => p.slug), files.map(f => f.replace(/^\d+-/, '').replace(/\.md$/, '')), 'pages in order (run python3 tools/about.py)');
    files.forEach((f, i) => { t.eq(f.slice(0, 2), String(i + 1).padStart(2, '0'), 'numbering of ' + f); const body = fs.readFileSync(path.join(dir, f), 'utf8'); t.ok(pages[i].body === body, f + ' bundled (run python3 tools/about.py)'); t.ok(/^# .+/.test(body), f + ' starts with a heading'); });
    const slugs = new Set(pages.map(p => p.slug)), links = pages.flatMap(p => [...p.body.matchAll(/\(\/about\/([a-z0-9-]+)\)/g)].map(m => m[1]));
    t.eq(links.filter(l => !slugs.has(l)), [], 'links to missing pages');
    const overview = pages[0].body; t.eq(pages.slice(1).filter(p => !overview.includes(`(/about/${p.slug})`)).map(p => p.slug), [], 'pages missing from the Overview');
    t.eq(pages[pages.length - 1].slug, 'release-notes', 'release notes last');
    t.eq(pages[pages.length - 2].slug, 'technical', 'technical next to last');
    const ver = fs.readFileSync(path.join(t.root, 'ui', 'js', 'core.js'), 'utf8').match(/APP_VERSION = '([^']+)'/)[1];
    t.eq(pages[pages.length - 1].body.match(/^## (\S+) /m)[1], ver, 'newest release note');
  },
  'app starts with the ribbon, panels and a built label': async t => {
    await t.open();
    t.eq(await t.eval(() => [...document.querySelectorAll('.rtab')].map(x => x.textContent)), ['Home', 'Label', 'Insert', 'Library', 'View', 'Help']);
    t.ok(await t.eval(() => MODEL.parts.length >= 2 && MESHES.length >= 2), 'parts built');
    t.ok(await t.eval(() => LIB.ready && LIB.sets.length > 5 && LIB.fonts.length === 33), 'library and fonts');
  },
  'every menu item and ribbon button has an action and is described in the guide': async t => {
    await t.open();
    const r = await t.eval(() => {
      const all = ABOUT_PAGES.map(p => p.body).join('\n').toLowerCase();
      const missing = [], noAction = [];
      for (const [k, f] of Object.entries(MENUS)) for (const i of f()) { if (i === '-') continue; if (!ACTIONS[i[1]]) noAction.push(i[1]); const lab = i[0].replace(/\.\.\.$/, '').replace(/\s*\([^)]*\)$/, ''); if (/ the (Sets|Properties|Saved labels) panel$/.test(lab)) continue; if (!all.includes(lab.toLowerCase())) missing.push(k + ': ' + lab); }
      for (const tab of DEFAULT_RIBBON) for (const g of tab.groups) for (const a of g.items) { if (!ACTIONS[a]) noAction.push(a); const lab = RLABEL[a].replace(/\.\.\.$/, ''); if (!all.includes(lab.toLowerCase())) missing.push('ribbon: ' + lab); }
      return { missing, noAction };
    });
    t.eq(r.noAction, [], 'items without an action');
    t.eq(r.missing, [], 'items not mentioned in the About guide');
  },
};
