/* ==============================================================
 * ONEPAY ID CPANEL V2  -  100% GRATIS & OPEN SOURCE (FREE!!!)
 * File ini GRATIS! Kalau kamu BELI source ini, kamu DITIPU!
 * Telegram : https://t.me/onepay_ChatZone
 * WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
 * License  : ONEPAY ID CPANEL V2 (lihat file LICENSE)
 * ============================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { config, NOTICE_BANNER } from './config.mjs';
import { seedOwner } from './db.mjs';
import { getUserFromReq, cleanupSessions } from './auth.mjs';
import { routes, HttpError } from './routes.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

// halaman yang butuh login
const PROTECTED = { '/panel.html': 'user', '/admin.html': 'owner' };

function clientIp(req) {
  if (config.TRUST_PROXY) {
    const h = req.headers['cf-connecting-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (h) return h;
  }
  return req.socket.remoteAddress || 'unknown';
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'Request terlalu besar'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(v && typeof v === 'object' ? v : {});
      } catch {
        reject(new HttpError(400, 'JSON tidak valid'));
      }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
  if (!route) {
    const pathExists = routes.some((r) => r.re.test(url.pathname));
    throw new HttpError(pathExists ? 405 : 404, 'Endpoint tidak ditemukan');
  }

  // Perlindungan CSRF: untuk request mengubah data, Origin (jika ada) harus sama dengan Host
  if (req.method !== 'GET') {
    const origin = req.headers.origin;
    if (origin) {
      let ok = false;
      try {
        ok = new URL(origin).host === req.headers.host;
      } catch {}
      if (!ok) throw new HttpError(403, 'Origin tidak diizinkan');
    }
  }

  const user = getUserFromReq(req);
  if (route.auth && !user) throw new HttpError(401, 'Belum login');
  if (route.auth === 'owner' && user.role !== 'owner') throw new HttpError(403, 'Khusus OWNER');

  const body = req.method === 'GET' ? {} : await readBody(req);
  const params = route.re.exec(url.pathname).groups || {};
  const result = await route.handler({ req, res, params, query: url.searchParams, body, user, ip: clientIp(req) });
  sendJson(res, 200, result ?? { ok: true });
}

function serveStatic(req, res, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('400 Bad Request');
  }
  if (pathname === '/') pathname = '/index.html';

  const need = PROTECTED[pathname];
  if (need) {
    const user = getUserFromReq(req);
    if (!user || (need === 'owner' && user.role !== 'owner')) {
      res.writeHead(302, { Location: user ? '/panel.html' : '/' });
      return res.end();
    }
  }

  const file = path.join(config.PUBLIC_DIR, path.normalize(pathname));
  if (!file.startsWith(config.PUBLIC_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found');
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=300',
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-OnePay-Notice', 'ONEPAY-ID-CPANEL-V2 FREE-OPEN-SOURCE https://t.me/onepay_ChatZone');
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method tidak diizinkan');
    serveStatic(req, res, url);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error('[ERROR]', e);
    if (!res.headersSent) sendJson(res, status, { error: status === 500 ? 'Terjadi kesalahan server' : e.message });
  }
});

console.log(NOTICE_BANNER);

const seeded = await seedOwner();
if (seeded) {
  console.log('\n[SETUP] Akun OWNER pertama dibuat:');
  console.log(`        username : ${seeded.username}`);
  console.log(`        password : ${seeded.password}${seeded.generated ? '   <-- simpan! hanya tampil sekali' : ''}\n`);
}

cleanupSessions();
setInterval(cleanupSessions, 60 * 60 * 1000).unref();

server.listen(config.PORT, config.HOST, () => {
  console.log(`[ONEPAY] Server jalan di http://${config.HOST}:${config.PORT}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
