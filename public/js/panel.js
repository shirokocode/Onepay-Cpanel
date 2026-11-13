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

  // skeleton awal: top bar + user row + form
  app.append(O.topBar('Buat panel'), O.h('div', { class: 'mt-4 space-y-3' },
    O.h('div', { class: 'flex items-center gap-3' }, O.skCircle(), O.sk('h-3.5 w-1/3')),
    O.skPanelForm()));

  let user, opt;
  try {
    [{ user }, opt] = await O.load(Promise.all([O.api('/api/me'), O.api('/api/panel/options')]));
  } catch (e) {
    app.replaceChildren(O.topBar('Buat panel'), O.h('div', { class: 'mt-4' }, O.alertBox(e.message, 'red')), O.footer());
    return;
  }

  // ---------- header + info user ----------
  const logoutBtn = O.button({ icon: 'logout', variant: 'ghost', size: 'icon', aria: 'Keluar', onClick: O.logout });
  const userRow = O.h('div', { class: 'flex items-center gap-2.5' },
    O.avatar(user.username),
    O.h('div', { class: 'flex min-w-0 flex-1 items-center gap-2' },
      O.h('span', { class: 'truncate text-sm font-medium' }, user.username), O.roleBadge(user.role)),
    user.role === 'owner' ? O.linkButton({ href: '/admin.html', label: 'Admin', icon: 'settings', size: 'sm' }) : null);

  // ---------- form buat panel ----------
  const name = O.field({
    label: 'Username panel', required: '', minlength: '3', maxlength: '32', autocomplete: 'off', autocapitalize: 'none',
    placeholder: 'contoh: budi123', hint: 'Huruf kecil, angka, titik, garis bawah atau strip.',
  });
  name.input.addEventListener('input', () => {
    name.input.value = name.input.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  });

  let selected = '';
  const chips = opt.packages.map((p) => {
    const chip = O.h('button', {
      type: 'button', 'aria-pressed': 'false',
      class: 'rounded-lg border border-slate-300 bg-white px-2 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
    },
      O.h('span', { class: 'block text-sm font-semibold text-slate-800' }, p.label),
      O.h('span', { class: 'mt-0.5 block text-[11px] text-slate-500' }, 'CPU ' + p.cpu + '%'));
    chip.addEventListener('click', () => {
      selected = p.id;
      chips.forEach((c) => {
        const on = c === chip;
        c.setAttribute('aria-pressed', String(on));
        c.classList.toggle('border-blue-600', on);
        c.classList.toggle('bg-blue-50', on);
        c.classList.toggle('ring-1', on);
        c.classList.toggle('ring-blue-600', on);
        c.classList.toggle('border-slate-300', !on);
        c.classList.toggle('bg-white', !on);
      });
    });
    return chip;
  });

  const submit = O.button({ label: 'Buat panel', type: 'submit', cls: 'w-full' });
  const form = O.h('form', { class: 'space-y-4' },
    opt.configured ? null : O.alertBox('Pterodactyl belum dikonfigurasi. Hubungi owner.', 'amber'),
    name,
    O.h('div', {}, O.h('p', { class: 'mb-1 text-xs font-medium text-slate-600' }, 'Storage'),
      O.h('div', { class: 'grid grid-cols-3 gap-2', role: 'group', 'aria-label': 'Pilih storage' }, chips)),
    submit);

  const result = O.h('div', { class: 'hidden' });
  const history = O.card(O.h('h2', { class: 'mb-3 text-sm font-semibold' }, 'Riwayat panel'), O.skList(2, O.skRowCard));

  // ---------- teks salinan untuk pelanggan (teks polos) ----------
  function customerText(d) {
    const rules = String(opt.rulesNote || '').split('\n')
      .map((l) => l.replace(/^[\s\u2022*-]+/, '').trim()).filter(Boolean);
    return [
      'DATA PANEL',
      'Email    : ' + d.email,
      'Username : ' + d.username,
      'Password : ' + d.password,
      'RAM      : ' + d.ram,
      'CPU      : ' + d.cpu,
      'Domain   : ' + d.domain,
      '',
      'NOTE PENTING',
      ...rules,
      '',
      'Informasi lainnya',
      'https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q',
      '',
      'ONEPAY ID CPANEL V2',
    ].join('\n');
  }

  function showResult(d) {
    const rows = [['Email', d.email], ['Username', d.username], ['Password', d.password], ['RAM', d.ram], ['CPU', d.cpu], ['Domain', d.domain]];
    result.replaceChildren(O.card(
      O.h('div', { class: 'mb-1 flex items-center justify-between' },
        O.h('h2', { class: 'text-sm font-semibold' }, 'Panel berhasil dibuat'), O.badge('Sukses', 'green')),
      O.h('div', { class: 'divide-y divide-slate-100' }, rows.map(([k, v]) => {
        const cp = O.button({ icon: 'copy', variant: 'ghost', size: 'icon', aria: 'Salin ' + k });
        cp.addEventListener('click', () => O.copy(v, cp));
        return O.h('div', { class: 'flex items-center justify-between gap-3 py-2' },
          O.h('div', { class: 'min-w-0' },
            O.h('p', { class: 'text-xs text-slate-500' }, k),
            O.h('p', { class: 'break-all text-sm font-medium' }, v)),
          cp);
      })),
      O.h('div', { class: 'mt-2' }, O.alertBox('Password hanya ditampilkan sekali. Salin sekarang.', 'amber', 'info')),
      O.button({ label: 'Salin semua', icon: 'copy', cls: 'mt-3 w-full', onClick: (e) => O.copy(customerText(d), e.currentTarget) })));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selected) return O.toast('Pilih storage terlebih dahulu', 'err');
    O.busy(submit, true);
    result.classList.remove('hidden');
    result.replaceChildren(O.skResult());
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try {
      const d = await O.api('/api/panel/create', { method: 'POST', body: { username: name.input.value, storage: selected } });
      showResult(d);
      name.input.value = '';
      loadHistory();
    } catch (err) {
      result.classList.add('hidden');
      O.toast(err.message, 'err');
    } finally {
      O.busy(submit, false);
    }
  });

  async function loadHistory() {
    try {
      const { panels } = await O.api('/api/panel/history');
      history.replaceChildren(
        O.h('h2', { class: 'mb-1 text-sm font-semibold' }, 'Riwayat panel'),
        panels.length
          ? O.h('div', { class: 'divide-y divide-slate-100' }, panels.slice(0, 20).map((p) =>
              O.h('div', { class: 'py-2.5' },
                O.h('p', { class: 'break-all text-sm font-medium' }, p.panel_username),
                O.h('div', { class: 'mt-0.5 flex items-center gap-2 text-xs text-slate-500' },
                  O.h('span', {}, O.fmtRam(p.ram)), O.dot(), O.h('span', {}, O.fmtDate(p.created_at))))))
          : O.emptyState('history', 'Belum ada riwayat', 'Panel yang kamu buat akan muncul di sini.'));
    } catch (e) {
      history.replaceChildren(O.alertBox(e.message, 'red'));
    }
  }

  // ---------- ganti password ----------
  const cur = O.field({ label: 'Password lama', type: 'password', autocomplete: 'current-password' });
  const nw = O.field({ label: 'Password baru', type: 'password', autocomplete: 'new-password', minlength: '6', hint: 'Minimal 6 karakter.' });
  const savePw = O.button({ label: 'Simpan password', cls: 'w-full' });
  savePw.addEventListener('click', async () => {
    O.busy(savePw, true);
    try {
      await O.api('/api/me/password', { method: 'POST', body: { currentPassword: cur.input.value, newPassword: nw.input.value } });
      cur.input.value = nw.input.value = '';
      O.toast('Password berhasil diganti');
    } catch (e) {
      O.toast(e.message, 'err');
    } finally {
      O.busy(savePw, false);
    }
  });
  const pwCard = O.card(O.h('details', { class: 'group' },
    O.h('summary', { class: 'flex cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden' },
      'Ganti password', O.icon('chevron', 'size-4 text-slate-400 transition group-open:rotate-180')),
    O.h('div', { class: 'mt-3 space-y-3' }, cur, nw, savePw)));

  app.replaceChildren(
    O.topBar('Buat panel', logoutBtn),
    O.h('div', { class: 'mt-4 space-y-3' }, userRow, O.card(form), result, history, pwCard, O.footer()));
  loadHistory();
})();
