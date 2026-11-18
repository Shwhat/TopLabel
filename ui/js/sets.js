// ---------- Sets panel: search, sort and pick a set, or a land or watermark ----------
let setsKey = '', setsList = [], setsHi = -1;
function setIconURL(s) {
  if (s.src === 'vectors') return `/api/library/set/${encodeURIComponent(s.folder)}/${s.rarities.includes('C') ? 'C' : encodeURIComponent(s.rarities[0])}.svg`;
  if (s.src === 'scryfall') return `/api/library/icon/${encodeURIComponent(s.icon.toLowerCase())}.svg`;
  return '';
}
function filteredSets() {
  const f = PREFS.setFilter || {}, q = (f.q || '').trim().toLowerCase();
  let l = LIB.sets.filter(s => {
    if (f.types === 'main' && !MAIN_TYPES.has(s.type)) return false;
    if (f.types && f.types !== 'main' && f.types !== 'all' && s.type !== f.types) return false;
    if (f.year && (s.date || '').slice(0, 4) !== String(f.year)) return false;
    if (f.symbol && s.src === 'none') return false;
    if (q && !(s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))) return false;
    return true;
  });
  const { col, dir } = PREFS.setSort || { col: 'date', dir: -1 };
  const key = { code: s => s.code, name: s => s.name, date: s => s.date || '', type: s => typeName(s.type) }[col] || (s => s.date);
  l.sort((a, b) => dir * natCmp(key(a), key(b)) || natCmp(a.code, b.code));
  if (q) { const exact = l.findIndex(s => s.code.toLowerCase() === q); if (exact > 0) l.unshift(l.splice(exact, 1)[0]); }
  return l;
}
function renderSets(force) {
  const el = $('#setspanel'); if (!el) return;
  const view = PREFS.setsView === 'wm' ? 'wm' : 'sets';
  const key = JSON.stringify([view, PREFS.setFilter, PREFS.setSort, LIB.sets.length, LIB.ready, (LIB.meta || {}).updated]);
  if (!force && key === setsKey) { markActiveSet(); return; }
  setsKey = key;
  const head = `<div class="sbar"><div class="seg"><button data-act="showSets" class="${view === 'sets' ? 'on' : ''}">Sets</button><button data-act="showWatermarks" class="${view === 'wm' ? 'on' : ''}">Lands and watermarks</button></div></div>`;
  if (!LIB.ready) {
    el.innerHTML = head + `<div class="empty">The symbol library is not downloaded yet.<div class="btnrow"><button class="btn primary" data-act="refreshLibrary">Refresh library</button></div><div class="note">TopLabel downloads the set symbols from mtg-vectors on GitHub and the set list from Scryfall. On a new server this starts by itself.</div></div>`;
    return;
  }
  if (view === 'wm') { renderWatermarks(el, head); return; }
  const f = PREFS.setFilter || {}, types = [...new Set(LIB.sets.map(s => s.type))].sort((a, b) => natCmp(typeName(a), typeName(b)));
  const years = [...new Set(LIB.sets.map(s => (s.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  setsList = filteredSets(); setsHi = -1;
  const { col, dir } = PREFS.setSort || {};
  const th = (c, label, cls = '') => `<th class="${cls}" data-sort="${c}">${label}${col === c ? ` <span class="dir">${dir > 0 ? '&#9650;' : '&#9660;'}</span>` : ''}</th>`;
  el.innerHTML = head + `<div class="sbar"><input id="setsearch" class="search" placeholder="Search sets by name or code (/)" value="${esc(f.q || '')}" autocomplete="off" spellcheck="false"></div>
    <div class="sbar2"><select id="settypes" title="Set types"><option value="main" ${f.types === 'main' ? 'selected' : ''}>Main sets</option><option value="all" ${f.types === 'all' ? 'selected' : ''}>All set types</option>${types.map(t => `<option value="${esc(t)}" ${f.types === t ? 'selected' : ''}>${esc(typeName(t))}</option>`).join('')}</select>
    <select id="setyear" title="Release year"><option value="">Any year</option>${years.map(y => `<option ${String(f.year) === y ? 'selected' : ''}>${y}</option>`).join('')}</select>
    <label title="Hide sets that have no symbol"><input type="checkbox" id="setsym" ${f.symbol ? 'checked' : ''}> With symbol</label><span style="margin-left:auto">${setsList.length}</span></div>
    <table class="stab"><thead><tr><th class="icon"></th>${th('code', 'Code', 'code')}${th('name', 'Name')}${th('date', 'Date', 'date')}</tr></thead><tbody>${setsList.map((s, i) => {
      const u = setIconURL(s), src = s.src === 'vectors' ? '' : s.src === 'scryfall' ? ' <span class="badge" title="No mtg-vectors symbol yet; the Scryfall icon is used">Scryfall icon</span>' : ' <span class="badge warn" title="No symbol in the library">No symbol</span>';
      return `<tr class="srow" data-set="${esc(s.code)}" data-i="${i}" title="${esc(s.name)} (${esc(s.code)}), ${esc(typeName(s.type))}, ${esc(s.date)}"><td class="icon">${u ? `<img loading="lazy" src="${u}" alt="">` : ''}</td><td class="code">${esc(s.code)}</td><td>${esc(fixDashes(s.name))}${src}</td><td class="date">${esc(s.date || '')}</td></tr>`;
    }).join('')}</tbody></table>${setsList.length ? '' : '<div class="empty">No sets match. Clear the search or choose All set types.</div>'}`;
  markActiveSet();
}
function markActiveSet() {
  const code = L && L.set ? L.set.code : '';
  $$('#setspanel .srow').forEach(r => r.classList.toggle('active', r.dataset.set === code));
  const wm = L && L.symbol.src === 'wm' ? L.symbol.wm : '';
  $$('#setspanel [data-wm],#setspanel [data-land]').forEach(r => r.classList.toggle('active', (r.dataset.wm || r.dataset.land) === wm));
}
function renderWatermarks(el, head) {
  const has = n => LIB.watermarks.includes(n);
  const lands = LANDS.filter(l => has(l.id)), rest = LIB.watermarks.filter(n => !LANDS.some(l => l.id === n)).sort(natCmp);
  const card = (attr, name, file, label) => `<div class="wmcard" ${attr}="${esc(name)}" title="${esc(label)}"><img loading="lazy" src="/api/library/watermark/${encodeURIComponent(file)}.svg" alt="">${esc(label)}</div>`;
  el.innerHTML = head + `<div class="grouphead">Basic lands</div><div class="wmgrid">${lands.map(l => card('data-land', l.id, l.id, l.name)).join('')}</div>
    <div class="grouphead">Watermarks</div><div class="wmgrid">${rest.map(n => card('data-wm', n, n, n.replace(/^./, c => c.toUpperCase()))).join('')}</div>`;
  markActiveSet();
}
function pickSet(code) {
  const s = SETS_BY_CODE.get(code); if (!s) return;
  commit(() => applySet(L, s));
  flash(`${fixDashes(s.name)} (${s.code})`);
}
const setsPanel = $('#setspanel');
setsPanel.addEventListener('click', e => {
  const r = e.target.closest('[data-set]'); if (r) { pickSet(r.dataset.set); return; }
  const land = e.target.closest('[data-land]'); if (land) { const l = LANDS.find(x => x.id === land.dataset.land); commit(() => applyLand(L, l)); flash(l.name); return; }
  const wm = e.target.closest('[data-wm]'); if (wm) { commit(() => applyWatermark(L, wm.dataset.wm)); flash(L.name); return; }
  const th = e.target.closest('[data-sort]'); if (th) { const c = th.dataset.sort, s = PREFS.setSort || {}; PREFS.setSort = { col: c, dir: s.col === c ? -s.dir : (c === 'date' ? -1 : 1) }; savePrefs(); renderSets(true); }
});
let setSearchTimer = 0;
setsPanel.addEventListener('input', e => {
  if (e.target.id !== 'setsearch') return;
  clearTimeout(setSearchTimer);
  setSearchTimer = setTimeout(() => { PREFS.setFilter = Object.assign({}, PREFS.setFilter, { q: e.target.value }); savePrefs(); const pos = e.target.selectionStart; renderSets(true); const s = $('#setsearch'); s.focus(); s.setSelectionRange(pos, pos); }, 120);
});
setsPanel.addEventListener('change', e => {
  const f = PREFS.setFilter = Object.assign({}, PREFS.setFilter);
  if (e.target.id === 'settypes') f.types = e.target.value;
  else if (e.target.id === 'setyear') f.year = e.target.value;
  else if (e.target.id === 'setsym') f.symbol = e.target.checked;
  else return;
  savePrefs(); renderSets(true);
});
setsPanel.addEventListener('keydown', e => {
  if (e.target.id !== 'setsearch') return;
  const rows = $$('#setspanel .srow'); if (!rows.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); setsHi = clamp(setsHi + (e.key === 'ArrowDown' ? 1 : -1), 0, rows.length - 1);
    rows.forEach((r, i) => r.classList.toggle('active', i === setsHi)); rows[setsHi].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') { e.preventDefault(); pickSet(rows[Math.max(0, setsHi)].dataset.set); }
});
