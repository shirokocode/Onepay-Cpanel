/*
ONEPAY ID CPANEL V2 - 100% GRATIS & OPEN SOURCE (FREE!!!)
File ini GRATIS! Kalau kamu BELI source ini, kamu DITIPU!
Telegram : https://t.me/onepay_ChatZone
WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
License  : ONEPAY ID CPANEL V2 (lihat file LICENSE)
*/
/* api.js - helper fetch ke backend */
const OPAPI = {
  async request(path, { method = 'GET', body, noRedirect = false } = {}) {
    const res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (res.status === 401 && !noRedirect) {
      location.href = '/';
      throw new Error('Sesi habis, silakan login ulang');
    }
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
    return data;
  },
};
