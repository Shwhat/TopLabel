// The About TopLabel guide: opened from the Help menu and the address, page list, links, previous and next, Escape.
export const tests = {
  'the guide opens in the work area with the version, pages, links, previous and next': async t => {
    await t.open();
    await t.menu('help', 'about');
    t.ok(await t.eval(() => !$('#aboutview').classList.contains('hidden') && $('.abhead').textContent.includes('Version ' + APP_VERSION)), 'header with version');
    t.eq(await t.eval(() => [...document.querySelectorAll('.abtoc a')].map(a => a.textContent)), await t.eval(() => ABOUT_PAGES.map(p => p.title)));
    t.ok(await t.eval(() => $('.abpage h1').textContent === 'Overview' && $('.abpage table') !== null), 'overview with its table');
    await t.page.click('.abpage a[data-about="export"]');
    t.eq(await t.eval(() => [$('.abpage h1').textContent, $('.abtoc a.on').textContent]), ['Export', 'Export']);
    await t.page.click('.abpager a:last-child');
    t.eq(await t.eval(() => $('.abpage h1').textContent), 'Keyboard shortcuts');
    await t.page.click('.abtoc a[data-about="release-notes"]');
    t.ok(await t.eval(() => $('.abpage h2').textContent.startsWith(APP_VERSION)), 'newest release note first');
    await t.key('Escape');
    t.ok(await t.eval(() => $('#aboutview').classList.contains('hidden')), 'Escape closes it');
    await t.page.goto(t.url + '/#about/technical'); await t.page.waitForFunction(() => window.TL_READY && $('.abpage h1'));
    t.eq(await t.eval(() => $('.abpage h1').textContent), 'Technical', 'opens from the address');
  },
  'narrow windows switch pages with a drop-down': async t => {
    await t.page.setViewportSize({ width: 800, height: 800 });
    await t.open('#about');
    t.ok(await t.eval(() => getComputedStyle($('.abselect')).display !== 'none' && getComputedStyle($('.abtoc')).display === 'none'), 'drop-down shown');
    await t.page.selectOption('.abselect', 'fonts');
    t.eq(await t.eval(() => $('.abpage h1').textContent), 'Fonts');
  },
};
