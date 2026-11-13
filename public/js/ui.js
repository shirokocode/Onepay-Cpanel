/*
ONEPAY ID CPANEL V2 - 100% GRATIS & OPEN SOURCE (FREE!!!)
File ini GRATIS! Kalau kamu BELI source ini, kamu DITIPU!
Telegram : https://t.me/onepay_ChatZone
WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
License  : ONEPAY ID CPANEL V2 (lihat file LICENSE)
*/
/* ui.js - komponen UI (Tailwind) + ikon SVG + skeleton. Tema putih, ukuran kecil. */
const OP = (() => {
  // ---------- helper DOM (aman XSS: pakai createElement/textNode) ----------
  const $ = (s, r = document) => r.querySelector(s);

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  const api = (...a) => OPAPI.request(...a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // tahan minimal 250ms supaya skeleton tidak berkedip kalau data datang terlalu cepat
  const load = (promise, min = 250) => Promise.all([promise, sleep(min)]).then(([v]) => v);

  // ---------- ikon (inline SVG, tanpa file / CDN) ----------
  const ICONS = {
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    logout: '<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-4 4.8M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 3-.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
    server: '<rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    telegram: '<path d="m22 3-7 18-4-8-8-4Z"/><path d="M22 3 11 13"/>',
    whatsapp: '<path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.2A8.5 8.5 0 1 1 20 11.5Z"/><path d="M8 8c1 4 3 6 7 7"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    spinner: '<circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  };

  function icon(name, cls = 'size-4') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', cls + ' shrink-0');
    svg.innerHTML = ICONS[name] || ICONS.info; // string statis di atas, bukan data user
    return svg;
  }

  // ---------- tombol ----------
  const VARIANT = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50 active:bg-red-100',
    dangerSolid: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  };
  const SIZE = {
    md: 'h-10 px-4 text-sm gap-2',
    sm: 'h-8 px-3 text-xs gap-1.5',
    icon: 'size-9',
  };
  const btnClass = (variant, size, cls) =>
    `inline-flex items-center justify-center rounded-lg font-medium transition-colors select-none ` +
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ` +
    `disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT[variant]} ${SIZE[size]} ${cls}`;

  // button({ label, icon, onClick, variant, size, type, cls, aria })
  function button({ label = '', icon: ic, onClick, variant = 'primary', size = 'md', type = 'button', cls = '', aria } = {}) {
    const btn = h('button', { type, class: btnClass(variant, size, cls) });
    btn._paint = (busy) =>
      btn.replaceChildren(
        ...(busy ? [icon('spinner', 'size-4 animate-spin motion-reduce:animate-none')] : ic ? [icon(ic)] : []),
        ...(label ? [label] : [])
      );
    btn._paint(false);
    if (!label) btn.setAttribute('aria-label', aria || 'Tombol');
    if (onClick) btn.addEventListener('click', onClick);
    return btn;
  }
  const busy = (btn, on) => { btn.disabled = on; btn._paint(on); };

  function linkButton({ href, label, icon: ic, variant = 'secondary', size = 'md', cls = '', external = false }) {
    const a = h('a', { href, class: btnClass(variant, size, cls) });
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.append(...(ic ? [icon(ic)] : []), label);
    return a;
  }

  // ---------- form ----------
  const INPUT =
    'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 ' +
    'placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ' +
    'disabled:bg-slate-100 sm:text-sm';

  // field({ label, hint, type, ...atribut }) -> elemen; elemen.input = <input>
  function field({ label, hint, ...attrs }) {
    const input = h('input', { class: INPUT, ...attrs });
    let control = input;
    if (attrs.type === 'password') {
      input.classList.add('pr-10');
      const toggle = button({ icon: 'eye', variant: 'ghost', size: 'icon', cls: '!size-8 absolute right-1 top-1/2 -translate-y-1/2 text-slate-500', aria: 'Lihat password' });
      toggle.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        toggle.replaceChildren(icon(show ? 'eyeoff' : 'eye'));
        toggle.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Lihat password');
      });
      control = h('div', { class: 'relative' }, input, toggle);
    }
    const wrap = h('div', {},
      h('label', { class: 'mb-1 block text-xs font-medium text-slate-600' }, label, h('div', { class: 'mt-1' }, control)),
      hint ? h('p', { class: 'mt-1 text-xs text-slate-500' }, hint) : null);
    wrap.input = input;
    return wrap;
  }

  function select({ label, options, value }) {
    const el = h('select', { class: INPUT },
      options.map(([v, t]) => h('option', { value: v, selected: v === value }, t)));
    const wrap = h('label', { class: 'block text-xs font-medium text-slate-600' }, label, h('div', { class: 'mt-1' }, el));
    wrap.input = el;
    return wrap;
  }

  function textarea({ label, name, value = '', rows = 5 }) {
    const el = h('textarea', { name, rows, class: INPUT.replace('h-10 ', '') + ' py-2' }, value);
    const wrap = h('label', { class: 'block text-xs font-medium text-slate-600' }, label, h('div', { class: 'mt-1' }, el));
    wrap.input = el;
    return wrap;
  }

  // ---------- kartu, badge, avatar, alert ----------
  const card = (...kids) => h('section', { class: 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm' }, ...kids);

  const BADGE = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
  const badge = (label, kind = 'blue') =>
    h('span', { class: `inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${BADGE[kind]}` }, label);

  const roleBadge = (role) => badge(role === 'owner' ? 'Owner' : 'User', role === 'owner' ? 'amber' : 'blue');

  const avatar = (name) =>
    h('div', { class: 'flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700' },
      String(name || '?').charAt(0).toUpperCase());

  const ALERT = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  const alertBox = (text, kind = 'amber', ic = 'alert') =>
    h('div', { class: `flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${ALERT[kind]}`, role: 'alert' }, icon(ic, 'size-4 mt-px'), h('span', {}, text));

  const emptyState = (ic, title, text) =>
    h('div', { class: 'flex flex-col items-center py-8 text-center' },
      h('div', { class: 'flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400' }, icon(ic, 'size-5')),
      h('p', { class: 'mt-3 text-sm font-medium text-slate-700' }, title),
      text ? h('p', { class: 'mt-1 text-xs text-slate-500' }, text) : null);

  const dot = () => h('span', { class: 'size-1 rounded-full bg-slate-300' });

  // ---------- layout ----------
  function topBar(title, ...actions) {
    return h('header', { class: 'sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur' },
      h('div', { class: 'flex h-12 items-center justify-between gap-2' },
        h('div', { class: 'min-w-0' },
          h('p', { class: 'text-[10px] font-semibold uppercase tracking-widest text-blue-600' }, 'ONEPAY CPANEL'),
          h('h1', { class: 'truncate text-sm font-semibold text-slate-900' }, title)),
        h('div', { class: 'flex items-center gap-1.5' }, ...actions)));
  }

  function footer() {
    return h('footer', { class: 'mt-6 border-t border-slate-200 pt-4 text-center' },
      h('p', { class: 'text-[11px] leading-relaxed text-slate-500' },
        '100% GRATIS & OPEN SOURCE. Kalau kamu BELI source ini, kamu DITIPU!'),
      h('div', { class: 'mt-3 grid grid-cols-2 gap-2' },
        linkButton({ href: 'https://t.me/onepay_ChatZone', label: 'Telegram Group', icon: 'telegram', size: 'sm', external: true }),
        linkButton({ href: 'https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q', label: 'WhatsApp Channel', icon: 'whatsapp', size: 'sm', external: true })));
  }

  // ---------- toast ----------
  function toast(msg, type = 'ok') {
    const el = h('div', {
      role: 'status',
      class: 'pointer-events-auto flex max-w-[88vw] items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white shadow-lg ' +
        (type === 'err' ? 'bg-red-600' : 'bg-slate-900'),
    }, icon(type === 'err' ? 'alert' : 'check', 'size-4'), h('span', {}, msg));
    let box = $('#toasts');
    if (!box) {
      box = h('div', { id: 'toasts', class: 'pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4' });
      document.body.append(box);
    }
    box.append(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ---------- bottom sheet ----------
  function sheet(title, body) {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const overlay = h('div', { class: 'fixed inset-0 z-50 flex items-end bg-slate-900/40', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'mx-auto max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl' },
        h('div', { class: 'mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200' }),
        h('div', { class: 'mb-3 flex items-center justify-between' },
          h('h2', { class: 'text-base font-semibold text-slate-900' }, title),
          button({ icon: 'close', variant: 'ghost', size: 'icon', aria: 'Tutup', onClick: () => close() })),
        body));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    document.body.append(overlay);
    return { el: overlay, close };
  }

  // ---------- skeleton (bentuknya sama dengan konten asli) ----------
  const sk = (cls) => h('div', { class: 'animate-pulse rounded bg-slate-200 motion-reduce:animate-none ' + cls });
  const skCircle = (size = 'size-8') => sk(`${size} !rounded-full shrink-0`);
  const skField = () => h('div', { class: 'space-y-1.5' }, sk('h-3 w-1/4'), sk('h-10 w-full !rounded-lg'));
  const skForm = (n = 2) => card(h('div', { class: 'space-y-4' }, Array.from({ length: n }, skField), sk('h-10 w-full !rounded-lg')));
  const skUserCard = () => card(
    h('div', { class: 'flex items-center gap-3' }, skCircle(),
      h('div', { class: 'flex-1 space-y-1.5' }, sk('h-3.5 w-1/3'), sk('h-3 w-1/5'))),
    sk('mt-3 h-3 w-1/2'),
    h('div', { class: 'mt-3 grid grid-cols-2 gap-2' }, sk('h-8 !rounded-lg'), sk('h-8 !rounded-lg')));
  const skRowCard = () => card(
    h('div', { class: 'flex items-center justify-between gap-3' }, sk('h-3.5 w-1/3'), sk('h-4 w-12 !rounded-full')),
    sk('mt-2.5 h-3 w-1/2'));
  const skList = (n = 3, kind = skUserCard) => h('div', { class: 'space-y-3' }, Array.from({ length: n }, kind));
  const skPanelForm = () => card(h('div', { class: 'space-y-4' },
    skField(),
    h('div', { class: 'space-y-1.5' }, sk('h-3 w-1/4'),
      h('div', { class: 'grid grid-cols-3 gap-2' }, Array.from({ length: 11 }, () => sk('h-12 !rounded-lg')))),
    sk('h-10 w-full !rounded-lg')));
  const skResult = () => card(
    sk('h-4 w-1/2'),
    h('div', { class: 'mt-4 space-y-3' }, Array.from({ length: 4 }, () =>
      h('div', { class: 'flex items-center justify-between gap-3' },
        h('div', { class: 'flex-1 space-y-1.5' }, sk('h-3 w-1/5'), sk('h-3.5 w-3/5')), sk('size-9 !rounded-lg')))));

  // ---------- util ----------
  const fmtDate = (ms) => (ms ? new Date(ms).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum pernah');
  const fmtRam = (mb) => (mb === 0 ? 'UNLIMITED' : mb / 1024 + ' GB');

  async function copy(text, btn) {
    try {
      await navigator.clipboard.writeText(String(text));
    } catch {
      const t = h('textarea', { class: 'fixed opacity-0' });
      t.value = String(text);
      document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
    }
    if (btn && !btn.textContent.trim()) {
      btn.replaceChildren(icon('check'));
      btn.classList.add('!text-emerald-600');
      setTimeout(() => { btn._paint(false); btn.classList.remove('!text-emerald-600'); }, 1800);
    }
    toast('Berhasil disalin');
  }

  async function logout() {
    try { await api('/api/logout', { method: 'POST', noRedirect: true }); } catch {}
    location.href = '/';
  }

  return {
    $, h, api, load, icon, button, busy, linkButton, field, select, textarea,
    card, badge, roleBadge, avatar, alertBox, emptyState, dot,
    topBar, footer, toast, sheet,
    sk, skCircle, skForm, skUserCard, skRowCard, skList, skPanelForm, skResult,
    fmtDate, fmtRam, copy, logout,
  };
})();
