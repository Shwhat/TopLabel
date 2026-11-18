// ---------- menus, actions and keyboard shortcuts ----------
const MENUS = {
  file: () => [['New label', 'newLabel', 'Ctrl+N'], ['New divider', 'newDivider', 'Ctrl+Shift+N'], ['Open saved label...', 'openDlg', 'Ctrl+O'], ['Save', 'save', 'Ctrl+S'], ['Save as...', 'saveAs', 'Ctrl+Shift+S'], ['Rename label...', 'renameLabel'], ['Delete saved label...', 'deleteLabel'], '-', ['Export...', 'exportDlg', 'Ctrl+E'], ['Export Bambu Studio 3MF', 'exportBambu'], ['Export STL', 'exportStl'], ...(host.has ? ['-', ['Change password...', 'changePassword'], ['Sign out', 'signOut']] : [])],
  edit: () => [['Undo', 'undo', 'Ctrl+Z'], ['Redo', 'redo', 'Ctrl+Y'], '-', ['Add a set symbol row', 'addRowSymbol'], ['Add a text row', 'addRowText', 'Ctrl+L'], ['Add a set code row', 'addRowCode'], ['Add a mana symbols row', 'addRowMana'], '-', ['Reset label to defaults', 'resetLabel']],
  label: () => [['Size...', 'sizeDlg'], ['Layout...', 'arrangementDlg'], ['Save layout...', 'saveArrangement'], ['Make layout the default', 'setDefaultArr'], ['Manage layouts...', 'manageArrangements'], '-', ['Depth...', 'depthDlg'], ['Save depth profile...', 'saveDepth'], ['Save size preset...', 'saveSize'], ['Save divider shape...', 'saveDivider'], ['Manage presets...', 'managePresets'], '-', ['Filament colors...', 'paletteDlg'], ['Two-tone symbol on or off', 'toggleTwoTone']],
  library: () => [['Refresh library', 'refreshLibrary'], ['Library information...', 'libraryInfo'], ['Fonts...', 'fontsDlg'], '-', ['Show sets', 'showSets'], ['Show lands and watermarks', 'showWatermarks']],
  export: () => [['Export...', 'exportDlg', 'Ctrl+E'], '-', ...EXPORT_FORMATS.map(([k, n]) => [n, 'exp_' + k])],
  view: () => [['2D layout', 'view2d', '2'], ['3D preview', 'view3d', '3'], ['Both views', 'viewBoth', 'B'], ['Fit the label in the view', 'fitView', 'F'], '-', ['Layout guides on or off', 'toggleGuides', 'G'], ['Dark theme on or off', 'toggleTheme'], ['Dark work surface on or off', 'toggleSurface'], '-', [(PREFS.panels.left ? 'Hide' : 'Show') + ' the Sets panel', 'panelLeft'], [(PREFS.panels.right ? 'Hide' : 'Show') + ' the Properties panel', 'panelRight'], [(PREFS.panels.bottom ? 'Hide' : 'Show') + ' the Saved labels panel', 'panelBottom']],
  help: () => [['Keyboard shortcuts', 'shortcuts', 'F1'], ['Open demo labels', 'demo'], '-', ['About TopLabel', 'about']],
  account: () => [['About TopLabel', 'about'], '-', ['Change password...', 'changePassword'], ['Sign out', 'signOut']],
};
function openMenu(el) {
  const items = MENUS[el.dataset.menu](); const dd = $('#dropdown');
  dd.innerHTML = items.map(i => i === '-' ? '<div class="ddsep"></div>' : `<div class="dd" data-act="${i[1]}"><span>${esc(i[0])}</span><span class="k">${i[2] || ''}</span></div>`).join('');
  const r = el.getBoundingClientRect(); dd.classList.remove('hidden');
  dd.style.left = Math.min(r.left, window.innerWidth - dd.offsetWidth - 4) + 'px'; dd.style.top = r.bottom + 'px';
  $$('.menu').forEach(m => m.classList.toggle('open', m === el));
}
function closeMenus() { $('#dropdown').classList.add('hidden'); $$('.menu').forEach(m => m.classList.remove('open')); }
$$('.menu').forEach(m => {
  m.addEventListener('mousedown', e => { e.stopPropagation(); m.classList.contains('open') ? closeMenus() : openMenu(m); });
  m.addEventListener('mouseenter', () => { if (document.querySelector('.menu.open') && !m.classList.contains('open')) openMenu(m); });
});
document.addEventListener('mousedown', e => { if (!e.target.closest('#dropdown') && !e.target.closest('.menu')) closeMenus(); });

