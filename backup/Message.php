<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $fillable = [
        'conversation_id', 'sender_id', 'type', 'body', 
        'attachment_url', 'attachment_name', 'attachment_size', 
        'attachment_mime', 'duration', 'status'
    ];

    protected $casts = [
        'attachment_size' => 'integer',
        'duration' => 'integer',
        'created_at' => 'datetime',
    ];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}