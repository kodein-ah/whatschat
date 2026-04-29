# WhatChat — Aplikasi Chat ala WhatsApp

Frontend siap-pakai untuk aplikasi chat real-time mirip WhatsApp.
Dibangun dengan **React 18 + Vite + TypeScript + Tailwind**, dirancang untuk
disambungkan ke **backend Laravel** melalui REST API + WebSocket.

> Saat ini frontend berjalan dengan **mock auth & mock data** (disimpan di
> `localStorage` dan memori) sehingga Anda bisa langsung mencoba alurnya
> tanpa backend. Setelah backend Laravel siap, cukup setel environment
> variable, semua endpoint otomatis dipakai.

---

## 🧱 Arsitektur

```
┌────────────────────────────────────────────────┐
│                  FRONTEND (this repo)          │
│  React + Vite + TS + Tailwind + shadcn/ui      │
│  ┌──────────────┐   ┌────────────────────────┐ │
│  │ AuthContext  │   │ Pages: /auth, /        │ │
│  │ (login state)│   │ ProtectedRoute guard   │ │
│  └──────┬───────┘   └─────────┬──────────────┘ │
│         │                     │                │
│  ┌──────▼─────────────────────▼──────────────┐ │
│  │ src/lib/authService.ts                    │ │
│  │ src/lib/chatService.ts                    │ │
│  │ src/lib/api.ts  (axios + Bearer token)    │ │
│  └──────┬────────────────────────────────────┘ │
└─────────┼──────────────────────────────────────┘
          │ HTTPS REST  +  WebSocket (Echo/Reverb)
          ▼
┌────────────────────────────────────────────────┐
│            BACKEND LARAVEL (Anda buat)         │
│  Sanctum/Passport · Eloquent · Broadcasting    │
│  Storage (S3/local) · Reverb / Pusher          │
│  PostgreSQL / MySQL                            │
└────────────────────────────────────────────────┘
```

### Struktur folder penting

```
src/
├── contexts/
│   └── AuthContext.tsx        # Provider global state user login
├── components/
│   ├── ProtectedRoute.tsx     # Guard halaman yang butuh login
│   └── chat/
│       ├── Sidebar.tsx        # Daftar percakapan + search
│       ├── ConversationList.tsx
│       ├── ChatHeader.tsx     # Header chat + tombol panggilan
│       ├── ChatWindow.tsx     # Container chat aktif
│       ├── MessageBubble.tsx  # Bubble teks / gambar / file
│       ├── MessageComposer.tsx# Input + lampiran + voice
│       ├── Avatar.tsx
│       └── Tick.tsx           # ✓ ✓✓ status pesan
├── pages/
│   ├── Auth.tsx               # Login / Register email
│   └── Index.tsx              # Layar chat utama
├── lib/
│   ├── api.ts                 # Axios client (interceptor token)
│   ├── authService.ts         # register/login/logout/me
│   ├── chatService.ts         # conversations & messages
│   ├── mockData.ts            # Data dummy untuk dev
│   └── types.ts               # User, Message, Conversation, ...
└── index.css                  # Design tokens (HSL) ala WhatsApp
```

---

## ✨ Fitur

### Sudah berjalan di frontend

- 🔐 **Auth Email**: Register & Login dengan validasi (zod), password
  min 6 karakter, persist session di `localStorage`.
- 🆔 **Auto-generate User ID**: Setiap user yang daftar otomatis dapat ID
  unik (`u_xxxxxxxxxxxx`). Saat tersambung Laravel, ID akan datang dari
  `auth.users.id` (bigint / UUID).
- 🛡️ **Protected Route**: Halaman utama hanya bisa diakses setelah login,
  jika tidak diarahkan ke `/auth`.
- 💬 **Kirim pesan teks** dengan optimistic UI (langsung muncul, lalu
  diganti hasil server) + tampilan ✓ / ✓✓ / ✓✓ biru.
- 📎 **Upload lampiran**: gambar (preview), PDF, DOC, XLS, ZIP — maks 20MB.
  Pesan gambar dirender inline, file lain sebagai kartu unduhan.
