// ---------- startup, panels and the status bar (this file is loaded last) ----------
// The three panels (Sets, Properties, Saved labels; keys left, right and bottom, after where they start) can be
// moved to any of the three docks. A dock with more than one panel shows them as tabs.
const PANELS = { left: { title: 'Sets', el: '#setspanel' }, right: { title: 'Properties', el: '#props' }, bottom: { title: 'Saved labels', el: '#labelspanel' } };
const DOCK_NAMES = { left: 'left', right: 'right', bottom: 'bottom' };
function applyPanels() {
  const P = PREFS.panels, S = PREFS.sizes, D = PREFS.dock, T = PREFS.dockTab;
  for (const dk of ['left', 'right', 'bottom']) {
    const dock = $('#dock-' + dk), mine = Object.keys(PANELS).filter(k => D[k] === dk), shown = mine.filter(k => P[k]);
    for (const k of mine) { const el = $(PANELS[k].el); if (el.parentElement !== dock) dock.insertBefore(el, dock.querySelector('.dedge')); }
    if (!shown.includes(T[dk])) T[dk] = shown[0] || mine[0] || dk;
    for (const k of mine) $(PANELS[k].el).classList.toggle('hidden', k !== T[dk] || !P[k]);
    dock.querySelector('.dtabs').innerHTML = shown.map(k => `<div class="dtab ${k === T[dk] ? 'active' : ''}" data-ptab="${k}" title="Drag to another side of the window to move this panel">${PANELS[k].title}<button class="dmove" data-pmove="${k}" title="Move this panel">&#8644;</button></div>`).join('');
    dock.classList.toggle('hidden', !shown.length);
  }
  $('#dock-left').style.width = clamp(S.left, 200, 700) + 'px'; $('#dock-right').style.width = clamp(S.right, 240, 700) + 'px'; $('#dock-bottom').style.height = clamp(S.bottom, 60, 600) + 'px';
  requestAnimationFrame(() => { size3D(); paint3D(); });
}
function showPanel(k) { PREFS.panels[k] = true; PREFS.dockTab[PREFS.dock[k]] = k; savePrefs(); applyPanels(); }
function movePanel(k, dk) { PREFS.dock[k] = dk; PREFS.panels[k] = true; PREFS.dockTab[dk] = k; savePrefs(); applyPanels(); flash(`${PANELS[k].title} panel moved to the ${DOCK_NAMES[dk]}`); }
function resetDock() { PREFS.dock = clone(PREFS_DEFAULT.dock); PREFS.dockTab = clone(PREFS_DEFAULT.dockTab); PREFS.panels = clone(PREFS_DEFAULT.panels); savePrefs(); applyPanels(); flash('Panels back in their places'); }
// click a tab to show its panel; drag it to a dock to move it there; the arrows button moves it from a menu
document.addEventListener('click', e => {
  const mv = e.target.closest('[data-pmove]');
  if (mv) {
    e.stopPropagation(); const k = mv.dataset.pmove, dd = $('#dropdown');
    dd.innerHTML = ['left', 'right', 'bottom'].filter(d => d !== PREFS.dock[k]).map(d => `<div class="dd" data-dockto="${d}" data-pk="${k}"><span>Move to the ${d}</span><span class="k"></span></div>`).join('') + `<div class="ddsep"></div><div class="dd" data-pk="${k}" data-hidepanel="1"><span>Hide this panel</span><span class="k"></span></div>`;
    const r = mv.getBoundingClientRect(); dd.classList.remove('hidden'); dd.style.left = Math.min(r.left, window.innerWidth - dd.offsetWidth - 4) + 'px'; dd.style.top = r.bottom + 'px'; return;
  }
  const to = e.target.closest('[data-dockto]'); if (to) { closeMenus(); movePanel(to.dataset.pk, to.dataset.dockto); return; }
  const hp = e.target.closest('[data-hidepanel]'); if (hp) { closeMenus(); togglePanel(hp.dataset.pk); return; }
  const t = e.target.closest('[data-ptab]'); if (t) { PREFS.dockTab[PREFS.dock[t.dataset.ptab]] = t.dataset.ptab; savePrefs(); applyPanels(); }
});
document.addEventListener('pointerdown', e => {
  const t = e.target.closest('[data-ptab]'); if (!t || e.target.closest('[data-pmove]') || e.button !== 0) return;
  const k = t.dataset.ptab, x0 = e.clientX, y0 = e.clientY; let target = null, moving = false;
  // while dragging, every dock is shown so a panel can go to an empty side
  const mv = ev => {
    if (!moving && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
    if (!moving) { moving = true; $$('.dock').forEach(d => d.classList.remove('hidden')); }
    const el = document.elementFromPoint(ev.clientX, ev.clientY), d = el && el.closest('.dock');
    target = d ? d.dataset.dock : null; $$('.dock').forEach(x => x.classList.toggle('droptarget', x === d));
  };
  const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); $$('.dock').forEach(x => x.classList.remove('droptarget')); if (moving) { if (target && target !== PREFS.dock[k]) movePanel(k, target); else applyPanels(); } };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
});
// drag the inner edge of a panel to resize it
document.addEventListener('pointerdown', e => {
  const ed = e.target.closest('.dedge'); if (!ed) return;
  e.preventDefault(); const k = ed.dataset.edge, el = ed.parentElement, x0 = e.clientX, y0 = e.clientY, w0 = el.offsetWidth, h0 = el.offsetHeight;
  const mv = ev => {
    if (k === 'left') PREFS.sizes.left = clamp(w0 + ev.clientX - x0, 200, 700);
    else if (k === 'right') PREFS.sizes.right = clamp(w0 - (ev.clientX - x0), 240, 700);
    else PREFS.sizes.bottom = clamp(h0 - (ev.clientY - y0), 60, 600);
    applyPanels();
  };
  const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); savePrefs(); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
});
$('#pane3d').addEventListener('change', e => { const k = e.target.dataset.layer; if (!k) return; e.target.checked ? LAYERS_OFF.delete(k) : LAYERS_OFF.add(k); draw2D(); draw3D(); });
$('#st-warn').addEventListener('click', () => { showPanel('right'); const w = $('#propwarn'); if (w) w.scrollIntoView({ block: 'nearest' }); });

