/*
ONEPAY ID CPANEL V2 - 100% GRATIS & OPEN SOURCE (FREE!!!)
File ini GRATIS! Kalau kamu BELI source ini, kamu DITIPU!
Telegram : https://t.me/onepay_ChatZone
WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
License  : ONEPAY ID CPANEL V2 (lihat file LICENSE)
*/
(async () => {
  const O = OP;
  const app = O.$('#app');

  app.append(O.topBar('Admin'), O.h('div', { class: 'mt-4' }, O.skList(3)));

  let me;
  try {
    ({ user: me } = await O.load(O.api('/api/me')));
  } catch (e) {
    app.replaceChildren(O.topBar('Admin'), O.h('div', { class: 'mt-4' }, O.alertBox(e.message, 'red')), O.footer());
    return;
  }

  // ---------- kerangka halaman ----------
  const content = O.h('main', { class: 'mt-4' });
  const nav = O.h('nav', {
    class: 'fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur',
    'aria-label': 'Menu admin',
  });
  const navInner = O.h('div', { class: 'mx-auto grid max-w-md grid-cols-3' });
  nav.append(navInner);

  const makePanelLink = O.linkButton({ href: '/panel.html', label: 'Buat panel', icon: 'plus', size: 'sm', variant: 'secondary' });
  const logoutBtn = O.button({ icon: 'logout', variant: 'ghost', size: 'icon', aria: 'Keluar', onClick: O.logout });

  app.replaceChildren(
    O.topBar('Admin', makePanelLink, logoutBtn),
    O.h('div', { class: 'mt-4 flex items-center gap-2.5' },
      O.avatar(me.username), O.h('span', { class: 'truncate text-sm font-medium' }, me.username), O.roleBadge('owner')),
    content, O.h('div', { class: 'mt-2' }, O.footer()), nav);

  // ---------- tab ----------
  const TABS = {
    users: { label: 'Users', icon: 'users', skeleton: () => O.skList(3), render: renderUsers },
    ptero: { label: 'Pterodactyl', icon: 'server', skeleton: () => O.skForm(4), render: renderPtero },
    history: { label: 'Riwayat', icon: 'history', skeleton: () => O.skList(3, O.skRowCard), render: renderHistory },
  };
  let seq = 0; // cegah tab lama menimpa tab baru bila user pindah tab cepat

  function go(key) {
    const mine = ++seq;
    navInner.replaceChildren(...Object.entries(TABS).map(([k, t]) => {
      const active = k === key;
      const b = O.h('button', {
        type: 'button',
        'aria-current': active ? 'page' : null,
        class: 'flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ' +
          (active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'),
      }, O.icon(t.icon, 'size-5'), t.label);
      b.addEventListener('click', () => go(k));
      return b;
    }));
    content.replaceChildren(TABS[key].skeleton());
    TABS[key].render().then(
      (node) => { if (mine === seq) content.replaceChildren(node); },
      (e) => { if (mine === seq) content.replaceChildren(O.alertBox(e.message, 'red')); });
  }

  // ---------- USERS ----------
  async function renderUsers() {
    const { users } = await O.load(O.api('/api/admin/users'));
    const addBtn = O.button({ label: 'Tambah', icon: 'plus', size: 'sm', onClick: () => userSheet() });

    const cards = users.map((u) => {
      const editBtn = O.button({ label: 'Edit', icon: 'edit', variant: 'secondary', size: 'sm', cls: u.id === me.id ? 'col-span-2' : '', onClick: () => userSheet(u) });
      const delBtn = u.id === me.id ? null : O.button({ label: 'Hapus', icon: 'trash', variant: 'danger', size: 'sm', onClick: () => deleteSheet(u) });
      return O.card(
        O.h('div', { class: 'flex items-center gap-3' },
          O.avatar(u.username),
          O.h('div', { class: 'min-w-0 flex-1' },
            O.h('div', { class: 'flex items-center gap-2' },
              O.h('p', { class: 'truncate text-sm font-semibold' }, u.username),
              u.id === me.id ? O.badge('Kamu', 'slate') : null),
            O.h('div', { class: 'mt-1' }, O.roleBadge(u.role)))),
        O.h('div', { class: 'mt-3 flex items-center gap-2 text-xs text-slate-500' },
          O.h('span', {}, u.panel_count + ' panel'), O.dot(), O.h('span', {}, 'Login terakhir: ' + O.fmtDate(u.last_login))),
        O.h('div', { class: 'mt-3 grid grid-cols-2 gap-2' }, editBtn, delBtn));
    });

    return O.h('div', { class: 'space-y-3' },
      O.h('div', { class: 'flex items-center justify-between' },
        O.h('h2', { class: 'text-sm font-semibold' }, 'Pengguna (' + users.length + ')'), addBtn),
      cards.length ? cards : O.card(O.emptyState('users', 'Belum ada user', 'Tambahkan pengguna untuk mulai.')));
  }

  function userSheet(u) {
    const isEdit = !!u;
    const un = O.field({ label: 'Username', value: u?.username || '', required: '', minlength: '3', maxlength: '32', autocapitalize: 'none', autocomplete: 'off' });
    const pw = O.field({
      label: isEdit ? 'Password baru (opsional)' : 'Password', type: 'password', minlength: '6', autocomplete: 'new-password',
      ...(isEdit ? {} : { required: '' }), hint: isEdit ? 'Kosongkan jika tidak ingin mengubah password.' : 'Minimal 6 karakter.',
    });
    const role = O.select({ label: 'Role', value: u?.role || 'user', options: [['user', 'User (hanya buat panel)'], ['owner', 'Owner (akses admin)']] });
    const save = O.button({ label: 'Simpan', type: 'submit', cls: 'w-full' });
    const form = O.h('form', { class: 'space-y-3' }, un, pw, role, save);
    const sh = O.sheet(isEdit ? 'Edit user' : 'Tambah user', form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      O.busy(save, true);
      try {
        const body = { username: un.input.value, role: role.input.value };
        if (pw.input.value) body.password = pw.input.value;
        await O.api(isEdit ? '/api/admin/users/' + u.id : '/api/admin/users', { method: isEdit ? 'PUT' : 'POST', body });
        sh.close();
        O.toast(isEdit ? 'User diperbarui' : 'User ditambahkan');
        go('users');
      } catch (err) {
        O.toast(err.message, 'err');
        O.busy(save, false);
      }
    });
  }

  function deleteSheet(u) {
    const cancel = O.button({ label: 'Batal', variant: 'secondary' });
    const yes = O.button({ label: 'Hapus user', variant: 'dangerSolid' });
    const sh = O.sheet('Hapus user',
      O.h('div', { class: 'space-y-4' },
        O.h('p', { class: 'text-sm text-slate-600' }, 'Hapus akun ', O.h('b', { class: 'text-slate-900' }, u.username), '? Riwayat panelnya tetap tersimpan.'),
        O.h('div', { class: 'grid grid-cols-2 gap-2' }, cancel, yes)));
    cancel.addEventListener('click', () => sh.close());
    yes.addEventListener('click', async () => {
      O.busy(yes, true);
      try {
        await O.api('/api/admin/users/' + u.id, { method: 'DELETE' });
        sh.close();
        O.toast('User dihapus');
        go('users');
      } catch (e) {
        O.toast(e.message, 'err');
        O.busy(yes, false);
      }
    });
  }

  // ---------- PTERODACTYL ----------
  async function renderPtero() {
    const s = await O.load(O.api('/api/admin/settings'));
    const f = (label, key, extra = {}) =>
      O.field({ label, name: key, value: s[key] ?? '', autocomplete: 'off', autocapitalize: 'none', ...extra });

    const domain = f('Domain panel', 'ptero_domain', { placeholder: 'panel.domainkamu.com' });
    const plta = O.field({
      label: 'Application API key (PLTA)', name: 'ptero_plta', type: 'password', value: '', autocomplete: 'off',
      placeholder: s.plta_set ? 'Kosongkan jika tidak diubah' : 'ptla_xxxxxxxx',
      hint: s.plta_set ? 'Tersimpan, berakhiran ' + s.plta_hint : 'Belum diatur.',
    });
    const num = { inputmode: 'numeric', pattern: '[0-9]*' };
    const nest = f('Nest ID', 'ptero_nest', num);
    const egg = f('Egg ID', 'ptero_egg', num);
    const loc = f('Location ID', 'ptero_location', num);
    const email = f('Domain email user panel', 'email_domain', { placeholder: 'example.com' });
    const wa = f('Nomor WhatsApp kontak', 'contact_wa', { placeholder: '628123456789', inputmode: 'numeric' });
    const rules = O.textarea({ label: 'Catatan dan aturan (ikut tersalin ke pelanggan)', name: 'rules_note', value: s.rules_note || '' });

    const status = O.h('div');
    const save = O.button({ label: 'Simpan', type: 'submit' });
    const test = O.button({ label: 'Simpan dan tes', variant: 'secondary' });

    const form = O.h('form', { class: 'space-y-3' },
      O.card(O.h('h2', { class: 'mb-3 text-sm font-semibold' }, 'Koneksi'), O.h('div', { class: 'space-y-3' }, domain, plta)),
      O.card(O.h('h2', { class: 'mb-3 text-sm font-semibold' }, 'Resource'), O.h('div', { class: 'grid grid-cols-3 gap-2' }, nest, egg, loc)),
      O.card(O.h('h2', { class: 'mb-3 text-sm font-semibold' }, 'Lainnya'), O.h('div', { class: 'space-y-3' }, email, wa, rules)),
      status,
      O.h('div', { class: 'grid grid-cols-2 gap-2' }, save, test));

    const read = () => Object.fromEntries(new FormData(form).entries());
    const persist = () => O.api('/api/admin/settings', { method: 'PUT', body: read() });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      O.busy(save, true);
      try { await persist(); O.toast('Setelan tersimpan'); } catch (err) { O.toast(err.message, 'err'); }
      O.busy(save, false);
    });

    test.addEventListener('click', async () => {
      O.busy(test, true);
      status.replaceChildren(O.skRowCard());
      try {
        await persist();
        const r = await O.api('/api/admin/settings/test', { method: 'POST' });
        status.replaceChildren(O.alertBox('Terhubung ke Pterodactyl. Total user: ' + r.users + (r.egg ? ', egg: ' + r.egg : ''), 'green', 'check'));
      } catch (err) {
        status.replaceChildren(O.alertBox(err.message, 'red'));
      }
      O.busy(test, false);
    });

    return form;
  }

  // ---------- RIWAYAT ----------
  async function renderHistory() {
    const { panels } = await O.load(O.api('/api/panel/history?all=1'));
    return O.h('div', { class: 'space-y-3' },
      O.h('h2', { class: 'text-sm font-semibold' }, 'Semua panel (' + panels.length + ')'),
      panels.length
        ? panels.map((p) => O.card(
            O.h('div', { class: 'flex items-center justify-between gap-3' },
              O.h('p', { class: 'break-all text-sm font-semibold' }, p.panel_username), O.badge(O.fmtRam(p.ram), 'slate')),
            O.h('div', { class: 'mt-1.5 flex items-center gap-2 text-xs text-slate-500' },
              O.h('span', {}, 'Oleh ' + p.created_by), O.dot(), O.h('span', {}, O.fmtDate(p.created_at)))))
        : O.card(O.emptyState('history', 'Belum ada riwayat', 'Panel yang dibuat user akan muncul di sini.')));
  }

  go('users');
})();
