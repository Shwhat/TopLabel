// ---------- theme: light, dark or system, and the separate dark work surface ----------
const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function applyTheme() {
  const dark = PREFS.theme === 'dark' || (PREFS.theme === 'system' && mq && mq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.surface = PREFS.surface === 'dark' ? 'dark' : 'light';
  paint3D();
}
if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (PREFS.theme === 'system') applyTheme(); });
function toggleTheme() { PREFS.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; savePrefs(); applyTheme(); renderRibbon(); flash(PREFS.theme === 'dark' ? 'Dark theme' : 'Light theme'); }
function toggleSurface() { PREFS.surface = PREFS.surface === 'dark' ? 'light' : 'dark'; savePrefs(); applyTheme(); draw2D(); renderRibbon(); flash(PREFS.surface === 'dark' ? 'Dark work surface' : 'Light work surface'); }
