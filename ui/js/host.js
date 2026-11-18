// ---------- host: everything that talks to the TopLabel server ----------
// On the server, window.TL_SERVER holds the signed-in user. Without a server (the page opened from disk)
// saved data goes to the browser's local storage, and the library is read from the same addresses if reachable.
const SERVER = window.TL_SERVER || null;
let SAVED = { labels: [], arrangements: [], presets: { sizes: [], depths: [], palettes: [], dividers: [] } };
let LIB = { ready: false, meta: {}, sets: [], watermarks: [], mana: [], fonts: [] };

async function api(method, url, body) {
  const o = { method, headers: { 'X-TopLabel': '1' } };
  if (body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = typeof body === 'string' ? body : JSON.stringify(body); }
  const r = await fetch(url, o);
  if (r.status === 401 && SERVER) { location.href = '/login'; throw new Error('You are signed out.'); }
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
  if (!r.ok) { const e = new Error((j && j.error) || 'Server error ' + r.status); e.status = r.status; throw e; }
  return j;
}

const host = {
  has: !!SERVER,
  user: SERVER ? SERVER.user : null,
  async read(name) {
    if (!this.has) { try { return JSON.parse(localStorage.getItem('toplabel:' + name) || 'null'); } catch (e) { return null; } }
    return api('GET', '/api/data/' + name);
  },
  async write(name, value) {
    if (!this.has) { try { localStorage.setItem('toplabel:' + name, JSON.stringify(value)); } catch (e) { flash('Could not save in this browser'); } return; }
    await api('PUT', '/api/data/' + name, value);
  },
  async library() {
    try { const j = await api('GET', '/api/library'); if (j) LIB = j; } catch (e) { LIB = { ready: false, meta: {}, sets: [], watermarks: [], fonts: LIB.fonts || [] }; }
    LIB.sets = LIB.sets || []; LIB.watermarks = LIB.watermarks || []; LIB.mana = LIB.mana || []; LIB.fonts = LIB.fonts || [];
    SETS_BY_CODE = new Map(LIB.sets.map(s => [s.code, s]));
  },
  refresh() { return api('POST', '/api/library/refresh'); },
  status() { return api('GET', '/api/library/status'); },
  async signOut() { if (this.has) { try { await api('POST', '/api/logout'); } catch (e) {} location.href = '/login'; } },
  changePassword(old, nw) { return api('POST', '/api/password', { old, new: nw }); },
};
let SETS_BY_CODE = new Map();

async function loadSaved() {
  const [labels, arrangements, presets, prefs] = await Promise.all(['labels.json', 'arrangements.json', 'presets.json', 'prefs.json'].map(n => host.read(n).catch(() => null)));
  SAVED.labels = Array.isArray(labels) ? labels : [];
  SAVED.arrangements = Array.isArray(arrangements) ? arrangements : [];
  SAVED.presets = Object.assign({ sizes: [], depths: [], palettes: [], dividers: [] }, presets || {});
  if (prefs && typeof prefs === 'object') PREFS = Object.assign(clone(PREFS_DEFAULT), prefs, { panels: Object.assign({}, PREFS_DEFAULT.panels, prefs.panels), sizes: Object.assign({}, PREFS_DEFAULT.sizes, prefs.sizes) });
}
let prefsTimer = 0;
function savePrefs() { clearTimeout(prefsTimer); prefsTimer = setTimeout(() => host.write('prefs.json', PREFS).catch(e => flash(e.message)), 400); }
let autosaveTimer = 0;
function scheduleAutosave() { clearTimeout(autosaveTimer); autosaveTimer = setTimeout(() => { PREFS.autosave = { label: L, id: labelId, dirty }; savePrefs(); }, 1500); }

// ---------- symbol and font files, fetched once and kept ----------
const FILE_CACHE = new Map();
function fetchText(url) {
  if (!FILE_CACHE.has(url)) FILE_CACHE.set(url, fetch(url).then(r => { if (!r.ok) throw new Error('missing ' + url); return r.text(); }).catch(e => { FILE_CACHE.delete(url); throw e; }));
  return FILE_CACHE.get(url);
}
const FONT_CACHE = new Map();
function fontInfo(id) { return (LIB.fonts || []).find(f => f.id === id) || (LIB.fonts || []).find(f => f.id === DEFAULT_FONT) || (LIB.fonts || [])[0]; }
// the font file for a family and style; key is 400, 700, 400i or 700i. Missing styles fall back to the nearest one.
function fontKey(info, bold, italic) {
  const want = (bold ? '700' : '400') + (italic ? 'i' : '');
  const order = [want, (bold ? '700' : '400'), (italic ? '400i' : '400'), '400', '700'];
  return order.find(k => info.files[k]) || Object.keys(info.files)[0];
}
function loadFont(id, key) {
  const info = fontInfo(id); if (!info) return Promise.reject(new Error('No fonts are available'));
  const k = info.id + '/' + key;
  if (!FONT_CACHE.has(k)) FONT_CACHE.set(k, fetch(`/fonts/${info.id}/${info.files[key]}`).then(r => { if (!r.ok) throw new Error('Font missing'); return r.arrayBuffer(); }).then(b => opentype.parse(b)).catch(e => { FONT_CACHE.delete(k); throw e; }));
  return FONT_CACHE.get(k);
}
function symbolURL(l) {
  const s = l.symbol;
  if (s.src === 'wm') return s.wm ? `/api/library/watermark/${encodeURIComponent(s.wm)}.svg` : '';
  const st = l.set; if (!st) return '';
  if (st.src === 'vectors') return `/api/library/set/${encodeURIComponent(st.folder)}/${encodeURIComponent(s.rarity || 'C')}.svg`;
  if (st.src === 'scryfall') return `/api/library/icon/${encodeURIComponent(String(st.icon).toLowerCase())}.svg`;
  return '';
}
