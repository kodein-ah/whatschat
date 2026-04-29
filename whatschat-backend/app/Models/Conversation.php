<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'is_group',
        'avatar',
    ];

    protected $casts = [
        'is_group' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * ✅ PERBAIKAN 1: Relationship ke Users/Participants
     * Conversation punya banyak users melalui pivot table conversation_user
     * Ganti nama dari users() menjadi participants() untuk clarity
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'conversation_user',      // Nama tabel pivot
            'conversation_id',        // Foreign key conversation
            'user_id'                 // Foreign key user
        )
        ->withTimestamps()
        ->select('users.id', 'users.name', 'users.email', 'users.avatar', 'users.online', 'users.status');
    }

    /**
     * ✅ Alias: participants() untuk consistency
     */
    public function participants(): BelongsToMany
    {
        return $this->users();
    }

    /**
     * ✅ PERBAIKAN 2: Relationship ke Messages
     * Conversation punya banyak messages
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)
                    ->orderBy('created_at', 'asc');
    }

    /**
     * ✅ PERBAIKAN 3: Accessor untuk last_message
     * Untuk mendapatkan pesan terakhir tanpa query tambahan
     */
    public function getLastMessageAttribute()
    {
        return $this->messages()
                    ->with('sender:id,name,avatar')
                    ->latest()
                    ->first();
    }

    /**
     * ✅ PERBAIKAN 4: Accessor untuk unread_count
     * Hitung berapa pesan yang belum dibaca
     */
    public function getUnreadCountAttribute()
    {
        return $this->messages()
                    ->where('status', '!=', 'read')
                    ->count();
    }

    /**
     * ✅ Scope: Get conversations untuk specific user
     */
    public function scopeForUser($query, $userId)
    {
        return $query->whereHas('users', function ($q) use ($userId) {
            $q->where('users.id', $userId);
        });
    }

    /**
     * ✅ Helper: Get display name
     * Untuk group: nama group
     * Untuk private: nama user lain
     */
    public function getDisplayName($currentUserId = null): string
    {
        if ($this->is_group) {
            return $this->name ?? 'Grup Tanpa Nama';
        }

        // Untuk private chat, cari user lain (bukan current user)
        $otherUser = $this->users()
                          ->where('users.id', '!=', $currentUserId)
                          ->first();

        return $otherUser?->name ?? 'User WhatChat';
    }
}