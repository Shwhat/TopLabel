// ---------- Saved labels panel ----------
function renderLabels() {
  const el = $('#labelspanel'); if (!el) return;
  if (!SAVED.labels.length) { el.innerHTML = '<div class="empty">No saved labels yet. Use Save (Ctrl+S) to keep the current label.</div>'; return; }
  const list = SAVED.labels.slice().sort((a, b) => natCmp(a.name, b.name));
  el.innerHTML = `<table class="ltab"><thead><tr><th>Name</th><th>Set</th><th>Size (mm)</th><th>Arrangement</th><th>Saved</th><th></th></tr></thead><tbody>${list.map(x => {
    const l = x.label || {}, s = l.size || {};
    return `<tr class="lrow ${x.id === labelId ? 'active' : ''}" data-label="${x.id}" title="Open this label"><td>${esc(x.name)}${l.kind === 'divider' ? ' <span class="badge">divider</span>' : ''}</td><td class="num">${esc(l.set ? l.set.code : (l.symbol && l.symbol.wm) || '')}</td><td class="num">${esc(`${s.w} x ${s.h} x ${s.t}`)}</td><td>${esc((l.arr && l.arr.name) || '')}</td><td class="num">${esc(new Date(x.updated).toLocaleString())}</td><td><button class="lnk" data-dellabel="${x.id}">Delete</button></td></tr>`;
  }).join('')}</tbody></table>`;
}
$('#labelspanel').addEventListener('click', e => {
  const d = e.target.closest('[data-dellabel]'); if (d) { e.stopPropagation(); deleteLabelDlg(d.dataset.dellabel); return; }
  const r = e.target.closest('[data-label]'); if (!r || r.dataset.label === labelId) return;
  const it = SAVED.labels.find(x => x.id === r.dataset.label); if (!it || !confirmDiscard()) return;
  openLabel(it.label, it.id); flash('Opened ' + it.name);
});
