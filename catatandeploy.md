# 🚀 VERCEL CLI DEPLOYMENT GUIDE (FOR TERMUX ARCHITECTS)
**Project:** Nexus WhatChat (Frontend & Backend Laravel)
**Tools:** Vercel CLI, Acode Editor, PostgreSQL (Neon.tech)

## 🛠️ 1. GLOBAL SETUP (ONCE ONLY)
Jalankan ini di Terminal Termux lu untuk install senjata utamanya:
```bash
npm install -g vercel
vercel login
# Masukkan email -> Buka link verifikasi di browser HP -> Login Sukses!

⚛️ 2. DEPLOY FRONTEND (React + Vite)

Lakukan ini di folder whatschat:

1.  Buat file vercel.json (Root folder):

{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}

2.  Eksekusi Deployment:

vercel --prod

Pilih Default untuk semua pertanyaan. URL Live lu bakal dapet di akhir log.

🐘 3. DEPLOY BACKEND (Laravel API)

Lakukan ini di folder whatschat-backend. WARNING: Vercel bersifat Serverless,
wajib ganti SQLite ke PostgreSQL (Neon.tech/Supabase) sebelum deploy.

1.  Buat folder api dan file api/index.php:

<?php
// Jembatan Vercel ke core Laravel
require __DIR__ . '/../public/index.php';

2.  Buat file vercel.json (Root folder backend):

{
  "version": 2,
  "functions": {
    "api/index.php": { "runtime": "vercel-php@0.7.2" }
  },
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.php" },
    { "src": "/sanctum/csrf-cookie", "dest": "api/index.php" },
    { "src": "/(.*)", "dest": "api/index.php" }
  ]
}

3.  Ganti Driver Websocket: Ubah BROADCAST_CONNECTION=reverb jadi pusher di .env
    (Karena Reverb butuh server standby, Vercel Serverless tidak mendukungnya).

4.  Eksekusi Deployment:

vercel --prod

🚨 PENTING: ENVIRONMENT VARIABLES

Setelah deploy, lu WAJIB masuk ke Dashboard Vercel (Browser) untuk set:

  - Di Backend: APP_KEY, DB_URL, PUSHER_APP_ID, dll.
  - Di Frontend: VITE_API_BASE_URL (Arahkan ke URL Vercel Backend lu).

STATUS: ARCHITECTURE PREPARED. READY FOR DEPLOYMENT COMMAND! 🚀🔥🦾😎