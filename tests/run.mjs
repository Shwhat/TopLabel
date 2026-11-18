// TopLabel test runner.
// Builds the server, starts it on a free port with a fresh data folder holding the fixture library
// (tests/fixtures/library), opens it in headless Chromium and runs every suite in tests/suites.
// A small fake GitHub and Scryfall server lets the library refresh run without the internet.
// Usage: npm test            (all suites)
//        npm test -- export  (only suites whose file name contains "export")
import { execFileSync, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import net from 'net';
import http from 'http';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright']) { try { return require(p); } catch (e) {} }
  console.error('Playwright is not installed. Run: npm install'); process.exit(2);
}
const { chromium } = loadPlaywright();
const freePort = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

// ---------- the fake upstream: GitHub tarball, Scryfall set list and icons ----------
const FIX = path.join(ROOT, 'tests', 'fixtures', 'library', 'current');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toplabel-test-'));
const repo = path.join(tmp, 'Investigamer-mtg-vectors-abc123');
fs.mkdirSync(path.join(repo, 'svg', 'optimized'), { recursive: true }); fs.mkdirSync(path.join(repo, 'data'), { recursive: true });
fs.cpSync(path.join(FIX, 'vectors', 'set'), path.join(repo, 'svg', 'optimized', 'set'), { recursive: true });
fs.cpSync(path.join(FIX, 'vectors', 'watermark'), path.join(repo, 'svg', 'optimized', 'watermark'), { recursive: true });
fs.cpSync(path.join(FIX, 'vectors', 'data'), path.join(repo, 'data', 'set'), { recursive: true });
const tarball = path.join(tmp, 'vectors.tar.gz');
execFileSync('tar', ['czf', tarball, '-C', tmp, path.basename(repo)]);
const upPort = await freePort(), UP = 'http://127.0.0.1:' + upPort;
const upstream = { fail: false, hits: 0 };
http.createServer((req, res) => {
  upstream.hits++;
  if (upstream.fail) { res.writeHead(503); res.end('down'); return; }
  if (/^\/repos\/.+\/tarball$/.test(req.url)) { res.writeHead(200, { 'Content-Type': 'application/gzip' }); fs.createReadStream(tarball).pipe(res); return; }
  if (req.url === '/sets') {
    const sets = JSON.parse(fs.readFileSync(path.join(FIX, 'sets.json'), 'utf8')).map(s => ({ ...s, icon_svg_uri: s.icon_svg_uri.replace('https://svgs.scryfall.io', UP) }));
    sets.push({ code: 'new', name: 'Brand New Set', released_at: '2026-12-04', set_type: 'expansion', card_count: 10, icon_svg_uri: UP + '/sets/zzt.svg?1' });
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ object: 'list', data: sets })); return;
  }
  const m = req.url.match(/^\/sets\/([a-z0-9]+)\.svg/);
  if (m && fs.existsSync(path.join(FIX, 'icons', m[1] + '.svg'))) { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); res.end(fs.readFileSync(path.join(FIX, 'icons', m[1] + '.svg'))); return; }
  res.writeHead(404); res.end();
}).listen(upPort, '127.0.0.1');

// ---------- the TopLabel server ----------
const bin = path.join(ROOT, 'build', 'toplabel-test');
execFileSync('go', ['build', '-o', bin, '.'], { cwd: ROOT, env: { ...process.env, CGO_ENABLED: '0' }, stdio: 'inherit' });
const port = await freePort();
const data = path.join(tmp, 'data');
fs.mkdirSync(path.join(data, 'library'), { recursive: true });
fs.cpSync(FIX, path.join(data, 'library', 'current'), { recursive: true });
const proc = spawn(bin, [], { env: { ...process.env, TOPLABEL_ADDR: '127.0.0.1:' + port, TOPLABEL_DATA: data, TOPLABEL_SIGNUP: 'true', TOPLABEL_AUTO_REFRESH: 'false', TOPLABEL_GITHUB_API: UP, TOPLABEL_SCRYFALL_API: UP }, stdio: ['ignore', 'ignore', 'inherit'] });
process.on('exit', () => { proc.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });
const URL = 'http://127.0.0.1:' + port;
for (let i = 0; i < 200; i++) { try { if ((await fetch(URL + '/healthz')).ok) break; } catch (e) {} await new Promise(r => setTimeout(r, 50)); }


