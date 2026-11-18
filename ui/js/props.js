// ---------- Properties panel ----------
const getP = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
const setP = (o, p, v) => { const ks = p.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
// arrow keys and spinner buttons: 0.1 per step for millimetres, 1 for percentages, 0.05 for line spacing
const stepFor = path => /^arr\.(band|symPct)$/.test(path) ? 1 : path === 'text.spacing' ? 0.05 : 0.1;
function pIn(label, path, type = 'num', extra = '') {
  const v = getP(L, path);
  if (type === 'bool') return `<div class="prow"><label>${label}</label><input type="checkbox" data-p="${path}" data-t="bool" ${v ? 'checked' : ''} ${extra}></div>`;
  return `<div class="prow"><label>${label}</label><input ${type === 'num' ? `type="number" step="${stepFor(path)}"` : ''} data-p="${path}" data-t="${type}" value="${esc(v)}" ${extra}></div>`;
}
function pSel(label, path, opts, type = 'str', after = '') {
  const v = String(getP(L, path));
  return `<div class="prow"><label>${label}</label><div class="pair"><select data-p="${path}" data-t="${type}">${opts.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(ov) === v ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>${after}</div></div>`;
}
const slotSel = (label, path) => pSel(label, path, slotOpts(), 'int', `<span class="sw" style="background:${slotColor(getP(L, path))}"></span>`);
function fontOpts() {
  const cats = [...new Set(LIB.fonts.map(f => f.cat))];
  return cats.map(c => `<optgroup label="${esc(c)}">${LIB.fonts.filter(f => f.cat === c).map(f => `<option value="${f.id}" ${f.id === L.text.font ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</optgroup>`).join('');
}
function renderProps() {
  const el = $('#props'); if (!el || !L) return;
  const ae = document.activeElement, focus = ae && el.contains(ae) ? { p: ae.dataset.p, ln: ae.dataset.ln, lf: ae.dataset.lf, s: ae.selectionStart, e: ae.selectionEnd } : null;
  const st = L.set, sy = L.symbol, tx = L.text, isDiv = L.kind === 'divider', dp = L.depth;
  const subtitle = st ? `${st.code}, ${st.date || ''}, ${typeName(st.type)}` : sy.src === 'wm' && sy.wm ? `Watermark: ${sy.wm}` : 'Pick a set in the Sets panel';
  const sizeV = sizeById(L.size.preset) ? L.size.preset : 'custom';
  const arrList = arrOpts(); if (!arrangementById(L.arr.id)) arrList.push([L.arr.id, L.arr.name || 'Custom']);
  const rarities = st && st.src === 'vectors' && sy.src === 'set' ? st.rarities : [];
  const symSrc = sy.src === 'wm' ? `Watermark: ${sy.wm || 'none'}` : !st ? 'No set chosen' : st.src === 'vectors' ? `mtg-vectors, folder ${st.folder}` : st.src === 'scryfall' ? 'Scryfall icon (no mtg-vectors symbol yet)' : 'No symbol for this set';
  el.innerHTML = `<div class="ident">${esc(labelTitle(L))}</div><div class="sub">${esc(subtitle)}</div><div id="propwarn"></div>
  ${isDiv ? dividerProps() : `<div class="pgrp"><h4>Label</h4>${pIn('Name', 'name', 'str', `placeholder="${esc(st ? fixDashes(st.name) : 'Label name')}"`)}
    ${pSel('Size', 'size.preset', sizeOpts())}${pIn('Width (mm)', 'size.w')}${pIn('Height (mm)', 'size.h')}${pIn('Base (mm)', 'size.t')}${pIn('Corners (mm)', 'size.r')}
    <div class="btnrow"><button class="btn small" data-act="sizeDlg">Scale...</button><button class="btn small" data-act="saveSize">Save size...</button></div></div>`}
  <div class="pgrp"><h4>Arrangement <button class="lnk" data-act="saveArrangement">Save...</button></h4>${pSel('Arrangement', 'arr.id', arrList)}${pSel('Layout', 'arr.kind', ARR_KINDS)}
    ${pIn('Margin (mm)', 'arr.margin')}${pIn('Gap (mm)', 'arr.gap')}${pIn('Text area (%)', 'arr.band')}${pIn('Symbol size (%)', 'arr.symPct')}
    <div class="btnrow"><button class="btn small" data-act="setDefaultArr">Make default</button><button class="btn small" data-act="manageArrangements">Manage...</button></div></div>
  <div class="pgrp"><h4>Symbol</h4>${pIn('Show symbol', 'symbol.show', 'bool')}<div class="prow"><label>Source</label><span class="note" style="margin:0">${esc(symSrc)}</span></div>
    ${rarities.length ? pSel('Rarity', 'symbol.rarity', rarities.map(r => [r, rarityName(r)])) : ''}
    ${pSel('Style', 'symbol.style', SYMBOL_STYLES)}
    ${slotSel(sy.style === 'twotone' ? 'Outline color' : 'Color', 'symbol.slot')}${sy.style === 'twotone' ? slotSel('Fill color', 'symbol.slot2') : ''}</div>
  <div class="pgrp"><h4>Text <button class="lnk" data-act="addLine">Add line</button></h4>${pIn('Show text', 'text.show', 'bool')}
    <div id="lines">${tx.lines.map((ln, i) => `<div class="lnrow"><select data-ln="${i}" data-lf="src">${LINE_SOURCES.map(([k, n]) => `<option value="${k}" ${k === ln.src ? 'selected' : ''}>${n}</option>`).join('')}</select><input data-ln="${i}" data-lf="text" value="${esc(ln.src === 'custom' ? ln.text : resolveLines({ ...L, text: { ...tx, upper: false, lines: [ln] } })[0] || '')}" ${ln.src === 'custom' ? 'placeholder="Type the text"' : 'disabled'}><button class="xbtn" data-rmline="${i}" title="Remove this line">&times;</button></div>`).join('')}</div>
    <div class="prow"><label>Font</label><select data-p="text.font" data-t="str">${fontOpts()}</select></div>
    ${pIn('Bold', 'text.bold', 'bool')}${pIn('Italic', 'text.italic', 'bool')}${pIn('All capitals', 'text.upper', 'bool')}
    ${pIn('Size (mm)', 'text.size')}${pIn('Minimum (mm)', 'text.min')}${pIn('Line spacing', 'text.spacing')}
    ${pSel('Alignment', 'text.align', [['center', 'Center'], ['left', 'Left'], ['right', 'Right']])}${slotSel('Color', 'text.slot')}</div>
  <div class="pgrp"><h4>${isDiv ? 'Depth (front)' : 'Depth'} <button class="lnk" data-act="saveDepth">Save...</button></h4>${pSel('Profile', 'depth.id', depthOpts())}
    ${pIn('Same depth for symbol and text', 'depth.sync', 'bool')}
    ${dp.sync ? `${pIn('Above (mm)', 'depth.symbol.raise')}${pIn('Sunk (mm)', 'depth.symbol.sink')}${pIn('Engrave', 'depth.symbol.engrave', 'bool')}`
      : `${pIn('Symbol above (mm)', 'depth.symbol.raise')}${pIn('Symbol sunk (mm)', 'depth.symbol.sink')}${pIn('Engrave symbol', 'depth.symbol.engrave', 'bool')}
    ${pIn('Text above (mm)', 'depth.text.raise')}${pIn('Text sunk (mm)', 'depth.text.sink')}${pIn('Engrave text', 'depth.text.engrave', 'bool')}`}</div>
  ${isDiv ? `<div class="pgrp"><h4>Back face</h4>${pSel('Back', 'div.back.mode', [['off', 'Off (front only)'], ['flush', 'Flush inlay'], ['engrave', 'Engraved']])}
    ${L.div.back.mode !== 'off' ? pIn('Sunk (mm)', 'div.back.sink') : ''}<div class="note">The back carries the same symbol and text, mirrored so they read from behind. It lies on the print bed, so it can be flush or engraved but not raised.</div></div>` : ''}
  <div class="pgrp"><h4>Colors <button class="lnk" data-act="paletteDlg">Filament colors...</button></h4>${slotSel('Base', 'base.slot')}
    <div class="note">Numbers are filament slots in the slicer.</div></div>`;
  renderWarnings();
  if (focus) {
    const q = focus.p ? `[data-p="${focus.p}"]` : focus.ln !== undefined ? `[data-ln="${focus.ln}"][data-lf="${focus.lf}"]` : '';
    const f = q && el.querySelector(q); if (f) { f.focus(); try { if (focus.s != null) f.setSelectionRange(focus.s, focus.e); } catch (e) {} }
  }
}
function dividerShapeOpts() { return DIVIDER_SHAPES.concat(SAVED.presets.dividers || []).map(d => [d.id, d.name + ((SAVED.presets.dividers || []).includes(d) ? ' (saved)' : '')]).concat([['custom', 'Custom']]); }
function dividerProps() {
  const st = L.set, pt = L.div.pattern || {}, solid = !pt.kind || pt.kind === 'solid', info = (MODEL && MODEL.info && MODEL.info.pattern) || null;
  return `<div class="pgrp"><h4>Divider <button class="lnk" data-act="saveDivider">Save shape...</button></h4>${pIn('Name', 'name', 'str', `placeholder="${esc(st ? fixDashes(st.name) : 'Divider name')}"`)}
    ${pSel('Shape', 'div.shape', dividerShapeOpts())}${pIn('Width (mm)', 'size.w')}${pIn('Height (mm)', 'size.h')}${pIn('Thickness (mm)', 'size.t')}${pIn('Corners (mm)', 'size.r')}
    ${pIn('Top band (mm)', 'div.band')}${pIn('Tab height (mm)', 'div.tabH')}${pIn('Tab inset (mm)', 'div.tabInset')}</div>
  <div class="pgrp"><h4>Pattern</h4>${pSel('Pattern', 'div.pattern.kind', PATTERN_OPTS)}
    ${solid ? '' : `${pIn('Hole width (mm)', 'div.pattern.w')}${pIn('Hole height (mm)', 'div.pattern.h')}${pIn('Columns every (mm)', 'div.pattern.cx')}${pIn('Rows every (mm)', 'div.pattern.cy')}${pIn('Stagger rows', 'div.pattern.stagger', 'bool')}${pIn('Border (mm)', 'div.pattern.border')}
    <div class="note">${info ? `${info.holes} holes. ` : ''}Holes cut off by the border are kept when at least a quarter remains.</div>`}</div>`;
}
function renderWarnings() {
  const w = $('#propwarn'); if (!w) return;
  const list = (MODEL ? MODEL.warnings : []).concat(BUILD_ERR ? [BUILD_ERR] : []);
  w.innerHTML = list.map(m => `<div class="warnbox">${esc(m)}</div>`).join('');
}
function matchDepth() {
  const m = DEPTH_PROFILES.concat(SAVED.presets.depths || []).find(q => (L.kind === 'divider' || q.t === L.size.t) && JSON.stringify(q.symbol) === JSON.stringify(L.depth.symbol) && JSON.stringify(q.text) === JSON.stringify(L.depth.text));
  L.depth.id = m ? m.id : 'custom';
}
function matchSize() { if (L.kind === 'divider') return; const m = SIZE_PRESETS.concat(SAVED.presets.sizes || []).find(q => q.w === L.size.w && q.h === L.size.h && q.t === L.size.t); L.size.preset = m ? m.id : 'custom'; }
const propsEl = $('#props');
propsEl.addEventListener('change', e => {
  const t = e.target, p = t.dataset.p;
  if (p) {
    let v = t.dataset.t === 'bool' ? t.checked : t.value;
    if (t.dataset.t === 'num') { v = Math.round(parseFloat(v) * 1e4) / 1e4; if (!Number.isFinite(v) || v < 0) { flash('Enter a number of 0 or more'); renderProps(); return; } }
    if (t.dataset.t === 'int') v = parseInt(v, 10) || 1;
    commit(() => {
      if (p === 'size.preset') { const s = sizeById(v); if (s) applySize(s); else L.size.preset = 'custom'; matchDepth(); return; }
      if (p === 'arr.id') { const a = arrangementById(v); if (a) applyArrangement(a); return; }
      if (p === 'depth.id') { const d = depthById(v); if (d) applyDepth(d); else L.depth.id = 'custom'; matchSize(); return; }
      if (p === 'div.shape') { const d = dividerShapeById(v); if (d) applyDividerShape(L, d); else L.div.shape = 'custom'; return; }
      if (p === 'div.pattern.kind') { const def = PATTERNS[v] || {}; L.div.pattern = Object.assign({ kind: v, border: L.div.pattern.border || 2 }, def.w ? { w: def.w, h: def.h, cx: def.cx, cy: def.cy, stagger: def.stagger } : {}); L.div.shape = 'custom'; return; }
      if (p === 'depth.sync') { L.depth.sync = v; if (v) L.depth.text = clone(L.depth.symbol); matchDepth(); return; }
      if (p === 'size.w' || p === 'size.h') v = Math.max(5, v);
      if (p === 'size.t') v = Math.max(0.2, v);
      if (p === 'text.size' || p === 'text.min') v = Math.max(0.5, v);
      if (p === 'text.spacing') v = clamp(v, 0.7, 3);
      if (p === 'arr.band') v = clamp(v, 5, 95);
      if (p === 'arr.symPct') v = clamp(v, 5, 100);
      setP(L, p, v);
      if (L.depth.sync && /^depth\.(symbol|text)\./.test(p)) { const k = p.split('.')[2]; L.depth.symbol[k] = v; L.depth.text[k] = v; }
      if (L.kind === 'divider' && (p.startsWith('div.') || p.startsWith('size.')) && !p.startsWith('div.back')) { L.div.shape = 'custom'; L.size.preset = 'custom'; }
      if (p.startsWith('size.') && p !== 'size.r') { matchSize(); matchDepth(); }
      if (p.startsWith('depth.')) matchDepth();
      if (p === 'symbol.style' && v === 'twotone' && L.symbol.slot2 === L.symbol.slot) L.symbol.slot2 = nearestSlot(RARITY_COLORS[L.symbol.rarity] || '#c12e1f', L.symbol.slot);
    });
    return;
  }
  if (t.dataset.ln !== undefined) {
    const i = +t.dataset.ln, f = t.dataset.lf;
    commit(() => { const ln = L.text.lines[i]; if (f === 'src') { if (t.value === 'custom' && ln.src !== 'custom') ln.text = resolveLines({ ...L, text: { ...L.text, upper: false, lines: [ln] } })[0] || ''; ln.src = t.value; } else ln.text = t.value; });
  }
});
propsEl.addEventListener('click', e => {
  const r = e.target.closest('[data-rmline]'); if (r) commit(() => { L.text.lines.splice(+r.dataset.rmline, 1); });
});
propsEl.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); });
