// ---------- startup, panels and the status bar (this file is loaded last) ----------
function applyPanels() {
  const P = PREFS.panels, S = PREFS.sizes;
  $('#dock-left').classList.toggle('hidden', !P.left); $('#dock-right').classList.toggle('hidden', !P.right); $('#dock-bottom').classList.toggle('hidden', !P.bottom);
  $('#dock-left').style.width = clamp(S.left, 200, 700) + 'px'; $('#dock-right').style.width = clamp(S.right, 240, 700) + 'px'; $('#dock-bottom').style.height = clamp(S.bottom, 60, 600) + 'px';
  requestAnimationFrame(() => { size3D(); paint3D(); });
}
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
$('#st-warn').addEventListener('click', () => { PREFS.panels.right = true; applyPanels(); const w = $('#propwarn'); if (w) w.scrollIntoView({ block: 'nearest' }); });

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
  $('#whsub').textContent = [L.set ? `${L.set.code}, ${L.set.date || ''}` : '', L.arr.name, t.text ? `text ${t.text.size} mm` : '', t.symbol ? `symbol ${t.symbol.w} x ${t.symbol.h} mm` : ''].filter(Boolean).join('  |  ');
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
