// ---------- About TopLabel: the built-in guide ----------
// The pages come from ui/about/*.md, bundled into ABOUT_PAGES by tools/about.py, so the guide works offline.
// It replaces the work area while open. The address #about or #about/slug opens it; Escape closes it.
const mdInline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => /^\/about\//.test(u) ? `<a href="#about/${u.slice(7)}" data-about="${u.slice(7)}">${t}</a>` : `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
function mdRender(src) {
  const Ls = src.replace(/\r/g, '').split('\n'), out = []; let i = 0;
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  while (i < Ls.length) {
    const l = Ls[i];
    if (!l.trim()) { i++; continue; }
    const h = l.match(/^(#{1,4}) (.+)$/); if (h) { out.push(`<h${h[1].length}>${mdInline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\|/.test(l) && /^\|[\s:|-]+\|?\s*$/.test(Ls[i + 1] || '')) {
      const head = cells(l); i += 2; const rows = [];
      while (i < Ls.length && /^\|/.test(Ls[i])) rows.push(cells(Ls[i++]));
      out.push(`<table><thead><tr>${head.map(c => `<th>${mdInline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${mdInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`); continue;
    }
    const li = l.match(/^(\s*)([-*]|\d+\.) (.+)$/);
    if (li) {
      const ord = /\d/.test(li[2]), items = [];
      while (i < Ls.length) { const m = Ls[i].match(/^\s*([-*]|\d+\.) (.+)$/); if (!m) break; items.push(m[2]); i++; }
      out.push(`<${ord ? 'ol' : 'ul'}>${items.map(t => `<li>${mdInline(t)}</li>`).join('')}</${ord ? 'ol' : 'ul'}>`); continue;
    }
    const para = []; while (i < Ls.length && Ls[i].trim() && !/^(#{1,4} |\||\s*([-*]|\d+\.) )/.test(Ls[i])) para.push(Ls[i++]);
    out.push(`<p>${mdInline(para.join(' '))}</p>`);
  }
  return out.join('');
}
function openAbout(slug) {
  const v = $('#aboutview'); v.classList.remove('hidden'); $('#work').classList.add('about');
  let i = Math.max(0, ABOUT_PAGES.findIndex(p => p.slug === slug));
  const show = n => {
    i = n; const p = ABOUT_PAGES[i], prev = ABOUT_PAGES[i - 1], next = ABOUT_PAGES[i + 1];
    v.innerHTML = `<div class="abhead"><b>About TopLabel</b><span class="note">Version ${esc(APP_VERSION)}</span><button class="lnk" data-act="closeAbout">Close (Esc)</button></div>
      <div class="about"><nav class="abtoc">${ABOUT_PAGES.map((q, k) => `<a href="#about/${q.slug}" data-about="${q.slug}" class="${k === i ? 'on' : ''}">${esc(q.title)}</a>`).join('')}</nav>
      <select class="abselect" aria-label="About page">${ABOUT_PAGES.map((q, k) => `<option value="${q.slug}" ${k === i ? 'selected' : ''}>${esc(q.title)}</option>`).join('')}</select>
      <article class="abpage">${mdRender(p.body)}<div class="abpager">${prev ? `<a href="#about/${prev.slug}" data-about="${prev.slug}">Previous: ${esc(prev.title)}</a>` : ''}<span style="flex:1"></span>${next ? `<a href="#about/${next.slug}" data-about="${next.slug}">Next: ${esc(next.title)}</a>` : ''}</div></article></div>`;
    v.scrollTop = 0;
  };
  v.onclick = e => { const a = e.target.closest('[data-about]'); if (!a) return; e.preventDefault(); const k = ABOUT_PAGES.findIndex(q => q.slug === a.dataset.about); if (k >= 0) show(k); };
  v.onchange = e => { if (e.target.classList.contains('abselect')) show(ABOUT_PAGES.findIndex(q => q.slug === e.target.value)); };
  show(i);
}
function closeAbout() {
  $('#aboutview').classList.add('hidden'); $('#work').classList.remove('about');
  if (/^#about/.test(location.hash)) try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  requestAnimationFrame(() => { size3D(); paint3D(); });
}
ACTIONS.closeAbout = closeAbout;
window.addEventListener('hashchange', () => { if (/^#about(\/|$)/.test(location.hash)) openAbout(location.hash.slice(7)); });
