#!/usr/bin/env node
/* ==============================================================
 * ONEPAY ID CPANEL V2  -  100% GRATIS & OPEN SOURCE (FREE!!!)
 * File ini GRATIS! Kalau kamu BELI source ini, kamu DITIPU!
 * Telegram : https://t.me/onepay_ChatZone
 * WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
 * License  : ONEPAY ID CPANEL V2 (lihat file LICENSE)
 *
 * start.mjs = launcher:
 *   - cek versi Node
 *   - jalankan server web
 *   - (opsional) install + jalankan Cloudflare Tunnel otomatis
 *
 * Cara pakai:
 *   node start.mjs                 -> menu pilihan (kalau terminal interaktif)
 *   node start.mjs --cloudflare    -> pakai Cloudflare Tunnel (link trycloudflare)
 *   node start.mjs --cloudflare --token=XXXX   -> Tunnel dengan domain sendiri
 *   node start.mjs --port          -> langsung http://domain-panel:PORT (Pterodactyl)
 *   node start.mjs --port=8080     -> tentukan port
 * Atau lewat .env: START_MODE=cloudflare|port
 * ============================================================== */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BIN_DIR = path.join(ROOT, 'bin');

const BANNER = `
╔══════════════════════════════════════════════════════════════╗
║   ONEPAY ID CPANEL V2  -  100% GRATIS & OPEN SOURCE (FREE!)   ║
║   Kalau kamu BELI source code ini, kamu sudah DITIPU!!!       ║
║   Telegram : https://t.me/onepay_ChatZone                     ║
║   WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
║   Jangan lupa ikuti saluran & group kami ya :)                ║
╚══════════════════════════════════════════════════════════════╝`;

const log = (...a) => console.log('[START]', ...a);
const children = new Set();
let stopping = false;

// ---------- load .env (supaya START_MODE, PORT, CF_TUNNEL_TOKEN kebaca) ----------
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2].replace(/^(["'])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

// ---------- args ----------
const args = process.argv.slice(2);
const argVal = (name) => {
  const a = args.find((x) => x === name || x.startsWith(name + '='));
  return a === undefined ? undefined : a.includes('=') ? a.split('=').slice(1).join('=') : true;
};

function checkNode() {
  const [maj, min] = process.versions.node.split('.').map(Number);
  if (maj < 22 || (maj === 22 && min < 13)) {
    console.error(`\n[ERROR] Node.js ${process.versions.node} terlalu lama. Butuh Node.js >= 22.13 (SQLite bawaan).`);
    console.error('        Update Node.js: https://nodejs.org  (atau ganti Docker image egg ke Node 22/24)\n');
    process.exit(1);
  }
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (a) => (rl.close(), res(a.trim()))));
}

async function chooseMode() {
  if (argVal('--cloudflare') || argVal('-c')) return 'cloudflare';
  if (argVal('--port') || argVal('-p')) return 'port';
  const envMode = String(process.env.START_MODE || '').toLowerCase();
  if (envMode === 'cloudflare' || envMode === 'port') return envMode;
  if (process.stdin.isTTY) {
    console.log('\nPilih mode:\n  1) Cloudflare Tunnel  (otomatis dapat link https, tanpa buka port)\n  2) Port langsung      (http://domain-panel-pterodactyl.com:PORT)\n');
    const a = await ask('Pilih [1/2] (default 2): ');
    return a === '1' ? 'cloudflare' : 'port';
  }
  return 'port';
}

// ---------- server ----------
function startServer(env) {
  let quickCrashes = 0;
  const run = () => {
    const t0 = Date.now();
    const p = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(ROOT, 'server', 'index.mjs')], {
      stdio: 'inherit',
      env,
    });
    children.add(p);
    p.on('exit', (code) => {
      children.delete(p);
      if (stopping) return;
      quickCrashes = Date.now() - t0 < 10000 ? quickCrashes + 1 : 0;
      if (quickCrashes >= 5) {
        console.error('[ERROR] Server crash berulang kali, berhenti. Cek log di atas.');
        shutdown(1);
        return;
      }
      log(`Server berhenti (code ${code}), restart 2 detik lagi...`);
      setTimeout(run, 2000);
    });
  };
  run();
}

