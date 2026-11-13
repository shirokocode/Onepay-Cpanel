/* ==============================================================
 * ONEPAY ID CPANEL V2  -  100% GRATIS & OPEN SOURCE (FREE!!!)
 * File ini GRATIS! Kalau kamu BELI source ini, kamu DITIPU!
 * Telegram : https://t.me/onepay_ChatZone
 * WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
 * License  : ONEPAY ID CPANEL V2 (lihat file LICENSE)
 *
 * Klien Pterodactyl Application API (langsung, tanpa API pihak ketiga).
 * ============================================================== */
import crypto from 'node:crypto';

export class PteroError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

function baseUrl(s) {
  let d = String(s.ptero_domain || '').trim().replace(/\/+$/, '');
  if (!d) throw new PteroError('Domain Pterodactyl belum diatur (Admin > Pterodactyl)', 400);
  if (!/^https?:\/\//i.test(d)) d = 'https://' + d;
  return d;
}

async function call(s, method, path, body) {
  if (!s.ptero_plta) throw new PteroError('PLTA (Application API key) belum diatur', 400);
  let res;
  try {
    res = await fetch(`${baseUrl(s)}/api/application${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${s.ptero_plta}`,
        Accept: 'application/vnd.pterodactyl.v1+json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(25000),
    });
  } catch (e) {
    throw new PteroError(`Tidak bisa terhubung ke Pterodactyl: ${e.cause?.code || e.message}`);
  }
  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const detail = data?.errors?.map((e) => e.detail).filter(Boolean).join('; ');
    throw new PteroError(`Pterodactyl: ${detail || 'HTTP ' + res.status}`, res.status === 401 ? 400 : 502);
  }
  return data;
}

export async function testConnection(s) {
  const d = await call(s, 'GET', '/users?per_page=1');
  const egg = await call(s, 'GET', `/nests/${s.ptero_nest}/eggs/${s.ptero_egg}`).catch(() => null);
  return { users: d?.meta?.pagination?.total ?? 0, egg: egg?.attributes?.name || null };
}

export function randomPassword(len = 12) {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(len), (b) => chars[b % chars.length]).join('');
}

export async function createPanel(s, { username, ram, disk, cpu }) {
  const password = randomPassword();
  const email = `${username}@${s.email_domain || 'example.com'}`;

  // 1) buat user
  const u = await call(s, 'POST', '/users', {
    email,
    username,
    first_name: username,
    last_name: 'Panel',
    password,
    language: 'en',
  });
  const userId = u.attributes.id;

  try {
    // 2) ambil detail egg (docker image, startup, env default)
    const egg = await call(s, 'GET', `/nests/${s.ptero_nest}/eggs/${s.ptero_egg}?include=variables`);
    const environment = {};
    for (const v of egg.attributes.relationships?.variables?.data || []) {
      environment[v.attributes.env_variable] = v.attributes.default_value;
    }

    // 3) buat server
    const sv = await call(s, 'POST', '/servers', {
      name: username,
      description: 'Created by ONEPAY CPANEL',
      user: userId,
      egg: Number(s.ptero_egg),
      docker_image: egg.attributes.docker_image,
      startup: egg.attributes.startup,
      environment,
      limits: { memory: ram, swap: 0, disk, io: 500, cpu },
      feature_limits: { databases: 5, backups: 5, allocations: 5 },
      deploy: { locations: [Number(s.ptero_location)], dedicated_ip: false, port_range: [] },
    });

    return { email, password, pteroUserId: userId, pteroServerId: sv.attributes.id };
  } catch (e) {
    // rollback: hapus user supaya tidak nyangkut tanpa server
    await call(s, 'DELETE', `/users/${userId}`).catch(() => {});
    throw e;
  }
}
