/* ==============================================================
 * ONEPAY ID CPANEL V2  -  100% GRATIS & OPEN SOURCE (FREE!!!)
 * File ini GRATIS! Kalau kamu BELI source ini, kamu DITIPU!
 * Telegram : https://t.me/onepay_ChatZone
 * WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
 * License  : ONEPAY ID CPANEL V2 (lihat file LICENSE)
 * ============================================================== */
import { db, getSettings, setSetting, hashPassword, verifyPassword, createUser } from './db.mjs';
import { config, PACKAGES } from './config.mjs';
import {
  createSession,
  sessionCookie,
  destroySession,
  destroyUserSessions,
  loginBlocked,
  loginFailed,
  loginOk,
} from './auth.mjs';
import { createPanel, testConnection, PteroError } from './ptero.mjs';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (m) => new HttpError(400, m);

const USER_RE = /^[a-zA-Z0-9_.-]{3,32}$/;
const PANEL_RE = /^[a-z0-9][a-z0-9_.-]{1,30}[a-z0-9]$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function checkPassword(p) {
  if (typeof p !== 'string' || p.length < 6 || p.length > 128) throw bad('Password minimal 6 karakter');
}

const ownerCount = () => db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='owner'").get().c;

const publicUser = (u) => ({ id: u.id, username: u.username, role: u.role });

// =============== definisi route ===============
// auth: null (publik) | 'user' (login) | 'owner'
export const routes = [];
const add = (method, pattern, auth, handler) =>
  routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), auth, handler });

add('GET', '/api/health', null, () => ({ ok: true }));

add('GET', '/api/public-config', null, () => {
  const s = getSettings();
  return {
    app: config.APP_NAME,
    version: config.VERSION,
    telegram: config.LINKS.telegram,
    whatsappChannel: config.LINKS.whatsappChannel,
    contactWa: s.contact_wa,
  };
});

// ---------- auth ----------
add('POST', '/api/login', null, async ({ req, res, body, ip }) => {
  const username = str(body.username);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) throw bad('Username & password wajib diisi');

  const key = `${ip}|${username.toLowerCase()}`;
  const wait = loginBlocked(key);
  if (wait) throw new HttpError(429, `Terlalu banyak percobaan. Coba lagi ${Math.ceil(wait / 60)} menit lagi.`);

  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  const ok = u ? await verifyPassword(password, u.password_hash) : (await hashPassword('x'), false);
  if (!ok) {
    loginFailed(key);
    throw new HttpError(401, 'Username atau password salah');
  }
  loginOk(key);
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Date.now(), u.id);
  const token = createSession(u.id);
  res.setHeader('Set-Cookie', sessionCookie(req, token, config.SESSION_TTL_MS / 1000));
  return { user: publicUser(u) };
});

add('POST', '/api/logout', null, ({ req, res }) => {
  destroySession(req);
  res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
  return { ok: true };
});

add('GET', '/api/me', 'user', ({ user }) => ({ user: publicUser(user) }));

add('POST', '/api/me/password', 'user', async ({ user, body }) => {
  checkPassword(body.newPassword);
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  if (!(await verifyPassword(String(body.currentPassword || ''), u.password_hash)))
    throw new HttpError(403, 'Password lama salah');
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(body.newPassword), user.id);
  return { ok: true };
});

// ---------- panel (user & owner) ----------
add('GET', '/api/panel/options', 'user', () => {
  const s = getSettings();
  return {
    packages: PACKAGES.map(({ id, label, cpu }) => ({ id, label, cpu })),
    domain: s.ptero_domain,
    rulesNote: s.rules_note,
    configured: Boolean(s.ptero_domain && s.ptero_plta),
  };
});