- 👥 **Chat 1-on-1 & Grup**: tampilan label nama pengirim untuk pesan grup.
- 🔍 **Pencarian percakapan** di sidebar.
- 📱 **Responsif**: layout split desktop, full-screen mobile.
- 🎨 **Design system** ala WhatsApp (hijau #25D366), tokens HSL, dark mode.
- 🚪 **Logout** dengan konfirmasi visual (tombol di sidebar).

### Belum diimplementasikan (butuh backend Laravel)

- Realtime push (saat ini polling on-demand)
- Voice notes (UI tombol sudah ada, perlu MediaRecorder + endpoint)
- Voice / video call (UI tombol sudah ada, perlu WebRTC + signaling server)
- Read receipts otomatis
- Typing indicator
- Online presence
- Push notification (FCM/APNs)
- End-to-end encryption (saat ini klaim di UI hanya placeholder)

---

## 🚀 Menjalankan frontend

```bash
bun install        # atau: npm install
bun run dev        # http://localhost:5173
```

### Environment variables

Buat file `.env.local`:

```env
# URL base API Laravel Anda
VITE_API_BASE_URL=http://localhost:8000/api

# Setel ke "false" untuk pakai backend asli, default "true" (mock)
VITE_USE_MOCK=false
```

Token Sanctum/Passport disimpan otomatis di `localStorage.auth_token`
dan dikirim sebagai `Authorization: Bearer ...` oleh axios interceptor.

---

## 🛠️ PANDUAN PENGEMBANGAN BACKEND LARAVEL

Berikut **checklist lengkap** yang perlu Anda kerjakan di Laravel agar
aplikasi ini berjalan penuh.

### 1. Setup proyek Laravel + Sanctum

```bash
composer create-project laravel/laravel whatchat-api
cd whatchat-api
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

Aktifkan CORS di `config/cors.php` agar menerima origin frontend:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:5173', 'https://your-domain.com'],
'supports_credentials' => true,
```

### 2. Skema database (migration)

```php
// users (default Laravel) — tambah kolom opsional:
$table->string('avatar')->nullable();
$table->string('phone')->nullable();
$table->string('status')->default('Halo, saya pakai WhatChat!');
$table->timestamp('last_seen_at')->nullable();

// conversations
Schema::create('conversations', function (Blueprint $t) {
    $t->id();
    $t->boolean('is_group')->default(false);
    $t->string('name')->nullable();
    $t->string('avatar')->nullable();
    $t->timestamps();
});

// conversation_user (pivot)
Schema::create('conversation_user', function (Blueprint $t) {
    $t->foreignId('conversation_id')->constrained()->cascadeOnDelete();
    $t->foreignId('user_id')->constrained()->cascadeOnDelete();
    $t->timestamp('last_read_at')->nullable();
    $t->primary(['conversation_id', 'user_id']);
});

// messages
Schema::create('messages', function (Blueprint $t) {
    $t->id();
    $t->foreignId('conversation_id')->constrained()->cascadeOnDelete();
    $t->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
    $t->enum('type', ['text', 'image', 'file', 'voice'])->default('text');
    $t->text('body')->nullable();
    $t->string('attachment_url')->nullable();
    $t->string('attachment_name')->nullable();
    $t->unsignedBigInteger('attachment_size')->nullable();
    $t->string('attachment_mime')->nullable();
    $t->unsignedInteger('duration')->nullable(); // voice
    $t->timestamps();
});

// message_reads
Schema::create('message_reads', function (Blueprint $t) {
    $t->foreignId('message_id')->constrained()->cascadeOnDelete();
    $t->foreignId('user_id')->constrained()->cascadeOnDelete();
    $t->timestamp('read_at');
    $t->primary(['message_id', 'user_id']);
});
```

### 3. Endpoint REST yang diharapkan frontend

| Method | URL | Body | Response |
|---|---|---|---|
| POST | `/api/register` | `{ name, email, password }` | `{ token, user }` |
| POST | `/api/login` | `{ email, password }` | `{ token, user }` |
| POST | `/api/logout` | — | 204 |
| GET  | `/api/me` | — | `User` |
| GET  | `/api/conversations` | — | `Conversation[]` |
| GET  | `/api/conversations/{id}/messages` | — | `Message[]` |
| POST | `/api/conversations/{id}/messages` | multipart: `type`, `body`, `attachment?` | `Message` |
| POST | `/api/conversations` | `{ participant_ids[], is_group, name? }` | `Conversation` |
| POST | `/api/messages/{id}/read` | — | 204 |

Format JSON lihat `src/lib/types.ts`. Field penting: `id`, `sender_id`,
`conversation_id`, `type`, `body`, `created_at`, `status`,
`attachment{url,name,size,mime}`.

Contoh route file `routes/api.php`:
```php
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    Route::get('/conversations',                         [ConversationController::class, 'index']);
    Route::post('/conversations',                        [ConversationController::class, 'store']);
    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'index']);
    Route::post('/conversations/{conversation}/messages',[MessageController::class, 'store']);
    Route::post('/messages/{message}/read',              [MessageController::class, 'markRead']);
});
```

### 4. Auth controller (Sanctum)

```php
public function register(Request $r) {
    $data = $r->validate([
        'name' => 'required|string|max:100',
        'email' => 'required|email|unique:users,email',
        'password' => 'required|string|min:6|max:100',
    ]);
    $user = User::create([
        'name' => $data['name'],
        'email' => $data['email'],
        'password' => Hash::make($data['password']),
    ]);
    return ['token' => $user->createToken('web')->plainTextToken, 'user' => $user];
}
```

### 5. Upload lampiran

Frontend mengirim `multipart/form-data` ke `POST /conversations/{id}/messages`.
Di Laravel:
```php
public function store(Request $r, Conversation $conversation) {
    $r->validate([
        'type' => 'required|in:text,image,file,voice',
        'body' => 'nullable|string|max:5000',
        'attachment' => 'nullable|file|max:20480', // 20MB
    ]);

    $payload = [
        'conversation_id' => $conversation->id,
        'sender_id'       => $r->user()->id,
        'type'            => $r->type,
        'body'            => $r->body ?? '',
    ];

    if ($r->hasFile('attachment')) {
        $f = $r->file('attachment');
        // Pakai disk 's3' di production, 'public' untuk dev
        $path = $f->store('chat-attachments', 'public');
        $payload += [
            'attachment_url'  => Storage::url($path),
            'attachment_name' => $f->getClientOriginalName(),
            'attachment_size' => $f->getSize(),
            'attachment_mime' => $f->getMimeType(),
        ];
    }

    $msg = Message::create($payload);
    broadcast(new MessageSent($msg))->toOthers();   // realtime
    return new MessageResource($msg);
}
```
Jangan lupa `php artisan storage:link` untuk disk `public`.
Untuk production gunakan S3: `composer require league/flysystem-aws-s3-v3`.

### 6. Realtime (Laravel Reverb / Pusher)

Install Reverb (gratis, self-hosted):
```bash
php artisan install:broadcasting
php artisan reverb:start
```
Buat event `MessageSent` di-broadcast ke channel
`private-conversation.{id}` dengan payload `MessageResource`.

Di frontend, tambahkan **Laravel Echo** (perlu instalasi paket terpisah
saat siap):
```ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
window.Pusher = Pusher;
const echo = new Echo({ broadcaster: 'reverb', key: '...', wsHost: '...' });
echo.private(`conversation.${id}`).listen('MessageSent', (e) => { ... });
```

### 7. Voice notes (rencana)

1. Frontend: gunakan `MediaRecorder` untuk merekam audio (`audio/webm`).
2. Upload melalui endpoint pesan yang sama dengan `type=voice`,
   tambahkan field `duration` (detik).
3. Backend menyimpan ke storage seperti lampiran biasa.
4. Bubble pesan render `<audio controls src={attachment.url} />`.

### 8. Voice / Video call (rencana — kompleks)

- Tambahkan **WebRTC** di klien (peer-to-peer media).
- Laravel sebagai **signaling server** via WebSocket: pertukaran SDP
  offer/answer & ICE candidates.
- Untuk multi-pihak (group call), butuh **SFU** (mis. mediasoup,
  LiveKit, Janus). Pertimbangkan layanan terkelola: Twilio, Agora, Daily.

### 9. Hal lain yang direkomendasikan

- **Rate limiting** di route `login`/`register` (`throttle:5,1`).
- **Email verification** (Laravel built-in).
- **Forgot password** via `Password::sendResetLink`.
- **Pagination** untuk `GET /messages` (cursor pagination).
- **Soft delete** untuk pesan & conversation.
- **Indexing** kolom `messages(conversation_id, created_at)`.
- **Push notification** (FCM) untuk pesan masuk saat tab tertutup.

---

## 🔄 Cara mengganti dari mock ke Laravel

1. Selesaikan minimal endpoint `register`, `login`, `me`,
   `conversations`, dan `messages`.
2. Setel di `.env.local`:
   ```env
   VITE_API_BASE_URL=https://api.anda.com/api
   VITE_USE_MOCK=false
   ```
3. Restart `bun run dev`.
4. Selesai — frontend otomatis pakai endpoint Laravel.

---

## 📜 Lisensi

Bebas dipakai untuk proyek pribadi/komersial Anda.
