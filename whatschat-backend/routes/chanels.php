<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// [TETAP DIPERTAHANKAN] Channel Privat untuk setiap percakapan
// Fungsinya: Memastikan hanya user dalam percakapan X yang bisa menerima pesan dari percakapan X.
Broadcast::channel('conversation.{id}', function ($user, $id) {
    // Cek apakah user yang login tergabung dalam percakapan dengan ID tersebut.
    return $user->conversations()->where('conversation_id', $id)->exists();
});


// [CHANNEL BARU] Presence Channel untuk status online global
// Fungsinya: Melacak semua user yang sedang aktif (online) di aplikasi.
// Setiap user yang login dan membuka aplikasi akan join ke channel ini.
Broadcast::channel('online-users', function ($user) {
    // Jika user sudah terautentikasi (login), izinkan dia masuk.
    // Dan kirimkan data dirinya (id, name, avatar) ke semua anggota channel lain.
    if (auth()->check()) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar,
        ];
    }
    return null; // Tolak jika belum login
});