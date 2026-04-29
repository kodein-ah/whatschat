<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'type',
        'body',
        'attachment_url',
        'attachment_name',
        'attachment_size',
        'attachment_mime',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * ✅ Relationship: Sender dari message
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id')
                    ->select('id', 'name', 'email', 'avatar', 'online');
    }

    /**
     * ✅ Relationship: Conversation
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * ✅ Scope: Latest messages
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    /**
     * ✅ Scope: Unread messages
     */
    public function scopeUnread($query)
    {
        return $query->where('status', '!=', 'read');
    }

    /**
     * ✅ Helper: Mark as read
     */
    public function markAsRead()
    {
        $this->update(['status' => 'read']);
    }

    /**
     * ✅ Helper: Mark as delivered
     */
    public function markAsDelivered()
    {
        $this->update(['status' => 'delivered']);
    }
}