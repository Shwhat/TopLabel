// Signing in and out through the pages, changing the password.
export const tests = {
  'sign-in page, sign out, sign in again': async t => {
    const name = await t.signup();
    await t.open();
    t.eq(await t.eval(() => $('#accountmenu').textContent), name);
    await t.menu('account', 'signOut'); await t.page.waitForURL(/\/login$/);
    await t.page.fill('#name', name); await t.page.fill('#pw', 'password123'); await t.page.click('#go');
    await t.page.waitForFunction(() => window.TL_READY === true);
    t.ok(await t.eval(() => host.user.name) === name, 'signed in');
  },
  'wrong password message, change password': async t => {
    const name = await t.signup();
    await t.open();
    await t.act('changePassword');
    await t.page.fill('#dlg input[name=old]', 'password123'); await t.page.fill('#dlg input[name=nw]', 'newpassword9'); await t.page.fill('#dlg input[name=nw2]', 'newpassword9');
    await t.page.click('#dlgbtns .primary'); await t.page.waitForFunction(() => /Password changed/.test($('#st-msg').textContent));
    const ctx = await t.page.context().browser().newContext(); const p = await ctx.newPage();
    await p.goto(t.url + '/login'); await p.fill('#name', name); await p.fill('#pw', 'password123'); await p.click('#go');
    await p.waitForFunction(() => document.getElementById('msg').textContent.length > 0);
    t.eq(await p.textContent('#msg'), 'Wrong user name or password.');
    await p.fill('#pw', 'newpassword9'); await p.click('#go'); await p.waitForURL(t.url + '/');
    await ctx.close();
  },
};
