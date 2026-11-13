<!--
  ==============================================================
   ONEPAY ID CPANEL V2  -  100% GRATIS & OPEN SOURCE (FREE!!!)
   File ini GRATIS! Kalau kamu BELI source ini, kamu DITIPU!
   Telegram : https://t.me/onepay_ChatZone
   WhatsApp : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
  ==============================================================
-->
# ONEPAY CPANEL (ONEPAY ID CPANEL V2)

> ## ✅ 100% GRATIS & OPEN SOURCE
> ## ⚠️ Banyak oknum yang menjual source ini padahal GRATIS. Kalau kamu BELI, kamu DITIPU!
>
> - 💬 Telegram : https://t.me/onepay_ChatZone
> - 📢 WhatsApp Channel : https://whatsapp.com/channel/0029Vb96s5LCHDyl8NQpXy1q
>
> **Jangan lupa ikuti saluran & group kami!**

Pembuat panel Pterodactyl berbasis web. Backend Node.js, database SQLite, tampilan Tailwind CSS.
**Tanpa `npm install`** (tidak ada dependency).

## Fitur
- 2 role: **OWNER** dan **USER**
  - USER: hanya bisa **membuat panel** (+ ganti password sendiri, lihat riwayat sendiri)
  - OWNER: halaman **Admin** → tambah / edit / hapus user, atur Pterodactyl, lihat semua riwayat
- Langsung memakai Pterodactyl Application API (tidak lewat API pihak ketiga)
- Password pelanggan panel diacak otomatis, ditampilkan sekali
- Login otomatis habis 24 jam, password di-hash (scrypt), rate-limit login, proteksi CSRF
- Mode jalan: **Cloudflare Tunnel otomatis** atau **port langsung** (`http://domain-panel:PORT`)

## Syarat
- **Node.js 22.13 atau lebih baru** (SQLite bawaan Node dipakai)

## Cara jalan
```bash
node start.mjs                 # menu pilihan mode
node start.mjs --cloudflare    # Cloudflare Tunnel (link https otomatis)
node start.mjs --port          # http://domain-panel-pterodactyl.com:PORT
```
Saat pertama jalan, akun OWNER dibuat dan **password-nya tampil di console** (simpan!).
Atau isi `OWNER_USER` / `OWNER_PASS` di `.env` (salin dari `.env.example`).

### Di Pterodactyl
Startup command: `node start.mjs --port` (port otomatis dari `SERVER_PORT`).
Isi variabel `START_MODE=cloudflare` kalau mau pakai tunnel.

### Cloudflare
- Tanpa token → dapat link acak `https://xxxx.trycloudflare.com` (berubah tiap restart).
- Domain tetap → buat Tunnel di Cloudflare Zero Trust, lalu `node start.mjs --cloudflare --token=TOKEN` (atau `CF_TUNNEL_TOKEN` di `.env`).
- `cloudflared` diunduh otomatis ke folder `bin/` (atau pakai yang sudah ada di sistem).

## Setelan Pterodactyl
Login sebagai OWNER → **Admin → Pterodactyl**: isi domain panel, PLTA (Application API key,
izin read & write untuk Users + Servers), Nest ID, Egg ID, Location ID, lalu klik **Simpan & Tes**.

## Struktur
```
start.mjs            launcher (Node check + server + Cloudflare)
server/              backend (config, db, auth, ptero, routes, index)
public/              frontend (index, panel, admin) + css/js
data/onepay.db       database SQLite (dibuat otomatis, jangan di-commit)
```

## License
**ONEPAY ID CPANEL V2 License** - lihat file [LICENSE](LICENSE).
Bebas dipakai & dimodifikasi, tapi **dilarang menjual source code ini**.
