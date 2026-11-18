// ---------- ribbon: icons, tabs and groups ----------
const S_ = 'fill="none" stroke="#2b3442" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"';
const RI = {
  newLabel: `<rect x="4" y="2.5" width="12" height="15" rx="1" fill="#dbe6f7" ${S_}/><path d="M13 13.5h4M15 11.5v4" stroke="#2f7d32" stroke-width="1.8"/>`,
  newDivider: `<rect x="3" y="2.5" width="13" height="4" rx="0.6" fill="#dbe6f7" ${S_}/><path d="M3 6.5h13v6H14.5v4h-10v-4H3z" fill="#fff" ${S_}/><path d="M6.5 9l1.2 .8v1.4L6.5 12l-1.2-.8V9.8zM10 9l1.2 .8v1.4L10 12l-1.2-.8V9.8z" fill="#556"/><path d="M14 14.5h5M16.5 12v5" stroke="#2f7d32" stroke-width="1.8"/>`,
  open: `<path d="M2.5 6V15.5h13l2-7H5l-2 7" fill="#f4d58d" stroke="#8a6d1d" stroke-width="1.3" stroke-linejoin="round"/><path d="M2.5 6V4h5l1.5 1.5H15V8" fill="none" stroke="#8a6d1d" stroke-width="1.3"/>`,
  save: `<rect x="3" y="3" width="14" height="14" rx="1.5" fill="#dbe6f7" ${S_}/><rect x="6" y="3" width="8" height="5" fill="#fff" ${S_}/><rect x="6" y="11" width="8" height="6" fill="#fff" ${S_}/>`,
  saveAs: `<rect x="3" y="3" width="12" height="12" rx="1.5" fill="#dbe6f7" ${S_}/><rect x="5.5" y="3" width="7" height="4" fill="#fff" ${S_}/><path d="M12 17l5-5-1.5-1.5-5 5V17z" fill="#f4d58d" stroke="#8a6d1d" stroke-width="1.1"/>`,
  undo: `<path d="M7 5L3.5 8.5 7 12" ${S_}/><path d="M4 8.5h8a4.5 4.5 0 010 9H9" ${S_}/>`,
  redo: `<path d="M13 5l3.5 3.5L13 12" ${S_}/><path d="M16 8.5H8a4.5 4.5 0 000 9h3" ${S_}/>`,
  export3mf: `<path d="M4 2.5h8l4 4v11H4z" fill="#e4f2e6" ${S_}/><text x="10" y="14.5" font-size="5.6" font-family="Arial" font-weight="bold" text-anchor="middle" fill="#1e7a3c">3MF</text>`,
  exportStl: `<path d="M4 2.5h8l4 4v11H4z" fill="#e4f2e6" ${S_}/><text x="10" y="14.5" font-size="5.6" font-family="Arial" font-weight="bold" text-anchor="middle" fill="#1e7a3c">STL</text>`,
  exportDlg: `<path d="M3 13v4h14v-4" ${S_}/><path d="M10 3v10M6.5 9.5L10 13l3.5-3.5" fill="none" stroke="#1e7a3c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  size: `<rect x="5" y="3" width="10" height="14" rx="1" fill="#dbe6f7" ${S_}/><path d="M2.5 3v14M1.5 3h2M1.5 17h2M5 19h10" stroke="#556" stroke-width="1"/>`,
  arrangement: `<rect x="4" y="2.5" width="12" height="15" rx="1" fill="#fff" ${S_}/><rect x="6.5" y="4.5" width="7" height="6.5" fill="#dbe6f7" stroke="#1f5fbf" stroke-width="1"/><path d="M6.5 13.5h7M7.5 15.5h5" stroke="#556" stroke-width="1.2"/>`,
  saveArr: `<rect x="3" y="2.5" width="11" height="14" rx="1" fill="#fff" ${S_}/><rect x="5.5" y="4.5" width="6" height="5.5" fill="#dbe6f7" stroke="#1f5fbf" stroke-width="1"/><path d="M5.5 12.5h6" stroke="#556" stroke-width="1.2"/><path d="M13 18l5-5-1.5-1.5-5 5V18z" fill="#f4d58d" stroke="#8a6d1d" stroke-width="1.1"/>`,
  defaultArr: `<rect x="4" y="2.5" width="12" height="15" rx="1" fill="#fff" ${S_}/><path d="M10 5.5l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z" fill="#f4d58d" stroke="#8a6d1d" stroke-width="1"/>`,
  depth: `<path d="M3 12l7-3.5 7 3.5-7 3.5z" fill="#dbe6f7" ${S_}/><path d="M3 12v2.5l7 3.5 7-3.5V12" ${S_}/><path d="M8 7.5l2-1 2 1v2.5l-2 1-2-1z" fill="#fff" stroke="#1f5fbf" stroke-width="1.1"/>`,
  saveDepth: `<path d="M2.5 11l6-3 6 3-6 3z" fill="#dbe6f7" ${S_}/><path d="M2.5 11v2.5l6 3 6-3V11" ${S_}/><path d="M13 18l5-5-1.5-1.5-5 5V18z" fill="#f4d58d" stroke="#8a6d1d" stroke-width="1.1"/>`,
  palette: `<path d="M10 2.5a7.5 7.5 0 100 15c1.2 0 1.6-1 1-2s-.2-2.2 1.2-2.2H15a2.5 2.5 0 002.5-2.5c0-4.6-3.4-8.3-7.5-8.3z" fill="#fff" ${S_}/><circle cx="6" cy="9" r="1.4" fill="#c12e1f"/><circle cx="8.5" cy="5.5" r="1.4" fill="#f4d58d"/><circle cx="12.5" cy="5.5" r="1.4" fill="#0078bf"/><circle cx="14.5" cy="9" r="1.4" fill="#057748"/>`,
  twoTone: `<path d="M10 2.5l7 7-7 8-7-8z" fill="#2b3442"/><path d="M10 6l3.8 3.8L10 14l-3.8-4.2z" fill="#e3cd99"/>`,
  addLine: `<path d="M3 5h10M3 9h8M3 13h6" ${S_}/><path d="M13 14.5h5M15.5 12v5" stroke="#2f7d32" stroke-width="1.8" stroke-linecap="round"/>`,
  toggleSymbol: `<path d="M10 3l2.2 4.5 4.8.7-3.5 3.4.8 4.8L10 14.1l-4.3 2.3.8-4.8L3 8.2l4.8-.7z" fill="#dbe6f7" ${S_}/>`,
  toggleText: `<path d="M4 4.5h12M10 4.5v12M7.5 16.5h5" ${S_}/>`,
  refresh: `<path d="M16 10a6 6 0 11-1.8-4.3" ${S_}/><path d="M16.5 3v4h-4" fill="none" stroke="#1f5fbf" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  libInfo: `<path d="M3.5 4.5h4.5a2 2 0 012 2v10a2 2 0 00-2-2H3.5zM16.5 4.5H12a2 2 0 00-2 2v10a2 2 0 012-2h4.5z" fill="#dbe6f7" ${S_}/>`,
  fonts: `<path d="M3 16L7.5 4h1L13 16M4.8 12h6.4" ${S_}/><path d="M13.5 16v-5.5a2 2 0 014 0V16M13.5 13.5h4" stroke="#1f5fbf" stroke-width="1.3" fill="none"/>`,
  watermarks: `<circle cx="10" cy="10" r="7" fill="#e4f2e6" ${S_}/><path d="M10 5.5c2 2.2 3 4 3 5.5a3 3 0 01-6 0c0-1.5 1-3.3 3-5.5z" fill="#057748"/>`,
  view2d: `<rect x="3" y="3" width="14" height="14" rx="1" fill="#fff" ${S_}/><rect x="6" y="5.5" width="8" height="6" fill="#dbe6f7" stroke="#1f5fbf" stroke-width="1"/><path d="M6 14h8" stroke="#556" stroke-width="1.2"/>`,
  view3d: `<path d="M10 2.5l7 3.5v8l-7 3.5-7-3.5V6z" fill="#dbe6f7" ${S_}/><path d="M3 6l7 3.5L17 6M10 9.5v8" ${S_}/>`,
  viewBoth: `<rect x="2.5" y="4" width="7" height="12" rx="1" fill="#fff" ${S_}/><path d="M14 4.5l3.5 1.8v7.4L14 15.5l-3.5-1.8V6.3z" fill="#dbe6f7" ${S_}/>`,
  fitView: `<path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" ${S_}/><rect x="7" y="7" width="6" height="6" fill="#dbe6f7" stroke="#1f5fbf" stroke-width="1"/>`,
  guides: `<rect x="3" y="3" width="14" height="14" rx="1" fill="#fff" ${S_}/><rect x="5.5" y="5.5" width="9" height="9" fill="none" stroke="#1f5fbf" stroke-width="1" stroke-dasharray="1.6 1.2"/>`,
  theme: `<path d="M14.5 13.5A6.5 6.5 0 017 3.6a6.5 6.5 0 107.5 9.9z" fill="#2b3442"/>`,
  surface: `<rect x="2.5" y="3.5" width="15" height="13" rx="1" fill="#2b3442"/><rect x="6" y="6" width="8" height="8" fill="#e3e7ec"/>`,
  panels: `<rect x="2.5" y="3.5" width="15" height="13" rx="1" fill="#fff" ${S_}/><path d="M7 3.5v13M13 3.5v13" ${S_}/>`,
  about: `<circle cx="10" cy="10" r="7.5" fill="#dbe6f7" ${S_}/><path d="M10 9v5.5" stroke="#1f5fbf" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="6.2" r="1.1" fill="#1f5fbf"/>`,
  shortcuts: `<rect x="2" y="5.5" width="16" height="9" rx="1.5" fill="#fff" ${S_}/><path d="M5 8.5h1M8 8.5h1M11 8.5h1M14 8.5h1M6 11.5h8" ${S_}/>`,
  demo: `<rect x="4" y="2.5" width="12" height="15" rx="1" fill="#fff" ${S_}/><path d="M10 5l1.6 3.2 3.4.4-2.5 2.4.6 3.5L10 12.8l-3.1 1.7.6-3.5L5 8.6l3.4-.4z" fill="#f4d58d" stroke="#8a6d1d" stroke-width="1"/>`,
};
const RLABEL = {
  newLabel: 'New label', newDivider: 'New divider', openDlg: 'Open', save: 'Save', saveAs: 'Save as', undo: 'Undo', redo: 'Redo',
  exportBambu: 'Bambu 3MF', exportStl: 'STL', exportDlg: 'Export...', sizeDlg: 'Size...', arrangementDlg: 'Arrangement...',
  saveArrangement: 'Save arrangement', setDefaultArr: 'Make default', depthDlg: 'Depth...', saveDepth: 'Save depth', saveDivider: 'Save divider shape', paletteDlg: 'Filament colors',
  toggleTwoTone: 'Two-tone symbol', addLine: 'Add text line', toggleSymbol: 'Symbol', toggleText: 'Text',
  refreshLibrary: 'Refresh library', libraryInfo: 'Library info', fontsDlg: 'Fonts', showWatermarks: 'Lands and watermarks', showSets: 'Sets',
  view2d: '2D layout', view3d: '3D preview', viewBoth: 'Both', fitView: 'Fit', toggleGuides: 'Layout guides', toggleTheme: 'Dark theme', toggleSurface: 'Dark work surface',
  togglePanels: 'Panels', about: 'About', shortcuts: 'Shortcuts', demo: 'Demo labels',
};
const RICON = { openDlg: 'open', saveDivider: 'newDivider', exportBambu: 'export3mf', exportStl: 'exportStl', sizeDlg: 'size', arrangementDlg: 'arrangement', saveArrangement: 'saveArr', setDefaultArr: 'defaultArr', depthDlg: 'depth', saveDepth: 'saveDepth', paletteDlg: 'palette', toggleTwoTone: 'twoTone', refreshLibrary: 'refresh', libraryInfo: 'libInfo', fontsDlg: 'fonts', showWatermarks: 'watermarks', showSets: 'libInfo', toggleGuides: 'guides', toggleTheme: 'theme', toggleSurface: 'surface', togglePanels: 'panels' };
const DEFAULT_RIBBON = [
  { id: 'home', name: 'Home', groups: [{ name: 'Label', items: ['newLabel', 'newDivider', 'save', 'saveAs', 'openDlg'] }, { name: 'Edit', items: ['undo', 'redo'] }, { name: 'Export', items: ['exportBambu', 'exportStl', 'exportDlg'] }, { name: 'View', items: ['view2d', 'view3d', 'viewBoth'] }] },
  { id: 'label', name: 'Label', groups: [{ name: 'Size', items: ['sizeDlg'] }, { name: 'Arrangement', items: ['arrangementDlg', 'saveArrangement', 'setDefaultArr'] }, { name: 'Depth', items: ['depthDlg', 'saveDepth'] }, { name: 'Divider', items: ['saveDivider'] }, { name: 'Colors', items: ['paletteDlg', 'toggleTwoTone'] }] },
  { id: 'insert', name: 'Insert', groups: [{ name: 'Elements', items: ['toggleSymbol', 'toggleText', 'addLine'] }, { name: 'Symbols', items: ['showSets', 'showWatermarks'] }] },
  { id: 'library', name: 'Library', groups: [{ name: 'Library', items: ['refreshLibrary', 'libraryInfo', 'fontsDlg'] }] },
  { id: 'view', name: 'View', groups: [{ name: 'Views', items: ['view2d', 'view3d', 'viewBoth', 'fitView'] }, { name: 'Show', items: ['toggleGuides', 'togglePanels'] }, { name: 'Theme', items: ['toggleTheme', 'toggleSurface'] }] },
  { id: 'help', name: 'Help', groups: [{ name: 'Help', items: ['about', 'shortcuts', 'demo'] }] },
];
// toggle buttons and the state that shows them as on
const RON = {
  view2d: () => PREFS.view === '2d', view3d: () => PREFS.view === '3d', viewBoth: () => PREFS.view === 'both', toggleGuides: () => !!PREFS.guides,
  toggleTheme: () => document.documentElement.dataset.theme === 'dark', toggleSurface: () => PREFS.surface === 'dark',
  toggleTwoTone: () => L && L.symbol.style === 'twotone', toggleSymbol: () => L && L.symbol.show, toggleText: () => L && L.text.show,
  showSets: () => PREFS.setsView !== 'wm', showWatermarks: () => PREFS.setsView === 'wm',
};
const ricon = a => `<svg viewBox="0 0 20 20">${RI[RICON[a] || a] || RI.about}</svg>`;
let ribbonHTML = '';
function renderRibbon() {
  const tab = DEFAULT_RIBBON.find(t => t.id === PREFS.ribbonTab) || DEFAULT_RIBBON[0];
  const html = `<div class="rtabs">${DEFAULT_RIBBON.map(t => `<div class="rtab ${t === tab ? 'active' : ''}" data-rtab="${t.id}">${t.name}</div>`).join('')}</div>
    <div class="rpanel">${tab.groups.map(g => `<div class="rgroup"><div class="ritems">${g.items.map(a => `<button class="rb ${RON[a] && RON[a]() ? 'on' : ''}" data-act="${a}" title="${esc(RLABEL[a])}">${ricon(a)}<span>${esc(RLABEL[a])}</span></button>`).join('')}</div><div class="rgname">${g.name}</div></div>`).join('')}</div>`;
  if (html !== ribbonHTML) { $('#toolbar').innerHTML = html; ribbonHTML = html; }
}
document.addEventListener('click', e => { const t = e.target.closest('[data-rtab]'); if (t) { PREFS.ribbonTab = t.dataset.rtab; savePrefs(); renderRibbon(); } });