async function waitHealthy(port, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ---------- cloudflared ----------
function cloudflaredAsset() {
  const arch = { x64: 'amd64', arm64: 'arm64', arm: 'arm', ia32: '386' }[process.arch];
  const base = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-';
  if (!arch) return null;
  switch (process.platform) {
    case 'linux':
    case 'android':
      return { url: `${base}linux-${arch}`, file: 'cloudflared' };
    case 'darwin':
      return { url: `${base}darwin-${arch === 'arm64' ? 'arm64' : 'amd64'}.tgz`, file: 'cloudflared', tgz: true };
    case 'win32':
      return { url: `${base}windows-${arch === '386' ? '386' : 'amd64'}.exe`, file: 'cloudflared.exe' };
    default:
      return null;
  }
}

async function ensureCloudflared() {
  // 1) sudah ada di PATH?
  const inPath = spawnSync('cloudflared', ['--version'], { encoding: 'utf8' });
  if (inPath.status === 0) {
    log('cloudflared ditemukan di sistem:', inPath.stdout.trim().split('\n')[0]);
    return 'cloudflared';
  }
  // 2) sudah pernah diunduh?
  const asset = cloudflaredAsset();
  if (!asset) throw new Error(`Platform ${process.platform}/${process.arch} belum didukung. Install cloudflared manual.`);
  const target = path.join(BIN_DIR, asset.file);
  if (fs.existsSync(target)) return target;

  // 3) download
  fs.mkdirSync(BIN_DIR, { recursive: true });
  log('Mengunduh cloudflared...', asset.url);
  const res = await fetch(asset.url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`Download gagal (HTTP ${res.status}). Cek koneksi internet / firewall.`);
  const tmp = target + (asset.tgz ? '.tgz' : '.part');
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
  if (asset.tgz) {
    const t = spawnSync('tar', ['-xzf', tmp, '-C', BIN_DIR]);
    fs.rmSync(tmp, { force: true });
    if (t.status !== 0) throw new Error('Gagal ekstrak cloudflared (butuh perintah tar).');
  } else {
    fs.renameSync(tmp, target);
  }
  if (process.platform !== 'win32') fs.chmodSync(target, 0o755);
  log('cloudflared terpasang di', target);
  return target;
}

function startTunnel(bin, port, token) {
  const argv = token
    ? ['tunnel', '--no-autoupdate', 'run', '--token', token]
    : ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`];
  const p = spawn(bin, argv, { stdio: ['ignore', 'pipe', 'pipe'] });
  children.add(p);
  let shown = false;
  const onData = (buf) => {
    const text = buf.toString();
    const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (m && !shown) {
      shown = true;
      console.log(`\n┌──────────────────────────────────────────────┐\n  🌐 LINK PANEL KAMU:\n  ${m[0]}\n└──────────────────────────────────────────────┘\n`);
    }
    if (token && !shown && /Registered tunnel connection/i.test(text)) {
      shown = true;
      console.log(`\n[CLOUDFLARE] Tunnel aktif. ${process.env.PUBLIC_URL ? 'Buka: ' + process.env.PUBLIC_URL : 'Buka hostname yang kamu set di dashboard Cloudflare Zero Trust.'}\n`);
    }
    if (/\b(ERR|error)\b/i.test(text) && !/Retrying|retrying/.test(text)) process.stderr.write('[cloudflared] ' + text);
  };
  p.stdout.on('data', onData);
  p.stderr.on('data', onData);
  p.on('exit', (code) => {
    children.delete(p);
    if (stopping) return;
    log(`cloudflared berhenti (code ${code}), restart 5 detik lagi...`);
    setTimeout(() => startTunnel(bin, port, token), 5000);
  });
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) c.kill('SIGTERM');
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// ---------- main ----------
console.log(BANNER);
checkNode();

const mode = await chooseMode();
const portArg = argVal('--port');
const port = Number(typeof portArg === 'string' ? portArg : process.env.PORT || process.env.SERVER_PORT || 3000);
const token = (typeof argVal('--token') === 'string' ? argVal('--token') : process.env.CF_TUNNEL_TOKEN) || '';

const env = {
  ...process.env,
  PORT: String(port),
  HOST: mode === 'cloudflare' ? '127.0.0.1' : '0.0.0.0',
  TRUST_PROXY: mode === 'cloudflare' ? 'true' : process.env.TRUST_PROXY || 'false',
};

log(`Mode: ${mode.toUpperCase()}  |  Port: ${port}`);
startServer(env);

if (mode === 'port') {
  const ip = process.env.SERVER_IP && process.env.SERVER_IP !== '0.0.0.0' ? process.env.SERVER_IP : 'domain-panel-pterodactyl.com';
  console.log(`\n[INFO] Buka di: ${process.env.PUBLIC_URL || `http://${ip}:${port}`}`);
  console.log('[INFO] (Pastikan port ini sudah di-allocate di panel Pterodactyl kamu)\n');
} else {
  if (!(await waitHealthy(port))) {
    console.error('[ERROR] Server web tidak merespons, tunnel dibatalkan.');
    shutdown(1);
  } else {
    try {
      const bin = await ensureCloudflared();
      startTunnel(bin, port, token);
    } catch (e) {
      console.error('[ERROR] Cloudflare:', e.message);
      console.error('        Server tetap jalan di http://127.0.0.1:' + port);
    }
  }
}
