/* ==============================================================
 * ONEPAY ID CPANEL V2  -  100% GRATIS & OPEN SOURCE (FREE!!!)
 * File ini GRATIS! Kalau kamu BELI source ini, kamu DITIPU!
 * Telegram : https://t.me/onepay_ChatZone
 * WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
 * License  : ONEPAY ID CPANEL V2 (lihat file LICENSE)
 * ============================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite'; // SQLite bawaan Node.js (butuh Node >= 22.13)
import { config } from './config.mjs';

fs.mkdirSync(config.DATA_DIR, { recursive: true });
export const db = new DatabaseSync(path.join(config.DATA_DIR, 'onepay.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner','user')),
  created_at    INTEGER NOT NULL,
  last_login    INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS panels (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by     TEXT NOT NULL,
  panel_username TEXT NOT NULL,
  email          TEXT NOT NULL,
  ram            INTEGER NOT NULL,
  disk           INTEGER NOT NULL,
  cpu            INTEGER NOT NULL,
  ptero_user_id  INTEGER,
  ptero_server_id INTEGER,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

// ---------- password hashing (scrypt, tanpa dependency) ----------
const scrypt = promisify(crypto.scrypt);

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [, saltHex, hashHex] = stored.split('$');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ---------- settings ----------
export function getSettings() {
  const out = { ...config.DEFAULT_SETTINGS };
  for (const r of db.prepare('SELECT key, value FROM settings').all()) out[r.key] = r.value;
  return out;
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value ?? ''));
}

// ---------- seed owner pertama ----------
export async function seedOwner() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (c > 0) return null;
  const password = config.OWNER_PASS || crypto.randomBytes(9).toString('base64url');
  await createUser(config.OWNER_USER, password, 'owner');
  return { username: config.OWNER_USER, password, generated: !config.OWNER_PASS };
}

export async function createUser(username, password, role) {
  const hash = await hashPassword(password);
  const r = db
    .prepare('INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)')
    .run(username, hash, role, Date.now());
  return Number(r.lastInsertRowid);
}
