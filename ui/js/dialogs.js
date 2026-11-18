// ---------- dialogs ----------
// fields: [key, label, value, type, options]; types: text, number, password, check, select. onOk gets trimmed values;
// returning false reopens the dialog with what was typed.
function dialog(title, fields, onOk, okLabel = 'OK', extraHTML = '') {
  const dlg = $('#dlg'); dlg.style.width = ''; dlg.style.maxWidth = ''; dlg.onkeydown = null; $('#dlgbody').onclick = null; $('#dlgbody').onchange = null; $('#dlgbody').oninput = null;
  $('#dlgtitle').textContent = title;
  let s = '';
  for (const [k, label, v, type, opt] of fields) {
    if (type === 'check') s += `<div class="prow"><label for="f_${k}">${label}</label><input id="f_${k}" type="checkbox" name="${k}" ${v ? 'checked' : ''}></div>`;
    else if (type === 'select') s += `<div class="prow"><label for="f_${k}">${label}</label><select id="f_${k}" name="${k}">${opt.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select></div>`;
    else s += `<div class="prow"><label for="f_${k}">${label}</label><input id="f_${k}" name="${k}" value="${esc(v)}" ${type === 'number' ? 'type="number" step="any"' : type === 'password' ? 'type="password" autocomplete="off"' : ''}></div>`;
  }
  $('#dlgbody').innerHTML = s + extraHTML;
  $('#dlgbtns').innerHTML = onOk ? `<button type="button" class="btn" onclick="document.getElementById('dlg').close('cancel')">Cancel</button><button class="btn primary" value="ok">${okLabel}</button>` : `<button class="btn primary" value="cancel">${okLabel === 'OK' ? 'Close' : okLabel}</button>`;
  dlg.onclose = () => {
    if (dlg.returnValue !== 'ok' || !onOk) return;
    const v = {}; for (const [k, , , type] of fields) { const el = $('#dlgform').elements[k]; v[k] = type === 'check' ? el.checked : el.value.trim(); }
    if (onOk(v) === false) setTimeout(() => dialog(title, fields.map(f => [f[0], f[1], v[f[0]], f[3], f[4]]), onOk, okLabel, extraHTML), 0);
  };
  dlg.onkeydown = e => { if (e.key === 'Enter' && onOk && (e.target.tagName === 'SELECT' || e.target.type === 'checkbox')) { e.preventDefault(); dlg.close('ok'); } };
  dlg.returnValue = ''; dlg.showModal();
  dlgFocus();
}
function dlgFocus() {
  const dlg = $('#dlg'); let touched = false;
  const mark = () => { touched = true; };
  dlg.addEventListener('keydown', mark, { once: true }); dlg.addEventListener('pointerdown', mark, { once: true });
  const go = () => {
    if (!dlg.open || (touched && dlg.contains(document.activeElement))) return;
    const first = $('#dlgbody input:not([type=checkbox]):not([type=hidden]):not([type=color]):not([disabled]), #dlgbody textarea, #dlgbody select');
    if (!first) { const b = $('#dlgbtns .primary'); if (b) b.focus(); return; }
    if (document.activeElement !== first) first.focus();
    if (!touched && first.select && first.tagName !== 'SELECT') first.select();
  };
  go(); setTimeout(go, 0); requestAnimationFrame(() => setTimeout(go, 0));
}
document.addEventListener('mouseup', () => { if ($('#dlg') && $('#dlg').open && !$('#dlg').contains(document.activeElement)) dlgFocus(); }, true);
const slotOpts = () => palette().map((s, i) => [String(i + 1), `${i + 1} ${s.name}`]);
const posNum = (v, min = 0) => { const n = parseFloat(v); return Number.isFinite(n) && n >= min ? n : null; };

function confirmDiscard() { return !dirty || confirm('This label has changes that are not saved. Continue without saving?'); }

