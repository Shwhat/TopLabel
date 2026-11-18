// ---------- views: the 2D layout (top view) and the 3D preview ----------
let MODEL = null, MESHES = [], BUILD_ERR = '';
let buildTimer = 0, building = 0, pendingBuild = false;
function scheduleBuild() { pendingBuild = true; clearTimeout(buildTimer); buildTimer = setTimeout(runBuild, 40); }
async function runBuild() {
  if (!L) return;
  const seq = ++BUILD_SEQ; building++;
  renderStatus();
  try {
    const model = await buildLabel(clone(L));
    if (seq !== BUILD_SEQ) return;
    MODEL = model; MESHES = partMeshes(model); BUILD_ERR = '';
  } catch (e) {
    if (seq !== BUILD_SEQ) return;
    console.error(e); BUILD_ERR = 'The label could not be built: ' + e.message;
  } finally { building--; }
  if (seq === BUILD_SEQ) pendingBuild = false;
  draw2D(); draw3D(); renderStatus(); renderPartToggles();
}
const LAYERS_OFF = new Set();
const surfaceDark = () => PREFS.surface === 'dark';

// ---------- 2D ----------
function draw2D() {
  const svg = $('#view2d'); if (!svg || !MODEL) return;
  const w = num(L.size.w, 76), h = num(L.size.h, 100), pad = Math.max(w, h) * 0.1;
  svg.setAttribute('viewBox', `${-w / 2 - pad} ${-h / 2 - pad} ${w + pad * 2} ${h + pad * 2}`);
  const g = [];
  const parts = MODEL.parts.filter(p => !LAYERS_OFF.has(p.key));
  const base = parts.find(p => p.key === 'base');
  if (base) g.push(`<path class="v2base" d="${gPathD(base.slabs[base.slabs.length - 1].paths)}" fill="${slotColor(base.slot)}"/>`);
  for (const e of MODEL.engraved) g.push(`<path class="v2cut" d="${gPathD(e.paths)}"/>`);
  for (const p of parts) if (p.key !== 'base' && p.side !== 'bottom') g.push(`<path class="v2part" data-part="${p.key}" d="${gPathD(p.paths)}" fill="${slotColor(p.slot)}"/>`);
  g.push(`<path class="v2edge" d="${gPathD(MODEL.outline)}"/>`);
  if (PREFS.guides) {
    const R = MODEL.guides, box = (r, c) => r ? `<rect class="v2guide ${c}" x="${r.x0}" y="${-r.y1}" width="${Math.max(0, r.w)}" height="${Math.max(0, r.h)}"/>` : '';
    g.push(box(R.inner, 'in'), box(R.pattern, 'pat'), ...(R.items || []).map(i => box(i.rect, { symbol: 'sym', text: 'txt', mana: 'mana' }[i.kind])));
  }
  // dimensions
  const dy = h / 2 + pad * 0.55, dx = w / 2 + pad * 0.55;
  g.push(`<g class="v2dim"><line x1="${-w / 2}" y1="${dy}" x2="${w / 2}" y2="${dy}"/><text x="0" y="${dy - 1}" font-size="${pad * 0.32}">${r2(w)} mm</text>`);
  g.push(`<line x1="${dx}" y1="${-h / 2}" x2="${dx}" y2="${h / 2}"/><text x="${dx - 1}" y="0" font-size="${pad * 0.32}" transform="rotate(-90 ${dx - 1} 0)">${r2(h)} mm</text></g>`);
  svg.innerHTML = g.join('');
}

// ---------- 3D ----------
const V3 = { renderer: null, scene: null, camera: null, controls: null, group: null, fitted: '' };
function init3D() {
  const host = $('#view3d'); if (V3.renderer || !host) return;
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); } catch (e) { host.innerHTML = '<div class="v3msg">The 3D preview needs WebGL, which this browser does not offer. The 2D layout and the exports still work.</div>'; return; }
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  host.appendChild(r.domElement);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 5000); cam.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.75));
  const d1 = new THREE.DirectionalLight(0xffffff, 0.7); d1.position.set(-60, -80, 160); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.3); d2.position.set(90, 60, 80); scene.add(d2);
  const group = new THREE.Group(); scene.add(group);
  const controls = new THREE.OrbitControls(cam, r.domElement); controls.enableDamping = false; controls.addEventListener('change', () => paint3D());
  Object.assign(V3, { renderer: r, scene, camera: cam, controls, group });
  controls.addEventListener('start', () => { V3.moved = true; });
  // keep the label in view when the pane changes size, unless the view was turned or moved by hand
  new ResizeObserver(() => { size3D(); if (V3.fitted && !V3.moved) fit3D(); else paint3D(); }).observe(host);
  size3D();
}
function size3D() { const host = $('#view3d'); if (!V3.renderer || !host) return; const w = host.clientWidth || 10, h = host.clientHeight || 10; V3.renderer.setSize(w, h); V3.camera.aspect = w / h; V3.camera.updateProjectionMatrix(); }
function paint3D() { if (!V3.renderer) return; V3.scene.background = new THREE.Color(surfaceDark() ? 0x15181d : 0xdfe3e8); V3.renderer.render(V3.scene, V3.camera); }
function draw3D() {
  init3D(); if (!V3.renderer) return;
  for (const c of [...V3.group.children]) { V3.group.remove(c); c.geometry.dispose(); c.material.dispose(); }
  for (const m of MESHES) {
    if (LAYERS_OFF.has(m.key)) continue;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(m.pos, 3)); geo.setIndex(new THREE.BufferAttribute(m.idx, 1));
    const ng = geo.toNonIndexed(); ng.computeVertexNormals(); geo.dispose();
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(slotColor(m.slot)), roughness: 0.62, metalness: 0.05 });
    const mesh = new THREE.Mesh(ng, mat); mesh.userData.key = m.key; V3.group.add(mesh);
  }
  const key = `${L.size.w}x${L.size.h}`;
  if (V3.fitted !== key) { fit3D(); V3.fitted = key; }
  paint3D();
}
function fit3D() {
  if (!V3.camera) return;
  const w = num(L.size.w, 76), h = num(L.size.h, 100), r = Math.hypot(w, h) / 2 + 2;
  const vf = V3.camera.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * V3.camera.aspect);
  const d = r / Math.sin(Math.min(vf, hf)) * 1.05, dir = new THREE.Vector3(0.12, -0.58, 0.8).normalize();
  V3.moved = false; V3.camera.position.copy(dir.multiplyScalar(d)); V3.controls.target.set(0, 0, 0); V3.camera.lookAt(0, 0, 0); V3.controls.update(); paint3D();
}
// a PNG of the 3D view, for previews in exports
function snapshotPNG(size = 512) {
  if (!V3.renderer) return null;
  return new Promise(res => V3.renderer.domElement.toBlob(b => res(b), 'image/png'));
}
function renderPartToggles() {
  const el = $('#parttoggles'); if (!el || !MODEL) return;
  el.innerHTML = MODEL.parts.map(p => `<label title="Show or hide this part"><input type="checkbox" data-layer="${p.key}" ${LAYERS_OFF.has(p.key) ? '' : 'checked'}><i style="background:${slotColor(p.slot)}"></i>${esc(p.name)}</label>`).join('');
}
function setView(v) { PREFS.view = v; savePrefs(); applyView(); }
function applyView() {
  const v = PREFS.view || '3d';
  $('#work').dataset.view = v;
  $$('#viewtabs [data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  requestAnimationFrame(() => { size3D(); paint3D(); });
}
