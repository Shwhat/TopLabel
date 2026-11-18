// Themes, views, panels, menus, shortcuts and the demo labels.
export const tests = {
  'dark theme and dark work surface are separate and remembered': async t => {
    await t.open();
    await t.page.click('.rtab[data-rtab="view"]'); await t.page.click('.rb[data-act="toggleTheme"]');
    t.eq(await t.eval(() => [document.documentElement.dataset.theme, document.documentElement.dataset.surface, PREFS.theme]), ['dark', 'light', 'dark']);
    t.ok(await t.eval(() => $('.rb[data-act="toggleTheme"]').classList.contains('on')), 'button on');
    await t.page.click('.rb[data-act="toggleSurface"]');
    t.eq(await t.eval(() => document.documentElement.dataset.surface), 'dark');
    t.eq(await t.eval(() => getComputedStyle($('#work')).backgroundColor), 'rgb(20, 23, 28)');
  },
  'views, fit and guides by keyboard': async t => {
    await t.open(); await t.page.click('#workhead .whname');
    await t.key('2'); t.eq(await t.eval(() => [$('#work').dataset.view, getComputedStyle($('#pane3d')).display]), ['2d', 'none']);
    await t.key('b'); t.eq(await t.eval(() => [getComputedStyle($('#pane2d')).display, getComputedStyle($('#pane3d')).display]), ['block', 'block']);
    t.ok(await t.eval(() => document.querySelectorAll('#view2d .v2guide').length === 3), 'guides drawn');
    await t.key('g'); t.ok(await t.eval(() => document.querySelectorAll('#view2d .v2guide').length === 0), 'guides off');
    await t.key('3'); t.eq(await t.eval(() => $('#work').dataset.view), '3d');
    t.ok(await t.eval(() => V3.renderer && V3.group.children.length === MESHES.length), '3D meshes shown');
  },
  'hiding a part in the views keeps it in the export': async t => {
    await t.open(); await t.pickSet('NEO');
    await t.page.uncheck('#parttoggles input[data-layer="text"]');
    t.eq(await t.eval(() => [V3.group.children.length, MESHES.length]), [2, 3]);
  },
  'panels hide, show and resize': async t => {
    await t.open();
    await t.menu('view', 'panelLeft');
    t.ok(await t.eval(() => $('#dock-left').classList.contains('hidden')), 'hidden');
    await t.act('togglePanels');
    t.ok(await t.eval(() => !$('#dock-left').classList.contains('hidden') && !$('#dock-right').classList.contains('hidden')), 'all shown');
    const box = await t.page.locator('#dock-right .dedge').boundingBox();
    await t.page.mouse.move(box.x + 3, box.y + 200); await t.page.mouse.down(); await t.page.mouse.move(box.x - 77, box.y + 200, { steps: 4 }); await t.page.mouse.up();
    t.near(await t.eval(() => PREFS.sizes.right), 410, 3, 'wider');
  },
  'keyboard shortcuts dialog and menus open by keyboard': async t => {
    await t.open();
    await t.key('F1');
    t.ok(await t.eval(() => $('#dlg').open && $('#dlgtitle').textContent === 'Keyboard shortcuts'), 'shortcuts');
    await t.key('Escape');
    await t.page.click('.menu[data-menu="file"]');
    t.ok(await t.eval(() => [...document.querySelectorAll('#dropdown .dd')].some(d => d.textContent.includes('Sign out'))), 'file menu on the server');
    await t.page.hover('.menu[data-menu="label"]');
    t.ok(await t.eval(() => $('.menu[data-menu="label"]').classList.contains('open')), 'hover switches menus');
  },
  'every demo label builds without warnings': async t => {
    await t.open();
    for (const id of await t.eval(() => DEMOS.map(d => d.id))) {
      await t.act('demo'); await t.page.selectOption('#dlg select[name=id]', id); await t.enter();
      const r = await t.eval(() => [MODEL.warnings, MODEL.parts.length]);
      t.eq(r[0], [], id + ' warnings'); t.ok(r[1] >= 1, id + ' parts');
    }
    t.eq(await t.eval(() => [L.set.code, L.depth.id, MODEL.parts.map(p => p.key)]), ['FDN', 'engraved', ['base']]);
  },
};
