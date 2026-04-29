<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    // ✅ WHITELIST fields yang bisa di-assign
    protected $fillable = [
        'name',
        'email',
        'phone_number',
        'password',
        'avatar',
        'status',
        'online',
        'last_seen_at',
    ];

    // ✅ HIDE sensitive fields dari response
    protected $hidden = [
        'password',
        'remember_token',
    ];

    // ✅ CAST fields ke tipe yang benar
    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'online' => 'boolean',
    ];

    // ✅ APPEND custom attributes
    protected $appends = [];

    /**
     * ✅ PERBAIKAN 1: Relationship ke Conversations
     * User punya banyak conversations melalui pivot table conversation_user
     */
    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(
            Conversation::class,
            'conversation_user',  // Nama tabel pivot
            'user_id',            // Foreign key user
            'conversation_id'     // Foreign key conversation
        )
        ->withTimestamps()
        ->orderBy('conversation_user.updated_at', 'desc');
    }

    /**
     * ✅ PERBAIKAN 2: Relationship ke Messages
     * User punya banyak messages yang dia kirim (sender_id)
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'sender_id')
                    ->orderBy('created_at', 'desc');
    }

    /**
     * ✅ PERBAIKAN 3: Override toArray() untuk search results
     * Pastikan password TIDAK PERNAH dikirim ke frontend
     */
    public function toArray()
    {
        $array = parent::toArray();
        unset($array['password']);
        return $array;
    }

    /**
     * ✅ Helper: Cek apakah sudah chat dengan user lain
     */
    public function hasConversationWith(User $otherUser): bool
    {
        return $this->conversations()
                    ->whereHas('users', function ($q) use ($otherUser) {
                        $q->where('users.id', $otherUser->id);
                    })
                    ->exists();
    }

    /**
     * ✅ Helper: Get atau buat conversation dengan user lain
     */
    public function getOrCreateConversationWith(User $otherUser): Conversation
    {
        // ✅ Cari conversation yang ada dengan user lain
        $conversation = $this->conversations()
                             ->whereHas('users', function ($q) use ($otherUser) {
                                 $q->where('users.id', $otherUser->id);
                             })
                             ->first();

        // Jika sudah ada, return
        if ($conversation) {
            return $conversation;
        }

        // Jika belum ada, buat baru
        $conversation = Conversation::create([
            'is_group' => false,
        ]);

        // ✅ Attach kedua user ke conversation
        $conversation->users()->attach([$this->id, $otherUser->id]);

        return $conversation;
    }
}