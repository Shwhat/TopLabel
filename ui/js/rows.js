// ---------- Layout rows in the Properties panel ----------
// Rows run from top to bottom; each holds items side by side: set symbol, text, set code or mana symbols.
const itemLabel = it => it.t === 'symbol' ? 'Set symbol' : it.t === 'mana' ? 'Mana symbols' : (it.lines.length === 1 && it.lines[0].src === 'code' ? 'Set code' : 'Text');
const addOpts = lbl => `<option value="">${lbl}</option>` + ITEM_TYPES.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
function manaOpts(sel) { return (LIB.mana || []).map(m => `<option value="${esc(m.code)}" ${m.code === sel ? 'selected' : ''}>${esc(m.symbol)} ${esc(m.name)}</option>`).join(''); }
function presetOpts() {
  return '<option value="">Preset...</option>' + MANA_PRESETS.map(([g, list]) => `<optgroup label="${g}">${list.map(([c, n]) => `<option value="${c}">${n}${c.length > 1 && c !== 'WUBRG' ? ' (' + c.split('').join(' ') + ')' : ''}</option>`).join('')}</optgroup>`).join('');
}
function slotSelect(attrs, val) { return `<select ${attrs}>${slotOpts().map(([v, n]) => `<option value="${v}" ${+v === +val ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><span class="sw" style="background:${slotColor(val)}"></span>`; }
function itemBody(it) {
  if (it.t === 'symbol') return '<div class="note">Rarity, style and color are in the Symbol group.</div>';
  if (it.t === 'text') return it.lines.map((ln, li) => `<div class="lnrow"><select data-li="${li}" data-lf="src">${LINE_SOURCES.map(([k, n]) => `<option value="${k}" ${k === ln.src ? 'selected' : ''}>${n}</option>`).join('')}</select><input data-li="${li}" data-lf="text" value="${esc(ln.src === 'custom' ? ln.text : resolveLines({ ...L, text: { ...L.text, upper: false } }, [ln])[0] || '')}" ${ln.src === 'custom' ? 'placeholder="Type the text"' : 'disabled'}><button class="xbtn" data-lidel="${li}" title="Remove this line">&times;</button></div>`).join('')
    + `<div class="irow"><button class="lnk" data-liadd="1">Add line</button><span class="sp"></span><span>Color</span>${slotSelect('data-if="slot"', it.slot)}</div>`;
  const list = it.syms.length ? it.syms.map((m, mi) => `<div class="mrow"><select data-mi="${mi}" data-mf="c">${manaOpts(m.c)}${manaInfo(m.c) ? '' : `<option value="${esc(m.c)}" selected>{${esc(m.c)}} not in the library</option>`}</select><select data-mi="${mi}" data-mf="style"><option value="pip" ${m.style !== 'icon' ? 'selected' : ''}>Pip</option><option value="icon" ${m.style === 'icon' ? 'selected' : ''}>Icon</option></select>${slotSelect(`data-mi="${mi}" data-mf="slot"`, m.slot)}<button class="xbtn" data-midel="${mi}" title="Remove this mana symbol">&times;</button></div>`).join('')
    : `<div class="note">${(LIB.mana || []).length ? 'No mana symbols yet. Add one or choose a preset.' : 'The library has no mana symbols yet. Refresh the library to download them.'}</div>`;
  return list + `<div class="irow"><select data-madd="1"><option value="">Add...</option>${manaOpts('')}</select><select data-mpreset="1">${presetOpts()}</select><label>Size <input type="number" step="0.1" data-if="size" value="${esc(it.size)}"> mm</label></div>`;
}
function rowsHTML() {
  const rows = L.arr.rows || [];
  return `<div id="rows">${rows.map((r, ri) => `<div class="lrow2" data-ri="${ri}">
    <div class="rhead"><b>Row ${ri + 1}</b><label>Height <input data-rf="h" type="number" step="1" min="0" max="100" placeholder="Auto" value="${esc(r.h)}"> %</label><span class="sp"></span>
      <button class="xbtn" data-rowup="1" title="Move this row up" ${ri ? '' : 'disabled'}>&uarr;</button><button class="xbtn" data-rowdown="1" title="Move this row down" ${ri < rows.length - 1 ? '' : 'disabled'}>&darr;</button><button class="xbtn" data-rowdel="1" title="Remove this row">&times;</button></div>
    ${r.items.map((it, ii) => `<div class="litem" data-ii="${ii}"><div class="ihead"><span>${itemLabel(it)}</span><span class="sp"></span>
      <button class="xbtn" data-ileft="1" title="Move left" ${ii ? '' : 'disabled'}>&larr;</button><button class="xbtn" data-iright="1" title="Move right" ${ii < r.items.length - 1 ? '' : 'disabled'}>&rarr;</button><button class="xbtn" data-idel="1" title="Remove this item">&times;</button></div>
      ${itemBody(it)}</div>`).join('')}
    <select class="addsel" data-additem="1">${addOpts('Add to this row...')}</select></div>`).join('')}
    <select class="addsel" data-addrow="1">${addOpts('Add a row...')}</select></div>`;
}
// any change to the rows makes the layout custom
function rowsCommit(fn) { commit(() => { fn(); L.arr.id = 'custom'; L.arr.name = 'Custom'; }); }
const where = el => { const r = el.closest('[data-ri]'), i = el.closest('[data-ii]'); return { ri: r ? +r.dataset.ri : -1, ii: i ? +i.dataset.ii : -1 }; };
function rowsChange(t) {
  if (!t.closest('#rows')) return false;
  const { ri, ii } = where(t), r = L.arr.rows[ri], it = r && ii >= 0 ? r.items[ii] : null, v = t.value;
  if (t.dataset.addrow !== undefined) { if (v) rowsCommit(() => L.arr.rows.push(row(newItem(v, L)))); return true; }
  if (t.dataset.additem !== undefined) { if (v) rowsCommit(() => r.items.push(newItem(v, L))); return true; }
  if (t.dataset.rf === 'h') { const n = parseFloat(v); rowsCommit(() => { r.h = Number.isFinite(n) && n > 0 ? clamp(n, 1, 100) : ''; }); return true; }
  if (!it) return true;
  if (t.dataset.lf) {
    const ln = it.lines[+t.dataset.li];
    rowsCommit(() => { if (t.dataset.lf === 'src') { if (v === 'custom' && ln.src !== 'custom') ln.text = resolveLines({ ...L, text: { ...L.text, upper: false } }, [ln])[0] || ''; ln.src = v; } else ln.text = v; });
  } else if (t.dataset.if === 'slot') rowsCommit(() => { it.slot = parseInt(v, 10) || 1; });
  else if (t.dataset.if === 'size') { const n = parseFloat(v); if (!(n > 0)) { flash('Enter a number above 0'); renderProps(); return true; } rowsCommit(() => { it.size = Math.round(n * 1e4) / 1e4; }); }
  else if (t.dataset.mf) { const m = it.syms[+t.dataset.mi]; rowsCommit(() => { if (t.dataset.mf === 'slot') m.slot = parseInt(v, 10) || 1; else if (t.dataset.mf === 'c') { m.c = v; m.slot = manaDefaultSlot(v); } else m.style = v; }); }
  else if (t.dataset.madd !== undefined) { if (v) rowsCommit(() => it.syms.push(newMana(v))); }
  else if (t.dataset.mpreset !== undefined) { if (v) rowsCommit(() => { it.syms = v.split('').map(newMana); }); }
  return true;
}
function rowsClick(t) {
  const b = t.closest('#rows button'); if (!b || b.disabled) return false;
  const { ri, ii } = where(b), rows = L.arr.rows, r = rows[ri];
  const swap = (a, i, j) => { [a[i], a[j]] = [a[j], a[i]]; };
  if (b.dataset.rowup) rowsCommit(() => swap(rows, ri, ri - 1));
  else if (b.dataset.rowdown) rowsCommit(() => swap(rows, ri, ri + 1));
  else if (b.dataset.rowdel) rowsCommit(() => rows.splice(ri, 1));
  else if (b.dataset.ileft) rowsCommit(() => swap(r.items, ii, ii - 1));
  else if (b.dataset.iright) rowsCommit(() => swap(r.items, ii, ii + 1));
  else if (b.dataset.idel) rowsCommit(() => { r.items.splice(ii, 1); if (!r.items.length) rows.splice(ri, 1); });
  else if (b.dataset.liadd) rowsCommit(() => r.items[ii].lines.push({ src: 'custom', text: '' }));
  else if (b.dataset.lidel) rowsCommit(() => { const it = r.items[ii]; it.lines.splice(+b.dataset.lidel, 1); if (!it.lines.length) { r.items.splice(ii, 1); if (!r.items.length) rows.splice(ri, 1); } });
  else if (b.dataset.midel) rowsCommit(() => r.items[ii].syms.splice(+b.dataset.midel, 1));
  else return false;
  return true;
}