function renderStatus() {
  if (!L) return;
  $('#st-size').textContent = `${r2(num(L.size.w))} x ${r2(num(L.size.h))} mm, ${MODEL ? r2(MODEL.height) : r2(num(L.size.t))} mm tall`;
  const st = MESHES.length ? meshStats(MESHES) : null;
  $('#st-parts').textContent = building ? 'Building...' : st ? `${MESHES.length} parts, ${st.tris.toLocaleString()} triangles` : '';
  const n = (MODEL ? MODEL.warnings.length : 0) + (BUILD_ERR ? 1 : 0);
  $('#st-warn').textContent = n ? `${n} warning${n > 1 ? 's' : ''}` : '';
  $('#st-lib').textContent = LIB.ready ? `Library ${libDate()}, ${LIB.sets.length} sets` : 'Library not downloaded';
  const t = (MODEL && MODEL.info) || {};
  $('#whname').textContent = labelTitle(L);
  $('#whsub').textContent = [L.set ? `${L.set.code}, ${L.set.date || ''}` : '', L.arr.name, t.text ? `text ${t.text.size} mm` : '', t.symbol ? `symbol ${t.symbol.w} x ${t.symbol.h} mm` : '', t.mana ? `${t.mana} mana` : ''].filter(Boolean).join('  |  ');
  renderWarnings();
}

async function start() {
  if (host.has) { const a = $('#accountmenu'); a.classList.remove('hidden'); a.textContent = host.user.name; }
  await loadSaved();
  applyTheme(); applyPanels();
  await host.library();
  const as = PREFS.autosave;
  if (as && as.label) { L = normalizeLabel(as.label); labelId = SAVED.labels.some(x => x.id === as.id) ? as.id : ''; dirty = !!as.dirty || !labelId; }
  else {
    L = newLabel();
    const first = LIB.sets.find(s => s.src === 'vectors' && MAIN_TYPES.has(s.type) && s.date <= new Date().toISOString().slice(0, 10));
    if (first) applySet(L, first);
    dirty = false;
  }
  render(); applyView(); renderSets(true);
  if (/^#about(\/|$)/.test(location.hash)) openAbout(location.hash.slice(7));
  // a new server downloads the library by itself; show it arriving
  if (!LIB.ready && host.has) pollFirstLibrary();
  window.TL_READY = true;
}
async function pollFirstLibrary() {
  for (let i = 0; i < 600 && !LIB.ready; i++) {
    let st; try { st = await host.status(); } catch (e) { return; }
    $('#st-lib').textContent = st.running ? 'Downloading the library: ' + st.step : st.error ? 'Library download failed' : 'Library not downloaded';
    if (!st.running) { await host.library(); if (LIB.ready) { renderSets(true); render(); flash('Library downloaded'); } return; }
    await new Promise(r => setTimeout(r, 1500));
  }
}
window.addEventListener('beforeunload', e => { if (dirty && labelId) { PREFS.autosave = { label: L, id: labelId, dirty }; } });
start();
