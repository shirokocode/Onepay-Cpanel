/* ==============================================================
 * ONEPAY ID CPANEL V2  -  100% GRATIS & OPEN SOURCE (FREE!!!)
 * File ini GRATIS! Kalau kamu BELI source ini, kamu DITIPU!
 * Telegram : https://t.me/onepay_ChatZone
 * WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
 * License  : ONEPAY ID CPANEL V2 (lihat file LICENSE)
 * ============================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- load .env sederhana (tanpa dependency) ---
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

const env = process.env;

export const config = {
  APP_NAME: 'ONEPAY CPANEL',
  VERSION: '2.0.0',
  PORT: Number(env.PORT || env.SERVER_PORT || 3000),
  HOST: env.HOST || '0.0.0.0',
  TRUST_PROXY: String(env.TRUST_PROXY || '').toLowerCase() === 'true',
  DATA_DIR: path.join(ROOT, 'data'),
  PUBLIC_DIR: path.join(ROOT, 'public'),
  SESSION_TTL_MS: 24 * 60 * 60 * 1000, // login otomatis habis 24 jam (sama seperti versi lama)
  COOKIE_NAME: 'onepay_sid',
  OWNER_USER: env.OWNER_USER || 'owner',
  OWNER_PASS: env.OWNER_PASS || '',
  LINKS: {
    telegram: 'https://t.me/onepay_ChatZone',
    whatsappChannel: 'https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q',
  },
  // Nilai awal setelan Pterodactyl (bisa diubah dari halaman admin)
  DEFAULT_SETTINGS: {
    ptero_domain: env.PTERO_DOMAIN || '',
    ptero_plta: env.PTERO_PLTA || '',
    ptero_nest: env.PTERO_NEST || '5',
    ptero_egg: env.PTERO_EGG || '15',
    ptero_location: env.PTERO_LOCATION || '1',
    email_domain: 'example.com',
    contact_wa: '',
    rules_note:
      'PANEL BERLAKU 30 HARI\nGARANSI 15 HARI\nDILARANG pasang SC DDOS\nDILARANG sebar domain\nDILARANG sebar data panel\nCLAIM GARANSI WAJIB ADA STRUK',
  },
};

// Paket storage: value dalam MB. cpu mengikuti tabel versi lama (1GB=120% ... 10GB=300%)
export const PACKAGES = [
  ...Array.from({ length: 10 }, (_, i) => ({
    id: String((i + 1) * 1024),
    label: `${i + 1} GB`,
    ram: (i + 1) * 1024,
    disk: (i + 1) * 1024,
    cpu: 120 + i * 20,
  })),
  { id: '0', label: 'UNLIMITED', ram: 0, disk: 0, cpu: 0 },
];

export const NOTICE_BANNER = `
╔══════════════════════════════════════════════════════════════╗
║   ONEPAY ID CPANEL V2  -  100% GRATIS & OPEN SOURCE (FREE!)   ║
║   Kalau kamu BELI source code ini, kamu sudah DITIPU!!!       ║
║   Telegram : https://t.me/onepay_ChatZone                     ║
║   WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
║   Jangan lupa ikuti saluran & group kami ya :)                ║
╚══════════════════════════════════════════════════════════════╝`;
