'use strict';
// ---------- core: version, helpers, preferences, the open label, undo ----------
const APP_VERSION = '0.4.0';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = o => JSON.parse(JSON.stringify(o));
const natCmp = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = v => Math.round(v * 100) / 100;

const PREFS_DEFAULT = { theme: 'light', surface: 'light', view: '3d', guides: true, panels: { left: true, right: true, bottom: true }, dock: { left: 'left', right: 'right', bottom: 'bottom' }, dockTab: { left: 'left', right: 'right', bottom: 'bottom' }, side2d: 'front', sizes: { left: 330, right: 330, bottom: 150 }, palette: null, defaultArr: 'stack', exportFmt: 'bambu', bed: 'h2d', colors3mf: true, namePattern: '{code} - {name}', setSort: { col: 'date', dir: -1 }, setFilter: { types: 'main', q: '' }, setsView: 'sets', ribbonTab: 'home', autosave: null };
let PREFS = clone(PREFS_DEFAULT);

// the open label and where it is saved
let L = null;          // label document (see newLabel in presets.js)
let labelId = '';      // id in the saved label list, '' when not saved yet
let dirty = false;
let undoStack = [], redoStack = [];

function commit(fn) {
  undoStack.push(JSON.stringify(L)); if (undoStack.length > 150) undoStack.shift();
  redoStack = [];
  fn(); dirty = true; render(); scheduleAutosave();
}
function undo() { if (!undoStack.length) { flash('Nothing to undo'); return; } redoStack.push(JSON.stringify(L)); L = JSON.parse(undoStack.pop()); dirty = true; render(); scheduleAutosave(); }
function redo() { if (!redoStack.length) { flash('Nothing to redo'); return; } undoStack.push(JSON.stringify(L)); L = JSON.parse(redoStack.pop()); dirty = true; render(); scheduleAutosave(); }

let flashTimer = 0;
function flash(msg) { const el = $('#st-msg'); if (!el) return; el.textContent = msg; clearTimeout(flashTimer); flashTimer = setTimeout(() => { el.textContent = ''; }, 2600); }

// render redraws the interface from state, then rebuilds the label geometry in the background
function render() {
  if (!L) return;
  renderRibbon(); renderProps(); renderSets(false); renderLabels(); updateTitle(); renderStatus();
  scheduleBuild();
}
function updateTitle() {
  const n = labelTitle(L);
  document.title = (dirty ? '* ' : '') + n + ' - TopLabel';
  const d = $('#docname'); if (d) d.textContent = n + (labelId ? '' : ' (not saved)') + (dirty && labelId ? ' (changed)' : '');
}
function labelTitle(l) { return (l && (l.name || (l.set && l.set.name))) || 'Untitled label'; }

function download(name, data, type = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  LAST_DOWNLOAD = { name, size: blob.size, blob };
}
let LAST_DOWNLOAD = null;
const safeFile = s => String(s).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'label';