add('POST', '/api/panel/create', 'user', async ({ user, body }) => {
  const username = str(body.username).toLowerCase();
  const pkg = PACKAGES.find((p) => p.id === String(body.storage));
  if (!PANEL_RE.test(username)) throw bad('Username panel 3-32 karakter: huruf kecil, angka, titik, _ atau -');
  if (!pkg) throw bad('Pilih storage dulu');

  const s = getSettings();
  try {
    const r = await createPanel(s, { username, ram: pkg.ram, disk: pkg.disk, cpu: pkg.cpu });
    db.prepare(
      `INSERT INTO panels (user_id, created_by, panel_username, email, ram, disk, cpu, ptero_user_id, ptero_server_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(user.id, user.username, username, r.email, pkg.ram, pkg.disk, pkg.cpu, r.pteroUserId, r.pteroServerId, Date.now());
    return {
      email: r.email,
      username,
      password: r.password,
      ram: pkg.ram === 0 ? 'UNLIMITED' : pkg.label,
      cpu: pkg.cpu === 0 ? '0%' : pkg.cpu + '%',
      domain: baseDomain(s),
    };
  } catch (e) {
    if (e instanceof PteroError) throw new HttpError(e.status, e.message);
    throw e;
  }
});

function baseDomain(s) {
  const d = String(s.ptero_domain || '').trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(d) ? d : 'https://' + d;
}

add('GET', '/api/panel/history', 'user', ({ user, query }) => {
  const all = user.role === 'owner' && query.get('all') === '1';
  const rows = db
    .prepare(
      `SELECT id, created_by, panel_username, email, ram, cpu, created_at FROM panels
       ${all ? '' : 'WHERE user_id = ?'} ORDER BY id DESC LIMIT 200`
    )
    .all(...(all ? [] : [user.id]));
  return { panels: rows };
});

// ---------- admin: users ----------
add('GET', '/api/admin/users', 'owner', () => {
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.created_at, u.last_login,
              (SELECT COUNT(*) FROM panels p WHERE p.user_id = u.id) AS panel_count
       FROM users u ORDER BY u.id`
    )
    .all();
  return { users: rows };
});

add('POST', '/api/admin/users', 'owner', async ({ body }) => {
  const username = str(body.username);
  const role = body.role === 'owner' ? 'owner' : 'user';
  if (!USER_RE.test(username)) throw bad('Username 3-32 karakter (huruf, angka, . _ -)');
  checkPassword(body.password);
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw new HttpError(409, 'Username sudah dipakai');
  const id = await createUser(username, body.password, role);
  return { id };
});

add('PUT', '/api/admin/users/:id', 'owner', async ({ params, body, user }) => {
  const id = Number(params.id);
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) throw new HttpError(404, 'User tidak ditemukan');

  let { username, role } = target;
  let sessionsReset = false;

  if (body.username !== undefined) {
    username = str(body.username);
    if (!USER_RE.test(username)) throw bad('Username 3-32 karakter (huruf, angka, . _ -)');
    const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
    if (dup) throw new HttpError(409, 'Username sudah dipakai');
  }
  if (body.role !== undefined) {
    if (!['owner', 'user'].includes(body.role)) throw bad('Role tidak valid');
    if (target.role === 'owner' && body.role !== 'owner' && ownerCount() <= 1)
      throw bad('Tidak bisa menurunkan OWNER terakhir');
    if (body.role !== target.role) sessionsReset = true;
    role = body.role;
  }
  let hash = target.password_hash;
  if (body.password) {
    checkPassword(body.password);
    hash = await hashPassword(body.password);
    sessionsReset = true;
  }

  db.prepare('UPDATE users SET username = ?, role = ?, password_hash = ? WHERE id = ?').run(username, role, hash, id);
  if (sessionsReset && id !== user.id) destroyUserSessions(id); // paksa login ulang
  return { ok: true };
});

add('DELETE', '/api/admin/users/:id', 'owner', ({ params, user }) => {
  const id = Number(params.id);
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) throw new HttpError(404, 'User tidak ditemukan');
  if (id === user.id) throw bad('Kamu tidak bisa menghapus akunmu sendiri');
  if (target.role === 'owner' && ownerCount() <= 1) throw bad('Tidak bisa menghapus OWNER terakhir');
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return { ok: true };
});

// ---------- admin: settings ----------
const SETTING_KEYS = ['ptero_domain', 'ptero_plta', 'ptero_nest', 'ptero_egg', 'ptero_location', 'email_domain', 'contact_wa', 'rules_note'];

add('GET', '/api/admin/settings', 'owner', () => {
  const s = getSettings();
  const out = {};
  for (const k of SETTING_KEYS) out[k] = s[k];
  out.plta_set = Boolean(s.ptero_plta);
  out.plta_hint = s.ptero_plta ? s.ptero_plta.slice(-4) : '';
  delete out.ptero_plta; // PLTA tidak pernah dikirim balik ke browser
  return out;
});

add('PUT', '/api/admin/settings', 'owner', ({ body }) => {
  for (const k of SETTING_KEYS) {
    if (body[k] === undefined) continue;
    let v = String(body[k]).trim();
    if (k === 'ptero_plta' && v === '') continue; // kosong = jangan ubah
    if (['ptero_nest', 'ptero_egg', 'ptero_location'].includes(k) && !/^\d+$/.test(v)) throw bad(`${k} harus angka`);
    if (k === 'email_domain' && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v)) throw bad('Domain email tidak valid');
    if (k === 'rules_note') v = String(body[k]).slice(0, 2000);
    setSetting(k, v);
  }
  return { ok: true };
});

add('POST', '/api/admin/settings/test', 'owner', async () => {
  try {
    return await testConnection(getSettings());
  } catch (e) {
    if (e instanceof PteroError) throw new HttpError(e.status, e.message);
    throw e;
  }
});
