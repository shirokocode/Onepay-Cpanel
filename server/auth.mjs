/* ==============================================================
 * ONEPAY ID CPANEL V2  -  100% GRATIS & OPEN SOURCE (FREE!!!)
 * File ini GRATIS! Kalau kamu BELI source ini, kamu DITIPU!
 * Telegram : https://t.me/onepay_ChatZone
 * WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
 * License  : ONEPAY ID CPANEL V2 (lihat file LICENSE)
 * ============================================================== */
import crypto from 'node:crypto';
import { db } from './db.mjs';
import { config } from './config.mjs';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function isHttps(req) {
  return config.TRUST_PROXY && String(req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https';
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    sha256(token),
    userId,
    now + config.SESSION_TTL_MS,
    now
  );
  return token;
}

export function sessionCookie(req, token, maxAgeSec) {
  const parts = [`${config.COOKIE_NAME}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAgeSec}`];
  if (isHttps(req)) parts.push('Secure');
  return parts.join('; ');
}

export function getUserFromReq(req) {
  const token = parseCookies(req)[config.COOKIE_NAME];
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.role, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(sha256(token));
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
    return null;
  }
  return { id: row.id, username: row.username, role: row.role };
}

export function destroySession(req) {
  const token = parseCookies(req)[config.COOKIE_NAME];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

export function destroyUserSessions(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function cleanupSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}

// ---------- rate limit login (in-memory) ----------
const fails = new Map();
const WINDOW = 10 * 60 * 1000;
const MAX_FAILS = 6;

export function loginBlocked(key) {
  const e = fails.get(key);
  if (!e) return 0;
  if (Date.now() - e.first > WINDOW) {
    fails.delete(key);
    return 0;
  }
  return e.count >= MAX_FAILS ? Math.ceil((WINDOW - (Date.now() - e.first)) / 1000) : 0;
}
export function loginFailed(key) {
  const e = fails.get(key);
  if (!e || Date.now() - e.first > WINDOW) fails.set(key, { count: 1, first: Date.now() });
  else e.count++;
}
export function loginOk(key) {
  fails.delete(key);
}