function addRow(type) {
  commit(() => { L.arr.rows.push(row(newItem(type, L))); L.arr.id = 'custom'; L.arr.name = 'Custom'; });
  PREFS.panels.right = true; applyPanels();
  flash('Added a ' + ITEM_TYPES.find(x => x[0] === type)[1].toLowerCase() + ' row');
}
function togglePanel(k) { PREFS.panels[k] = !PREFS.panels[k]; savePrefs(); applyPanels(); }
// a new divider starts with the set (or land and watermark) of the label that is open
function keepSet(l) {
  if (!L) return l;
  if (L.set) { const s = SETS_BY_CODE.get(L.set.code) || L.set; applySet(l, s); l.symbol.rarity = L.symbol.rarity; }
  else if (L.symbol.src === 'wm' && L.symbol.wm) { l.symbol.src = 'wm'; l.symbol.wm = L.symbol.wm; l.symbol.slot = L.symbol.slot; l.name = L.name; setCustomText(l, resolveLines(L)[0] || L.name); }
  return l;
}
const ACTIONS = {
  newLabel: () => { if (!confirmDiscard()) return; openLabel(newLabel(), ''); flash('New label'); },
  newDivider: () => { if (!confirmDiscard()) return; openLabel(keepSet(newDivider()), ''); flash('New divider'); },
  saveDivider: () => { if (L.kind !== 'divider') { flash('Open a divider first'); return; } saveDividerDlg(); },
  openDlg: () => openDlg(), save: () => saveLabel(false), saveAs: () => saveLabel(true), renameLabel: () => renameLabel(), deleteLabel: () => deleteLabelDlg(),
  undo, redo,
  exportDlg: () => exportDlg(), exportBambu: () => exportLabel('bambu'), exportStl: () => exportLabel('stl'),
  exp_bambu: () => exportLabel('bambu'), exp_3mf: () => exportLabel('3mf'), exp_stl: () => exportLabel('stl'), exp_stlcolors: () => exportLabel('stlcolors'),
  addLine: () => addRow('text'), addRowSymbol: () => addRow('symbol'), addRowText: () => addRow('text'), addRowCode: () => addRow('code'), addRowMana: () => addRow('mana'),
  resetLabel: () => { if (!confirm('Reset this label to the default size, arrangement, depth and text? The chosen set stays.')) return; commit(() => { const keep = L.set, wm = L.symbol.src === 'wm' ? L.symbol.wm : '', name = L.name; L = L.kind === 'divider' ? newDivider() : newLabel(); if (keep) applySet(L, keep); else if (wm) { L.symbol.src = 'wm'; L.symbol.wm = wm; L.name = name; } }); },
  sizeDlg: () => sizeDlg(), arrangementDlg: () => arrangementDlg(), saveArrangement: () => saveArrangementDlg(), setDefaultArr: () => setDefaultArr(), manageArrangements: () => manageArrangements(),
  depthDlg: () => depthDlg(), saveDepth: () => saveDepthDlg(), saveSize: () => saveSizeDlg(), managePresets: () => managePresets(),
  paletteDlg: () => paletteDlg(), toggleTwoTone: () => { commit(() => { L.symbol.style = L.symbol.style === 'twotone' ? 'detail' : 'twotone'; }); flash(L.symbol.style === 'twotone' ? 'Two-tone symbol' : 'Detailed symbol'); },
  refreshLibrary: () => refreshDlg(), libraryInfo: () => libraryInfo(), fontsDlg: () => fontsDlg(),
  showSets: () => { PREFS.setsView = 'sets'; savePrefs(); PREFS.panels.left = true; applyPanels(); renderSets(true); renderRibbon(); },
  showWatermarks: () => { PREFS.setsView = 'wm'; savePrefs(); PREFS.panels.left = true; applyPanels(); renderSets(true); renderRibbon(); },
  view2d: () => { setView('2d'); renderRibbon(); }, view3d: () => { setView('3d'); renderRibbon(); }, viewBoth: () => { setView('both'); renderRibbon(); },
  fitView: () => { fit3D(); draw2D(); flash('Fit to view'); },
  toggleGuides: () => { PREFS.guides = !PREFS.guides; savePrefs(); draw2D(); renderRibbon(); flash(PREFS.guides ? 'Layout guides on' : 'Layout guides off'); },
  toggleTheme, toggleSurface,
  togglePanels: () => { const all = PREFS.panels.left && PREFS.panels.right && PREFS.panels.bottom; PREFS.panels = { left: !all, right: !all, bottom: !all }; savePrefs(); applyPanels(); },
  panelLeft: () => togglePanel('left'), panelRight: () => togglePanel('right'), panelBottom: () => togglePanel('bottom'),
  shortcuts: () => shortcuts(), demo: () => demoDlg(), about: () => openAbout(),
  changePassword: () => changePasswordDlg(), signOut: () => { if (confirmDiscard()) host.signOut(); },
};
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (a && ACTIONS[a.dataset.act] && !a.disabled) { e.preventDefault(); closeMenus(); ACTIONS[a.dataset.act](); }
});
document.addEventListener('keydown', e => {
  if ($('#dlg').open) return;
  const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select';
  const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
  const go = (name, ev = e) => { ev.preventDefault(); closeMenus(); ACTIONS[name](); };
  if (ctrl && k === 'z' && !e.shiftKey && !typing) return go('undo');
  if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey)) && !typing) return go('redo');
  if (ctrl && k === 's') return go(e.shiftKey ? 'saveAs' : 'save');
  if (ctrl && k === 'o') return go('openDlg');
  if (ctrl && k === 'n') return go(e.shiftKey ? 'newDivider' : 'newLabel');
  if (ctrl && k === 'e') return go('exportDlg');
  if (ctrl && k === 'l') return go('addLine');
  if (e.key === 'F1') return go('shortcuts');
  if (e.key === 'Escape') { if (!$('#aboutview').classList.contains('hidden')) closeAbout(); closeMenus(); return; }
  if (typing || ctrl || e.altKey) return;
  if (k === '2') return go('view2d'); if (k === '3') return go('view3d'); if (k === 'b') return go('viewBoth');
  if (k === 'f') return go('fitView'); if (k === 'g') return go('toggleGuides');
  if (k === '/') { e.preventDefault(); PREFS.panels.left = true; applyPanels(); const s = $('#setsearch'); if (s) s.focus(); }
});