let n = 0;
const H = { 'X-TopLabel': '1' };
// one account for the tests, signed up once (sign-ups per address are limited); each test starts from empty data
const TESTER = { name: 'tester', password: 'password123' };
{ const r = await fetch(URL + '/api/signup', { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(TESTER) }); if (!r.ok) { console.error('test account: ' + await r.text()); process.exit(1); } }
class Tester {
  constructor(page, root) { this.page = page; this.root = root; this.url = URL; this.upstream = upstream; this.data = data; this.H = H; }
  // a new account for each test, so saved labels and preferences start empty
  async signup() {
    const name = `t${Date.now() % 1000000}${n++}`;
    const r = await this.page.request.post(URL + '/api/signup', { headers: H, data: { name, password: 'password123' } });
    if (!r.ok()) throw new Error('signup failed: ' + (await r.text()));
    this.user = name; return name;
  }
  async login() {
    const r = await this.page.request.post(URL + '/api/login', { headers: H, data: TESTER });
    if (!r.ok()) throw new Error('login failed: ' + (await r.text()));
    for (const [f, v] of [['labels.json', '[]'], ['prefs.json', 'null'], ['arrangements.json', '[]'], ['presets.json', '{}']]) await this.page.request.put(URL + '/api/data/' + f, { headers: { ...H, 'Content-Type': 'application/json' }, data: v });
    this.user = TESTER.name;
  }
  async open(hash = '') {
    if (!this.user) await this.login();
    await this.page.goto(URL + '/' + hash);
    await this.page.waitForFunction(() => window.TL_READY === true);
    await this.built();
  }
  // wait until the label geometry is rebuilt after the last change
  async built() { await this.page.waitForFunction(() => !pendingBuild && building === 0 && MODEL, null, { timeout: 20000 }); }
  eval(fn, arg) { return this.page.evaluate(fn, arg); }
  eq(actual, expected, msg = '') { const a = JSON.stringify(actual), e = JSON.stringify(expected); if (a !== e) throw new Error(`${msg}\n  expected ${e}\n  got      ${a}`); }
  ok(v, msg = 'expected true') { if (!v) throw new Error(msg); }
  near(a, b, tol, msg = '') { if (!(Math.abs(a - b) <= tol)) throw new Error(`${msg}: expected ${b} +/- ${tol}, got ${a}`); }
  key(k) { return this.page.keyboard.press(k); }
  async act(name) { await this.page.evaluate(n => ACTIONS[n](), name); await this.built(); }
  // the dialog's close handler runs in a later task, so wait a moment before waiting for the rebuild
  async confirm() { await this.page.click('#dlgbtns .primary'); await this.page.waitForFunction(() => !$('#dlg').open); await this.page.waitForTimeout(60); await this.built(); }
  async enter() { await this.key('Enter'); await this.page.waitForFunction(() => !$('#dlg').open); await this.page.waitForTimeout(60); await this.built(); }
  async menu(menu, act) { await this.page.click(`.menu[data-menu="${menu}"]`); await this.page.click(`#dropdown [data-act="${act}"]`); }
  // set a field in the Properties panel the way a person does: type and leave the field
  async prop(p, value) {
    const sel = `#props [data-p="${p}"]`, type = await this.page.getAttribute(sel, 'type');
    if (type === 'checkbox') { const on = await this.page.isChecked(sel); if (on !== value) await this.page.click(sel); }
    else if ((await this.page.evaluate(s => document.querySelector(s).tagName, sel)) === 'SELECT') await this.page.selectOption(sel, String(value));
    else { await this.page.fill(sel, String(value)); await this.page.press(sel, 'Enter'); }
    await this.built();
  }
  async pickSet(code) { await this.page.click(`#setspanel tr[data-set="${code}"]`); await this.built(); }
  async download(fn) { const [d] = await Promise.all([this.page.waitForEvent('download'), fn()]); const p = await d.path(); return { name: d.suggestedFilename(), bytes: fs.readFileSync(p) }; }
}

const filter = process.argv[2] || '';
const dir = path.join(ROOT, 'tests', 'suites');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mjs') && f.includes(filter)).sort();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let pass = 0, fail = 0;
const failures = [];
for (const f of files) {
  const suite = await import(pathToFileURL(path.join(dir, f)).href);
  for (const [name, fn] of Object.entries(suite.tests)) {
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, acceptDownloads: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    const t = new Tester(page, ROOT);
    try {
      await fn(t);
      if (errors.length) throw new Error('page error: ' + errors.join(' | '));
      pass++; process.stdout.write(`  ok    ${f.replace('.mjs', '')}: ${name}\n`);
    } catch (e) {
      fail++; failures.push(`${f}: ${name}\n        ${String(e.message).split('\n').join('\n        ')}`);
      process.stdout.write(`  FAIL  ${f.replace('.mjs', '')}: ${name}\n`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) { console.log('\nFailures:\n  ' + failures.join('\n  ')); process.exit(1); }
process.exit(0);