function shortcuts() {
  const k = [['Ctrl+N', 'New label'], ['Ctrl+O', 'Open a saved label'], ['Ctrl+S', 'Save the label'], ['Ctrl+Shift+S', 'Save the label under a new name'], ['Ctrl+E', 'Export...'], ['Ctrl+Z / Ctrl+Y', 'Undo, redo'], ['Ctrl+L', 'Add a text line'], ['2, 3, B', '2D layout, 3D preview, both views'], ['F', 'Fit the label in the view'], ['G', 'Layout guides on or off'], ['/', 'Search the set list'], ['Up, Down', 'In the set list: move through the sets'], ['Enter', 'In the set list: use the highlighted set; in a dialog: confirm'], ['Esc', 'Close a menu, a dialog or the About screen'], ['F1', 'This list'], ['Drag (3D)', 'Turn the view'], ['Right drag or Shift drag (3D)', 'Move the view'], ['Wheel (3D)', 'Zoom']];
  dialog('Keyboard shortcuts', [], null, 'OK', `<div class="kbd">${k.map(([a, b]) => `<b>${a}</b><span>${b}</span>`).join('')}</div>`);
}

// ---------- size, arrangement, depth ----------
function sizeOpts() { return SIZE_PRESETS.concat((SAVED.presets.sizes || [])).map(p => [p.id, `${p.name} (${p.w} x ${p.h} x ${p.t} mm)`]).concat([['custom', 'Custom']]); }
function applySize(p) { L.size.preset = p.id; L.size.w = p.w; L.size.h = p.h; L.size.t = p.t; }
function sizeDlg() {
  const s = L.size;
  dialog('Label size', [['preset', 'Size preset', sizeById(s.preset) ? s.preset : 'custom', 'select', sizeOpts()], ['w', 'Width (mm)', s.w, 'number'], ['h', 'Height (mm)', s.h, 'number'], ['t', 'Base thickness (mm)', s.t, 'number'], ['r', 'Corner radius (mm)', s.r, 'number'], ['scale', 'Scale the whole label (%)', 100, 'number']], v => {
    const p = sizeById(v.preset), sc = posNum(v.scale, 1);
    let w = posNum(v.w, 5), h = posNum(v.h, 5), t = posNum(v.t, 0.2), r = posNum(v.r, 0);
    if (p && p.id !== s.preset) { w = p.w; h = p.h; t = p.t; }
    if (w === null || h === null || t === null || r === null || sc === null) { alert('Width and height must be at least 5 mm, the base at least 0.2 mm, and the scale above 1%.'); return false; }
    commit(() => {
      const k = sc / 100;
      L.size.w = r2(w * k); L.size.h = r2(h * k); L.size.t = r2(t); L.size.r = r2(r * k);
      if (k !== 1) { L.text.size = r2(L.text.size * k); L.arr.margin = r2(L.arr.margin * k); L.arr.gap = r2(L.arr.gap * k); }
      const match = SIZE_PRESETS.concat(SAVED.presets.sizes || []).find(q => q.w === L.size.w && q.h === L.size.h && q.t === L.size.t);
      L.size.preset = match ? match.id : 'custom';
    });
    flash(`Label size ${L.size.w} x ${L.size.h} mm`);
  }, 'OK', '<div class="note">Choosing a preset fills in its size. Scale changes the width, height, corner radius, margins and text size together; the base thickness stays.</div>');
}
function arrOpts() { return ARRANGEMENTS.concat(SAVED.arrangements || []).map(a => [a.id, a.name + (SAVED.arrangements.includes(a) ? ' (saved)' : '')]); }
function applyArrangement(a) { L.arr = { id: a.id, name: a.name, kind: a.kind, margin: a.margin, gap: a.gap, band: a.band, symPct: a.symPct }; if (a.text) { Object.assign(L.text, clone(a.text)); } }
function arrangementDlg() {
  const a = L.arr;
  dialog('Arrangement', [['id', 'Arrangement', arrangementById(a.id) ? a.id : 'stack', 'select', arrOpts()], ['kind', 'Layout', a.kind, 'select', ARR_KINDS], ['margin', 'Margin (mm)', a.margin, 'number'], ['gap', 'Gap between symbol and text (mm)', a.gap, 'number'], ['band', 'Text area (% of the label)', a.band, 'number'], ['symPct', 'Symbol size (% of its area)', a.symPct, 'number']], v => {
    const pick = arrangementById(v.id);
    commit(() => {
      if (pick && pick.id !== a.id) { applyArrangement(pick); return; }
      Object.assign(L.arr, { kind: v.kind, margin: num(v.margin, 7), gap: num(v.gap, 4), band: clamp(num(v.band, 27), 5, 95), symPct: clamp(num(v.symPct, 90), 5, 100) });
    });
    flash('Arrangement: ' + L.arr.name);
  }, 'OK', '<div class="note">Choosing another arrangement replaces the values below with its own. The text area is the share of the label height (or width, for symbol beside text) kept for the text.</div>');
}
function saveArrangementDlg() {
  dialog('Save arrangement', [['name', 'Name', SAVED.arrangements.find(a => a.id === L.arr.id) ? L.arr.name : '', 'text'], ['font', 'Also keep the text settings (lines, font, size)', true, 'check']], v => {
    if (!v.name) { alert('Enter a name.'); return false; }
    const ex = SAVED.arrangements.find(a => a.name.toLowerCase() === v.name.toLowerCase());
    if (ex && !confirm(`Replace the saved arrangement "${ex.name}"?`)) return false;
    const a = { id: ex ? ex.id : 'a_' + uid(), name: v.name, kind: L.arr.kind, margin: L.arr.margin, gap: L.arr.gap, band: L.arr.band, symPct: L.arr.symPct };
    if (v.font) a.text = { lines: clone(L.text.lines), font: L.text.font, bold: L.text.bold, italic: L.text.italic, upper: L.text.upper, size: L.text.size, min: L.text.min, spacing: L.text.spacing, align: L.text.align };
    SAVED.arrangements = SAVED.arrangements.filter(x => x !== ex).concat([a]);
    host.write('arrangements.json', SAVED.arrangements).then(() => flash('Arrangement saved')).catch(e => flash(e.message));
    commit(() => { L.arr.id = a.id; L.arr.name = a.name; });
  }, 'Save', '<div class="note">Saved arrangements are shared with everyone on this server and work with any set. They keep the layout and margins, and optionally the text lines and font, but not the set or the symbol.</div>');
}
function setDefaultArr() {
  if (!arrangementById(L.arr.id)) { flash('Save the arrangement first'); saveArrangementDlg(); return; }
  PREFS.defaultArr = L.arr.id; savePrefs(); flash(`New labels use "${L.arr.name}"`);
}
function manageArrangements() {
  const rows = () => SAVED.arrangements.length ? `<table class="dtab"><tr><th>Name</th><th>Layout</th><th></th></tr>${SAVED.arrangements.map(a => `<tr><td>${esc(a.name)}${PREFS.defaultArr === a.id ? ' <span class="badge">default</span>' : ''}</td><td>${esc((ARR_KINDS.find(k => k[0] === a.kind) || [0, ''])[1])}</td><td><button type="button" class="lnk" data-del="${a.id}">Delete</button></td></tr>`).join('')}</table>` : '<div class="note">No saved arrangements yet. Use Label, Save arrangement.</div>';
  dialog('Saved arrangements', [], null, 'OK', `<div id="marr">${rows()}</div>`);
  $('#dlgbody').onclick = e => {
    const d = e.target.closest('[data-del]'); if (!d) return;
    const a = SAVED.arrangements.find(x => x.id === d.dataset.del); if (!a || !confirm(`Delete the saved arrangement "${a.name}"?`)) return;
    SAVED.arrangements = SAVED.arrangements.filter(x => x !== a); if (PREFS.defaultArr === a.id) { PREFS.defaultArr = 'stack'; savePrefs(); }
    host.write('arrangements.json', SAVED.arrangements).catch(er => flash(er.message)); $('#marr').innerHTML = rows(); renderProps();
  };
}
function depthOpts() { return DEPTH_PROFILES.concat(SAVED.presets.depths || []).map(d => [d.id, d.name]).concat([['custom', 'Custom']]); }
function applyDepth(d) { L.depth = { id: d.id, symbol: clone(d.symbol), text: clone(d.text) }; L.size.t = d.t; }
function depthDlg() {
  const d = L.depth;
  dialog('Depth', [['id', 'Depth profile', depthById(d.id) ? d.id : 'custom', 'select', depthOpts()], ['t', 'Base thickness (mm)', L.size.t, 'number'], ['sr', 'Symbol height above the base (mm)', d.symbol.raise, 'number'], ['ss', 'Symbol sunk into the base (mm)', d.symbol.sink, 'number'], ['se', 'Engrave the symbol (cut only)', d.symbol.engrave, 'check'], ['tr', 'Text height above the base (mm)', d.text.raise, 'number'], ['ts', 'Text sunk into the base (mm)', d.text.sink, 'number'], ['te', 'Engrave the text (cut only)', d.text.engrave, 'check']], v => {
    const p = depthById(v.id);
    commit(() => {
      if (p && p.id !== d.id) { applyDepth(p); return; }
      L.size.t = Math.max(0.2, num(v.t, 2));
      L.depth.symbol = { raise: Math.max(0, num(v.sr)), sink: Math.max(0, num(v.ss)), engrave: v.se };
      L.depth.text = { raise: Math.max(0, num(v.tr)), sink: Math.max(0, num(v.ts)), engrave: v.te };
      const m = DEPTH_PROFILES.concat(SAVED.presets.depths || []).find(q => q.t === L.size.t && JSON.stringify(q.symbol) === JSON.stringify(L.depth.symbol) && JSON.stringify(q.text) === JSON.stringify(L.depth.text));
      L.depth.id = m ? m.id : 'custom';
    });
    flash('Depth: ' + ((depthById(L.depth.id) || {}).name || 'custom'));
  }, 'OK', '<div class="note">Height above the base is how far a part stands up from the top of the base. Sunk into the base cuts a pocket that the part fills, so it prints in its own color flush with or below the surface. Engraved parts cut the pocket and leave it empty.</div>');
}
function savePreset(kind, item) {
  const list = SAVED.presets[kind] = (SAVED.presets[kind] || []);
  const ex = list.find(x => x.name.toLowerCase() === item.name.toLowerCase());
  if (ex && !confirm(`Replace the saved preset "${ex.name}"?`)) return null;
  if (ex) item.id = ex.id; SAVED.presets[kind] = list.filter(x => x !== ex).concat([item]);
  host.write('presets.json', SAVED.presets).then(() => flash('Preset saved')).catch(e => flash(e.message));
  return item;
}
function saveDepthDlg() {
  dialog('Save depth profile', [['name', 'Name', '', 'text']], v => {
    if (!v.name) { alert('Enter a name.'); return false; }
    const it = savePreset('depths', { id: 'd_' + uid(), name: v.name, t: L.size.t, symbol: clone(L.depth.symbol), text: clone(L.depth.text) }); if (!it) return false;
    commit(() => { L.depth.id = it.id; });
  }, 'Save', '<div class="note">Saves the base thickness and the symbol and text depths. Saved profiles are shared with everyone on this server.</div>');
}
function saveSizeDlg() {
  dialog('Save size preset', [['name', 'Name', '', 'text']], v => {
    if (!v.name) { alert('Enter a name.'); return false; }
    const it = savePreset('sizes', { id: 's_' + uid(), name: v.name, w: L.size.w, h: L.size.h, t: L.size.t }); if (!it) return false;
    commit(() => { L.size.preset = it.id; });
  }, 'Save', `<div class="note">Saves ${L.size.w} x ${L.size.h} x ${L.size.t} mm as a size preset, shared with everyone on this server.</div>`);
}
function managePresets() {
  const rows = () => {
    const sec = (kind, title, desc) => { const l = SAVED.presets[kind] || []; return `<div class="pgrp"><h4>${title}</h4>${l.length ? `<table class="dtab">${l.map(p => `<tr><td>${esc(p.name)}</td><td class="note">${desc(p)}</td><td><button type="button" class="lnk" data-del="${kind}:${p.id}">Delete</button></td></tr>`).join('')}</table>` : '<div class="note">None saved.</div>'}</div>`; };
    return sec('sizes', 'Sizes', p => `${p.w} x ${p.h} x ${p.t} mm`) + sec('depths', 'Depth profiles', p => `base ${p.t}, symbol +${p.symbol.raise}/-${p.symbol.sink}, text +${p.text.raise}/-${p.text.sink} mm`) + sec('palettes', 'Filament color sets', p => p.slots.map(s => s.name).join(', '));
  };
  dialog('Saved presets', [], null, 'OK', `<div id="mpre">${rows()}</div>`);
  $('#dlgbody').onclick = e => {
    const d = e.target.closest('[data-del]'); if (!d) return;
    const [kind, id] = d.dataset.del.split(':'); const p = (SAVED.presets[kind] || []).find(x => x.id === id);
    if (!p || !confirm(`Delete the saved preset "${p.name}"?`)) return;
    SAVED.presets[kind] = SAVED.presets[kind].filter(x => x !== p); host.write('presets.json', SAVED.presets).catch(er => flash(er.message)); $('#mpre').innerHTML = rows(); renderProps();
  };
}

