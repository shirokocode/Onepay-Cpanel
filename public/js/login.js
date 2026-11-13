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
  const home = (role) => (role === 'owner' ? '/admin.html' : '/panel.html');

  // skeleton selama cek sesi
  const skeleton = O.h('div', { class: 'pt-10' }, O.skForm(2));
  app.append(skeleton);

  try {
    const { user } = await O.api('/api/me', { noRedirect: true });
    location.href = home(user.role);
    return;
  } catch { /* belum login */ }

  const username = O.field({ label: 'Username', name: 'username', autocomplete: 'username', autocapitalize: 'none', required: '', placeholder: 'Masukkan username' });
  const password = O.field({ label: 'Password', name: 'password', type: 'password', autocomplete: 'current-password', required: '', placeholder: 'Masukkan password' });
  const submit = O.button({ label: 'Login', type: 'submit', cls: 'w-full' });

  const form = O.h('form', { class: 'space-y-4' }, username, password, submit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    O.busy(submit, true);
    try {
      const { user } = await O.api('/api/login', {
        method: 'POST', noRedirect: true,
        body: { username: username.input.value, password: password.input.value },
      });
      location.href = home(user.role);
    } catch (err) {
      O.toast(err.message, 'err');
      O.busy(submit, false);
    }
  });

  skeleton.remove();
  app.append(
    O.h('div', { class: 'pt-12 pb-6 text-center' },
      O.h('div', { class: 'mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white' }, O.icon('lock', 'size-6')),
      O.h('h1', { class: 'mt-4 text-lg font-semibold' }, 'ONEPAY CPANEL'),
      O.h('p', { class: 'mt-1 text-xs text-slate-500' }, 'Masuk untuk membuat panel server')),
    O.card(form),
    O.footer());
})();