// ---------- filament colors ----------
function paletteDlg() {
  let slots = clone(palette());
  const rows = () => `<table class="dtab"><tr><th>Slot</th><th>Color</th><th>Name</th><th></th></tr>${slots.map((s, i) => `<tr><td>${i + 1}</td><td><input type="color" data-c="${i}" value="${esc(s.color)}"></td><td><input type="text" data-n="${i}" value="${esc(s.name)}"></td><td>${slots.length > 1 ? `<button type="button" class="xbtn" data-rm="${i}" title="Remove this slot">&times;</button>` : ''}</td></tr>`).join('')}</table>
    <div class="btnrow"><button type="button" class="btn small" data-add="1" ${slots.length >= 16 ? 'disabled' : ''}>Add slot</button><button type="button" class="btn small" data-reset="1">Default colors</button>
    ${(SAVED.presets.palettes || []).length ? `<select id="palpick"><option value="">Load a saved set...</option>${SAVED.presets.palettes.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>` : ''}
    <input id="palname" class="search" style="width:150px" placeholder="Name to save as"><button type="button" class="btn small" data-savep="1">Save set</button></div>`;
  dialog('Filament colors', [], () => { PREFS.palette = slots; savePrefs(); render(); flash('Filament colors updated'); }, 'OK', `<div class="note" style="margin-bottom:8px">Slots match the filament slots in your slicer: a part on slot 2 prints with the second filament. The colors are used in the previews and in the 3MF exports.</div><div id="palrows">${rows()}</div>`);
  $('#dlg').style.width = '520px';
  const body = $('#dlgbody');
  const redraw = () => { $('#palrows').innerHTML = rows(); };
  body.oninput = e => { if (e.target.dataset.c !== undefined) slots[+e.target.dataset.c].color = e.target.value.toUpperCase(); if (e.target.dataset.n !== undefined) slots[+e.target.dataset.n].name = e.target.value; };
  body.onchange = e => { if (e.target.id === 'palpick' && e.target.value) { const p = SAVED.presets.palettes.find(x => x.id === e.target.value); if (p) { slots = clone(p.slots); redraw(); } } };
  body.onclick = e => {
    const t = e.target;
    if (t.dataset.add) { slots.push({ name: 'Slot ' + (slots.length + 1), color: '#888888' }); redraw(); }
    else if (t.dataset.rm !== undefined) { slots.splice(+t.dataset.rm, 1); redraw(); }
    else if (t.dataset.reset) { slots = clone(DEFAULT_PALETTE); redraw(); }
    else if (t.dataset.savep) { const n = $('#palname').value.trim(); if (!n) { flash('Enter a name for the color set'); return; } if (savePreset('palettes', { id: 'p_' + uid(), name: n, slots: clone(slots) })) redraw(); }
  };
}

// ---------- library ----------
function libDate() { return LIB.meta && LIB.meta.updated && !String(LIB.meta.updated).startsWith('0001') ? new Date(LIB.meta.updated).toLocaleString() : ''; }
let refreshPoll = 0;
async function refreshDlg() {
  dialog('Refresh library', [], null, 'Close', `<div id="rfstep">Starting...</div><div class="progress"><i id="rfbar"></i></div><div class="note" id="rfnote">TopLabel downloads the newest symbols from mtg-vectors on GitHub and the set list from Scryfall. The current library stays in use until the download is complete. You can close this window; the refresh continues.</div>`);
  try { await host.refresh(); } catch (e) { if (e.status !== 409) { $('#rfstep').textContent = e.message; return; } }
  clearInterval(refreshPoll);
  const poll = async () => {
    let st; try { st = await host.status(); } catch (e) { return; }
    const step = $('#rfstep'), bar = $('#rfbar');
    if (step) step.textContent = st.step + (st.total ? ` (${st.done} of ${st.total})` : st.done ? ` (${st.done} files)` : '');
    if (bar) bar.style.width = (st.running ? (st.total ? 30 + 60 * st.done / st.total : 25) : 100) + '%';
    if (!st.running) {
      clearInterval(refreshPoll);
      if (st.error) { if (step) step.innerHTML = `<b style="color:var(--err)">The refresh failed.</b> ${esc(st.error)}. The current library is still in use.`; flash('Library refresh failed'); return; }
      await host.library(); FILE_CACHE.clear(); renderSets(true); renderStatus(); scheduleBuild();
      if (step) step.textContent = `Done. ${LIB.sets.length} sets, ${(LIB.meta || {}).symbols || 0} symbols.`;
      flash('Library refreshed');
    }
  };
  refreshPoll = setInterval(poll, 700); poll();
}
function libraryInfo() {
  const m = LIB.meta || {}, by = k => LIB.sets.filter(s => s.src === k).length;
  const html = LIB.ready ? `<table class="dtab">
    <tr><td>Downloaded</td><td>${esc(libDate())}</td></tr><tr><td>Symbol source</td><td>github.com/${esc(m.repo || '')}</td></tr>
    <tr><td>Sets on Scryfall</td><td>${LIB.sets.length}</td></tr><tr><td>Sets with an mtg-vectors symbol</td><td>${by('vectors')}</td></tr>
    <tr><td>Sets with a Scryfall icon</td><td>${by('scryfall')}</td></tr><tr><td>Sets without a symbol</td><td>${by('none')}</td></tr>
    <tr><td>Symbol files</td><td>${m.symbols || 0} in ${m.folders || 0} folders</td></tr><tr><td>Watermarks</td><td>${LIB.watermarks.length}</td></tr><tr><td>Fonts</td><td>${LIB.fonts.length} families</td></tr></table>`
    : '<div class="note">The library has not been downloaded yet. Use Refresh library.</div>';
  dialog('Library information', [], null, 'OK', html);
}
function fontsDlg() {
  const groups = [...new Set(LIB.fonts.map(f => f.cat))];
  dialog('Fonts', [], null, 'OK', `<div class="note" style="margin-bottom:6px">These fonts are built into TopLabel and are free to use (SIL Open Font License). Pick a font for the label text in the Properties panel.</div>${groups.map(g => `<div class="pgrp"><h4>${esc(g)}</h4>${LIB.fonts.filter(f => f.cat === g).map(f => `<div class="fontrow"><span class="fn">${esc(f.name)}</span><span class="fc">${Object.keys(f.files).map(k => ({ 400: 'Regular', 700: 'Bold', '400i': 'Italic', '700i': 'Bold italic' }[k])).join(', ')}</span><span class="note">${esc(f.license)}</span></div>`).join('')}</div>`).join('')}`);
  $('#dlg').style.width = '600px';
}

// ---------- export ----------
function exportDlg() {
  dialog('Export', [['fmt', 'Format', PREFS.exportFmt, 'select', EXPORT_FORMATS], ['bed', 'Printer bed (3MF placement)', PREFS.bed, 'select', BEDS.map(b => [b.id, b.name])], ['colors', 'Include filament colors in the Bambu 3MF', PREFS.colors3mf !== false, 'check'], ['pattern', 'File name', PREFS.namePattern, 'text']], v => {
    PREFS.exportFmt = v.fmt; PREFS.bed = v.bed; PREFS.colors3mf = v.colors; PREFS.namePattern = v.pattern || '{code} - {name}'; savePrefs();
    exportLabel(v.fmt);
  }, 'Export', `<div class="note">The file name can use {code}, {name} and {rarity}. The Bambu 3MF opens in Bambu Studio and OrcaSlicer with each part on its filament slot. With filament colors included, the slicer also takes the colors from TopLabel; turn this off to keep the filament colors set in the slicer.</div>`);
  $('#dlg').style.width = '560px';
}

// ---------- saved labels ----------
async function writeLabels() { try { await host.write('labels.json', SAVED.labels); } catch (e) { flash(e.message); throw e; } }
function saveLabel(as) {
  const cur = SAVED.labels.find(x => x.id === labelId);
  if (cur && !as) {
    cur.label = clone(L); cur.updated = new Date().toISOString();
    writeLabels().then(() => { dirty = false; updateTitle(); renderLabels(); flash('Saved'); scheduleAutosave(); }); return;
  }
  dialog(as ? 'Save label as' : 'Save label', [['name', 'Name', cur ? cur.name + ' copy' : labelTitle(L), 'text']], v => {
    if (!v.name) { alert('Enter a name.'); return false; }
    const it = { id: 'l_' + uid(), name: v.name, updated: new Date().toISOString(), label: clone(L) };
    SAVED.labels.push(it); labelId = it.id;
    writeLabels().then(() => { dirty = false; updateTitle(); renderLabels(); flash('Saved as ' + v.name); scheduleAutosave(); });
  }, 'Save', '<div class="note">Labels are saved on the server under your account.</div>');
}
function openLabel(lab, id) { L = normalizeLabel(clone(lab)); labelId = id; dirty = false; undoStack = []; redoStack = []; V3.fitted = ''; render(); scheduleAutosave(); }
function normalizeLabel(l) {
  const d = newLabel();
  for (const k of ['size', 'arr', 'depth', 'base', 'symbol', 'text']) l[k] = Object.assign({}, d[k], l[k] || {});
  l.depth.symbol = Object.assign({}, d.depth.symbol, l.depth.symbol); l.depth.text = Object.assign({}, d.depth.text, l.depth.text);
  if (!Array.isArray(l.text.lines)) l.text.lines = d.text.lines;
  return l;
}
function openDlg() {
  if (!SAVED.labels.length) { flash('No saved labels yet'); return; }
  dialog('Open saved label', [['id', 'Label', SAVED.labels[SAVED.labels.length - 1].id, 'select', SAVED.labels.slice().sort((a, b) => natCmp(a.name, b.name)).map(x => [x.id, x.name])]], v => {
    const it = SAVED.labels.find(x => x.id === v.id); if (!it || !confirmDiscard()) return;
    openLabel(it.label, it.id); flash('Opened ' + it.name);
  }, 'Open');
}
function renameLabel() {
  const it = SAVED.labels.find(x => x.id === labelId); if (!it) { flash('Save the label first'); return; }
  dialog('Rename label', [['name', 'Name', it.name, 'text']], v => { if (!v.name) return false; it.name = v.name; writeLabels().then(() => { renderLabels(); updateTitle(); flash('Renamed'); }); });
}
function deleteLabelDlg(id = labelId) {
  const it = SAVED.labels.find(x => x.id === id); if (!it) { flash('This label is not saved'); return; }
  if (!confirm(`Delete the saved label "${it.name}"? This cannot be undone.`)) return;
  SAVED.labels = SAVED.labels.filter(x => x !== it); if (labelId === id) { labelId = ''; dirty = true; }
  writeLabels().then(() => { renderLabels(); updateTitle(); flash('Deleted ' + it.name); });
}

// ---------- account ----------
function changePasswordDlg() {
  dialog('Change password', [['old', 'Current password', '', 'password'], ['nw', 'New password', '', 'password'], ['nw2', 'Repeat new password', '', 'password']], v => {
    if (v.nw.length < 8) { alert('Passwords need at least 8 characters.'); return false; }
    if (v.nw !== v.nw2) { alert('The new passwords do not match.'); return false; }
    host.changePassword(v.old, v.nw).then(() => flash('Password changed. Other sign-ins were ended.')).catch(e => alert(e.message));
  }, 'Change');
}
